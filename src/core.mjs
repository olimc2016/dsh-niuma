/**
 * 牛马加速器核心逻辑（纯函数，宿主与浏览器共用）。
 *
 * 设计约束：
 *   - 不依赖 DOM / Node API / 全局状态，可在浏览器 bundle 与 Node 测试里同样运行。
 *   - 所有时间按**本机本地时区**理解；日期键是本地 `YYYY-MM-DD`。
 *   - 金额不做取整（展示层用 formatMoney 控制小数位），避免逐秒累计误差。
 *
 * 口径（详见 SPEC.md §1）：
 *   日有效工时 = 上班~下班跨度 - （午休启用且午休不算工时 ? 午休跨度 : 0）
 *   日工资 = 实收月薪 / 当月工作日数（周末与法定节假日不算，调休上班日算）
 *   时工资 = 日工资 / 日有效工时；分/秒工资逐级除 60
 *   周工资 = 日工资 × 本周（周一~周日）工作日数
 *
 * @module dsh-niuma/core
 */
import { DEFAULT_HOLIDAYS, DEFAULT_EXTRA_WORKDAYS } from './holidays.mjs';

/** 默认配置：字段与默认值的唯一来源（settings schema / 面板 / 宿主共用）。 */
export const DEFAULTS = Object.freeze({
  monthlySalary: 10000,
  workStart: '09:00',
  workEnd: '18:00',
  lunchEnabled: true,
  lunchStart: '12:00',
  lunchEnd: '13:00',
  lunchPaid: false,
  holidays: DEFAULT_HOLIDAYS,
  extraWorkdays: DEFAULT_EXTRA_WORKDAYS,
  /** 主金额小数位（0-6） */
  decimals: 4,
  /** 面板刷新间隔 ms：1000=按秒；16≈屏幕刷新率（连续滚动）；中间值为毫秒级 */
  updateMs: 1000,
});

const SALARY_MAX = 10_000_000;
const DAY_MS = 86_400_000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/* ------------------------------------------------------------------ *
 * 时间解析 / 格式化
 * ------------------------------------------------------------------ */

/**
 * 把 'HH:mm' 解析成当天分钟数。
 * @param {string} text
 * @returns {number|null} 0..1439；非法值返回 null。
 */
export function parseHm(text) {
  if (typeof text !== 'string') return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(text.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return hour * 60 + minute;
}

/**
 * 把分钟数格式化为 'HH:mm'。
 * @param {number} minutes
 * @returns {string}
 */
export function formatHm(minutes) {
  const total = Math.max(0, Math.min(24 * 60 - 1, Math.round(Number(minutes) || 0)));
  const hour = Math.floor(total / 60);
  const minute = total % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/**
 * 本地日期键 'YYYY-MM-DD'。
 * @param {Date} date
 * @returns {string}
 */
export function dateKeyOf(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 把 'YYYY-MM-DD' 解析成**本地**零点 Date。
 * @param {string} key
 * @returns {Date|null} 非法日期返回 null。
 */
export function parseDateKey(key) {
  if (typeof key !== 'string' || !DATE_RE.test(key)) return null;
  const [year, month, day] = key.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

/* ------------------------------------------------------------------ *
 * 配置校验
 * ------------------------------------------------------------------ */

function normalizeDateList(value) {
  const errors = [];
  const list = [];
  const seen = new Set();
  const items = Array.isArray(value) ? value : [];
  for (const raw of items) {
    if (typeof raw !== 'string' || !DATE_RE.test(raw.trim())) {
      errors.push(`日期格式应为 YYYY-MM-DD：${String(raw)}`);
      continue;
    }
    const key = raw.trim();
    if (parseDateKey(key) === null) {
      errors.push(`不是真实日期：${key}`);
      continue;
    }
    if (seen.has(key)) continue;
    seen.add(key);
    list.push(key);
  }
  list.sort();
  return { list, errors };
}

/**
 * 合并默认值并校验；**不抛错**，把所有问题收集到 errors（面板可即时提示）。
 * @param {object} patch 部分或完整配置
 * @returns {{ config: object, errors: string[] }}
 */
export function normalizeConfig(patch) {
  const source = patch && typeof patch === 'object' ? patch : {};
  const merged = { ...DEFAULTS };
  for (const key of Object.keys(DEFAULTS)) {
    if (source[key] !== undefined) merged[key] = source[key];
  }
  const errors = [];

  // 月薪
  const salary = Number(merged.monthlySalary);
  if (!Number.isFinite(salary) || salary <= 0 || salary > SALARY_MAX) {
    errors.push(`月薪需要是 0~${SALARY_MAX} 之间的数字`);
    merged.monthlySalary = salary;
  } else {
    merged.monthlySalary = salary;
  }

  // 时间
  const start = parseHm(merged.workStart);
  const end = parseHm(merged.workEnd);
  const lunchStart = parseHm(merged.lunchStart);
  const lunchEnd = parseHm(merged.lunchEnd);
  if (start === null) errors.push('上班时间格式应为 HH:mm');
  if (end === null) errors.push('下班时间格式应为 HH:mm');
  if (summaryLunchEnabled(merged) && lunchStart === null) errors.push('午休开始时间格式应为 HH:mm');
  if (summaryLunchEnabled(merged) && lunchEnd === null) errors.push('午休结束时间格式应为 HH:mm');
  if (start !== null && end !== null && end <= start) errors.push('下班时间必须晚于上班时间（暂不支持跨夜班）');
  if (summaryLunchEnabled(merged) && start !== null && end !== null && lunchStart !== null && lunchEnd !== null) {
    if (lunchStart < start) errors.push('午休开始不能早于上班时间');
    if (lunchEnd > end) errors.push('午休结束不能晚于下班时间');
    if (lunchEnd <= lunchStart) errors.push('午休结束必须晚于午休开始');
    if (lunchEnd - lunchStart >= end - start) errors.push('午休时长不能覆盖整个工作时间');
  }

  // 布尔
  merged.lunchEnabled = merged.lunchEnabled !== false;
  merged.lunchPaid = merged.lunchPaid === true;

  // 展示/刷新偏好：主金额小数位 0-6；刷新间隔 16-1000ms（16 ≈ 屏幕刷新率）
  const decimals = Number(merged.decimals);
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 6) {
    errors.push('小数位数需要是 0~6 的整数');
    merged.decimals = Number.isInteger(decimals) ? decimals : DEFAULTS.decimals;
  } else {
    merged.decimals = decimals;
  }
  const updateMs = Number(merged.updateMs);
  if (!Number.isInteger(updateMs) || updateMs < 16 || updateMs > 1000) {
    errors.push('刷新间隔需要是 16~1000ms 的整数');
    merged.updateMs = Number.isInteger(updateMs) ? updateMs : DEFAULTS.updateMs;
  } else {
    merged.updateMs = updateMs;
  }

  // 日期列表
  const holidays = normalizeDateList(merged.holidays);
  const extraWorkdays = normalizeDateList(merged.extraWorkdays);
  errors.push(...holidays.errors, ...extraWorkdays.errors);
  merged.holidays = holidays.list;
  merged.extraWorkdays = extraWorkdays.list;

  return { config: merged, errors };
}

function summaryLunchEnabled(config) {
  return config?.lunchEnabled !== false;
}

/**
 * 校验并返回规范化配置；非法时抛错（宿主写接口用）。
 * @param {object} patch
 * @returns {object} 规范化后的完整配置
 */
export function validateConfig(patch) {
  const { config, errors } = normalizeConfig(patch);
  if (errors.length > 0) throw new Error(errors.join('；'));
  return config;
}

/* ------------------------------------------------------------------ *
 * 工作日 / 工资率
 * ------------------------------------------------------------------ */

/** 判断某一天是否工作日（调休上班日 > 法定节假日 > 周一~周五）。 */
export function isWorkday(key, config) {
  const holidays = new Set(config.holidays ?? DEFAULTS.holidays);
  const extra = new Set(config.extraWorkdays ?? DEFAULTS.extraWorkdays);
  if (extra.has(key)) return true;
  if (holidays.has(key)) return false;
  const date = parseDateKey(key);
  if (date === null) return false;
  const day = date.getDay();
  return day >= 1 && day <= 5;
}

/**
 * 某自然月的工作日数。
 * @param {number} year
 * @param {number} monthIndex 0-11
 * @param {object} config
 * @returns {number}
 */
export function workdaysInMonth(year, monthIndex, config) {
  const last = new Date(year, monthIndex + 1, 0).getDate();
  let count = 0;
  for (let day = 1; day <= last; day += 1) {
    if (isWorkday(dateKeyOf(new Date(year, monthIndex, day)), config)) count += 1;
  }
  return count;
}

/**
 * 某一天所在自然周（周一~周日）的工作日数。
 * @param {string} key
 * @param {object} config
 * @returns {number}
 */
export function workdaysInWeek(key, config) {
  const date = parseDateKey(key);
  if (date === null) return 0;
  const offsetToMonday = (date.getDay() + 6) % 7; // 周一=0
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate() - offsetToMonday);
  let count = 0;
  for (let i = 0; i < 7; i += 1) {
    const day = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
    if (isWorkday(dateKeyOf(day), config)) count += 1;
  }
  return count;
}

/**
 * 每天的有效计薪分钟数（扣掉不计薪的午休）。
 * @param {object} config
 * @returns {number}
 */
export function paidMinutesPerDay(config) {
  const start = parseHm(config.workStart);
  const end = parseHm(config.workEnd);
  if (start === null || end === null || end <= start) return 0;
  let minutes = end - start;
  if (config.lunchEnabled !== false && config.lunchPaid !== true) {
    const lunchStart = parseHm(config.lunchStart);
    const lunchEnd = parseHm(config.lunchEnd);
    if (lunchStart !== null && lunchEnd !== null && lunchStart >= start && lunchEnd <= end && lunchEnd > lunchStart) {
      minutes -= lunchEnd - lunchStart;
    }
  }
  return Math.max(0, minutes);
}

function stripTimeToSeconds(date) {
  return date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds();
}

/**
 * 计算某天的工资率（日/时/分/秒/周/月）。
 * @param {object} config
 * @param {string} [dateKey] 决定「当月/当周」口径的日期键，默认今天
 * @returns {object}
 */
export function computeRates(config, dateKey) {
  const todayKey = dateKey ?? dateKeyOf(new Date());
  const date = parseDateKey(todayKey) ?? new Date();
  const year = date.getFullYear();
  const monthIndex = date.getMonth();
  const monthlySalary = Number(config.monthlySalary) || 0;
  const monthlyWorkdays = workdaysInMonth(year, monthIndex, config);
  const weekWorkdays = workdaysInWeek(todayKey, config);
  const paidMinutes = paidMinutesPerDay(config);
  const dailyWage = monthlyWorkdays > 0 ? monthlySalary / monthlyWorkdays : 0;
  const paidHours = paidMinutes / 60;
  const hourlyWage = paidHours > 0 ? dailyWage / paidHours : 0;
  return {
    monthlySalary,
    monthlyWorkdays,
    weekWorkdays,
    paidMinutes,
    paidHours,
    dailyWage,
    hourlyWage,
    minuteWage: hourlyWage / 60,
    secondWage: hourlyWage / 3600,
    weeklyWage: dailyWage * weekWorkdays,
    monthlyWage: monthlySalary,
  };
}

/* ------------------------------------------------------------------ *
 * 今日已赚 / 区间进度
 * ------------------------------------------------------------------ */

/**
 * 今日（或指定 Date）的实时收益与状态。
 * @param {object} config
 * @param {Date} now
 * @returns {object}
 */
export function earnedToday(config, now) {
  const date = now instanceof Date && !Number.isNaN(now.getTime()) ? now : new Date();
  const key = dateKeyOf(date);
  const rates = computeRates(config, key);
  const workday = isWorkday(key, config);
  const startSec = (parseHm(config.workStart) ?? 0) * 60;
  const endSec = (parseHm(config.workEnd) ?? 0) * 60;
  const paidTotalSec = rates.paidMinutes * 60;
  const nowSec = stripTimeToSeconds(date);

  let status;
  if (!workday) status = 'rest';
  else if (nowSec < startSec) status = 'before';
  else if (nowSec >= endSec) status = 'off';
  else if (isWithinUnpaidLunch(config, nowSec)) status = 'lunch';
  else status = 'working';

  let elapsedSec = 0;
  if (workday) {
    elapsedSec = Math.max(0, Math.min(nowSec, endSec) - startSec);
    // 不计薪午休：按“当前已进入午休的累计重叠”扣除（午休中冻结、午休后继续）
    if (config.lunchEnabled !== false && config.lunchPaid !== true) {
      const lunchStart = (parseHm(config.lunchStart) ?? 0) * 60;
      const lunchEnd = (parseHm(config.lunchEnd) ?? 0) * 60;
      if (lunchEnd > lunchStart) {
        const lunchLength = lunchEnd - lunchStart;
        const overlap = Math.max(0, Math.min(Math.min(nowSec, endSec), lunchEnd) - lunchStart);
        elapsedSec -= Math.min(overlap, lunchLength);
      }
    }
    elapsedSec = Math.max(0, Math.min(elapsedSec, paidTotalSec));
  }

  const todayEarned = Math.min(rates.dailyWage, elapsedSec * rates.secondWage);
  const todayTarget = workday ? rates.dailyWage : 0;
  const todayProgress = workday && paidTotalSec > 0 ? Math.min(1, elapsedSec / paidTotalSec) : 0;
  const monthEarned = earnedThisMonth(config, key, date, todayEarned, rates);
  const secondsToStart = workday && nowSec < startSec ? startSec - nowSec : 0;
  const secondsToEnd = workday && nowSec < endSec ? endSec - nowSec : 0;

  // 本月工作天数进度：已完成 = 今天之前的完整工作日 +（今天已下班则 +1）；
  // 「今天」在上班/午休中时算剩余（还没干完），这样「已工作 + 剩余 = 本月总工作日」。
  const monthWorkdays = rates.monthlyWorkdays;
  let monthWorkdaysDone = 0;
  for (let day = 1; day < date.getDate(); day += 1) {
    if (isWorkday(dateKeyOf(new Date(date.getFullYear(), date.getMonth(), day)), config)) monthWorkdaysDone += 1;
  }
  if (workday && status === 'off') monthWorkdaysDone += 1;
  const monthWorkdaysLeft = Math.max(0, monthWorkdays - monthWorkdaysDone);

  return {
    dateKey: key,
    isWorkday: workday,
    status,
    paidSecondsElapsed: elapsedSec,
    paidSecondsTotal: paidTotalSec,
    todayEarned,
    todayTarget,
    todayProgress,
    monthEarned,
    monthWorkdays,
    monthWorkdaysDone,
    monthWorkdaysLeft,
    secondsToStart,
    secondsToEnd,
    rates,
  };
}

function isWithinUnpaidLunch(config, nowSec) {
  if (config.lunchEnabled === false || config.lunchPaid === true) return false;
  const lunchStart = parseHm(config.lunchStart);
  const lunchEnd = parseHm(config.lunchEnd);
  if (lunchStart === null || lunchEnd === null || lunchEnd <= lunchStart) return false;
  const from = lunchStart * 60;
  const to = lunchEnd * 60;
  return nowSec >= from && nowSec < to;
}

function earnedThisMonth(config, key, date, todayEarned, rates) {
  const year = date.getFullYear();
  const monthIndex = date.getMonth();
  const today = date.getDate();
  let previousWorkdays = 0;
  for (let day = 1; day < today; day += 1) {
    const dayKey = dateKeyOf(new Date(year, monthIndex, day));
    if (isWorkday(dayKey, config)) previousWorkdays += 1;
  }
  return previousWorkdays * rates.dailyWage + todayEarned;
}

/* ------------------------------------------------------------------ *
 * 展示格式化
 * ------------------------------------------------------------------ */

/**
 * 金额格式化：固定小数位 + 千分位。
 * @param {number} value
 * @param {number} [digits]
 * @returns {string}
 */
export function formatMoney(value, digits = 2) {
  const number = Number(value);
  const safe = Number.isFinite(number) ? number : 0;
  const fixed = Math.abs(safe).toFixed(Math.max(0, Math.min(6, digits)));
  const [intPart, decPart] = fixed.split('.');
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${safe < 0 ? '-' : ''}${grouped}${decPart ? `.${decPart}` : ''}`;
}

/**
 * 秒数格式化为中文时长。
 * @param {number} seconds
 * @returns {string}
 */
export function formatDuration(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const rest = total % 60;
  if (hours > 0) return `${hours}小时 ${minutes}分 ${rest}秒`;
  if (minutes > 0) return `${minutes}分 ${rest}秒`;
  return `${rest}秒`;
}

/** 供面板脚注：当月工作日明细用（返回该月所有工作日日期键）。 */
export function workdaysOfMonth(year, monthIndex, config) {
  const last = new Date(year, monthIndex + 1, 0).getDate();
  const out = [];
  for (let day = 1; day <= last; day += 1) {
    const key = dateKeyOf(new Date(year, monthIndex, day));
    if (isWorkday(key, config)) out.push(key);
  }
  return out;
}

/** 今天是否是法定节假日（不含普通周末），用于文案区分。 */
export function isStatutoryHoliday(key, config) {
  return new Set(config.holidays ?? DEFAULTS.holidays).has(key);
}

export { DAY_MS };

/* ------------------------------------------------------------------ *
 * 月度 / 全年视角（只影响「查看」，不影响今日计数器）
 * ------------------------------------------------------------------ */

/** 某年某月里配置中的法定节假日日期数（按日期键前缀统计，无论是否落在周末）。 */
export function holidayDaysInMonth(year, monthIndex, config) {
  const prefix = `${year}-${String(monthIndex + 1).padStart(2, '0')}-`;
  return (config.holidays ?? DEFAULTS.holidays).filter((key) => key.startsWith(prefix)).length;
}

/**
 * 单月概览：工作日数、法定假日数、日/时/分/秒工资等。
 *
 * 口径与今日计数一致：月薪 / 当月工作日 = 日工资（节假日不算工作日 → 日工资更高）。
 * @param {object} config
 * @param {number} year
 * @param {number} monthIndex 0-11
 * @returns {object}
 */
export function monthSummary(config, year, monthIndex) {
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const workdays = workdaysInMonth(year, monthIndex, config);
  const holidayDays = holidayDaysInMonth(year, monthIndex, config);
  const monthlySalary = Number(config.monthlySalary) || 0;
  const paidMinutes = paidMinutesPerDay(config);
  const paidHours = paidMinutes / 60;
  const dailyWage = workdays > 0 ? monthlySalary / workdays : 0;
  const hourlyWage = paidHours > 0 ? dailyWage / paidHours : 0;
  return {
    year,
    monthIndex,
    month: monthIndex + 1,
    daysInMonth,
    workdays,
    holidayDays,
    restDays: daysInMonth - workdays,
    monthlySalary,
    paidMinutes,
    paidHours,
    dailyWage,
    hourlyWage,
    minuteWage: hourlyWage / 60,
    secondWage: hourlyWage / 3600,
  };
}

/**
 * 全年概览：12 个月汇总 + 全年平均工资 + 法定假日最多的月份。
 *
 * 「全年平均」口径：年收入 = 实收月薪 × 12；平均日薪 = 年收入 / 全年工作日；
 * 平均时薪 = 平均日薪 / 日有效工时。平均月薪 = 实收月薪（不因月份浮动）。
 * @param {object} config
 * @param {number} year
 * @returns {object}
 */
export function yearSummary(config, year) {
  const months = Array.from({ length: 12 }, (_, monthIndex) => monthSummary(config, year, monthIndex));
  const totalWorkdays = months.reduce((sum, item) => sum + item.workdays, 0);
  const totalHolidayDays = months.reduce((sum, item) => sum + item.holidayDays, 0);
  const monthlySalary = Number(config.monthlySalary) || 0;
  const annualIncome = monthlySalary * 12;
  const paidMinutes = paidMinutesPerDay(config);
  const paidHours = paidMinutes / 60;
  const averageDailyWage = totalWorkdays > 0 ? annualIncome / totalWorkdays : 0;
  const averageHourlyWage = paidHours > 0 ? averageDailyWage / paidHours : 0;
  const maxHolidayMonth = months.reduce((best, item) => {
    if (item.holidayDays !== best.holidayDays) return item.holidayDays > best.holidayDays ? item : best;
    if (item.workdays !== best.workdays) return item.workdays < best.workdays ? item : best;
    return item.month < best.month ? item : best;
  }, months[0]);
  return {
    year,
    months,
    totalWorkdays,
    totalHolidayDays,
    paidMinutes,
    paidHours,
    monthlySalary,
    annualIncome,
    averageMonthlyWage: monthlySalary,
    averageDailyWage,
    averageHourlyWage,
    averageMinuteWage: averageHourlyWage / 60,
    averageSecondWage: averageHourlyWage / 3600,
    maxHolidayMonth,
  };
}
