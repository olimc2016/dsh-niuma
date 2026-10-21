/**
 * 客户端 bundle 烟测（不启动 DSH、不需要浏览器）：
 *   1) 用桩 window.__ModuleLoader__ 执行 lib/client.js，确认它是合法的惰性 CJS factory；
 *   2) 桩 require('react')，实例化模块，确认 inject / apply 导出符合 SPEC §6；
 *   3) 桩 ctx.slots / ctx.locale / ctx.effect，跑 apply()，确认注册了 sidebar.panellist + main
 *      两个同名 slot（id/key 都是 niuma）、locale 命名空间 niuma、以及 zh/en 双语字典；
 *   4) 用字典扫描 lib/client.js 里所有 t('key') 字面量，确认中英字典都覆盖（不白屏）。
 *
 * 退出码：0 = 全绿；1 = 任一断言失败。
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const bundlePath = join(root, 'lib', 'client.js');
const code = readFileSync(bundlePath, 'utf8');

const failures = [];
const check = (label, ok, detail) => {
  console.log(`assert ${label} -> ${ok ? 'PASS' : 'FAIL'}${detail === undefined ? '' : ` (${detail})`}`);
  if (!ok) failures.push(label);
};

/* ------------------------------ 1. 加载 bundle ------------------------------ */
let captured = null;
globalThis.window = {
  __ModuleLoader__: {
    load(entry) { captured = entry; },
  },
};

// eslint-disable-next-line no-new-func
new Function(code)();

check('bundle 调用 window.__ModuleLoader__.load', Boolean(captured));
if (!captured) {
  console.error('FAIL: lib/client.js 没有注册到 __ModuleLoader__');
  process.exit(1);
}
check('bundle id === package name', captured.id === pkg.name, `${captured.id} vs ${pkg.name}`);
check('factory 是函数', typeof captured.factory === 'function');

// 用 function 做桩模块：DSH 外壳 `require` 只解析基座模块，react 是其中之一
const internals = new Map();
function createElement(type, props, ...children) {
  return {
    type,
    props: props || {},
    children: children.flat(Infinity).filter((c) => c !== null && c !== undefined && c !== false && c !== true),
  };
}
const stubReact = {
  createElement,
  useState: (init) => [typeof init === 'function' ? init() : init, () => {}],
  useEffect: () => {},
  useLayoutEffect: () => {},
  useRef: (value) => ({ current: value }),
  useMemo: (fn) => fn(),
  useCallback: (fn) => fn,
  Fragment: 'fragment',
};
const requireStub = (name) => {
  if (name === 'react') return stubReact;
  throw new Error(`unexpected require: ${name}`);
};

const mod = captured.factory(requireStub);
check('导出 inject', Array.isArray(mod.inject), JSON.stringify(mod.inject));
check("inject === ['slots','locale']", Array.isArray(mod.inject)
  && mod.inject.length === 2 && mod.inject[0] === 'slots' && mod.inject[1] === 'locale');
check('导出 apply 函数', typeof mod.apply === 'function');

/* ------------------------------ 2. 跑 apply ------------------------------ */
const registrations = [];
const effects = [];
const locales = [];
const ctx = {
  slots: {
    inject(key, cb) { registrations.push({ kind: 'inject', key }); cb(); return () => {}; },
    register(spec, component) {
      registrations.push({ kind: 'register', spec, component });
      return () => {};
    },
  },
  locale: {
    register(ns, dict) {
      locales.push({ ns, dict });
      return () => {};
    },
  },
  effect(cb, label) {
    const dispose = cb();
    effects.push({ label, dispose });
    return { dispose() {} };
  },
};

try {
  mod.apply(ctx);
} catch (error) {
  console.error(`FAIL: apply() 抛错 -> ${error?.message ?? error}`);
  process.exit(1);
}

const injected = registrations.filter((r) => r.kind === 'inject').map((r) => r.key);
check("slots.inject 了 'sidebar.panellist'", injected.includes('sidebar.panellist'), injected.join(', '));
check("slots.inject 了 'main'", injected.includes('main'), injected.join(', '));

const effectsOk = effects.length >= 1 && effects.some((e) => e.label === 'niuma: dictionaries');
check("ctx.effect 注册 'niuma: dictionaries'", effectsOk, effects.map((e) => e.label).join(', '));

const locale = locales.find((l) => l.ns === 'niuma');
check("locale.register('niuma', { zh, en })", Boolean(locale), locale ? Object.keys(locale.dict).join(',') : 'none');
check('zh / en 字典都存在且非空', Boolean(locale && locale.dict.zh && locale.dict.en
  && Object.keys(locale.dict.zh).length > 0 && Object.keys(locale.dict.en).length > 0),
locale ? `zh=${Object.keys(locale.dict.zh || {}).length} en=${Object.keys(locale.dict.en || {}).length}` : '');

/* ------------------------------ 3. slot 契约 ------------------------------ */
const EXPECTED_ID = 'niuma';
const panel = registrations.find((r) => r.kind === 'register' && r.spec.name === 'sidebar.panellist');
const main = registrations.find((r) => r.kind === 'register' && r.spec.name === 'main');

check('注册了 sidebar.panellist', Boolean(panel));
check("sidebar id === 'niuma'", panel?.spec.id === EXPECTED_ID, panel?.spec.id);
check('sidebar order === 120', panel?.spec.order === 120, panel?.spec.order);
check("sidebar locale === 'niuma'", panel?.spec.locale === EXPECTED_ID, panel?.spec.locale);
check("sidebar label() === '牛马'", typeof panel?.spec.label === 'function' && panel.spec.label() === '牛马', panel?.spec.label?.());
check('sidebar 组件是函数', typeof panel?.component === 'function');
check('注册了 main 面板', Boolean(main));
check("main key === 'niuma'", main?.spec.key === EXPECTED_ID, main?.spec.key);
check("main locale === 'niuma'", main?.spec.locale === EXPECTED_ID, main?.spec.locale);
check('main 组件是函数', typeof main?.component === 'function');

// 侧栏图标能渲染成 svg 元素
try {
  const icon = panel?.component ? panel.component({ size: 16, active: false }) : null;
  check('图标组件渲染出 svg', Boolean(icon && icon.type === 'svg'), icon && icon.type);
} catch (error) {
  check('图标组件渲染出 svg', false, `抛错 ${error?.message ?? error}`);
}

/* ------------------------------ 4. 字典覆盖 ------------------------------ */
const zhKeys = new Set(Object.keys(locale?.dict.zh || {}));
const enKeys = new Set(Object.keys(locale?.dict.en || {}));
const sameKeys = zhKeys.size === enKeys.size && [...zhKeys].every((k) => enKeys.has(k));
check('zh / en 键集合一致', sameKeys,
  sameKeys ? `${zhKeys.size} keys` : `only-zh:${[...zhKeys].filter((k) => !enKeys.has(k)).join(',')} only-en:${[...enKeys].filter((k) => !zhKeys.has(k)).join(',')}`);

// 字面量 t('key')：直接从产物源码里抓，确保「代码里用到的 key」字典都有
const literalKeys = new Set();
// esbuild 会把源码里的单引号规范化成双引号，这里两种都认
for (const match of code.matchAll(/\bt\(['"]([A-Za-z0-9_]+)['"]\)/g)) literalKeys.add(match[1]);
// 动态 key（状态徽标 / 六宫格 / 设置字段）也要覆盖
const dynamicKeys = [
  'statusRest', 'statusBefore', 'statusWorking', 'statusLunch', 'statusOff',
  'secondWage', 'minuteWage', 'hourlyWage', 'dailyWage', 'weeklyWage', 'monthlyWage',
  'salaryField', 'workStartField', 'workEndField', 'lunchStartField', 'lunchEndField',
  'lunchEnabledField', 'lunchPaidField', 'holidaysField', 'extraWorkdaysField',
];
const requiredKeys = [...new Set([...literalKeys, ...dynamicKeys])];
const missingZh = requiredKeys.filter((k) => !zhKeys.has(k));
const missingEn = requiredKeys.filter((k) => !enKeys.has(k));
check(`字典覆盖代码里的 ${requiredKeys.length} 个文案 key`, missingZh.length === 0 && missingEn.length === 0,
  missingZh.length || missingEn.length ? `missing zh=[${missingZh}] en=[${missingEn}]` : `literal=${literalKeys.size}+dynamic=${dynamicKeys.length}`);

/* ------------------------------ 5. 面板首帧可渲染 ------------------------------ */
try {
  const t = (key) => (locale?.dict.zh?.[key] != null ? locale.dict.zh[key] : key);
  const tree = main.component({ t });
  const childCount = tree && Array.isArray(tree.children) ? tree.children.length : 0;
  // 根容器现在是「滚动壳(StyleTag+inner)」：真正的面板内容在 inner 里（>= 6 个子区块）
  const inner = Array.isArray(tree?.children)
    ? tree.children.find((node) => node && node.props && node.props.key === 'inner')
    : null;
  const innerCount = inner && Array.isArray(inner.children) ? inner.children.length : 0;
  check("面板首帧渲染出 div 根节点", Boolean(tree && tree.type === 'div'), tree && tree.type);
  check('根壳含 style + inner 两个子节点', childCount === 2, childCount);
  check('面板 inner 子节点数 >= 6', innerCount >= 6, innerCount);

  // 抓一次文本，确认首帧不是空白
  const texts = [];
  const walk = (node) => {
    if (node === null || node === undefined || node === false || node === true) return;
    if (typeof node === 'string' || typeof node === 'number') { texts.push(String(node)); return; }
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (typeof node !== 'object') return;
    if (typeof node.type === 'function') { walk(node.type({ ...node.props, t })); return; }
    walk(node.children || []);
  };
  walk(tree);
  const text = texts.join(' ');
  check('面板首帧含标题', text.includes('牛马加速器'), text.slice(0, 60));
  check('面板首帧含今日已赚', text.includes('今日已赚'));
} catch (error) {
  check('面板首帧渲染不抛错', false, `抛错 ${error?.message ?? error}`);
}

/* ------------------------------ 结果 ------------------------------ */
if (failures.length > 0) {
  console.error(`\nCLIENT SMOKE FAILED: ${failures.length} 项断言失败 -> ${failures.join(', ')}`);
  process.exit(1);
}
console.log('\nCLIENT SMOKE OK');
