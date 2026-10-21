/**
 * 牛马加速器（dsh-niuma）—— 宿主半侧。
 *
 * 职责（详见 SPEC.md §5）：
 *   1. 设置：可选注册 settings namespace（schemastery schema），把面板里的修改持久化到 DSH 设置。
 *   2. 路由：通过 ctx.webServer 暴露三条只读/写配置路由，供浏览器半侧 fetch：
 *        GET  /niuma/config    -> { ok, data: { config, defaults, holidaySource } }
 *        POST /niuma/settings  -> 校验并持久化配置（body 上限 64KB）
 *        GET  /niuma/health    -> { ok, data: { name, version, aliveAt } }
 *   3. 鉴权：全部走 connection.requestRejection 守卫（与 DSH 内建路由同一套 Host/Origin 围栏）。
 *
 * 可靠性约束（0.x 插件血泪教训）：
 *   - settings / schemastery 都是**可选依赖**：动态 import 失败时静默降级，
 *     插件仍以 cordis.patch.yml 的 config + core.DEFAULTS 工作，绝不拖垮 DSH 启动。
 *   - apply() 内任何异常只写 warn 日志，绝不向上抛。
 *   - 路由注册统一挂在 ctx.effect 上并返回 dispose，卸载时干净摘除。
 *
 * 纯业务口径（工资公式、节假日判定）全在 src/core.mjs，宿主侧只做「存取配置」。
 */
import { readFileSync } from 'node:fs';
import { DEFAULTS, normalizeConfig, validateConfig } from '../src/core.mjs';
import { HOLIDAY_SOURCE } from '../src/holidays.mjs';

/** 包元数据：health 路由要报真实版本号；读不到也不能阻碍插件加载（用动态/容错读法） */
const PKG = (() => {
  try {
    return JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  } catch {
    return { name: 'dsh-niuma', version: '0.0.0' };
  }
})();

/** 稳定插件名（= 包名去掉 dsh- 前缀），同时用作 settings namespace 与路由前缀 */
export const name = 'niuma';

/**
 * 依赖的宿主服务。
 * 只声明 webServer（插件唯一必需出口）；settings 是可选依赖，用 ctx.inject 探测，
 * 不写进 inject 数组 —— 否则缺 settings 的组合里插件会直接加载不起来。
 */
export const inject = ['webServer'];

const NAMESPACE = name;
const ROUTE_BASE = `/${NAMESPACE}`;
/** POST /niuma/settings 的请求体上限（64KB） */
const MAX_BODY_BYTES = 64 * 1024;
/** 与 core.mjs 的校验口径保持一致（月薪上限） */
const SALARY_MAX = 10_000_000;

/* ------------------------------------------------------------------ *
 * 设置 schema（schemastery）：动态 import，失败降级为 null
 * ------------------------------------------------------------------ */

let schemaPromise = null;

/** 构造设置 schema；schemastery 不可用时返回 null（不抛错）。 */
export async function loadConfigSchema() {
  try {
    const { default: z } = await import('@deepseek-ai/schemastery');
    // 注意：schemastery 的标量没有隐式默认值，字段缺省时会被对象丢掉 → 必须逐个 .default()
    return z.object({
      monthlySalary: z.number().min(0).max(SALARY_MAX)
        .default(DEFAULTS.monthlySalary)
        .description('实收月薪（元/月，税后到手；>0，上限 10,000,000）'),
      workStart: z.string().default(DEFAULTS.workStart).description('上班时间（HH:mm）'),
      workEnd: z.string().default(DEFAULTS.workEnd).description('下班时间（HH:mm，必须晚于上班时间，暂不支持跨夜班）'),
      lunchEnabled: z.boolean().default(DEFAULTS.lunchEnabled).description('是否启用午休'),
      lunchStart: z.string().default(DEFAULTS.lunchStart).description('午休开始时间（HH:mm，启用午休时必填）'),
      lunchEnd: z.string().default(DEFAULTS.lunchEnd).description('午休结束时间（HH:mm，必须晚于午休开始且不晚于下班）'),
      lunchPaid: z.boolean().default(DEFAULTS.lunchPaid).description('午休是否算工时（算工时则日有效工时更长、时薪更低）'),
      holidays: z.array(z.string()).default([...DEFAULTS.holidays])
        .description('法定节假日（YYYY-MM-DD，一行一个）。放假日期不算工作日，日工资会相应变高'),
      extraWorkdays: z.array(z.string()).default([...DEFAULTS.extraWorkdays])
        .description('调休上班日（YYYY-MM-DD，一行一个）。周末补班日期算工作日'),
    });
  } catch {
    return null; // 可选依赖缺失：退化为「只读默认值 + 写接口 400」
  }
}

/** 单例 schema promise：避免每次 apply 都重新 import。 */
function configSchema() {
  if (!schemaPromise) schemaPromise = loadConfigSchema();
  return schemaPromise;
}

/* ------------------------------------------------------------------ *
 * 通用 HTTP 工具
 * ------------------------------------------------------------------ */

function sendJson(response, status, payload) {
  try {
    response.writeHead(status, {
      'cache-control': 'no-store',
      'content-type': 'application/json; charset=utf-8',
    });
    response.end(JSON.stringify(payload));
  } catch {
    /* 连接已断或响应已结束：忽略，交给上层日志 */
  }
}

function methodNotAllowed(response, allow) {
  try {
    response.writeHead(405, { allow, 'cache-control': 'no-store' });
    response.end();
  } catch {
    /* 同 sendJson：响应不可写时不再二次抛 */
  }
}

/** 请求体超限错误（用于把「太大」和「读失败」区分开） */
class BodyTooLargeError extends Error {
  constructor() {
    super(`请求体过大（上限 ${Math.floor(MAX_BODY_BYTES / 1024)}KB）`);
    this.code = 'BODY_TOO_LARGE';
  }
}

/**
 * 读取请求体文本（上限 64KB）。非流式 request（测试桩）视为空 body。
 * @param {object} request
 * @param {number} [limit]
 * @returns {Promise<string>}
 */
function readBody(request, limit = MAX_BODY_BYTES) {
  return new Promise((resolve, reject) => {
    if (!request || typeof request.on !== 'function') {
      resolve('');
      return;
    }
    let raw = '';
    let size = 0;
    let settled = false;
    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      fn(value);
    };
    request.on('data', (chunk) => {
      if (settled) return;
      const text = typeof chunk === 'string'
        ? chunk
        : Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk);
      size += Buffer.byteLength(text, 'utf8');
      if (size > limit) {
        finish(reject, new BodyTooLargeError());
        return;
      }
      raw += text;
    });
    request.on('end', () => finish(resolve, raw));
    request.on('error', (error) => finish(reject, error));
  });
}

/* ------------------------------------------------------------------ *
 * 日志
 * ------------------------------------------------------------------ */

/** 兼容两种 logger 形态：ctx.logger('name') 与 ctx.logger 直接是 logger 对象。 */
function resolveLogger(ctx) {
  try {
    if (typeof ctx?.logger === 'function') return ctx.logger(NAMESPACE);
    return ctx?.logger;
  } catch {
    return undefined;
  }
}

/* ------------------------------------------------------------------ *
 * 插件主体
 * ------------------------------------------------------------------ */

/**
 * 插件入口。
 * @param {object} ctx Cordis 上下文
 * @param {object} [config] cordis.patch.yml 里的组合配置（已过 schema，通常为 {}）
 */
export async function apply(ctx, config = {}) {
  const logger = resolveLogger(ctx);
  const baseConfig = config && typeof config === 'object' && !Array.isArray(config) ? config : {};
  const mountedAt = new Date().toISOString();

  // settings 服务可选：register 成功后才会有 scope / settingsService
  let scope = null;
  let settingsService = null;

  /**
   * 当前生效配置 = core.DEFAULTS ← 组合配置 ← 用户设置（后者覆盖前者）。
   * 永远返回补全 + 规范化后的完整配置，视图侧不用再自己 merge。
   */
  const currentConfig = () => {
    let stored = {};
    try {
      const value = scope?.get?.();
      if (value && typeof value === 'object' && !Array.isArray(value)) stored = value;
    } catch (error) {
      logger?.warn?.(`niuma: settings read failed: ${error?.message ?? error}`);
    }
    return normalizeConfig({ ...DEFAULTS, ...baseConfig, ...stored }).config;
  };

  /** 把校验后的完整配置写回 DSH 设置；返回是否真的持久化成功。 */
  const persistConfig = async (next) => {
    if (scope && typeof scope.update === 'function') {
      await scope.update(next);
      return true;
    }
    if (scope && typeof scope.replace === 'function') {
      await scope.replace(next);
      return true;
    }
    if (settingsService && typeof settingsService.update === 'function') {
      await settingsService.update(NAMESPACE, next);
      return true;
    }
    return false;
  };

  // ---- 设置注册：schemastery 动态 import + 失败静默降级 ----
  const registerSettings = (settingsCtx) => {
    configSchema()
      .then((Schema) => {
        if (!Schema) {
          logger?.warn?.('niuma: schemastery unavailable, settings namespace skipped');
          return;
        }
        try {
          const registered = settingsCtx.settings?.register?.(NAMESPACE, Schema, { base: baseConfig });
          if (!registered) return;
          scope = registered;
          settingsService = settingsCtx.settings ?? null;
          try {
            // watch 只是为了与设置页联动（当前版本没有需要失效的缓存），失败不影响主流程
            if (typeof settingsCtx.effect === 'function') {
              settingsCtx.effect(() => scope?.watch?.(() => {}), 'niuma: settings watch');
            }
          } catch (error) {
            logger?.warn?.(`niuma: settings watch failed: ${error?.message ?? error}`);
          }
          logger?.info?.('niuma: settings namespace registered');
        } catch (error) {
          logger?.warn?.(`niuma: settings namespace unavailable: ${error?.message ?? error}`);
        }
      })
      .catch((error) => {
        logger?.warn?.(`niuma: settings schema load failed: ${error?.message ?? error}`);
      });
  };

  try {
    if (typeof ctx.inject === 'function') {
      ctx.inject(['settings'], registerSettings);
    } else if (ctx.settings) {
      // 极端情况下没有 ctx.inject（老内核/测试桩）：直接尝试注册一次，失败也静默
      registerSettings(ctx);
    }
  } catch (error) {
    logger?.warn?.(`niuma: settings injection failed: ${error?.message ?? error}`);
  }

  // ---- 路由守卫：webServer 自身不做鉴权，复用 connection 的 Host/Origin 围栏 ----
  const guarded = (handler) => async (request, response) => {
    let rejection;
    try {
      const connection = typeof ctx.get === 'function' ? ctx.get('connection') : undefined;
      rejection = connection?.requestRejection?.(request);
    } catch (error) {
      rejection = undefined;
      logger?.warn?.(`niuma: requestRejection failed: ${error?.message ?? error}`);
    }
    if (rejection !== undefined && rejection !== null) {
      try {
        response.writeHead(rejection);
        response.end();
      } catch (error) {
        logger?.warn?.(`niuma: rejection response failed: ${error?.message ?? error}`);
      }
      return;
    }
    try {
      return await handler(request, response);
    } catch (error) {
      logger?.warn?.(`niuma: route failed: ${error?.stack ?? error}`);
      sendJson(response, 500, { ok: false, error: String(error?.message ?? error) });
    }
  };

  // ---- 三条路由的处理器 ----

  /** GET /niuma/config：当前配置 + 默认值 + 节假日数据出处（面板首次加载用） */
  const handleConfig = async (request, response) => {
    if (request?.method !== 'GET') {
      methodNotAllowed(response, 'GET');
      return;
    }
    sendJson(response, 200, {
      ok: true,
      data: {
        config: currentConfig(),
        defaults: DEFAULTS,
        holidaySource: HOLIDAY_SOURCE,
      },
    });
  };

  /** POST /niuma/settings：部分配置 → validateConfig 校验 → 持久化 */
  const handleSettings = async (request, response) => {
    if (request?.method !== 'POST') {
      methodNotAllowed(response, 'POST');
      return;
    }
    let raw;
    try {
      raw = await readBody(request);
    } catch (error) {
      const message = error instanceof BodyTooLargeError
        ? error.message
        : `读取请求体失败：${error?.message ?? error}`;
      logger?.warn?.(`niuma: settings body rejected: ${message}`);
      sendJson(response, 400, { ok: false, error: message });
      return;
    }

    let body;
    try {
      body = raw.trim() === '' ? {} : JSON.parse(raw);
    } catch {
      sendJson(response, 400, { ok: false, error: '请求体不是合法 JSON' });
      return;
    }
    if (body === null || typeof body !== 'object' || Array.isArray(body)) {
      sendJson(response, 400, { ok: false, error: '请求体必须是 JSON 对象' });
      return;
    }

    // 未知字段由 normalizeConfig 忽略；校验失败（含写接口专用 validateConfig）一律 400
    let next;
    try {
      next = validateConfig({ ...currentConfig(), ...body });
    } catch (error) {
      logger?.warn?.(`niuma: settings rejected: ${error?.message ?? error}`);
      sendJson(response, 400, { ok: false, error: String(error?.message ?? error) });
      return;
    }

    let persisted = false;
    try {
      persisted = await persistConfig(next);
    } catch (error) {
      logger?.warn?.(`niuma: settings persist failed: ${error?.stack ?? error}`);
      sendJson(response, 400, { ok: false, error: `写入设置失败：${error?.message ?? error}` });
      return;
    }
    if (!persisted) {
      sendJson(response, 400, { ok: false, error: '当前环境不支持写入设置（settings 服务不可用）' });
      return;
    }
    sendJson(response, 200, { ok: true, data: { config: next } });
  };

  /** GET /niuma/health：宿主半侧自检 */
  const handleHealth = async (request, response) => {
    if (request?.method !== 'GET') {
      methodNotAllowed(response, 'GET');
      return;
    }
    sendJson(response, 200, {
      ok: true,
      data: {
        name,
        version: PKG.version ?? '0.0.0',
        aliveAt: mountedAt,
      },
    });
  };

  // ---- 「先做后清」：注册与清理都在同一个 effect 上，注册中途失败也不会泄漏 ----
  const mountRoutes = () => {
    const disposers = [];
    const register = (path, handler) => {
      const dispose = ctx.webServer.register({ kind: 'exact', path, handler: guarded(handler) });
      if (typeof dispose === 'function') disposers.push(dispose);
    };
    try {
      register(`${ROUTE_BASE}/config`, handleConfig);
      register(`${ROUTE_BASE}/settings`, handleSettings);
      register(`${ROUTE_BASE}/health`, handleHealth);
      logger?.info?.(`niuma: routes mounted at ${ROUTE_BASE} (v${PKG.version ?? '?'})`);
    } catch (error) {
      logger?.warn?.(`niuma: route registration failed: ${error?.stack ?? error}`);
    }
    return () => {
      for (const dispose of disposers) {
        try {
          dispose?.();
        } catch (error) {
          logger?.warn?.(`niuma: route dispose failed: ${error?.message ?? error}`);
        }
      }
    };
  };

  try {
    if (typeof ctx.effect === 'function') {
      ctx.effect(mountRoutes, 'niuma: http routes');
    } else {
      // 没有 effect（异常组合）：至少把路由挂上，牺牲可卸载性换取可用性
      mountRoutes();
    }
  } catch (error) {
    logger?.warn?.(`niuma: routes effect failed: ${error?.stack ?? error}`);
  }
}
