/**
 * 版本号 / 自动更新机制单测（tools/verify-update.mjs）。
 *
 * 覆盖：semver 解析比较、更新路径、tarball 解包、暂存→应用、dev/disabled 守卫、失败降级。
 * 不连真实 npm registry：fetch 全部用桩；tar 用测试内生成的合法 ustar 包。
 */
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import {
  applyStagedUpdate, checkAndStageUpdate, compareVersions, extractTarballToDir,
  isDevCheckout, parseVersion, readPluginMeta, readUpdateState, resolveUpdatePaths, writeUpdateState,
} from '../lib/update.js';

let passed = 0;
let failed = 0;
const failures = [];
function check(label, condition, detail = '') {
  if (condition) { passed += 1; console.log(`  PASS ${label}${detail ? `（${detail}）` : ''}`); }
  else { failed += 1; failures.push(label); console.log(`  FAIL ${label}${detail ? `（${detail}）` : ''}`); }
}
function section(title) { console.log(`\n== ${title} ==`); }

/* ---------------- 1. semver ---------------- */
section('1. 版本号解析 / 比较');
check('parseVersion 正常', JSON.stringify(parseVersion('1.2.3')) === JSON.stringify([1, 2, 3, '']));
check('parseVersion 预发布', parseVersion('1.2.3-beta.2')?.[3] === 'beta.2');
check('parseVersion 非法返回 null', parseVersion('v1.2') === null && parseVersion('') === null);
check('0.2.2 < 0.2.3', compareVersions('0.2.2', '0.2.3') === -1);
check('0.2.3 > 0.2.2', compareVersions('0.2.3', '0.2.2') === 1);
check('相等返回 0', compareVersions('0.2.2', '0.2.2') === 0);
check('0.10.0 > 0.9.9（数字比较不是字符串）', compareVersions('0.10.0', '0.9.9') === 1);
check('1.0.0 > 1.0.0-beta', compareVersions('1.0.0', '1.0.0-beta') === 1);
check('非法版本不抛错', compareVersions('abc', '0.0.1') === 0);

/* ---------------- 2. 路径 ---------------- */
section('2. 更新路径');
const fakeHome = mkdtempSync(join(tmpdir(), 'niuma-upd-home-'));
const paths = resolveUpdatePaths({ DSH_HOME: fakeHome });
check('staging 在 $DSH_HOME/niuma/updates', paths.staging === join(fakeHome, 'niuma', 'updates'), paths.staging);
check('state 在 $DSH_HOME/niuma/update-state.json', paths.stateFile === join(fakeHome, 'niuma', 'update-state.json'));

/* ---------------- 3. tarball 解包 ---------------- */
section('3. tarball 解包（自写 ustar 解析）');
function tarEntry(name, content) {
  const data = Buffer.from(content);
  const header = Buffer.alloc(512, 0);
  header.write(name, 0, 100, 'utf8');
  header.write('0000644\0', 100, 8, 'utf8');
  header.write('0000000\0', 108, 8, 'utf8');
  header.write('0000000\0', 116, 8, 'utf8');
  header.write(`${data.length.toString(8).padStart(11, '0')}\0`, 124, 12, 'utf8');
  header.write('00000000000\0', 136, 12, 'utf8');
  header.write('        ', 148, 8, 'utf8');
  header.write('0', 156, 1, 'utf8');
  header.write('ustar\0', 257, 6, 'utf8');
  header.write('00', 263, 2, 'utf8');
  let sum = 0;
  for (const byte of header) sum += byte;
  header.write(`${sum.toString(8).padStart(6, '0')}\0 `, 148, 8, 'utf8');
  const padded = Buffer.alloc(Math.ceil(data.length / 512) * 512, 0);
  data.copy(padded);
  return Buffer.concat([header, padded]);
}
function buildTar(files) {
  const chunks = [];
  for (const [name, content] of Object.entries(files)) chunks.push(tarEntry(name, content));
  chunks.push(Buffer.alloc(1024, 0));
  return gzipSync(Buffer.concat(chunks));
}
const extractDir = mkdtempSync(join(tmpdir(), 'niuma-upd-extract-'));
const tarball = buildTar({
  'package/package.json': JSON.stringify({ name: 'dsh-niuma', version: '0.9.9' }),
  'package/lib/index.js': 'export const name = "niuma";\n',
  'package/docs/readme.txt': 'hello',
});
const fileCount = extractTarballToDir(tarball, extractDir);
check('解包出 3 个文件', fileCount === 3, String(fileCount));
check('package.json 已落盘', existsSync(join(extractDir, 'package.json')));
check('嵌套目录文件已落盘', readFileSync(join(extractDir, 'docs', 'readme.txt'), 'utf8') === 'hello');
check('package/ 前缀被剥离', !existsSync(join(extractDir, 'package', 'package.json')));

/* ---------------- 4. 暂存 → 应用 ---------------- */
section('4. 暂存 → 启动时应用');
const pluginDir = mkdtempSync(join(tmpdir(), 'niuma-upd-plugin-'));
mkdirSync(join(pluginDir, 'lib'), { recursive: true });
writeFileSync(join(pluginDir, 'package.json'), JSON.stringify({ name: 'dsh-niuma', version: '0.2.2' }));
writeFileSync(join(pluginDir, 'lib', 'index.js'), 'old');
const stagedDir = join(paths.staging, '0.9.9');
mkdirSync(stagedDir, { recursive: true });
writeFileSync(join(stagedDir, 'package.json'), JSON.stringify({ name: 'dsh-niuma', version: '0.9.9' }));
mkdirSync(join(stagedDir, 'lib'), { recursive: true });
writeFileSync(join(stagedDir, 'lib', 'index.js'), 'new');
writeUpdateState(paths, { currentVersion: '0.2.2', latestVersion: '0.9.9', hasUpdate: true, staged: true });
check('applyStagedUpdate 返回新版本', applyStagedUpdate(pluginDir, paths)?.appliedVersion === '0.9.9');
check('插件 package.json 已升级', readPluginMeta(pluginDir).version === '0.9.9');
check('lib/index.js 已替换', readFileSync(join(pluginDir, 'lib', 'index.js'), 'utf8') === 'new');
check('暂存目录已清理', !existsSync(stagedDir));
check('状态记录 appliedVersion', readUpdateState(paths)?.appliedVersion === '0.9.9');
check('无暂存时 applyStagedUpdate 返回 null', applyStagedUpdate(pluginDir, paths) === null);

/* ---------------- 5. 检查/下载（fetch 桩） ---------------- */
section('5. checkAndStageUpdate（fetch 桩）');
const updPlugin = mkdtempSync(join(tmpdir(), 'niuma-upd-plugin2-'));
writeFileSync(join(updPlugin, 'package.json'), JSON.stringify({ name: 'dsh-niuma', version: '0.2.2' }));
const updPaths = resolveUpdatePaths({ DSH_HOME: mkdtempSync(join(tmpdir(), 'niuma-upd-home2-')) });
function makeFetch({ latestVersion = '0.9.9', tarball } = {}) {
  return async (url) => {
    if (String(url).endsWith('/dsh-niuma/latest')) {
      return { ok: true, status: 200, async json() { return { version: latestVersion, dist: { tarball: 'https://example.test/dsh-niuma-0.9.9.tgz' } }; } };
    }
    if (String(url).includes('.tgz')) {
      return { ok: true, status: 200, async arrayBuffer() { return tarball.buffer.slice(tarball.byteOffset, tarball.byteOffset + tarball.byteLength); } };
    }
    return { ok: false, status: 404 };
  };
}
const stageResult = await checkAndStageUpdate({ pluginDir: updPlugin, currentVersion: '0.2.2', paths: updPaths, fetchImpl: makeFetch({ tarball }) });
check('发现新版并暂存', stageResult.staged === true && stageResult.latestVersion === '0.9.9', JSON.stringify(stageResult));
check('暂存目录有新版 package.json', existsSync(join(updPaths.staging, '0.9.9', 'package.json')));
const upToDate = await checkAndStageUpdate({ pluginDir: updPlugin, currentVersion: '0.9.9', paths: updPaths, fetchImpl: makeFetch({ tarball, latestVersion: '0.9.9' }) });
check('已是最新时不重复下载', upToDate.staged === false && upToDate.reason === 'up-to-date');
const failing = await checkAndStageUpdate({ pluginDir: updPlugin, currentVersion: '0.2.2', paths: updPaths, fetchImpl: async () => { throw new Error('offline'); } });
check('网络失败不抛错、返回 error', typeof failing.error === 'string' && failing.staged === false, failing.error);
const devPlugin = mkdtempSync(join(tmpdir(), 'niuma-upd-dev-'));
writeFileSync(join(devPlugin, 'package.json'), JSON.stringify({ name: 'dsh-niuma', version: '0.2.2' }));
mkdirSync(join(devPlugin, '.git'));
check('dev checkout 跳过更新', (await checkAndStageUpdate({ pluginDir: devPlugin, paths: updPaths, fetchImpl: makeFetch({ tarball }) })).reason === 'dev-checkout');
check('NIUMA_UPDATE_DISABLED=1 跳过更新', (await checkAndStageUpdate({ pluginDir: updPlugin, currentVersion: '0.2.2', paths: updPaths, env: { NIUMA_UPDATE_DISABLED: '1' }, fetchImpl: makeFetch({ tarball }) })).reason === 'disabled');

/* ---------------- 6. 清理 ---------------- */
for (const dir of [fakeHome, extractDir, pluginDir, updPlugin, devPlugin, updPaths.root]) {
  try { rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ }
}

console.log(`\n----------------------------------------------------`);
console.log(`断言：PASS ${passed} / FAIL ${failed}（共 ${passed + failed}）`);
if (failed > 0) { console.log('UPDATE TESTS FAILED'); process.exit(1); }
console.log('UPDATE TESTS OK');
