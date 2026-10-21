/**
 * 宿主半侧烟测（tools/smoke-host.mjs）。
 *
 * 不启动 DSH、不监听端口、不发出任何真实网络请求：
 *   - 用假 ctx（webServer 收集路由、effect 桩、logger 桩、connection 桩、settings 桩）调用 apply()
 *   - 构造 mock request/response，**真实调用**三条路由的 handler
 *   - 断言状态码、响应 JSON、405 + allow 头、鉴权守卫、settings 持久化、降级与异常韧性
 *
 * 运行：node tools/smoke-host.mjs（退出码 0 = 全绿）
 */
import { readFileSync } from 'node:fs';

import { DEFAULTS } from '../src/core.mjs';
import { HOLIDAY_SOURCE } from '../src/holidays.mjs';

const TARGET = new URL('../lib/index.js', import.meta.url).href;
const PKG = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

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

/**
 * 造一个独立的假 ctx（每个场景一份，互不污染）。
 * @param {object} [opts]
 * @param {object} [opts.connection] connection 桩（默认 requestRejection 放行）
 * @param {boolean} [opts.withSettings] 是否提供 settings 服务（false 模拟服务缺席）
 * @param {boolean} [opts.brokenWebServer] webServer.register 抛错，用于验证 apply 不抛
 */
function newCtx(opts = {}) {
  const routes = [];
  const effects = [];
  const logs = [];
  const settingsStore = {
    registrations: [],
    updates: [],
    watchers: [],
    stored: { ...(opts.stored ?? EMPTY_SCOPE) },
  };

  const fakeSettings = {
    register(ns, schema, options) {
      const registration = { ns, schema, options };
      settingsStore.registrations.push(registration);
      return {
        get() {
          return { ...settingsStore.stored };
        },
        watch(callback) {
          settingsStore.watchers.push(callback);
          return () => {
            const index = settingsStore.watchers.indexOf(callback);
            if (index >= 0) settingsStore.watchers.splice(index, 1);
          };
        },
        async update(patch) {
          settingsStore.updates.push(patch);
          settingsStore.stored = { ...settingsStore.stored, ...patch };
        },
        async replace(next) {
          settingsStore.updates.push(next);
          settingsStore.stored = { ...next };
        },
      };
    },
  };

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
    settings: opts.withSettings === false ? undefined : fakeSettings,
    connection: opts.connection ?? { requestRejection: () => undefined },
    logger,
    effect: trackEffect,
    get(serviceName) {
      if (serviceName === 'connection') return ctx.connection;
      if (serviceName === 'settings') return ctx.settings;
      return ctx[serviceName];
    },
    inject(names, callback) {
      // 模拟 Cordis 的可选服务：服务缺席时回调永不执行
      if (opts.withSettings === false) return { dispose() {} };
      const scoped = Object.create(ctx);
      scoped.effect = trackEffect;
      callback(scoped);
      return { dispose() {} };
    },
  };

  return { ctx, routes, effects, logs, settingsStore };
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

  const schemasteryAvailable = await (async () => {
    try {
      await import('@deepseek-ai/schemastery');
      return true;
    } catch {
      return false;
    }
  })();
  console.log(`  info schemastery ${schemasteryAvailable ? '可用' : '不可用（将验证降级路径）'}`);

  /* ---------------- 1. 路由注册 ---------------- */
  section('1. 路由注册与 ctx.effect 卸载');
  const baseConfig = { monthlySalary: 12345 };
  const main = newCtx();
  await mod.apply(main.ctx, baseConfig);

  check('apply 后注册 3 条路由', main.routes.length === 3, `实际 ${main.routes.length}`);
  const routePaths = main.routes.map((route) => route.path).sort();
  check(
    '路由路径精确匹配 SPEC §5',
    deepEqual(routePaths, ['/niuma/config', '/niuma/health', '/niuma/settings']),
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

  if (schemasteryAvailable) {
    const registered = await waitFor(() => main.settingsStore.registrations.length > 0, 1500);
    check('settings namespace 已注册', registered, `实际 ${main.settingsStore.registrations.length}`);
    const registration = main.settingsStore.registrations[0];
    check('namespace 名为 "niuma"', registration?.ns === 'niuma', String(registration?.ns));
    check('注册时带 schemastery Schema', typeof registration?.schema === 'function');
    check(
      '注册 options.base === 组合 config',
      deepEqual(registration?.options, { base: baseConfig }),
      JSON.stringify(registration?.options),
    );
    check('注册了 settings watch（与设置页联动）', main.settingsStore.watchers.length === 1);
  }

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
  check('默认节假日 33 天', configPayload?.data?.config?.holidays?.length === 33, String(configPayload?.data?.config?.holidays?.length));
  check('默认调休上班日 6 天', configPayload?.data?.config?.extraWorkdays?.length === 6, String(configPayload?.data?.config?.extraWorkdays?.length));
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

  /* ---------------- 4. POST /niuma/settings（成功路径） ---------------- */
  section('4. POST /niuma/settings（合法写入 + 持久化）');
  const firstWrite = await invoke(main.routes, '/niuma/settings', {
    method: 'POST',
    url: '/niuma/settings',
    body: JSON.stringify({ monthlySalary: 22000, workStart: '09:30', workEnd: '18:30' }),
  });
  const firstWritePayload = parseJson(firstWrite);
  if (schemasteryAvailable) {
    check('状态码 200', firstWrite.status === 200, String(firstWrite.status));
    check('ok === true', firstWritePayload?.ok === true);
    check('返回合并后的配置', firstWritePayload?.data?.config?.monthlySalary === 22000 && firstWritePayload?.data?.config?.workStart === '09:30', JSON.stringify(firstWritePayload?.data?.config?.monthlySalary));
    check('返回的配置已补全其他字段', firstWritePayload?.data?.config?.workEnd === '18:30' && firstWritePayload?.data?.config?.lunchEnabled === true);
    check('真的调用了 settings.update（1 次）', main.settingsStore.updates.length === 1, `实际 ${main.settingsStore.updates.length}`);
    check('写入的是完整合法配置（含节假日列表）', main.settingsStore.updates[0]?.holidays?.length === 33);

    const afterWrite = parseJson(await invoke(main.routes, '/niuma/config', { method: 'GET', url: '/niuma/config' }));
    check('写成后 GET /niuma/config 读到新值', afterWrite?.data?.config?.monthlySalary === 22000 && afterWrite?.data?.config?.workStart === '09:30');
    check('defaults 不受写入影响', afterWrite?.data?.defaults?.monthlySalary === 10000);

    // 未知字段忽略（SPEC §2）
    const unknownWrite = parseJson(await invoke(main.routes, '/niuma/settings', { method: 'POST', url: '/niuma/settings', body: JSON.stringify({ unknownField: 123 }) }));
    check('未知字段被忽略且请求成功', unknownWrite?.ok === true && unknownWrite?.data?.config?.unknownField === undefined && unknownWrite?.data?.config?.monthlySalary === 22000);
  } else {
    check('schemastery 缺席时写入返回 400 降级', firstWrite.status === 400 && firstWritePayload?.ok === false, String(firstWrite.status));
  }

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
  const updatesBeforeInvalid = main.settingsStore.updates.length;
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
  check('非法请求没有写入设置', main.settingsStore.updates.length === updatesBeforeInvalid, `${updatesBeforeInvalid} -> ${main.settingsStore.updates.length}`);

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
  check('超限请求没有写入设置', main.settingsStore.updates.length === updatesBeforeInvalid);

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
  check('守卫场景仍注册 3 条路由', guardedCtx.routes.length === 3);
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

  /* ---------------- 9. settings 服务缺席时的降级 ---------------- */
  section('9. settings 服务缺席 / apply 异常韧性');
  const noSettings = newCtx({ withSettings: false });
  let noSettingsThrew = false;
  try {
    await mod.apply(noSettings.ctx); // 不传 config，验证默认参数
  } catch (error) {
    noSettingsThrew = true;
    console.error(error);
  }
  check('没有 settings 服务时 apply 不抛错', noSettingsThrew === false);
  check('降级后仍注册 3 条路由', noSettings.routes.length === 3, `实际 ${noSettings.routes.length}`);
  const degradedConfig = parseJson(await invoke(noSettings.routes, '/niuma/config', { method: 'GET', url: '/niuma/config' }));
  check('降级后 GET /niuma/config 仍返回默认配置', degradedConfig?.ok === true && degradedConfig?.data?.config?.monthlySalary === DEFAULTS.monthlySalary);
  const degradedWrite = await invoke(noSettings.routes, '/niuma/settings', {
    method: 'POST',
    url: '/niuma/settings',
    body: JSON.stringify({ monthlySalary: 20000 }),
  });
  const degradedWritePayload = parseJson(degradedWrite);
  check(
    'settings 不可用时写接口返回 400 {ok:false,error}',
    degradedWrite.status === 400 && degradedWritePayload?.ok === false && typeof degradedWritePayload?.error === 'string' && /不支持|不可用/.test(degradedWritePayload.error),
    `${degradedWrite.status} ${degradedWritePayload?.error}`,
  );

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
