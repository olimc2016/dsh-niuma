/**
 * 节假日数据完整性回归：数据错了会让所有工资口径一起错。
 *
 * 运行：node tools/verify-holidays.mjs（退出码 0 = 全绿）
 * 期望值独立写在下方（不从被测文件反推），并断言分区计数与工作日语义。
 */
import {
  DEFAULT_HOLIDAYS, DEFAULT_EXTRA_WORKDAYS, HOLIDAY_SOURCE,
  OFFICIAL_HOLIDAYS_2026, OFFICIAL_EXTRA_WORKDAYS_2026,
  ESTIMATED_HOLIDAYS_2027, ESTIMATED_EXTRA_WORKDAYS_2027,
  HOLIDAY_BLOCKS, HOLIDAY_BLOCKS_2027_ESTIMATED, HOLIDAY_ESTIMATE_2027,
} from '../src/holidays.mjs';
import { isWorkday } from '../src/core.mjs';

let passed = 0;
const failures = [];
function ok(name, condition, detail) {
  if (condition) { passed += 1; return; }
  failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
}

/** 2026 年国务院通知的放假日期（独立抄录，用于双向核对） */
const EXPECTED_HOLIDAYS = [
  '2026-01-01', '2026-01-02', '2026-01-03',
  '2026-02-15', '2026-02-16', '2026-02-17', '2026-02-18', '2026-02-19', '2026-02-20', '2026-02-21', '2026-02-22', '2026-02-23',
  '2026-04-04', '2026-04-05', '2026-04-06',
  '2026-05-01', '2026-05-02', '2026-05-03', '2026-05-04', '2026-05-05',
  '2026-06-19', '2026-06-20', '2026-06-21',
  '2026-09-25', '2026-09-26', '2026-09-27',
  '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05', '2026-10-06', '2026-10-07',
];
const EXPECTED_EXTRA = ['2026-01-04', '2026-02-14', '2026-02-28', '2026-05-09', '2026-09-20', '2026-10-10'];

const holidays = [...OFFICIAL_HOLIDAYS_2026];
const extra = [...OFFICIAL_EXTRA_WORKDAYS_2026];
const est2027 = [...ESTIMATED_HOLIDAYS_2027];
const est2027Extra = [...ESTIMATED_EXTRA_WORKDAYS_2027];

ok('2026 官方放假日共 33 天', holidays.length === 33, `实际 ${holidays.length}`);
ok('2026 官方调休上班日共 6 天', extra.length === 6, `实际 ${extra.length}`);
ok('2027 预估放假日共 29 天', est2027.length === 29, `实际 ${est2027.length}`);
ok('2027 预估调休上班日共 5 天', est2027Extra.length === 5, `实际 ${est2027Extra.length}`);
ok('默认配置 = 2026 官方 + 2027 预估（62 天）', DEFAULT_HOLIDAYS.length === 62, `实际 ${DEFAULT_HOLIDAYS.length}`);
ok('默认调休 = 2026 + 2027（11 天）', DEFAULT_EXTRA_WORKDAYS.length === 11, `实际 ${DEFAULT_EXTRA_WORKDAYS.length}`);
ok('默认列表按年份升序排列', DEFAULT_HOLIDAYS.every((key, i) => i === 0 || key > DEFAULT_HOLIDAYS[i - 1]));
ok('默认列表不重复', new Set(DEFAULT_HOLIDAYS).size === DEFAULT_HOLIDAYS.length);
ok('2026 放假日与官方通知逐条一致', JSON.stringify(holidays) === JSON.stringify(EXPECTED_HOLIDAYS));
ok('2026 调休上班日与官方通知逐条一致', JSON.stringify(extra) === JSON.stringify(EXPECTED_EXTRA));
ok('2027 预估值全部是 2027 年', est2027.every((key) => key.startsWith('2027-')));
ok('2027 预估放假日升序无重复', est2027.every((key, i) => i === 0 || key > est2027[i - 1]));
ok('2027 预估调休全部是周末', est2027Extra.every((key) => {
  const [y, m, d] = key.split('-').map(Number);
  const dow = new Date(y, m - 1, d).getDay();
  return dow === 0 || dow === 6;
}));
ok('2027 预估数据明确标注 estimated=true', HOLIDAY_ESTIMATE_2027.estimated === true);
ok('2027 预估数据注明官方未公布', HOLIDAY_ESTIMATE_2027.announced === false && /预估/.test(HOLIDAY_ESTIMATE_2027.title));
ok('2027 预估说明写明仅供参考', /仅供参考/.test(HOLIDAY_ESTIMATE_2027.note));
ok('2027 区块天数合计 29', HOLIDAY_BLOCKS_2027_ESTIMATED.reduce((sum, b) => sum + b.days, 0) === 29);
ok('2027 区块全部标记为预估', HOLIDAY_BLOCKS_2027_ESTIMATED.every((b) => b.estimated === true));
ok('2026 区块全部标记为非预估', HOLIDAY_BLOCKS.every((b) => b.estimated === false));

/* 格式 / 排序 / 去重 / 真实日期 */
const KEY_RE = /^\d{4}-\d{2}-\d{2}$/;
for (const [label, list] of [['放假日', holidays], ['调休上班日', extra]]) {
  ok(`${label}全部是合法格式`, list.every((k) => KEY_RE.test(k)));
  ok(`${label}全部是 2026 年`, list.every((k) => k.startsWith('2026-')));
  ok(`${label}严格升序无重复`, list.every((k, i) => i === 0 || k > list[i - 1]));
  ok(`${label}全部是真实日期`, list.every((k) => {
    const [y, m, d] = k.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
  }));
}

/* 节假日分区计数（对应七个节日） */
function inRange(key, from, to) { return key >= from && key <= to; }
const blocks = [
  ['元旦', '2026-01-01', '2026-01-03', 3],
  ['春节', '2026-02-15', '2026-02-23', 9],
  ['清明节', '2026-04-04', '2026-04-06', 3],
  ['劳动节', '2026-05-01', '2026-05-05', 5],
  ['端午节', '2026-06-19', '2026-06-21', 3],
  ['中秋节', '2026-09-25', '2026-09-27', 3],
  ['国庆节', '2026-10-01', '2026-10-07', 7],
];
for (const [name, from, to, days] of blocks) {
  const matched = holidays.filter((k) => inRange(k, from, to));
  ok(`${name}放假 ${days} 天`, matched.length === days, `实际 ${matched.length}`);
  ok(`${name}首日 ${from} 在列`, holidays.includes(from));
  ok(`${name}末日 ${to} 在列`, holidays.includes(to));
}

/* 调休上班日必须是周末，且不能同时是法定放假日 */
for (const key of extra) {
  const [y, m, d] = key.split('-').map(Number);
  const dow = new Date(y, m - 1, d).getDay();
  ok(`${key} 是周末（调休补班前提）`, dow === 0 || dow === 6, `周 ${dow}`);
  ok(`${key} 不在放假日列表中`, !holidays.includes(key));
}
ok('放假日与调休上班日无交集', holidays.every((k) => !extra.includes(k)));

/* 与 isWorkday 语义联动（含默认配置外的年度） */
const cfg = { holidays, extraWorkdays: extra };
ok('国庆 10-01 不是工作日', isWorkday('2026-10-01', cfg) === false);
ok('国庆 10-08 是工作日', isWorkday('2026-10-08', cfg) === true);
ok('10-10 调休是工作日', isWorkday('2026-10-10', cfg) === true);
ok('空节假日列表时周六仍休息', isWorkday('2026-10-24', { holidays: [], extraWorkdays: [] }) === false);
ok('空节假日列表时 10-01 变成工作日', isWorkday('2026-10-01', { holidays: [], extraWorkdays: [] }) === true);
const cfgAll = { holidays: DEFAULT_HOLIDAYS, extraWorkdays: DEFAULT_EXTRA_WORKDAYS };
ok('2027 春节（预估）不是工作日', isWorkday('2027-02-08', cfgAll) === false);
ok('2027 春节调休（预估）是工作日', isWorkday('2027-02-14', cfgAll) === true);
ok('2027 国庆（预估）不是工作日', isWorkday('2027-10-02', cfgAll) === false);

/* 出处元数据 */
ok('HOLIDAY_SOURCE.year = 2026', HOLIDAY_SOURCE.year === 2026);
ok('HOLIDAY_SOURCE 带官方链接', /^https:\/\/www\.gov\.cn\//.test(HOLIDAY_SOURCE.url));
ok('HOLIDAY_SOURCE 标题含 2026', HOLIDAY_SOURCE.title.includes('2026'));
ok('HOLIDAY_SOURCE 文号正确', HOLIDAY_SOURCE.title.includes('2025〕7号'));

if (failures.length > 0) {
  console.error(`FAIL ${failures.length} / ${passed + failures.length}`);
  for (const line of failures) console.error('  ✗', line);
  process.exit(1);
}
console.log(`verify-holidays: ${passed}/${passed} 通过`);
