/**
 * 渲染闸门：用「有数据」的状态把整棵 NiumaPanel 树渲染一遍（不落 DOM、不比像素）。
 *
 * 只桩 React（createElement / useState / useEffect / useMemo / ...），时间固定为
 * 2026-10-21T13:30（周三，SPEC §8 固定样例），配置来自桩数据 { monthlySalary: 22000 }，
 * 其余字段由 core.mjs 的 DEFAULTS 补齐 → 预期 18 个工作日、日工资 1,222.22、今日已赚 534.7222。
 *
 * 抓的是「只有真实渲染才炸」的异常（真实事故：六宫格 map 漏传 index 却仍用 index → 整面板白屏）。
 * 验收：故意去掉 RatesGrid 里 map 的 index 参数时，本脚本必须非零退出。
 *
 * 退出码：0 = 渲染成功且关键数字都在；1 = 抛错 / 关键数字缺失 / 覆盖不足。
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const bundlePath = join(here, '..', 'lib', 'client.js');
const code = readFileSync(bundlePath, 'utf8');

/* ------------------------------ 固定时间 ------------------------------ */
const REAL_DATE = Date;
const FIXED = new REAL_DATE(2026, 9, 21, 13, 30, 0); // 本地时区 2026-10-21 13:30
class FixedDate extends REAL_DATE {
  constructor(...args) {
    if (args.length === 0) super(FIXED.getTime());
    else super(...args);
  }
  static now() { return FIXED.getTime(); }
}
globalThis.Date = FixedDate;

/* ------------------------------ 桩数据 ------------------------------ */
const READY_DATA = {
  // 只给月薪，其余由 bundle 内 normalizeConfig + DEFAULTS 补齐（节假日 2026 数据随 bundle 一起）
  config: { monthlySalary: 22000 },
  defaults: { monthlySalary: 10000 },
  holidaySource: {
    year: 2026,
    title: '国务院办公厅关于2026年部分节假日安排的通知（国办发明电〔2025〕7号）',
    url: 'https://www.gov.cn/zhengce/content/202511/content_7047090.htm',
  },
};

/* ------------------------------ 桩 React ------------------------------ */
const createElement = (type, props, ...children) => ({
  type,
  props: props || {},
  children: children.flat(Infinity).filter((c) => c !== null && c !== undefined && c !== false && c !== true),
});
const React = {
  createElement,
  // 数据类状态（{status,data}）直接落成 ready；其余保持初值
  useState: (init) => {
    const value = typeof init === 'function' ? init() : init;
    if (value && typeof value === 'object' && 'status' in value && 'data' in value) {
      return [{
        ...value,
        status: 'ready',
        data: READY_DATA,
        error: null,
      }, () => {}];
    }
    return [value, () => {}];
  },
  // 不执行 effect：不真实出网、不启动 interval，只验证渲染期
  useEffect: () => {},
  useLayoutEffect: () => {},
  useRef: (value) => ({ current: value }),
  useMemo: (fn) => fn(),
  useCallback: (fn) => fn,
  Fragment: 'fragment',
};

/* ------------------------------ 加载 bundle ------------------------------ */
let entry = null;
globalThis.window = { __ModuleLoader__: { load: (e) => { entry = e; } } };
try {
  // eslint-disable-next-line no-new-func
  new Function(code)();
} catch (error) {
  console.error(`FAIL: lib/client.js 执行抛错 -> ${error?.message ?? error}`);
  process.exit(1);
}
if (!entry) {
  console.error('FAIL: bundle 没有注册模块');
  process.exit(1);
}

const mod = entry.factory((name) => {
  if (name === 'react') return React;
  throw new Error(`unexpected require: ${name}`);
});

/* ------------------------------ apply & 取字典 ------------------------------ */
let panel = null;
let dictionary = null;
mod.apply({
  slots: {
    inject: (key, cb) => cb(),
    register: (spec, component) => {
      if (spec.name === 'main') panel = component;
      return () => {};
    },
  },
  locale: {
    register: (ns, dict) => { dictionary = dict; return () => {}; },
  },
  effect: (cb) => { cb(); return () => {}; },
});
if (!panel) {
  console.error('FAIL: 没有注册 main 面板组件');
  process.exit(1);
}
const t = (key) => (dictionary?.zh?.[key] != null ? dictionary.zh[key] : key);

/* ------------------------------ 渲染整棵树 ------------------------------ */
const problems = [];
let visited = 0;
const texts = [];
const anchors = [];
const dataStats = [];

const walk = (node) => {
  if (node === null || node === undefined || node === false || node === true) return;
  if (typeof node === 'string' || typeof node === 'number') { texts.push(String(node)); return; }
  if (Array.isArray(node)) { node.forEach(walk); return; }
  if (typeof node !== 'object') return;
  visited += 1;
  const type = node.type;
  const props = node.props || {};

  if (type === 'a' && typeof props.href === 'string') anchors.push(props.href);
  if (typeof props['data-stat'] === 'string') dataStats.push(props['data-stat']);

  // 函数组件：用同一套桩 props 继续展开（t 由上层传入；没有就用字典 t）
  if (typeof type === 'function') {
    walk(type({ ...props, t: typeof props.t === 'function' ? props.t : t }));
    return;
  }
  walk(node.children || []);
};

try {
  walk(panel({ t }));
} catch (error) {
  console.error(`FAIL: 有数据状态渲染抛错 -> ${error?.message ?? error}`);
  console.error(String(error?.stack ?? '').split('\n').slice(1, 6).join('\n'));
  process.exit(1);
}

const text = texts.join(' ');
const expectText = (label, needle) => {
  const ok = text.includes(needle);
  console.log(`assert 渲染文本含 ${label} ("${needle}") -> ${ok ? 'PASS' : 'FAIL'}`);
  if (!ok) problems.push(`缺文本：${label} (${needle})`);
};

console.log(`遍历节点数: ${visited}，文本片段: ${texts.length} 个`);
expectText('状态徽标-搬砖中', '搬砖中');
expectText('标题', '牛马加速器');
expectText('今日已赚标签', '今日已赚');
// SPEC §8：22000/18 工作日、8h/天 → 13:30（扣除 1h 午休后 3.5h）已赚 534.7222
expectText('今日已赚 534.7222', '534.7222');
expectText('秒工资 0.0424', '0.0424');
expectText('分工资 2.5463', '2.5463');
expectText('时工资 152.78', '152.78');
expectText('日工资 1,222.22', '1,222.22');
expectText('周工资 6,111.11', '6,111.11');
expectText('月工资 22,000.00', '22,000.00');
expectText('当月工作日 18天', '18天');
expectText('日有效工时 8小时', '8小时');
expectText('今日进度 43.8%', '43.8%');
expectText('距下班 4小时 30分', '4小时 30分');
expectText('设置区', '实收月薪（元/月）');
expectText('保存按钮', '保存');
expectText('节假日数据来源文案', '国务院办公厅 2026 年节假日安排');

// 六宫格：6 张卡片都渲染了（data-stat 属性）
const statsOk = dataStats.length === 6 && new Set(dataStats).size === 6;
console.log(`六宫格卡片: ${dataStats.length} 张 [${dataStats.join(', ')}] -> ${statsOk ? 'PASS' : 'FAIL'}`);
if (!statsOk) problems.push(`六宫格数量异常：${dataStats.length}`);

// 节假日来源链接（HOLIDAY_SOURCE.url，来自宿主或 bundle 兜底）
const sourceOk = anchors.some((href) => href.includes('gov.cn'));
console.log(`节假日来源链接: [${anchors.join(', ')}] -> ${sourceOk ? 'PASS' : 'FAIL'}`);
if (!sourceOk) problems.push('缺节假日来源链接');

// 覆盖度闸门：真实面板树足够大，别让“提前 return 一个空 div”混过去
const MIN_NODES = 100;
console.log(`节点覆盖: ${visited} >= ${MIN_NODES} -> ${visited >= MIN_NODES ? 'PASS' : 'FAIL'}`);
if (visited < MIN_NODES) problems.push(`覆盖不足：${visited} < ${MIN_NODES}`);

if (problems.length > 0) {
  console.error(`\nRENDER GATE FAILED: ${problems.length} 项 -> ${problems.join('；')}`);
  process.exit(1);
}
console.log('\nRENDER GATE OK');
