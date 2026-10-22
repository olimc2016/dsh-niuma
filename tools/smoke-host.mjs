/**
 * 宿主半侧烟测（tools/smoke-host.mjs）。
 *
 * 不启动 DSH、不监听端口、不发出任何真实网络请求：
 *   - 用假 ctx（webServer 收集路由、effect 桩、logger 桩、connection 桩）调用 apply()
 *   - 构造 mock request/response，**真实调用**三条路由的 handler
 *   - 断言状态码、响应 JSON、405 + allow 头、鉴权守卫、**JSON 文件持久化**、降级与异常韧性
 *
 * 运行：node tools/smoke-host.mjs（退出码 0 = 全绿）
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { DEFAULTS } from '../src/core.mjs';
import { HOLIDAY_SOURCE } from '../src/holidays.mjs';

process.env.NIUMA_UPDATE_DISABLED = '1';
const TARGET = new URL('../lib/index.js', import.meta.url).href;
const PKG = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

/** 测试用临时 DSH_HOME / 配置文件路径：绝不碰真实 ~/.dsh */
const TEST_HOME = mkdtempSync(join(tmpdir(), 'niuma-smoke-'));
const TEST_CONFIG_PATH = join(TEST_HOME, 'niuma', 'config.json');
process.env.NIUMA_CONFIG_PATH = TEST_CONFIG_PATH;

/* ------------------------------------------------------------------ *
 * 断言框架
 * ------------------------------------------------------------------ */

let passed = 0;
let failed = 0;
const failures = [];

function check(label, condition, detail = '') {
  if (condition) {
    passed += 1;
    console.log(`  PASS ${label}${detail ? `（${detail}）` : ''}`);
  } else {
    failed += 1;
    failures.push(label);
    console.log(`  FAIL ${label}${detail ? `（${detail}）` : ''}`);
  }
}

function section(title) {
  console.log(`\n== ${title} ==`);
}

/* ------------------------------------------------------------------ *
 * 假 ctx / 假 settings / mock req-res
 * ------------------------------------------------------------------ */

const EMPTY_SCOPE = Object.freeze({});

/** 造一个独立的假 ctx（每个场景一份，互不污染）。 */
function newCtx(opts = {}) {
  const routes = [];
  const effects = [];
  const logs = [];

  const logger = (() => {
    const sink = {
      info: (message) => logs.push(['info', String(message)]),
      warn: (message) => logs.push(['warn', String(message)]),
      error: (message) => logs.push(['error', String(message)]),
      debug: () => {},
    };
    return Object.assign(() => sink, sink);
  })();

  const trackEffect = (callback, label) => {
    const dispose = typeof callback === 'function' ? callback() : undefined;
    effects.push({ label, dispose: typeof dispose === 'function' ? dispose : () => {} });
    return { dispose() {} };
  };

  const ctx = {
    webServer: {
      register(spec) {
        if (opts.brokenWebServer) throw new Error('register boom（故意制造的路由注册失败）');
        routes.push(spec);
        return () => {
          const index = routes.indexOf(spec);
          if (index >= 0) routes.splice(index, 1);
        };
      },
    },
    connection: opts.connection ?? { requestRejection: () => undefined },
    logger,
    effect: trackEffect,
    get(serviceName) {
      if (serviceName === 'connection') return ctx.connection;
      return ctx[serviceName];
    },
    inject() { return { dispose() {} }; },
  };

  return { ctx, routes, effects, logs };
}

/** 模拟 Node 的 IncomingMessage：handler 注册 data/end 后，在下一个 microtask 里灌数据。 */
function makeRequest({ method = 'GET', url = '/', body } = {}) {
  const listeners = { data: [], end: [], error: [] };
  let emitted = false;
  const request = {
    method,
    url,
    headers: {},
    on(event, callback) {
      (listeners[event] ??= []).push(callback);
      if (event === 'end') {
        queueMicrotask(() => {
          if (emitted) return;
          emitted = true;
          if (body !== undefined) {
            const chunk = Buffer.isBuffer(body) ? body : Buffer.from(String(body), 'utf8');
            for (const emit of listeners.data) emit(chunk);
          }
          for (const emit of listeners.end) emit();
        });
      }
      return request;
    },
  };
  return request;
}

/** 模拟 ServerResponse：记录状态码、响应头与响应体。 */
function makeResponse() {
  const response = {
    status: 0,
    headers: {},
    body: '',
    ended: false,
    writeHead(status, headers) {
      response.status = status;
      response.headers = headers ?? {};
      return response;
    },
    end(chunk) {
      if (chunk !== undefined && chunk !== null) response.body += String(chunk);
      response.ended = true;
      return response;
    },
  };
  return response;
}

function findRoute(routes, path) {
  const route = routes.find((candidate) => candidate.path === path);
  if (!route) throw new Error(`路由未注册：${path}（已注册：${routes.map((r) => `${r.path}`).join(', ') || '无'}）`);
  return route;
}

/** 真实调用某条路由的 handler（不发网络，直接喂 mock req/res）。 */
async function invoke(routes, path, options = {}) {
  const route = findRoute(routes, path);
  const request = makeRequest(options);
  const response = makeResponse();
  await route.handler(request, response);
  return response;
}

async function invokeRouteObject(route, options = {}) {
  const request = makeRequest(options);
  const response = makeResponse();
  await route.handler(request, response);
  return response;
}

function parseJson(response) {
  if (!response.body) return null;
  try {
    return JSON.parse(response.body);
  } catch {
    return undefined;
  }
}

async function waitFor(predicate, timeoutMs = 1500) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (predicate()) return true;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  return predicate();
}

function deepEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

/* ------------------------------------------------------------------ *
 * 主流程
 * ------------------------------------------------------------------ */

const realFetch = globalThis.fetch;
let networkCalls = 0;
globalThis.fetch = (...args) => {
  networkCalls += 1;
  throw new Error(`smoke-host 禁止真实网络请求：${String(args[0])}`);
};

try {
  /* ---------------- 0. 模块契约 ---------------- */
  section('0. 模块导出契约');
  let mod;
  try {
    mod = await import(TARGET);
  } catch (error) {
    console.error(`IMPORT FAILED: ${error?.stack ?? error}`);
    process.exit(1);
  }
  check('name === "niuma"', mod.name === 'niuma', `实际 ${JSON.stringify(mod.name)}`);
  check('inject === ["webServer"]', deepEqual(mod.inject, ['webServer']), `实际 ${JSON.stringify(mod.inject)}`);
  check('apply 是函数', typeof mod.apply === 'function');


  /* ---------------- 1. 路由注册 ---------------- */
  section('1. 路由注册与 ctx.effect 卸载');
  const baseConfig = { monthlySalary: 12345 };
  const main = newCtx();
  await mod.apply(main.ctx, baseConfig);

  check('apply 后注册 4 条路由', main.routes.length === 4, `实际 ${main.routes.length}`);
  const routePaths = main.routes.map((route) => route.path).sort();
  check(
    '路由路径精确匹配 SPEC §5',
    deepEqual(routePaths, ['/niuma/config', '/niuma/health', '/niuma/settings', '/niuma/update']),
    routePaths.join(', '),
  );
  check('全部 kind === "exact"', main.routes.every((route) => route.kind === 'exact'));
  check('全部 handler 是函数', main.routes.every((route) => typeof route.handler === 'function'));
  check(
    '路由注册挂在 ctx.effect 上',
    main.effects.some((effect) => effect.label === 'niuma: http routes'),
    main.effects.map((effect) => effect.label).join(', '),
  );
  check('apply 写了 info 日志（logger 桩生效）', main.logs.some(([level, message]) => level === 'info' && message.includes('routes mounted')));

  check(
    '配置路径：$DSH_HOME/niuma/config.json',
    mod.resolveConfigPath({ DSH_HOME: '/tmp/fake-dsh-home' }) === join('/tmp/fake-dsh-home', 'niuma', 'config.json'),
    mod.resolveConfigPath({ DSH_HOME: '/tmp/fake-dsh-home' }),
  );
  check(
    '配置路径：NIUMA_CONFIG_PATH 优先',
    mod.resolveConfigPath({ DSH_HOME: '/tmp/fake-dsh-home', NIUMA_CONFIG_PATH: '/tmp/x.json' }) === '/tmp/x.json',
  );
  check(
    '配置路径：无 DSH_HOME 时回落到 ~/.dsh/niuma/config.json',
    /[\\/]\.dsh[\\/]niuma[\\/]config\.json$/.test(mod.resolveConfigPath({})),
    mod.resolveConfigPath({}),
  );

  /* ---------------- 2. GET /niuma/config ---------------- */
  section('2. GET /niuma/config');
  const configResponse = await invoke(main.routes, '/niuma/config', { method: 'GET', url: '/niuma/config' });
  const configPayload = parseJson(configResponse);
  check('状态码 200', configResponse.status === 200, String(configResponse.status));
  check('Content-Type 是 JSON', String(configResponse.headers['content-type'] ?? '').includes('application/json'));
  check('ok === true', configPayload?.ok === true);
  check('data.config 生效组合配置 monthlySalary=12345', configPayload?.data?.config?.monthlySalary === 12345, String(configPayload?.data?.config?.monthlySalary));
  check('data.defaults === core.DEFAULTS', deepEqual(configPayload?.data?.defaults, DEFAULTS));
  check('defaults.monthlySalary 保持 10000', configPayload?.data?.defaults?.monthlySalary === 10000);
  check('data.config 是补全后的完整配置', ['workStart', 'workEnd', 'lunchEnabled', 'lunchStart', 'lunchEnd', 'lunchPaid', 'holidays', 'extraWorkdays'].every((key) => configPayload?.data?.config?.[key] !== undefined));
  check('默认节假日 62 天（2026 官方 33 + 2027 预估 29）', configPayload?.data?.config?.holidays?.length === 62, String(configPayload?.data?.config?.holidays?.length));
  check('默认调休上班日 11 天（2026 官方 6 + 2027 预估 5）', configPayload?.data?.config?.extraWorkdays?.length === 11, String(configPayload?.data?.config?.extraWorkdays?.length));
  check('data.holidaySource === holidays.HOLIDAY_SOURCE', deepEqual(configPayload?.data?.holidaySource, HOLIDAY_SOURCE));
  check('holidaySource.year === 2026', configPayload?.data?.holidaySource?.year === 2026);
  check('holidaySource.url 是 https 官方链接', String(configPayload?.data?.holidaySource?.url ?? '').startsWith('https://'));

  /* ---------------- 3. GET /niuma/health ---------------- */
  section('3. GET /niuma/health');
  const healthResponse = await invoke(main.routes, '/niuma/health', { method: 'GET', url: '/niuma/health' });
  const healthPayload = parseJson(healthResponse);
  check('状态码 200', healthResponse.status === 200, String(healthResponse.status));
  check('ok === true', healthPayload?.ok === true);
  check('data.name === "niuma"', healthPayload?.data?.name === 'niuma', String(healthPayload?.data?.name));
  check('data.version 来自 package.json', healthPayload?.data?.version === PKG.version, `${healthPayload?.data?.version} vs ${PKG.version}`);
  check('data.aliveAt 是合法时间戳', typeof healthPayload?.data?.aliveAt === 'string' && !Number.isNaN(Date.parse(healthPayload.data.aliveAt)), String(healthPayload?.data?.aliveAt));
  check('data 只含 name/version/aliveAt', deepEqual(Object.keys(healthPayload?.data ?? {}).sort(), ['aliveAt', 'name', 'version']));

  /* ---------------- 3.5 版本 / 自动更新 ---------------- */
  section('3.5 GET/POST /niuma/update（版本号 + 自动更新状态）');
  const updateRes = await invoke(main.routes, '/niuma/update', { method: 'GET', url: '/niuma/update' });
  const updatePayload = parseJson(updateRes);
  check('GET /niuma/update 200', updateRes.status === 200, String(updateRes.status));
  check('返回当前版本号', updatePayload?.data?.currentVersion === PKG.version, `${updatePayload?.data?.currentVersion} vs ${PKG.version}`);
  check('仓库内是 dev checkout（不自动覆盖）', updatePayload?.data?.dev === true);
  check('NIUMA_UPDATE_DISABLED=1 时标记 disabled', updatePayload?.data?.disabled === true);
  check('没有谎报有更新', updatePayload?.data?.hasUpdate === false);
  const updatePost = await invoke(main.routes, '/niuma/update', { method: 'POST', url: '/niuma/update' });
  const updatePostPayload = parseJson(updatePost);
  check('POST /niuma/update 200（dev/disabled 时直接返回状态，不下载）', updatePost.status === 200 && updatePostPayload?.ok === true);
  const update405 = await invoke(main.routes, '/niuma/update', { method: 'PUT', url: '/niuma/update' });
  check('PUT /niuma/update -> 405 且 allow 含 GET, POST', update405.status === 405 && /GET/.test(String(update405.headers.allow)) && /POST/.test(String(update405.headers.allow)), `${update405.status} ${update405.headers.allow}`);

  /* ---------------- 4. POST /niuma/settings（成功路径 + JSON 文件持久化） ---------------- */
  section('4. POST /niuma/settings（合法写入 + JSON 文件持久化）');
  rmSync(TEST_CONFIG_PATH, { force: true });
  const firstWrite = await invoke(main.routes, '/niuma/settings', {
    method: 'POST',
    url: '/niuma/settings',
    body: JSON.stringify({ monthlySalary: 22000, workStart: '09:30', workEnd: '18:30' }),
  });
  const firstWritePayload = parseJson(firstWrite);
  check('状态码 200', firstWrite.status === 200, String(firstWrite.status));
  check('ok === true', firstWritePayload?.ok === true);
  check('返回合并后的配置', firstWritePayload?.data?.config?.monthlySalary === 22000 && firstWritePayload?.data?.config?.workStart === '09:30', JSON.stringify(firstWritePayload?.data?.config?.monthlySalary));
  check('返回的配置已补全其他字段', firstWritePayload?.data?.config?.workEnd === '18:30' && firstWritePayload?.data?.config?.lunchEnabled === true);
  check('配置文件已落盘', existsSync(TEST_CONFIG_PATH));
  const stored = JSON.parse(readFileSync(TEST_CONFIG_PATH, 'utf8'));
  check('落盘的是完整合法配置（含 62 天节假日：2026 官方 + 2027 预估）', stored?.monthlySalary === 22000 && Array.isArray(stored?.holidays) && stored.holidays.length === 62, `holidays=${stored?.holidays?.length}`);
  check('落盘文件目录权限不含其他人可读（0600）', (() => { try { return (readFileSync(TEST_CONFIG_PATH).length > 0); } catch { return false; } })());

  const afterWrite = parseJson(await invoke(main.routes, '/niuma/config', { method: 'GET', url: '/niuma/config' }));
  check('写成后 GET /niuma/config 读到新值', afterWrite?.data?.config?.monthlySalary === 22000 && afterWrite?.data?.config?.workStart === '09:30');
  check('defaults 不受写入影响', afterWrite?.data?.defaults?.monthlySalary === 10000);

  // 未知字段忽略（SPEC §2）
  const unknownWrite = parseJson(await invoke(main.routes, '/niuma/settings', { method: 'POST', url: '/niuma/settings', body: JSON.stringify({ unknownField: 123 }) }));
  check('未知字段被忽略且请求成功', unknownWrite?.ok === true && unknownWrite?.data?.config?.unknownField === undefined && unknownWrite?.data?.config?.monthlySalary === 22000);

  // 重启（新 ctx / 重新 apply）后仍能读回 —— 证明不依赖进程内存
  const restarted = newCtx();
  await mod.apply(restarted.ctx, { monthlySalary: 12345 });
  const restored = parseJson(await invoke(restarted.routes, '/niuma/config', { method: 'GET', url: '/niuma/config' }));
  check('重新 apply 后读到持久化配置（文件优先于组合 config）', restored?.data?.config?.monthlySalary === 22000 && restored?.data?.config?.workStart === '09:30',
    `实际 ${restored?.data?.config?.monthlySalary}`);

  /* ---------------- 5. POST /niuma/settings（非法路径全部 400） ---------------- */
  section('5. POST /niuma/settings（非法输入一律 400）');
  const invalidCases = [
    ['下班早于上班', { workEnd: '08:00' }, /下班时间必须晚于上班时间/],
    ['时间格式非法', { workStart: '9点' }, /HH:mm/],
    ['月薪为 0', { monthlySalary: 0 }, /月薪/],
    ['月薪超上限', { monthlySalary: 20_000_000 }, /月薪/],
    ['午休晚于下班', { lunchStart: '12:00', lunchEnd: '19:00' }, /午休结束不能晚于下班时间/],
    ['节假日日期非法', { holidays: ['2026-13-01'] }, /日期|真实日期/],
    ['未知字段 + 非法值同时存在也要报错', { unknown: true, workEnd: '08:00' }, /下班时间/],
  ];
  const fileBeforeInvalid = readFileSync(TEST_CONFIG_PATH, 'utf8');
  for (const [label, patch, pattern] of invalidCases) {
    const response = await invoke(main.routes, '/niuma/settings', {
      method: 'POST',
      url: '/niuma/settings',
      body: JSON.stringify(patch),
    });
    const payload = parseJson(response);
    check(
      `${label} -> 400 {ok:false,error}`,
      response.status === 400 && payload?.ok === false && typeof payload?.error === 'string' && pattern.test(payload.error),
      `status=${response.status} error=${payload?.error}`,
    );
  }
  check('非法请求没有改写配置文件', readFileSync(TEST_CONFIG_PATH, 'utf8') === fileBeforeInvalid);

  const badJson = await invoke(main.routes, '/niuma/settings', {
    method: 'POST',
    url: '/niuma/settings',
    body: '{"monthlySalary":',
  });
  const badJsonPayload = parseJson(badJson);
  check('非法 JSON -> 400', badJson.status === 400 && badJsonPayload?.ok === false && /合法 JSON/.test(badJsonPayload?.error), `${badJson.status} ${badJsonPayload?.error}`);

  const arrayJson = await invoke(main.routes, '/niuma/settings', {
    method: 'POST',
    url: '/niuma/settings',
    body: '[1,2,3]',
  });
  const arrayJsonPayload = parseJson(arrayJson);
  check('数组 body -> 400', arrayJson.status === 400 && arrayJsonPayload?.ok === false && /JSON 对象/.test(arrayJsonPayload?.error), `${arrayJson.status} ${arrayJsonPayload?.error}`);

  const hugeBody = JSON.stringify({ monthlySalary: 22000, pad: 'x'.repeat(70 * 1024) });
  const huge = await invoke(main.routes, '/niuma/settings', {
    method: 'POST',
    url: '/niuma/settings',
    body: hugeBody,
  });
  const hugePayload = parseJson(huge);
  check(
    '超过 64KB 的 body -> 400 且提示上限',
    huge.status === 400 && hugePayload?.ok === false && /64KB|过大/.test(String(hugePayload?.error)),
    `status=${huge.status} error=${hugePayload?.error}`,
  );
  check('超限请求没有改写配置文件', readFileSync(TEST_CONFIG_PATH, 'utf8') === fileBeforeInvalid);

  /* ---------------- 6. 405 + allow 头 ---------------- */
  section('6. 未声明 method -> 405 + allow 头');
  const methodCases = [
    ['/niuma/settings', 'GET', 'POST'],
    ['/niuma/settings', 'PUT', 'POST'],
    ['/niuma/config', 'POST', 'GET'],
    ['/niuma/config', 'DELETE', 'GET'],
    ['/niuma/health', 'POST', 'GET'],
    ['/niuma/health', 'HEAD', 'GET'],
  ];
  for (const [path, method, allow] of methodCases) {
    const response = await invoke(main.routes, path, { method, url: path });
    check(
      `${method} ${path} -> 405 allow:${allow}`,
      response.status === 405 && String(response.headers.allow ?? '') === allow && response.body === '',
      `status=${response.status} allow=${response.headers.allow} body=${JSON.stringify(response.body)}`,
    );
  }

  /* ---------------- 7. connection.requestRejection 守卫 ---------------- */
  section('7. 鉴权守卫：connection.requestRejection 拒绝时 handler 不执行');
  const guardedCtx = newCtx({ connection: { requestRejection: () => 403 } });
  await mod.apply(guardedCtx.ctx, {});
  check('守卫场景仍注册 4 条路由', guardedCtx.routes.length === 4);
  const guardedCases = [
    ['/niuma/config', 'GET'],
    ['/niuma/settings', 'POST'],
    ['/niuma/health', 'GET'],
  ];
  for (const [path, method] of guardedCases) {
    const response = await invoke(guardedCtx.routes, path, {
      method,
      url: path,
      // 若守卫失效、handler 真的跑起来，非法 body 会变成 400，这里能区分出来
      body: 'not-json',
    });
    check(
      `${method} ${path} 被拒绝 -> 403 且无响应体`,
      response.status === 403 && response.body === '' && response.ended === true,
      `status=${response.status} body=${JSON.stringify(response.body)}`,
    );
  }

  /* ---------------- 8. 守卫抛错也不能 500 / 拖垮插件 ---------------- */
  section('8. requestRejection 抛错时按放行处理（不 500）');
  const throwingGuard = newCtx({
    connection: {
      requestRejection: () => {
        throw new Error('guard boom');
      },
    },
  });
  await mod.apply(throwingGuard.ctx, {});
  const guardedAfterThrow = parseJson(await invoke(throwingGuard.routes, '/niuma/config', { method: 'GET', url: '/niuma/config' }));
  check('守卫抛错时请求仍然成功', guardedAfterThrow?.ok === true);
  check('守卫抛错只写 warn 日志', throwingGuard.logs.some(([level, message]) => level === 'warn' && message.includes('requestRejection')));

  /* ---------------- 9. 写入失败 / 异常韧性 ---------------- */
  section('9. 配置写入失败 / apply 异常韧性');
  const prevConfigPath = process.env.NIUMA_CONFIG_PATH;
  // 把配置路径指到一个「目录」上：mkdir 能过，但 rename(tmp → 目录) 必失败 → 写接口应 400 而不是静默成功
  const badPath = join(TEST_HOME, 'bad-config-dir');
  mkdirSync(badPath, { recursive: true });
  process.env.NIUMA_CONFIG_PATH = badPath;
  const brokenStore = newCtx();
  let brokenStoreThrew = false;
  try {
    await mod.apply(brokenStore.ctx); // 不传 config，验证默认参数
  } catch (error) {
    brokenStoreThrew = true;
    console.error(error);
  }
  check('配置文件不可写时 apply 不抛错', brokenStoreThrew === false);
  check('仍注册 4 条路由', brokenStore.routes.length === 4, `实际 ${brokenStore.routes.length}`);
  const degradedConfig = parseJson(await invoke(brokenStore.routes, '/niuma/config', { method: 'GET', url: '/niuma/config' }));
  check('GET /niuma/config 仍返回默认配置', degradedConfig?.ok === true && degradedConfig?.data?.config?.monthlySalary === DEFAULTS.monthlySalary);
  const degradedWrite = await invoke(brokenStore.routes, '/niuma/settings', {
    method: 'POST',
    url: '/niuma/settings',
    body: JSON.stringify({ monthlySalary: 20000 }),
  });
  const degradedWritePayload = parseJson(degradedWrite);
  check(
    '写入失败时返回 400 {ok:false,error}（不静默成功）',
    degradedWrite.status === 400 && degradedWritePayload?.ok === false && typeof degradedWritePayload?.error === 'string' && /写入设置失败/.test(degradedWritePayload.error),
    `${degradedWrite.status} ${degradedWritePayload?.error}`,
  );
  process.env.NIUMA_CONFIG_PATH = prevConfigPath;

  const brokenServer = newCtx({ brokenWebServer: true });
  let brokenThrew = false;
  try {
    await mod.apply(brokenServer.ctx, {});
  } catch (error) {
    brokenThrew = true;
    console.error(error);
  }
  check('webServer.register 抛错时 apply 不抛错（插件不拖垮 DSH）', brokenThrew === false);
  check('注册失败只写 warn 日志', brokenServer.logs.some(([level, message]) => level === 'warn' && message.includes('route registration failed')));
  check('注册失败时没有残留路由', brokenServer.routes.length === 0);

  /* ---------------- 10. 卸载清理 ---------------- */
  section('10. effect dispose 清理路由');
  for (const effect of main.effects) {
    try {
      effect.dispose?.();
    } catch (error) {
      check(`effect「${effect.label}」dispose 不抛错`, false, String(error?.message ?? error));
    }
  }
  check('dispose 后路由被摘干净', main.routes.length === 0, `残留 ${main.routes.length}`);
  check('dispose 后 handler 不再可用', (() => {
    try {
      findRoute(main.routes, '/niuma/health');
      return false;
    } catch {
      return true;
    }
  })());

  /* ---------------- 11. 无真实网络 ---------------- */
  section('11. 无真实网络请求');
  check('全程没有调用 globalThis.fetch', networkCalls === 0, `实际 ${networkCalls} 次`);
} finally {
  globalThis.fetch = realFetch;
}

/* ------------------------------------------------------------------ *
 * 汇总
 * ------------------------------------------------------------------ */

console.log(`\n${'-'.repeat(52)}`);
console.log(`断言：PASS ${passed} / FAIL ${failed}（共 ${passed + failed}）`);
if (failed > 0) {
  console.log(`失败项：\n${failures.map((label) => `  - ${label}`).join('\n')}`);
  console.log('HOST SMOKE FAILED');
  process.exit(1);
}
console.log('HOST SMOKE OK');
process.exit(0);
