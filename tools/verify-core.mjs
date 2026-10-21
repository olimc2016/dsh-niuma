/**
 * 纯逻辑回归：牛马加速器的工资口径。
 *
 * 运行：node tools/verify-core.mjs（退出码 0 = 全绿）
 * 口径来自 SPEC.md §1 / §8；这里只断言**用户可感知的事实**，不断言实现细节。
 */
import {
  DEFAULTS, parseHm, formatHm, dateKeyOf, parseDateKey, normalizeConfig, validateConfig,
  isWorkday, workdaysInMonth, workdaysInWeek, paidMinutesPerDay, computeRates,
  earnedToday, formatMoney, formatDuration, workdaysOfMonth, isStatutoryHoliday,
  monthSummary, yearSummary, holidayDaysInMonth,
} from '../src/core.mjs';

let passed = 0;
const failures = [];

function ok(name, condition, detail) {
  if (condition) { passed += 1; return; }
  failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
}
function eq(name, actual, expected, epsilon = 1e-9) {
  const same = typeof actual === 'number' && typeof expected === 'number'
    ? Math.abs(actual - expected) <= epsilon
    : actual === expected;
  ok(name, same, `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}
function cfgOf(patch = {}) {
  const { config, errors } = normalizeConfig(patch);
  if (errors.length) throw new Error('config errors: ' + errors.join('; '));
  return config;
}
/** 固定本地时间构造器：避免测试依赖“今天” */
function at(year, monthIndex, day, hour, minute, second = 0) {
  return new Date(year, monthIndex, day, hour, minute, second);
}

/* ---------------- 时间解析 ---------------- */
eq('parseHm 09:30', parseHm('09:30'), 570);
eq('parseHm 0:05', parseHm('0:05'), 5);
eq('parseHm 23:59', parseHm('23:59'), 1439);
eq('parseHm 24:00 非法', parseHm('24:00'), null);
eq('parseHm 09:60 非法', parseHm('09:60'), null);
eq('parseHm 乱码非法', parseHm('abc'), null);
eq('formatHm 570', formatHm(570), '09:30');
eq('formatHm 0', formatHm(0), '00:00');
eq('dateKeyOf 本地日期', dateKeyOf(at(2026, 9, 21, 23, 59)), '2026-10-21');
ok('parseDateKey 合法', parseDateKey('2026-10-21') !== null);
eq('parseDateKey 非法月', parseDateKey('2026-13-01'), null);
eq('parseDateKey 非法日', parseDateKey('2026-02-30'), null);

/* ---------------- 配置校验 ---------------- */
const defaults = cfgOf();
eq('默认月薪', defaults.monthlySalary, 10000);
eq('默认上班', defaults.workStart, '09:00');
eq('默认午休算工时 = false', defaults.lunchPaid, false);
eq('默认节假日 33 天', defaults.holidays.length, 33);
eq('默认调休上班 6 天', defaults.extraWorkdays.length, 6);
eq('非法月薪被记录', normalizeConfig({ monthlySalary: -1 }).errors.length > 0, true);
eq('下班早于上班被记录', normalizeConfig({ workStart: '18:00', workEnd: '09:00' }).errors.length > 0, true);
eq('午休超出班次被记录', normalizeConfig({ lunchStart: '08:00', lunchEnd: '12:00' }).errors.length > 0, true);
eq('日期格式非法被记录', normalizeConfig({ holidays: ['2026-1-1'] }).errors.length > 0, true);
eq('未知字段被忽略', 'foo' in normalizeConfig({ foo: 1 }).config, false);
eq('validateConfig 非法抛错', (() => { try { validateConfig({ workEnd: '08:00' }); return false; } catch { return true; } })(), true);
eq('日期列表去重升序', JSON.stringify(cfgOf({ holidays: ['2026-01-02', '2026-01-01', '2026-01-02'] }).holidays), JSON.stringify(['2026-01-01', '2026-01-02']));

/* ---------------- 工作日口径 ---------------- */
const cfg = cfgOf();
eq('普通周三工作日', isWorkday('2026-10-21', cfg), true);
eq('普通周六非工作日', isWorkday('2026-10-24', cfg), false);
eq('国庆 10-01 非工作日', isWorkday('2026-10-01', cfg), false);
eq('国庆 10-07 非工作日', isWorkday('2026-10-07', cfg), false);
eq('国庆 10-08 工作日', isWorkday('2026-10-08', cfg), true);
eq('调休 10-10 周六上班', isWorkday('2026-10-10', cfg), true);
eq('调休 09-20 周日上班', isWorkday('2026-09-20', cfg), true);
eq('调休 01-04 周日上班', isWorkday('2026-01-04', cfg), true);
eq('春节 02-17 非工作日', isWorkday('2026-02-17', cfg), false);
eq('isStatutoryHoliday 10-01', isStatutoryHoliday('2026-10-01', cfg), true);
eq('isStatutoryHoliday 10-24(周六) 为 false', isStatutoryHoliday('2026-10-24', cfg), false);

/* 2026 各月工作日数：中秋/国庆所在月份是重点 */
eq('2026-01 工作日 21 天', workdaysInMonth(2026, 0, cfg), 21);
eq('2026-02 工作日 16 天（春节 9 天 + 2 个调休）', workdaysInMonth(2026, 1, cfg), 16);
eq('2026-04 工作日 21 天（清明 3 天）', workdaysInMonth(2026, 3, cfg), 21);
eq('2026-05 工作日 19 天（劳动节 5 天 + 05-09 调休）', workdaysInMonth(2026, 4, cfg), 19);
eq('2026-06 工作日 21 天（端午 3 天）', workdaysInMonth(2026, 5, cfg), 21);
eq('2026-09 工作日 22 天（9 月 22 个工作日 - 中秋 1 个工作日 + 09-20 调休）', workdaysInMonth(2026, 8, cfg), 22);
eq('2026-10 工作日 18 天（国庆 7 天 + 10-10 调休）', workdaysInMonth(2026, 9, cfg), 18);
eq('2026-10 工作日日期数 = 18', workdaysOfMonth(2026, 9, cfg).length, 18);
eq('本周（2026-10-21 所在周）5 个工作日', workdaysInWeek('2026-10-21', cfg), 5);
eq('本周（2026-10-01 所在周）工作日 3 天（9/28~9/30 上班，10/1~10/4 放假/周末）', workdaysInWeek('2026-10-01', cfg), 3);

/* ---------------- 月度 / 全年口径（2026 实际排班） ---------------- */
/** 独立抄录的 2026 年实际工作日（按官方放假安排 + 调休上班日逐月核对） */
const EXPECTED_MONTH_WORKDAYS = [21, 16, 22, 21, 19, 21, 23, 21, 22, 18, 21, 23];
/** 独立抄录的 2026 年各月法定节假日天数（元旦 3 / 春节 9 / 清明 3 / 五一 5 / 端午 3 / 中秋 3 / 国庆 7） */
const EXPECTED_MONTH_HOLIDAYS = [3, 9, 0, 3, 5, 3, 0, 0, 3, 7, 0, 0];
/** 本区块统一用 22000 月薪（工资率区块的 cfg22 在后面才定义） */
const cfg22m = cfgOf({ monthlySalary: 22000 });
for (let month = 0; month < 12; month += 1) {
  eq(`2026-${String(month + 1).padStart(2, '0')} 工作日`, workdaysInMonth(2026, month, cfg), EXPECTED_MONTH_WORKDAYS[month]);
  eq(`2026-${String(month + 1).padStart(2, '0')} 法定假日`, holidayDaysInMonth(2026, month, cfg), EXPECTED_MONTH_HOLIDAYS[month]);
}
eq('2026 全年工作日合计 248 天', EXPECTED_MONTH_WORKDAYS.reduce((a, b) => a + b, 0), 248);
eq('2026 全年法定假日合计 33 天', EXPECTED_MONTH_HOLIDAYS.reduce((a, b) => a + b, 0), 33);

const oct = monthSummary(cfg22m, 2026, 9);
eq('10 月概览-工作日', oct.workdays, 18);
eq('10 月概览-法定假日', oct.holidayDays, 7);
eq('10 月概览-非工作日', oct.restDays, 13);
eq('10 月概览-日工资', oct.dailyWage, 22000 / 18);
eq('10 月概览-时工资', oct.hourlyWage, 22000 / 18 / 8);
const feb = monthSummary(cfg22m, 2026, 1);
eq('2 月概览-工作日 16', feb.workdays, 16);
eq('2 月概览-法定假日 9', feb.holidayDays, 9);
eq('2 月概览-日工资最高', feb.dailyWage, 22000 / 16);

const year = yearSummary(cfg22m, 2026);
eq('全年工作日 248 天', year.totalWorkdays, 248);
eq('全年法定假日 33 天', year.totalHolidayDays, 33);
eq('年收入 = 月薪 × 12', year.annualIncome, 264000);
eq('平均日薪 = 年收入 / 全年工作日', year.averageDailyWage, 264000 / 248);
eq('平均时薪 = 平均日薪 / 8h', year.averageHourlyWage, 264000 / 248 / 8);
eq('平均月薪 = 实收月薪', year.averageMonthlyWage, 22000);
eq('假日最多月份是 2 月', year.maxHolidayMonth.month, 2);
eq('假日最多月份法定假日 9 天', year.maxHolidayMonth.holidayDays, 9);
eq('12 个月明细齐全', year.months.length, 12);
eq('假日最多月份随配置变化（去掉 2 月节日 → 10 月）', (() => {
  const noFeb = cfgOf({ monthlySalary: 22000, holidays: cfg.holidays.filter((k) => !k.startsWith('2026-02-')) });
  return yearSummary(noFeb, 2026).maxHolidayMonth.month;
})(), 10);
eq('无节假日配置时全年工作日 = 周一至周五 + 6 个调休上班日',
  yearSummary(cfgOf({ holidays: [] }), 2026).totalWorkdays, 267);
eq('无节假日配置时 10-01 也是工作日', workdaysInMonth(2026, 9, cfgOf({ holidays: [] })), 23);

/* ---------------- 工资率 ---------------- */
const cfg22 = cfgOf({ monthlySalary: 22000 });
const rates = computeRates(cfg22, '2026-10-21');
eq('月薪透传', rates.monthlySalary, 22000);
eq('当月工作日', rates.monthlyWorkdays, 18);
eq('日工资 = 22000/18', rates.dailyWage, 22000 / 18);
eq('日有效工时 8h', rates.paidHours, 8);
eq('时工资 = 日工资/8', rates.hourlyWage, 22000 / 18 / 8);
eq('分工资 = 时工资/60', rates.minuteWage, 22000 / 18 / 8 / 60);
eq('秒工资 = 时工资/3600', rates.secondWage, 22000 / 18 / 8 / 3600);
eq('周工资 = 日工资 × 5', rates.weeklyWage, (22000 / 18) * 5);
eq('月工资 = 实收', rates.monthlyWage, 22000);

const cfgLunchPaid = cfgOf({ monthlySalary: 22000, lunchPaid: true });
eq('午休算工时 → 日工时 9h', paidMinutesPerDay(cfgLunchPaid), 540);
eq('午休算工时 → 时工资变小', computeRates(cfgLunchPaid, '2026-10-21').hourlyWage < rates.hourlyWage, true);
const cfgNoLunch = cfgOf({ monthlySalary: 22000, lunchEnabled: false });
eq('午休停用 → 日工时 9h', paidMinutesPerDay(cfgNoLunch), 540);

/* “节假日不算，则日工资变高”：把 10 月放假全部移除后工作日变多、日工资变小 */
const cfgOctFlat = cfgOf({ monthlySalary: 22000, holidays: cfg.holidays.filter((k) => !k.startsWith('2026-10-')) });
const flatWorkdays = workdaysInMonth(2026, 9, cfgOctFlat);
eq('去掉 10 月节假日后工作日 23 天（22 个工作日 + 10-10 调休）', flatWorkdays, 23);
ok('节假日不算 → 日工资更高', computeRates(cfg22, '2026-10-21').dailyWage > computeRates(cfgOctFlat, '2026-10-21').dailyWage,
  `holiday=${computeRates(cfg22, '2026-10-21').dailyWage} flat=${computeRates(cfgOctFlat, '2026-10-21').dailyWage}`);

/* ---------------- 今日已赚 / 状态 ---------------- */
const e = (h, m) => earnedToday(cfg22, at(2026, 9, 21, h, m));
eq('08:00 未上班', e(8, 0).status, 'before');
eq('08:00 已赚 0', e(8, 0).todayEarned, 0);
eq('09:00 刚上班', e(9, 0).status, 'working');
eq('09:00 已赚 0', e(9, 0).todayEarned, 0);
eq('12:00 进入午休', e(12, 0).status, 'lunch');
eq('12:00 已赚 = 3 小时', e(12, 0).todayEarned, 3 * rates.hourlyWage);
eq('12:30 午休中金额冻结', e(12, 30).todayEarned, e(12, 0).todayEarned);
eq('13:00 午休结束恢复', e(13, 0).status, 'working');
eq('13:00 已赚仍是 3 小时', e(13, 0).todayEarned, 3 * rates.hourlyWage);
eq('13:30 已赚 3.5 小时', e(13, 30).todayEarned, 3.5 * rates.hourlyWage);
eq('17:59 进度约 0.99', e(17, 59).todayProgress > 0.99 && e(17, 59).todayProgress < 1, true);
eq('18:00 下班', e(18, 0).status, 'off');
eq('18:00 已赚 = 日工资', e(18, 0).todayEarned, rates.dailyWage);
eq('18:30 已赚封顶', e(18, 30).todayEarned, rates.dailyWage);
eq('18:00 进度 1', e(18, 0).todayProgress, 1);
eq('08:00 距上班 1 小时', e(8, 0).secondsToStart, 3600);
eq('17:00 距下班 1 小时', e(17, 0).secondsToEnd, 3600);

const sat = earnedToday(cfg22, at(2026, 9, 24, 11, 0));
eq('周六休息', sat.status, 'rest');
eq('周六已赚 0', sat.todayEarned, 0);
eq('周六今日目标 0', sat.todayTarget, 0);
eq('国庆休息', earnedToday(cfg22, at(2026, 9, 1, 11, 0)).status, 'rest');
eq('调休 10-10 上班', earnedToday(cfg22, at(2026, 9, 10, 11, 0)).status, 'working');
eq('调休 10-10 已赚 2 小时', earnedToday(cfg22, at(2026, 9, 10, 11, 0)).todayEarned, 2 * rates.hourlyWage);

const lunchPaid = earnedToday(cfgLunchPaid, at(2026, 9, 21, 12, 30));
eq('午休算工时 → 12:30 仍在工作', lunchPaid.status, 'working');
eq('午休算工时 → 12:30 已赚 3.5 小时', lunchPaid.todayEarned, 3.5 * computeRates(cfgLunchPaid, '2026-10-21').hourlyWage);
const noLunch = earnedToday(cfgNoLunch, at(2026, 9, 21, 12, 30));
eq('午休停用 → 12:30 在工作', noLunch.status, 'working');

/* 本月已赚 = 今天之前完整工作日 × 日工资 + 今日已赚 */
const prior = workdaysOfMonth(2026, 9, cfg22).filter((k) => k < '2026-10-21').length;
eq('10-21 之前完整工作日 10 天（10/8、10/9、10/10、10/12~16、10/19、10/20）', prior, 10);
eq('本月已赚自洽', earnedToday(cfg22, at(2026, 9, 21, 9, 0)).monthEarned, prior * rates.dailyWage);

/* ---------------- 格式化 ---------------- */
eq('formatMoney 4 位', formatMoney(0.042438, 4), '0.0424');
eq('formatMoney 千分位', formatMoney(12345.678, 2), '12,345.68');
eq('formatMoney 整数', formatMoney(1000, 2), '1,000.00');
eq('formatMoney 非数字', formatMoney(undefined, 2), '0.00');
eq('formatDuration 时分秒', formatDuration(5025), '1小时 23分 45秒');
eq('formatDuration 分秒', formatDuration(125), '2分 5秒');
eq('formatDuration 纯秒', formatDuration(45), '45秒');
eq('formatDuration 0', formatDuration(0), '0秒');

/* ---------------- 配置缺省 / 冻结 ---------------- */
ok('DEFAULTS 冻结', Object.isFrozen(DEFAULTS));
eq('normalizeConfig 空参可用', normalizeConfig().errors.length, 0);

/* ---------------- 汇总 ---------------- */
if (failures.length > 0) {
  console.error(`FAIL ${failures.length} / ${passed + failures.length}`);
  for (const line of failures) console.error('  ✗', line);
  process.exit(1);
}
console.log(`verify-core: ${passed}/${passed} 通过`);
