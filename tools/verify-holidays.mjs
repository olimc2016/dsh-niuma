/**
 * 节假日数据完整性回归：数据错了会让所有工资口径一起错。
 *
 * 运行：node tools/verify-holidays.mjs（退出码 0 = 全绿）
 * 期望值独立写在下方（不从被测文件反推），并断言分区计数与工作日语义。
 */
import {
  DEFAULT_HOLIDAYS, DEFAULT_EXTRA_WORKDAYS, HOLIDAY_SOURCE,
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

const holidays = [...DEFAULT_HOLIDAYS];
const extra = [...DEFAULT_EXTRA_WORKDAYS];

ok('放假日共 33 天', holidays.length === 33, `实际 ${holidays.length}`);
ok('调休上班日共 6 天', extra.length === 6, `实际 ${extra.length}`);
ok('放假日与官方通知逐条一致', JSON.stringify(holidays) === JSON.stringify(EXPECTED_HOLIDAYS));
ok('调休上班日与官方通知逐条一致', JSON.stringify(extra) === JSON.stringify(EXPECTED_EXTRA));

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
