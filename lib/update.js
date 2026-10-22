/**
 * 版本检查 / 自动更新（宿主半侧，纯 Node，无第三方依赖）。
 *
 * 机制：
 *   1. `GET /niuma/update`：查 npm registry 上 `dsh-niuma` 的 latest，和本地版本比较（带缓存）。
 *   2. `POST /niuma/update`：发现新版本时下载 tarball 解包到 `$DSH_HOME/niuma/updates/<version>/`。
 *   3. **下次启动** apply() 时把暂存目录覆盖到插件目录（原子到文件级），新版本生效。
 *   4. 开发用 git checkout（存在 .git）不自动更新，避免覆盖工作区；`NIUMA_UPDATE_DISABLED=1` 可整体关闭。
 *
 * 为什么用「下载暂存 + 重启生效」而不是在线替换：宿主 lib 已被 Node 加载、文件被占用；
 * 下次启动前替换最安全，也避免升级到一半导致插件加载失败。
 */
import { gunzipSync } from 'node:zlib';
import {
  cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync,
} from 'node:fs';
import { dirname, isAbsolute, join, normalize } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

export const DEFAULT_REGISTRY = 'https://registry.npmjs.org';
export const PACKAGE_NAME = 'dsh-niuma';

/** 解析版本号；返回 [major, minor, patch, prerelease] 或 null。 */
export function parseVersion(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/.exec(String(version || '').trim());
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3]), match[4] || ''];
}

/** semver 比较：a>b → 1，a<b → -1，相等 → 0。 */
export function compareVersions(a, b) {
  const left = parseVersion(a);
  const right = parseVersion(b);
  if (!left || !right) return 0;
  for (let i = 0; i < 3; i += 1) {
    if (left[i] !== right[i]) return left[i] > right[i] ? 1 : -1;
  }
  if (left[3] === right[3]) return 0;
  if (left[3] === '') return 1;
  if (right[3] === '') return -1;
  return left[3] > right[3] ? 1 : -1;
}

/** 更新相关路径（测试可用 DSH_HOME 指到临时目录）。 */
export function resolveUpdatePaths(env = process.env) {
  const home = typeof env?.DSH_HOME === 'string' && env.DSH_HOME.trim()
    ? env.DSH_HOME.trim()
    : join(homedir(), '.dsh');
  const root = join(home, 'niuma');
  return {
    root,
    staging: join(root, 'updates'),
    stateFile: join(root, 'update-state.json'),
  };
}

/** 读插件自身的 package.json（插件目录 = 本文件所在目录的上一级）。 */
export function readPluginMeta(pluginDir) {
  try {
    const pkg = JSON.parse(readFileSync(join(pluginDir, 'package.json'), 'utf8'));
    return { name: String(pkg.name || ''), version: String(pkg.version || '0.0.0') };
  } catch {
    return { name: PACKAGE_NAME, version: '0.0.0' };
  }
}

/** 开发 git checkout（有 .git）不自动更新，避免覆盖未提交改动。 */
export function isDevCheckout(pluginDir) {
  try {
    return existsSync(join(pluginDir, '.git'));
  } catch {
    return false;
  }
}

function readJsonSafe(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function writeJsonSafe(file, value) {
  try {
    mkdirSync(dirname(file), { recursive: true, mode: 0o700 });
    writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  } catch {
    /* 状态写失败不影响功能 */
  }
}

export function readUpdateState(paths) {
  return readJsonSafe(paths.stateFile) || null;
}

export function writeUpdateState(paths, state) {
  writeJsonSafe(paths.stateFile, state);
}

/** 安全的 tar 解包（npm tarball = gzip + ustar，条目都在 package/ 下）。 */
export function extractTarballToDir(tarball, destDir) {
  const tar = gunzipSync(tarball);
  let offset = 0;
  let pendingPath = null;
  let fileCount = 0;
  while (offset + 512 <= tar.length) {
    const header = tar.subarray(offset, offset + 512);
    const nameField = header.subarray(0, 100).toString('utf8').replace(/\0.*$/, '');
    const sizeField = header.subarray(124, 136).toString('utf8').replace(/\0.*$/, '').trim();
    const type = header.subarray(156, 157).toString('utf8') || '0';
    const prefix = header.subarray(345, 500).toString('utf8').replace(/\0.*$/, '');
    if (!nameField) break;
    const size = parseInt(sizeField, 8) || 0;
    const dataStart = offset + 512;
    const dataEnd = dataStart + size;
    if (dataEnd > tar.length) throw new Error(`tarball 截断：${nameField}`);
    let name = nameField;
    if (pendingPath) {
      name = pendingPath;
      pendingPath = null;
    } else if (prefix) {
      name = `${prefix}/${nameField}`;
    }
    if (type === 'L' || type === 'x' || type === 'g') {
      // pax / long name：只处理长文件名，其余跳过
      if (type === 'L') pendingPath = tar.subarray(dataStart, dataEnd).toString('utf8').replace(/\0.*$/, '');
      offset = dataEnd + ((512 - (size % 512)) % 512);
      continue;
    }
    if (type === '0' || type === '\0' || type === '') {
      const rel = normalize(name).replace(/^package\//, '').replace(/^package$/, '');
      if (rel && !isAbsolute(rel) && !rel.startsWith('..')) {
        const target = join(destDir, rel);
        mkdirSync(dirname(target), { recursive: true });
        writeFileSync(target, tar.subarray(dataStart, dataEnd));
        fileCount += 1;
      }
    }
    offset = dataEnd + ((512 - (size % 512)) % 512);
  }
  return fileCount;
}

async function fetchWithTimeout(fetchImpl, url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, {
      signal: controller.signal,
      headers: { accept: 'application/json, application/octet-stream', 'user-agent': `${PACKAGE_NAME}-updater` },
    });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 检查 npm 上的最新版本；有新版则下载并解包到暂存目录。
 * @returns {Promise<{currentVersion:string, latestVersion:string, hasUpdate:boolean, staged:boolean, stagedDir?:string, reason?:string, error?:string}>}
 */
export async function checkAndStageUpdate(options) {
  const {
    pluginDir,
    currentVersion = readPluginMeta(pluginDir).version,
    registry = DEFAULT_REGISTRY,
    env = process.env,
    fetchImpl = globalThis.fetch,
    timeoutMs = 8000,
    paths = resolveUpdatePaths(env),
  } = options;
  const base = { currentVersion, latestVersion: currentVersion, hasUpdate: false, staged: false };
  if (isDevCheckout(pluginDir)) return { ...base, reason: 'dev-checkout' };
  if (env?.NIUMA_UPDATE_DISABLED === '1') return { ...base, reason: 'disabled' };
  if (typeof fetchImpl !== 'function') return { ...base, reason: 'fetch-unavailable', error: 'fetch unavailable' };
  try {
    const latestRes = await fetchWithTimeout(fetchImpl, `${registry.replace(/\/$/, '')}/${PACKAGE_NAME}/latest`, timeoutMs);
    if (!latestRes || !latestRes.ok) throw new Error(`registry HTTP ${latestRes ? latestRes.status : 'no-response'}`);
    const latest = await latestRes.json();
    const latestVersion = String(latest?.version || '');
    if (!parseVersion(latestVersion)) throw new Error(`非法版本号：${latestVersion}`);
    if (compareVersions(latestVersion, currentVersion) <= 0) {
      writeUpdateState(paths, { latestVersion, currentVersion, checkedAt: new Date().toISOString(), hasUpdate: false });
      return { ...base, latestVersion, reason: 'up-to-date' };
    }
    const tarballUrl = String(latest?.dist?.tarball || `${registry.replace(/\/$/, '')}/${PACKAGE_NAME}/-/${PACKAGE_NAME}-${latestVersion}.tgz`);
    const tarballRes = await fetchWithTimeout(fetchImpl, tarballUrl, timeoutMs);
    if (!tarballRes || !tarballRes.ok) throw new Error(`tarball HTTP ${tarballRes ? tarballRes.status : 'no-response'}`);
    const buffer = Buffer.from(await tarballRes.arrayBuffer());
    const stagedDir = join(paths.staging, latestVersion);
    rmSync(stagedDir, { recursive: true, force: true });
    mkdirSync(stagedDir, { recursive: true });
    const fileCount = extractTarballToDir(buffer, stagedDir);
    const stagedMeta = readPluginMeta(stagedDir);
    if (stagedMeta.version !== latestVersion) throw new Error(`暂存版本不符：${stagedMeta.version} != ${latestVersion}`);
    const state = {
      currentVersion, latestVersion, hasUpdate: true, staged: true,
      stagedDir, stagedAt: new Date().toISOString(), checkedAt: new Date().toISOString(), fileCount,
    };
    writeUpdateState(paths, state);
    return state;
  } catch (error) {
    const message = String(error?.message || error);
    writeUpdateState(paths, { currentVersion, latestVersion: currentVersion, checkedAt: new Date().toISOString(), hasUpdate: false, error: message });
    return { ...base, error: message };
  }
}

/**
 * 启动时应用已暂存的更新（把 updates/<version>/ 覆盖到插件目录）。
 * @returns {{appliedVersion:string}|null}
 */
export function applyStagedUpdate(pluginDir, paths = resolveUpdatePaths(process.env)) {
  const state = readUpdateState(paths);
  if (!state || !state.latestVersion || !state.staged) return null;
  const stagedDir = join(paths.staging, state.latestVersion);
  if (!existsSync(stagedDir)) return null;
  const current = readPluginMeta(pluginDir).version;
  if (compareVersions(state.latestVersion, current) <= 0) {
    rmSync(join(paths.staging, state.latestVersion), { recursive: true, force: true });
    writeUpdateState(paths, { ...state, staged: false, appliedVersion: current, appliedAt: new Date().toISOString() });
    return null;
  }
  try {
    cpSync(stagedDir, pluginDir, {
      recursive: true,
      force: true,
      filter: (source) => {
        const name = source.split(/[\\/]/).pop();
        return name !== '.git' && name !== 'node_modules';
      },
    });
    rmSync(join(paths.staging, state.latestVersion), { recursive: true, force: true });
    writeUpdateState(paths, {
      ...state, staged: false, appliedVersion: state.latestVersion, appliedAt: new Date().toISOString(),
    });
    return { appliedVersion: state.latestVersion };
  } catch {
    return null;
  }
}

/** 插件的真实目录（lib/ 的上一级）。 */
export function pluginDirFromModule(moduleUrl) {
  return dirname(dirname(fileURLToPath(moduleUrl)));
}
