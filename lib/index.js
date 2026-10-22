/**
 * 牛马加速器（dsh-niuma）—— 宿主半侧。
 *
 * 职责（详见 SPEC.md §5）：
 *   1. 设置：JSON 文件持久化（$DSH_HOME/niuma/config.json，可用 NIUMA_CONFIG_PATH 覆盖）。
 *      —— 不依赖 DSH 的 settings 服务：desktop 0.2.1-rc.2 里该服务缺席时写接口会永远 400。
 *   2. 路由：通过 ctx.webServer 暴露四条路由，供浏览器半侧 fetch：
 *        GET  /niuma/config    -> { ok, data: { config, defaults, holidaySource, version } }
 *        POST /niuma/settings  -> 校验并持久化配置（body 上限 64KB）
 *        GET  /niuma/health    -> { ok, data: { name, version, aliveAt } }
 *        GET/POST /niuma/update -> 版本检查 / 下载新版本到暂存区（下次启动生效）
 *   3. 鉴权：全部走 connection.requestRejection 守卫（与 DSH 内建路由同一套 Host/Origin 围栏）。
 *
 * 可靠性约束（0.x 插件血泪教训）：
 *   - 配置读写只用 node:fs；目录/文件权限 0700/0600，原子写（tmp + rename）。
 *     任何读失败都退回 cordis.patch.yml 的 config + core.DEFAULTS，绝不拖垮 DSH 启动。
 *   - apply() 内任何异常只写 warn 日志，绝不向上抛。
 *   - 路由注册统一挂在 ctx.effect 上并返回 dispose，卸载时干净摘除。
 *
 * 纯业务口径（工资公式、节假日判定）全在 src/core.mjs，宿主侧只做「存取配置」。
 */
import { chmodSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { DEFAULTS, normalizeConfig, validateConfig } from '../src/core.mjs';
import { HOLIDAY_SOURCE } from '../src/holidays.mjs';
import {
  applyStagedUpdate, checkAndStageUpdate, compareVersions, isDevCheckout,
  pluginDirFromModule, readPluginMeta, readUpdateState, resolveUpdatePaths,
} from './update.js';

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
 * 只声明 webServer（插件唯一必需出口）。配置持久化走自己的 JSON 文件，
 * 不依赖 DSH 的 settings 服务（desktop 0.2.1-rc.2 里该服务缺席 → 写接口会永远 400）。
 */
export const inject = ['webServer'];

const NAMESPACE = name;
const ROUTE_BASE = `/${NAMESPACE}`;
/** POST /niuma/settings 的请求体上限（64KB） */
const MAX_BODY_BYTES = 64 * 1024;

/**
 * 配置文件的解析路径（纯函数，导出供烟测/文档）：
 *   NIUMA_CONFIG_PATH → $DSH_HOME/niuma/config.json → ~/.dsh/niuma/config.json
 * 只写自己目录，绝不碰 profile 的 package.json / lockfile。
 * @param {object} [env]
 * @returns {string}
 */
export function resolveConfigPath(env = process.env) {
  const override = typeof env?.NIUMA_CONFIG_PATH === 'string' ? env.NIUMA_CONFIG_PATH.trim() : '';
  if (override) return override;
  const home = typeof env?.DSH_HOME === 'string' && env.DSH_HOME.trim() ? env.DSH_HOME.trim() : join(homedir(), '.dsh');
  return join(home, 'niuma', 'config.json');
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

  // ---- 自动更新：启动时先把上次暂存的新版本覆盖到插件目录（下次启动加载新代码） ----
  const pluginDir = pluginDirFromModule(import.meta.url);
  try {
    const applied = applyStagedUpdate(pluginDir);
    if (applied) logger?.info?.(`niuma: staged update applied -> v${applied.appliedVersion}（本次进程仍跑旧代码，重启后完全生效）`);
  } catch (error) {
    logger?.warn?.(`niuma: staged update apply failed: ${error?.message ?? error}`);
  }
  const runningVersion = readPluginMeta(pluginDir).version || PKG.version || '0.0.0';
  const updatePaths = resolveUpdatePaths(process.env);
  const updateDisabled = process.env.NIUMA_UPDATE_DISABLED === '1';
  const devCheckout = isDevCheckout(pluginDir);

  /** 版本/更新状态快照（面板与 /niuma/update 共用）。 */
  const updateInfo = () => {
    const state = readUpdateState(updatePaths) || {};
    const latest = state.latestVersion || runningVersion;
    return {
      currentVersion: runningVersion,
      latestVersion: latest,
      hasUpdate: compareVersions(latest, runningVersion) > 0,
      staged: state.staged === true,
      stagedVersion: state.staged === true ? latest : null,
      appliedVersion: state.appliedVersion || null,
      checkedAt: state.checkedAt || null,
      error: state.error || null,
      dev: devCheckout,
      disabled: updateDisabled,
      autoUpdate: baseConfig.autoUpdate !== false,
    };
  };

  /** 配置文件路径：NIUMA_CONFIG_PATH（测试/高级用户）→ $DSH_HOME/niuma/config.json → ~/.dsh/niuma/config.json。 */
  const configPath = resolveConfigPath(process.env);

  /** 读已持久化的配置；文件不存在/坏 JSON 都退回空对象（用默认值继续跑，绝不抛）。 */
  const readStoredConfig = () => {
    try {
      const raw = readFileSync(configPath, 'utf8');
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch (error) {
      if (error?.code !== 'ENOENT') logger?.warn?.(`niuma: settings read failed: ${error?.message ?? error}`);
      return {};
    }
  };

  /**
   * 当前生效配置 = core.DEFAULTS ← 组合配置 ← 已保存的用户配置（后者覆盖前者）。
   * 永远返回补全 + 规范化后的完整配置，视图侧不用再自己 merge。
   */
  const currentConfig = () => normalizeConfig({ ...DEFAULTS, ...baseConfig, ...readStoredConfig() }).config;

  /**
   * 把校验后的完整配置写到自己的 JSON 文件（原子写）。
   * 失败抛错（写接口返回 400），绝不静默吞掉。
   */
  const persistConfig = async (next) => {
    const dir = dirname(configPath);
    mkdirSync(dir, { recursive: true, mode: 0o700 });
    const tmp = `${configPath}.tmp-${process.pid}`;
    writeFileSync(tmp, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 });
    renameSync(tmp, configPath);
    try { chmodSync(configPath, 0o600); } catch { /* 权限收紧失败不影响内容 */ }
    return true;
  };

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
        version: runningVersion,
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

    try {
      await persistConfig(next);
    } catch (error) {
      logger?.warn?.(`niuma: settings persist failed: ${error?.stack ?? error}`);
      sendJson(response, 400, { ok: false, error: `写入设置失败：${error?.message ?? error}` });
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
        version: runningVersion,
        aliveAt: mountedAt,
      },
    });
  };

  /** GET/POST /niuma/update：查看版本状态；POST 主动检查并下载新版到暂存区。 */
  const handleUpdate = async (request, response) => {
    const method = request?.method;
    if (method !== 'GET' && method !== 'POST') {
      methodNotAllowed(response, 'GET, POST');
      return;
    }
    if (method === 'POST') {
      if (updateDisabled || devCheckout) {
        sendJson(response, 200, { ok: true, data: updateInfo() });
        return;
      }
      const result = await checkAndStageUpdate({
        pluginDir,
        currentVersion: runningVersion,
        env: process.env,
        paths: updatePaths,
      });
      if (result?.error) logger?.warn?.(`niuma: update check failed: ${result.error}`);
      else if (result?.staged) logger?.info?.(`niuma: v${result.latestVersion} downloaded (applies on next start)`);
    }
    sendJson(response, 200, { ok: true, data: updateInfo() });
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
      register(`${ROUTE_BASE}/update`, handleUpdate);
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

  // ---- 自动更新检查：启动后台查一次（git 工作区/显式关闭时跳过），只下载暂存、不覆盖运行中代码 ----
  if (!updateDisabled && !devCheckout && baseConfig.autoUpdate !== false) {
    const scheduleCheck = () => {
      const timer = setTimeout(() => {
        checkAndStageUpdate({
          pluginDir,
          currentVersion: runningVersion,
          env: process.env,
          paths: updatePaths,
        })
          .then((result) => {
            if (result?.error) logger?.warn?.(`niuma: auto update check failed: ${result.error}`);
            else if (result?.staged) logger?.info?.(`niuma: auto update v${result.latestVersion} staged (restart to apply)`);
          })
          .catch((error) => logger?.warn?.(`niuma: auto update crashed: ${error?.message ?? error}`));
      }, 8000);
      if (typeof timer.unref === 'function') timer.unref();
      return () => clearTimeout(timer);
    };
    try {
      if (typeof ctx.effect === 'function') ctx.effect(scheduleCheck, 'niuma: auto update check');
      else scheduleCheck();
    } catch (error) {
      logger?.warn?.(`niuma: auto update schedule failed: ${error?.message ?? error}`);
    }
  }

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
