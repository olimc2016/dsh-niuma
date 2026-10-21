window.__ModuleLoader__.load({ id: "dsh-niuma", factory: (require) => {
var module = { exports: {} }; var exports = module.exports;
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client/index.js
var index_exports = {};
__export(index_exports, {
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(index_exports);
var import_react = __toESM(require("react"), 1);

// src/holidays.mjs
var OFFICIAL_HOLIDAYS_2026 = Object.freeze([
  // 元旦：1月1日（周四）至3日（周六）
  "2026-01-01",
  "2026-01-02",
  "2026-01-03",
  // 春节：2月15日（周日）至23日（周一），共 9 天
  "2026-02-15",
  "2026-02-16",
  "2026-02-17",
  "2026-02-18",
  "2026-02-19",
  "2026-02-20",
  "2026-02-21",
  "2026-02-22",
  "2026-02-23",
  // 清明节：4月4日（周六）至6日（周一）
  "2026-04-04",
  "2026-04-05",
  "2026-04-06",
  // 劳动节：5月1日（周五）至5日（周二）
  "2026-05-01",
  "2026-05-02",
  "2026-05-03",
  "2026-05-04",
  "2026-05-05",
  // 端午节：6月19日（周五）至21日（周日）
  "2026-06-19",
  "2026-06-20",
  "2026-06-21",
  // 中秋节：9月25日（周五）至27日（周日）
  "2026-09-25",
  "2026-09-26",
  "2026-09-27",
  // 国庆节：10月1日（周四）至7日（周三）
  "2026-10-01",
  "2026-10-02",
  "2026-10-03",
  "2026-10-04",
  "2026-10-05",
  "2026-10-06",
  "2026-10-07"
]);
var OFFICIAL_EXTRA_WORKDAYS_2026 = Object.freeze([
  "2026-01-04",
  // 元旦调休：周日上班
  "2026-02-14",
  // 春节调休：周六上班
  "2026-02-28",
  // 春节调休：周六上班
  "2026-05-09",
  // 劳动节调休：周六上班
  "2026-09-20",
  // 国庆调休：周日上班
  "2026-10-10"
  // 国庆调休：周六上班
]);
var HOLIDAY_BLOCKS = Object.freeze([
  { id: "newYear", year: 2026, from: "2026-01-01", to: "2026-01-03", days: 3, estimated: false },
  { id: "spring", year: 2026, from: "2026-02-15", to: "2026-02-23", days: 9, estimated: false },
  { id: "qingming", year: 2026, from: "2026-04-04", to: "2026-04-06", days: 3, estimated: false },
  { id: "labour", year: 2026, from: "2026-05-01", to: "2026-05-05", days: 5, estimated: false },
  { id: "dragon", year: 2026, from: "2026-06-19", to: "2026-06-21", days: 3, estimated: false },
  { id: "midAutumn", year: 2026, from: "2026-09-25", to: "2026-09-27", days: 3, estimated: false },
  { id: "national", year: 2026, from: "2026-10-01", to: "2026-10-07", days: 7, estimated: false }
]);
var HOLIDAY_SOURCE = Object.freeze({
  year: 2026,
  estimated: false,
  title: "\u56FD\u52A1\u9662\u529E\u516C\u5385\u5173\u4E8E2026\u5E74\u90E8\u5206\u8282\u5047\u65E5\u5B89\u6392\u7684\u901A\u77E5\uFF08\u56FD\u529E\u53D1\u660E\u7535\u30142025\u30157\u53F7\uFF09",
  url: "https://www.gov.cn/zhengce/content/202511/content_7047090.htm"
});
var ESTIMATED_HOLIDAYS_2027 = Object.freeze([
  "2027-01-01",
  "2027-01-02",
  "2027-01-03",
  "2027-02-05",
  "2027-02-06",
  "2027-02-07",
  "2027-02-08",
  "2027-02-09",
  "2027-02-10",
  "2027-02-11",
  "2027-02-12",
  "2027-02-13",
  "2027-04-03",
  "2027-04-04",
  "2027-04-05",
  "2027-05-01",
  "2027-05-02",
  "2027-05-03",
  "2027-05-04",
  "2027-05-05",
  "2027-06-09",
  "2027-09-15",
  "2027-10-01",
  "2027-10-02",
  "2027-10-03",
  "2027-10-04",
  "2027-10-05",
  "2027-10-06",
  "2027-10-07"
]);
var ESTIMATED_EXTRA_WORKDAYS_2027 = Object.freeze([
  "2027-01-31",
  // 春节调休：周日上班（预估）
  "2027-02-14",
  // 春节调休：周日上班（预估）
  "2027-05-08",
  // 劳动节调休：周六上班（预估）
  "2027-09-26",
  // 国庆调休：周日上班（预估）
  "2027-10-09"
  // 国庆调休：周六上班（预估）
]);
var HOLIDAY_BLOCKS_2027_ESTIMATED = Object.freeze([
  { id: "newYear", year: 2027, from: "2027-01-01", to: "2027-01-03", days: 3, estimated: true },
  { id: "spring", year: 2027, from: "2027-02-05", to: "2027-02-13", days: 9, estimated: true },
  { id: "qingming", year: 2027, from: "2027-04-03", to: "2027-04-05", days: 3, estimated: true },
  { id: "labour", year: 2027, from: "2027-05-01", to: "2027-05-05", days: 5, estimated: true },
  { id: "dragon", year: 2027, from: "2027-06-09", to: "2027-06-09", days: 1, estimated: true },
  { id: "midAutumn", year: 2027, from: "2027-09-15", to: "2027-09-15", days: 1, estimated: true },
  { id: "national", year: 2027, from: "2027-10-01", to: "2027-10-07", days: 7, estimated: true }
]);
var HOLIDAY_ESTIMATE_2027 = Object.freeze({
  year: 2027,
  estimated: true,
  announced: false,
  title: "2027 \u5E74\u653E\u5047\u5B89\u6392\uFF08\u9884\u4F30\uFF0C\u5B98\u65B9\u5C1A\u672A\u516C\u5E03\uFF09",
  note: "\u5B98\u65B9\u901A\u77E5\u901A\u5E38\u5728\u524D\u4E00\u5E74 11 \u6708\u521D\u53D1\u5E03\uFF1B\u4EE5\u4E0B\u4E3A\u6309 2024 \u5E74\u4FEE\u8BA2\u7684\u300A\u5168\u56FD\u5E74\u8282\u53CA\u7EAA\u5FF5\u65E5\u653E\u5047\u529E\u6CD5\u300B\u4E0E\u5F80\u5E74\u60EF\u4F8B\u63A8\u7B97\uFF0C\u4EC5\u4F9B\u53C2\u8003\uFF0C\u8BF7\u4EE5\u56FD\u52A1\u9662\u901A\u77E5\u4E3A\u51C6\u3002",
  basis: [
    "\u6625\u8282\u81EA\u9664\u5915\u8D77\u653E\u5047\u8C03\u4F11\uFF0C\u4E00\u822C\u8FDE\u4F11 8\u20139 \u5929",
    "\u56FD\u5E86 7 \u5929\u3001\u52B3\u52A8\u8282 5 \u5929",
    "\u5143\u65E6 / \u6E05\u660E / \u7AEF\u5348 / \u4E2D\u79CB\u5404 1 \u5929\u6CD5\u5B9A\u5047\uFF0C\u9047\u5468\u672B\u987A\u8FDE"
  ],
  url: "https://www.gov.cn/zhengce/xxgk/"
});
var DEFAULT_HOLIDAYS = Object.freeze([...OFFICIAL_HOLIDAYS_2026, ...ESTIMATED_HOLIDAYS_2027]);
var DEFAULT_EXTRA_WORKDAYS = Object.freeze([...OFFICIAL_EXTRA_WORKDAYS_2026, ...ESTIMATED_EXTRA_WORKDAYS_2027]);

// src/core.mjs
var DEFAULTS = Object.freeze({
  monthlySalary: 1e4,
  workStart: "09:00",
  workEnd: "18:00",
  lunchEnabled: true,
  lunchStart: "12:00",
  lunchEnd: "13:00",
  lunchPaid: false,
  holidays: DEFAULT_HOLIDAYS,
  extraWorkdays: DEFAULT_EXTRA_WORKDAYS
});
var SALARY_MAX = 1e7;
var DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
function parseHm(text) {
  if (typeof text !== "string") return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(text.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return hour * 60 + minute;
}
function dateKeyOf(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
function parseDateKey(key) {
  if (typeof key !== "string" || !DATE_RE.test(key)) return null;
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}
function normalizeDateList(value) {
  const errors = [];
  const list = [];
  const seen = /* @__PURE__ */ new Set();
  const items = Array.isArray(value) ? value : [];
  for (const raw of items) {
    if (typeof raw !== "string" || !DATE_RE.test(raw.trim())) {
      errors.push(`\u65E5\u671F\u683C\u5F0F\u5E94\u4E3A YYYY-MM-DD\uFF1A${String(raw)}`);
      continue;
    }
    const key = raw.trim();
    if (parseDateKey(key) === null) {
      errors.push(`\u4E0D\u662F\u771F\u5B9E\u65E5\u671F\uFF1A${key}`);
      continue;
    }
    if (seen.has(key)) continue;
    seen.add(key);
    list.push(key);
  }
  list.sort();
  return { list, errors };
}
function normalizeConfig(patch) {
  const source = patch && typeof patch === "object" ? patch : {};
  const merged = { ...DEFAULTS };
  for (const key of Object.keys(DEFAULTS)) {
    if (source[key] !== void 0) merged[key] = source[key];
  }
  const errors = [];
  const salary = Number(merged.monthlySalary);
  if (!Number.isFinite(salary) || salary <= 0 || salary > SALARY_MAX) {
    errors.push(`\u6708\u85AA\u9700\u8981\u662F 0~${SALARY_MAX} \u4E4B\u95F4\u7684\u6570\u5B57`);
    merged.monthlySalary = salary;
  } else {
    merged.monthlySalary = salary;
  }
  const start = parseHm(merged.workStart);
  const end = parseHm(merged.workEnd);
  const lunchStart = parseHm(merged.lunchStart);
  const lunchEnd = parseHm(merged.lunchEnd);
  if (start === null) errors.push("\u4E0A\u73ED\u65F6\u95F4\u683C\u5F0F\u5E94\u4E3A HH:mm");
  if (end === null) errors.push("\u4E0B\u73ED\u65F6\u95F4\u683C\u5F0F\u5E94\u4E3A HH:mm");
  if (summaryLunchEnabled(merged) && lunchStart === null) errors.push("\u5348\u4F11\u5F00\u59CB\u65F6\u95F4\u683C\u5F0F\u5E94\u4E3A HH:mm");
  if (summaryLunchEnabled(merged) && lunchEnd === null) errors.push("\u5348\u4F11\u7ED3\u675F\u65F6\u95F4\u683C\u5F0F\u5E94\u4E3A HH:mm");
  if (start !== null && end !== null && end <= start) errors.push("\u4E0B\u73ED\u65F6\u95F4\u5FC5\u987B\u665A\u4E8E\u4E0A\u73ED\u65F6\u95F4\uFF08\u6682\u4E0D\u652F\u6301\u8DE8\u591C\u73ED\uFF09");
  if (summaryLunchEnabled(merged) && start !== null && end !== null && lunchStart !== null && lunchEnd !== null) {
    if (lunchStart < start) errors.push("\u5348\u4F11\u5F00\u59CB\u4E0D\u80FD\u65E9\u4E8E\u4E0A\u73ED\u65F6\u95F4");
    if (lunchEnd > end) errors.push("\u5348\u4F11\u7ED3\u675F\u4E0D\u80FD\u665A\u4E8E\u4E0B\u73ED\u65F6\u95F4");
    if (lunchEnd <= lunchStart) errors.push("\u5348\u4F11\u7ED3\u675F\u5FC5\u987B\u665A\u4E8E\u5348\u4F11\u5F00\u59CB");
    if (lunchEnd - lunchStart >= end - start) errors.push("\u5348\u4F11\u65F6\u957F\u4E0D\u80FD\u8986\u76D6\u6574\u4E2A\u5DE5\u4F5C\u65F6\u95F4");
  }
  merged.lunchEnabled = merged.lunchEnabled !== false;
  merged.lunchPaid = merged.lunchPaid === true;
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
function isWorkday(key, config) {
  const holidays = new Set(config.holidays ?? DEFAULTS.holidays);
  const extra = new Set(config.extraWorkdays ?? DEFAULTS.extraWorkdays);
  if (extra.has(key)) return true;
  if (holidays.has(key)) return false;
  const date = parseDateKey(key);
  if (date === null) return false;
  const day = date.getDay();
  return day >= 1 && day <= 5;
}
function workdaysInMonth(year, monthIndex, config) {
  const last = new Date(year, monthIndex + 1, 0).getDate();
  let count = 0;
  for (let day = 1; day <= last; day += 1) {
    if (isWorkday(dateKeyOf(new Date(year, monthIndex, day)), config)) count += 1;
  }
  return count;
}
function workdaysInWeek(key, config) {
  const date = parseDateKey(key);
  if (date === null) return 0;
  const offsetToMonday = (date.getDay() + 6) % 7;
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate() - offsetToMonday);
  let count = 0;
  for (let i = 0; i < 7; i += 1) {
    const day = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
    if (isWorkday(dateKeyOf(day), config)) count += 1;
  }
  return count;
}
function paidMinutesPerDay(config) {
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
function computeRates(config, dateKey) {
  const todayKey = dateKey ?? dateKeyOf(/* @__PURE__ */ new Date());
  const date = parseDateKey(todayKey) ?? /* @__PURE__ */ new Date();
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
    monthlyWage: monthlySalary
  };
}
function earnedToday(config, now) {
  const date = now instanceof Date && !Number.isNaN(now.getTime()) ? now : /* @__PURE__ */ new Date();
  const key = dateKeyOf(date);
  const rates = computeRates(config, key);
  const workday = isWorkday(key, config);
  const startSec = (parseHm(config.workStart) ?? 0) * 60;
  const endSec = (parseHm(config.workEnd) ?? 0) * 60;
  const paidTotalSec = rates.paidMinutes * 60;
  const nowSec = stripTimeToSeconds(date);
  let status;
  if (!workday) status = "rest";
  else if (nowSec < startSec) status = "before";
  else if (nowSec >= endSec) status = "off";
  else if (isWithinUnpaidLunch(config, nowSec)) status = "lunch";
  else status = "working";
  let elapsedSec = 0;
  if (workday) {
    elapsedSec = Math.max(0, Math.min(nowSec, endSec) - startSec);
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
    secondsToStart,
    secondsToEnd,
    rates
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
function formatMoney(value, digits = 2) {
  const number = Number(value);
  const safe = Number.isFinite(number) ? number : 0;
  const fixed = Math.abs(safe).toFixed(Math.max(0, Math.min(6, digits)));
  const [intPart, decPart] = fixed.split(".");
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${safe < 0 ? "-" : ""}${grouped}${decPart ? `.${decPart}` : ""}`;
}
function formatDuration(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor(total % 3600 / 60);
  const rest = total % 60;
  if (hours > 0) return `${hours}\u5C0F\u65F6 ${minutes}\u5206 ${rest}\u79D2`;
  if (minutes > 0) return `${minutes}\u5206 ${rest}\u79D2`;
  return `${rest}\u79D2`;
}
function holidayDaysInMonth(year, monthIndex, config) {
  const prefix = `${year}-${String(monthIndex + 1).padStart(2, "0")}-`;
  return (config.holidays ?? DEFAULTS.holidays).filter((key) => key.startsWith(prefix)).length;
}
function monthSummary(config, year, monthIndex) {
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
    secondWage: hourlyWage / 3600
  };
}
function yearSummary(config, year) {
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
    maxHolidayMonth
  };
}

// src/client/index.js
var PKG_NAME = true ? "dsh-niuma" : "dsh-niuma";
var SHORT_NAME = PKG_NAME.replace(/^dsh-/, "");
var SLOT_ID = SHORT_NAME === "niuma" ? "niuma" : SHORT_NAME;
var LOCALE_NS = SLOT_ID;
var ROUTE_BASE = `/${SHORT_NAME}`;
var C = {
  label: "var(--dsw-alias-label-primary, #1f2329)",
  label2: "var(--dsw-alias-label-secondary, #5a6472)",
  label3: "var(--dsw-alias-label-tertiary, #8a94a6)",
  border: "var(--dsw-alias-border-l2, rgba(128,128,128,.28))",
  border1: "var(--dsw-alias-border-l1, rgba(128,128,128,.16))",
  layer1: "var(--dsw-alias-bg-layer-1, rgba(128,128,128,.06))",
  layer2: "var(--dsw-alias-bg-layer-2, rgba(128,128,128,.10))",
  brand: "var(--dsw-alias-brand-primary, #2f7dff)",
  ok: "var(--dsw-alias-state-success-primary, #3fb950)",
  warn: "var(--dsw-alias-state-warn-primary, #e3b341)",
  error: "var(--dsw-alias-state-error-primary, #f85149)"
};
var CARD = {
  border: `1px solid ${C.border1}`,
  borderRadius: 12,
  background: C.layer1,
  boxShadow: "0 1px 2px rgba(0,0,0,.07)",
  padding: "10px 12px",
  boxSizing: "border-box"
};
var NUM = { fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" };
var GOLD = {
  color: "#D9A441",
  backgroundImage: "linear-gradient(180deg, #FFE9A8 0%, #F2C14E 40%, #D79A2B 72%, #B87A16 100%)",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  WebkitTextFillColor: "transparent",
  textShadow: "0 1px 0 rgba(0,0,0,.05)"
};
var GOLD_TINT = "#E7B84D";
var STATUS_META = {
  rest: { key: "statusRest", color: C.label3 },
  before: { key: "statusBefore", color: C.warn },
  working: { key: "statusWorking", color: C.ok },
  lunch: { key: "statusLunch", color: C.brand },
  off: { key: "statusOff", color: C.label2 }
};
var zh = {
  "nav": "\u725B\u9A6C",
  "title": "\u725B\u9A6C\u52A0\u901F\u5668",
  "subtitle": "\u4ECA\u65E5\u5DE5\u8D44\u5B9E\u65F6\u8BA1\u6570\u5668",
  "earnedToday": "\u4ECA\u65E5\u5DF2\u8D5A",
  "todayOn": "\u4ECA\u5929",
  "perSecond": "\u6BCF\u79D2\u8FDB\u8D26",
  "statusRest": "\u4F11\u606F\u65E5",
  "statusBefore": "\u672A\u4E0A\u73ED",
  "statusWorking": "\u642C\u7816\u4E2D",
  "statusLunch": "\u5348\u4F11\u4E2D",
  "statusOff": "\u5DF2\u4E0B\u73ED",
  "todayProgress": "\u4ECA\u65E5\u8FDB\u5EA6",
  "progressOfTarget": "\u5DF2\u8D5A / \u76EE\u6807",
  "toStart": "\u8DDD\u4E0A\u73ED",
  "toEnd": "\u8DDD\u4E0B\u73ED",
  "secondWage": "\u79D2\u5DE5\u8D44",
  "minuteWage": "\u5206\u5DE5\u8D44",
  "hourlyWage": "\u65F6\u5DE5\u8D44",
  "dailyWage": "\u65E5\u5DE5\u8D44",
  "weeklyWage": "\u5468\u5DE5\u8D44",
  "monthlyWage": "\u6708\u5DE5\u8D44",
  "details": "\u660E\u7EC6",
  "monthlySalaryLabel": "\u5B9E\u6536\u6708\u85AA",
  "workdaysThisMonth": "\u5F53\u6708\u5DE5\u4F5C\u65E5",
  "paidHoursPerDay": "\u65E5\u6709\u6548\u5DE5\u65F6",
  "todayTarget": "\u4ECA\u65E5\u76EE\u6807",
  "monthEarned": "\u672C\u6708\u5DF2\u8D5A",
  "holidaySourceLink": "\u56FD\u52A1\u9662\u529E\u516C\u5385 2026 \u5E74\u8282\u5047\u65E5\u5B89\u6392",
  "configLoading": "\u6B63\u5728\u8BFB\u53D6\u8BBE\u7F6E\u2026",
  "configFailed": "\u8BBE\u7F6E\u8BFB\u53D6\u5931\u8D25\uFF0C\u4F7F\u7528\u9ED8\u8BA4\u503C",
  "retry": "\u91CD\u8BD5",
  "settings": "\u8BBE\u7F6E",
  "settingsHint": "\u6539\u5B8C\u70B9\u300C\u4FDD\u5B58\u300D\u751F\u6548\uFF1B\u683C\u5F0F\u4E0D\u5BF9\u4F1A\u5728\u4E0B\u65B9\u7EA2\u5B57\u63D0\u793A\uFF0C\u4E0D\u5F71\u54CD\u8BA1\u65F6\u3002",
  "salaryField": "\u5B9E\u6536\u6708\u85AA\uFF08\u5143/\u6708\uFF09",
  "workStartField": "\u4E0A\u73ED\u65F6\u95F4",
  "workEndField": "\u4E0B\u73ED\u65F6\u95F4",
  "lunchEnabledField": "\u542F\u7528\u5348\u4F11",
  "lunchStartField": "\u5348\u4F11\u5F00\u59CB",
  "lunchEndField": "\u5348\u4F11\u7ED3\u675F",
  "lunchPaidField": "\u5348\u4F11\u7B97\u5DE5\u65F6",
  "holidaysCardTitle": "\u8282\u5047\u65E5\u5B89\u6392",
  "holidays2026Label": "2026 \u5E74\uFF08\u5B98\u65B9\uFF09",
  "holidays2027Label": "2027 \u5E74\uFF08\u9884\u4F30\uFF09",
  "holidayEstimateTag": "\u9884\u4F30",
  "holidayEstimateNote": "\u5B98\u65B9\u5C1A\u672A\u516C\u5E03\uFF0C\u4EE5\u4E0A\u4E3A\u6309\u89C4\u5219\u4E0E\u60EF\u4F8B\u63A8\u7B97\uFF0C\u4EC5\u4F9B\u53C2\u8003\uFF0C\u4EE5\u56FD\u52A1\u9662\u901A\u77E5\u4E3A\u51C6\u3002",
  "holidayEstimateShort": "2027 \u4E3A\u9884\u4F30\u503C",
  "settingsDataNote": "\u8282\u5047\u65E5\u4E0E\u8C03\u4F11\u6570\u636E\u89C1\u4E0A\u65B9\u300C\u8282\u5047\u65E5\u5B89\u6392\u300D\u5361\u7247\uFF082027 \u5E74\u4E3A\u9884\u4F30\u503C\uFF0C\u4E0D\u53EF\u5728\u672C\u9875\u7F16\u8F91\uFF09\u3002",
  "holidaysCardSub": "\u6CD5\u5B9A\u5047\u65E5 {days} \u5929 \xB7 \u8C03\u4F11\u4E0A\u73ED {extra} \u5929",
  "holidaysDaysShort": "{days} \u5929",
  "holidaysExtraNote": "\u8C03\u4F11\u4E0A\u73ED\u65E5 {extra} \u5929\uFF08\u5468\u672B\u8865\u73ED\uFF0C\u6309\u5DE5\u4F5C\u65E5\u8BA1\uFF09",
  "holidayNewYear": "\u5143\u65E6",
  "holidaySpring": "\u6625\u8282",
  "holidayQingming": "\u6E05\u660E",
  "holidayLabour": "\u52B3\u52A8\u8282",
  "holidayDragon": "\u7AEF\u5348",
  "holidayMidAutumn": "\u4E2D\u79CB",
  "holidayNational": "\u56FD\u5E86",
  "save": "\u4FDD\u5B58",
  "saving": "\u4FDD\u5B58\u4E2D\u2026",
  "saved": "\u5DF2\u4FDD\u5B58",
  "saveFailed": "\u4FDD\u5B58\u5931\u8D25\uFF1A",
  "dayUnit": "\u5929",
  "hourUnit": "\u5C0F\u65F6",
  "viewLabel": "\u67E5\u770B",
  "viewCurrent": "\u672C\u6708",
  "viewYear": "\u5168\u5E74\u5E73\u5747",
  "monthUnit": "\u6708",
  "holidayShort": "\u5047",
  "currentHint": "\u6309\u6BCF\u6708 {days} \u4E2A\u5DE5\u4F5C\u65E5\u3001\u6BCF\u5929 {hours} \u5C0F\u65F6\u8BA1",
  "monthHint": "{year} \u5E74 {month} \u6708 \xB7 \u5DE5\u4F5C\u65E5 {workdays} \u5929 \xB7 \u6CD5\u5B9A\u5047\u65E5 {holidays} \u5929",
  "yearHint": "{year} \u5168\u5E74 \xB7 {workdays} \u4E2A\u5DE5\u4F5C\u65E5 \xB7 \u6309\u5E74\u6536\u5165\u6298\u7B97",
  "viewOnlyHint": "\u4EC5\u6362\u7B97\uFF0C\u4E0D\u5F71\u54CD\u4ECA\u65E5\u8BA1\u6570\u5668",
  "yearWorkdays": "\u5168\u5E74\u5DE5\u4F5C\u65E5",
  "yearIncome": "\u5168\u5E74\u6536\u5165",
  "averageDaily": "\u5E73\u5747\u65E5\u85AA",
  "averageHourly": "\u5E73\u5747\u65F6\u85AA",
  "averageMinute": "\u5E73\u5747\u5206\u85AA",
  "averageSecond": "\u5E73\u5747\u79D2\u85AA",
  "monthWorkdaysCard": "\u5DE5\u4F5C\u65E5",
  "maxHolidayBadge": "\u5168\u5E74\u5047\u65E5\u6700\u591A",
  "maxHolidayNote": "\u5168\u5E74\u5047\u65E5\u6700\u591A\uFF1A{month} \u6708\uFF08\u6CD5\u5B9A\u5047\u65E5 {days} \u5929\uFF09",
  "maxHolidayThis": "\u5168\u5E74\u5047\u65E5\u6700\u591A\u7684\u6708\u4EFD\uFF08\u6CD5\u5B9A\u5047\u65E5 {days} \u5929\uFF09",
  "sectionRates": "\u5DE5\u8D44\u6362\u7B97",
  "sectionRatesHint": "\u6309\u6BCF\u6708 {days} \u4E2A\u5DE5\u4F5C\u65E5\u3001\u6BCF\u5929 {hours} \u5C0F\u65F6\u8BA1",
  "sectionDetail": "\u4ECA\u65E5\u53E3\u5F84\u660E\u7EC6",
  "restHint": "\u4ECA\u5929\u4F11\u606F\uFF0C\u597D\u597D\u8EBA\u5E73",
  "liveNow": "\u5B9E\u65F6"
};
var en = {
  "nav": "Niuma",
  "title": "Niuma Booster",
  "subtitle": "Real-time salary ticker",
  "earnedToday": "Earned today",
  "todayOn": "Today",
  "perSecond": "Per second",
  "statusRest": "Day off",
  "statusBefore": "Not started",
  "statusWorking": "Working",
  "statusLunch": "Lunch break",
  "statusOff": "Off work",
  "todayProgress": "Today progress",
  "progressOfTarget": "Earned / target",
  "toStart": "Until start",
  "toEnd": "Until off",
  "secondWage": "Per second",
  "minuteWage": "Per minute",
  "hourlyWage": "Per hour",
  "dailyWage": "Per day",
  "weeklyWage": "Per week",
  "monthlyWage": "Per month",
  "details": "Details",
  "monthlySalaryLabel": "Net monthly salary",
  "workdaysThisMonth": "Workdays this month",
  "paidHoursPerDay": "Paid hours / day",
  "todayTarget": "Today's target",
  "monthEarned": "Earned this month",
  "holidaySourceLink": "State Council 2026 holiday schedule",
  "configLoading": "Loading settings\u2026",
  "configFailed": "Failed to load settings, using defaults",
  "retry": "Retry",
  "settings": "Settings",
  "settingsHint": "Click Save to apply. Invalid input is shown in red below; the ticker keeps running.",
  "salaryField": "Net monthly salary (CNY)",
  "workStartField": "Work start",
  "workEndField": "Work end",
  "lunchEnabledField": "Enable lunch break",
  "lunchStartField": "Lunch start",
  "lunchEndField": "Lunch end",
  "lunchPaidField": "Lunch is paid",
  "holidaysCardTitle": "Holiday calendar",
  "holidays2026Label": "2026 (official)",
  "holidays2027Label": "2027 (estimated)",
  "holidayEstimateTag": "estimate",
  "holidayEstimateNote": "Not announced officially yet \u2014 estimated from the rules and past practice, for reference only.",
  "holidayEstimateShort": "2027 is estimated",
  "settingsDataNote": "Holiday data lives in the calendar card above (2027 values are estimates and not editable here).",
  "holidaysCardSub": "{days} statutory days \xB7 {extra} make-up workdays",
  "holidaysDaysShort": "{days} d",
  "holidaysExtraNote": "{extra} make-up workdays (weekend shifts, counted as workdays)",
  "holidayNewYear": "New Year's Day",
  "holidaySpring": "Spring Festival",
  "holidayQingming": "Qingming",
  "holidayLabour": "Labour Day",
  "holidayDragon": "Dragon Boat",
  "holidayMidAutumn": "Mid-Autumn",
  "holidayNational": "National Day",
  "save": "Save",
  "saving": "Saving\u2026",
  "saved": "Saved",
  "saveFailed": "Save failed: ",
  "dayUnit": "d",
  "hourUnit": "h",
  "viewLabel": "View",
  "viewCurrent": "This month",
  "viewYear": "Year average",
  "monthUnit": "M",
  "holidayShort": "hol.",
  "currentHint": "{days} workdays / month \xB7 {hours} h / day",
  "monthHint": "{year}-{month} \xB7 {workdays} workdays \xB7 {holidays} statutory holidays",
  "yearHint": "{year} \xB7 {workdays} workdays \xB7 averaged over the year",
  "viewOnlyHint": "Conversion only \u2014 today's ticker is unaffected",
  "yearWorkdays": "Workdays / year",
  "yearIncome": "Annual income",
  "averageDaily": "Avg per day",
  "averageHourly": "Avg per hour",
  "averageMinute": "Avg per minute",
  "averageSecond": "Avg per second",
  "monthWorkdaysCard": "Workdays",
  "maxHolidayBadge": "Most holidays",
  "maxHolidayNote": "Most holidays: month {month} ({days} statutory days)",
  "maxHolidayThis": "The month with the most holidays ({days} statutory days)",
  "sectionRates": "Pay rates",
  "sectionRatesHint": "{days} workdays / month \xB7 {hours} h / day",
  "sectionDetail": "Today's basis",
  "restHint": "Day off \u2014 enjoy it",
  "liveNow": "LIVE"
};
var fallbackTranslate = (key) => zh[key] != null ? zh[key] : key;
var money = (value, digits = 2) => `${formatMoney(value, digits)} \u5143`;
function trimNumber(value, digits = 2) {
  const fixed = Number(value || 0).toFixed(digits);
  return fixed.replace(/\.?0+$/, "") || "0";
}
function formFromConfig(config) {
  return {
    monthlySalary: String(config.monthlySalary == null ? "" : config.monthlySalary),
    workStart: String(config.workStart == null ? "" : config.workStart),
    workEnd: String(config.workEnd == null ? "" : config.workEnd),
    lunchEnabled: config.lunchEnabled !== false,
    lunchStart: String(config.lunchStart == null ? "" : config.lunchStart),
    lunchEnd: String(config.lunchEnd == null ? "" : config.lunchEnd),
    lunchPaid: config.lunchPaid === true
  };
}
function patchFromForm(form) {
  const salaryText = String(form.monthlySalary == null ? "" : form.monthlySalary).trim();
  return {
    monthlySalary: salaryText === "" ? Number.NaN : Number(salaryText),
    workStart: String(form.workStart || "").trim(),
    workEnd: String(form.workEnd || "").trim(),
    lunchEnabled: Boolean(form.lunchEnabled),
    lunchStart: String(form.lunchStart || "").trim(),
    lunchEnd: String(form.lunchEnd || "").trim(),
    lunchPaid: Boolean(form.lunchPaid)
  };
}
function useRemoteConfig() {
  const [state, setState] = import_react.default.useState({ status: "loading", data: null, error: null });
  const [tick, setTick] = import_react.default.useState(0);
  import_react.default.useEffect(() => {
    let alive = true;
    if (typeof fetch !== "function") {
      setState({ status: "failed", data: null, error: "fetch unavailable" });
      return void 0;
    }
    setState((prev) => ({ status: prev.data ? "ready" : "loading", data: prev.data, error: null }));
    fetch(`${ROUTE_BASE}/config`, { cache: "no-store", credentials: "same-origin" }).then(async (response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body = await response.json();
      if (!body || body.ok !== true) throw new Error(body && body.error || "bad payload");
      return body.data || null;
    }).then((data) => {
      if (alive) setState({ status: "ready", data, error: null });
    }).catch((error) => {
      if (alive) {
        setState((prev) => ({
          status: "failed",
          data: prev.data,
          error: String(error && error.message || error)
        }));
      }
    });
    return () => {
      alive = false;
    };
  }, [tick]);
  const refresh = import_react.default.useCallback(() => setTick((n) => n + 1), []);
  return { ...state, refresh };
}
function useSecondClock() {
  const [now, setNow] = import_react.default.useState(() => /* @__PURE__ */ new Date());
  import_react.default.useEffect(() => {
    let lastSecond = -1;
    const timer = setInterval(() => {
      const second = Math.floor(Date.now() / 1e3);
      if (second === lastSecond) return;
      lastSecond = second;
      setNow(/* @__PURE__ */ new Date());
    }, 250);
    return () => clearInterval(timer);
  }, []);
  return now;
}
function NiumaIcon(props) {
  const size = props && props.size || 16;
  const active = props && props.active;
  return import_react.default.createElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 16 16",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.3,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: { opacity: active ? 1 : 0.82 },
    "aria-hidden": "true"
  }, [
    import_react.default.createElement("rect", { key: "a", x: "1.4", y: "3.6", width: "13.2", height: "8.8", rx: "1.8" }),
    import_react.default.createElement("circle", { key: "b", cx: "8", cy: "8", r: "2.1" }),
    import_react.default.createElement("path", { key: "c", d: "M4 8h.01M12 8h.01" })
  ]);
}
var PANEL_CSS = `
@keyframes niumaPulse { 0%,100% { opacity: .95; transform: scale(1); } 50% { opacity: .3; transform: scale(.68); } }
@media (prefers-reduced-motion: reduce) { .niuma-live-dot { animation: none !important; } }
`;
function StyleTag() {
  return import_react.default.createElement("style", null, PANEL_CSS);
}
function StatusBadge(props) {
  const t = props.t;
  const meta = STATUS_META[props.status] || STATUS_META.rest;
  const live = props.status === "working";
  return import_react.default.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      padding: "4px 11px 4px 9px",
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 600,
      lineHeight: 1.5,
      color: meta.color,
      border: `1px solid color-mix(in srgb, ${meta.color} 42%, transparent)`,
      background: `color-mix(in srgb, ${meta.color} 12%, transparent)`,
      whiteSpace: "nowrap"
    }
  }, [
    import_react.default.createElement("i", {
      key: "dot",
      className: live ? "niuma-live-dot" : void 0,
      style: { width: 6, height: 6, borderRadius: "50%", background: meta.color, display: "inline-block" }
    }),
    t(meta.key)
  ]);
}
function SectionTitle(props) {
  return import_react.default.createElement("div", {
    style: {
      display: "flex",
      alignItems: "baseline",
      justifyContent: "space-between",
      gap: 8,
      flexWrap: "wrap",
      margin: "2px 1px -1px"
    }
  }, [
    import_react.default.createElement("span", {
      key: "t",
      style: { fontSize: 12.5, fontWeight: 700, color: C.label2, letterSpacing: ".2px" }
    }, props.title),
    props.hint ? import_react.default.createElement("span", { key: "h", style: { fontSize: 10.5, color: C.label3, ...NUM } }, props.hint) : null
  ]);
}
function HeroCard(props) {
  const t = props.t;
  const snap = props.snap;
  const rates = snap.rates;
  const progress = Math.max(0, Math.min(1, Number(snap.todayProgress) || 0));
  const percentText = `${(progress * 100).toFixed(1)}%`;
  const live = snap.status === "working";
  const rest = snap.status === "rest";
  const heroBackground = "linear-gradient(135deg, color-mix(in srgb, " + C.brand + " 17%, " + C.layer1 + ") 0%, " + C.layer1 + " 58%, " + C.layer1 + " 100%)";
  return import_react.default.createElement("div", {
    style: {
      position: "relative",
      overflow: "hidden",
      borderRadius: 18,
      padding: "16px 18px 14px",
      border: `1px solid color-mix(in srgb, ${GOLD_TINT} 34%, ${C.border1})`,
      background: heroBackground,
      boxShadow: "0 12px 30px rgba(0,0,0,.10)",
      boxSizing: "border-box",
      minWidth: 0
    }
  }, [
    import_react.default.createElement("div", {
      key: "glow",
      "aria-hidden": "true",
      style: {
        position: "absolute",
        right: -52,
        top: -72,
        width: 188,
        height: 188,
        borderRadius: "50%",
        background: `radial-gradient(circle, color-mix(in srgb, ${GOLD_TINT} 30%, transparent) 0%, transparent 68%)`,
        pointerEvents: "none"
      }
    }),
    import_react.default.createElement("div", {
      key: "head",
      style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }
    }, [
      import_react.default.createElement("span", {
        key: "a",
        style: { display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600, color: C.label2 }
      }, [
        live ? import_react.default.createElement("i", {
          key: "dot",
          className: "niuma-live-dot",
          style: { width: 7, height: 7, borderRadius: "50%", background: C.ok, display: "inline-block" }
        }) : null,
        t("earnedToday")
      ]),
      import_react.default.createElement(
        "span",
        { key: "b", style: { fontSize: 11, color: C.label3, ...NUM } },
        `${t("todayOn")} ${snap.dateKey}`
      )
    ]),
    import_react.default.createElement("div", {
      key: "amt",
      style: { display: "flex", alignItems: "baseline", gap: 7, marginTop: 4, flexWrap: "wrap" }
    }, [
      import_react.default.createElement("span", {
        key: "val",
        style: {
          fontSize: 46,
          lineHeight: 1.12,
          fontWeight: 800,
          letterSpacing: "-1.2px",
          ...GOLD,
          ...NUM,
          ...rest ? { opacity: 0.62 } : {}
        }
      }, formatMoney(snap.todayEarned, 4)),
      import_react.default.createElement("span", {
        key: "unit",
        style: { fontSize: 18, fontWeight: 700, color: C.label2, ...NUM }
      }, "\u5143")
    ]),
    import_react.default.createElement("div", {
      key: "chips",
      style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 5, flexWrap: "wrap" }
    }, [
      import_react.default.createElement("span", {
        key: "per",
        style: {
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          fontSize: 11.5,
          fontWeight: 600,
          color: C.label2,
          background: `color-mix(in srgb, ${C.brand} 11%, transparent)`,
          border: `1px solid color-mix(in srgb, ${C.brand} 22%, transparent)`,
          borderRadius: 999,
          padding: "2px 9px",
          ...NUM
        }
      }, `${t("perSecond")} +${money(rates.secondWage, 4)}`),
      import_react.default.createElement(
        "span",
        { key: "target", style: { fontSize: 11, color: C.label3, ...NUM } },
        rest ? t("restHint") : `${t("todayTarget")} ${money(snap.todayTarget, 2)}`
      )
    ]),
    import_react.default.createElement("div", {
      key: "progTop",
      style: { display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, marginTop: 13, flexWrap: "wrap" }
    }, [
      import_react.default.createElement("span", { key: "l", style: { fontSize: 11.5, color: C.label3 } }, t("todayProgress")),
      import_react.default.createElement("span", { key: "p", style: { fontSize: 12.5, fontWeight: 700, color: C.brand, ...NUM } }, percentText)
    ]),
    import_react.default.createElement("div", {
      key: "bar",
      style: { marginTop: 5, height: 9, borderRadius: 999, background: `color-mix(in srgb, ${C.label} 9%, transparent)`, overflow: "hidden" }
    }, [
      import_react.default.createElement("div", {
        key: "fill",
        style: {
          width: `${(progress * 100).toFixed(2)}%`,
          height: "100%",
          borderRadius: 999,
          background: `linear-gradient(90deg, ${C.brand} 0%, color-mix(in srgb, ${C.brand} 55%, ${C.ok}) 100%)`,
          transition: "width .35s linear"
        }
      })
    ]),
    import_react.default.createElement("div", {
      key: "progNum",
      style: { display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, marginTop: 5, flexWrap: "wrap", fontSize: 10.5, color: C.label3 }
    }, [
      import_react.default.createElement("span", { key: "a" }, t("progressOfTarget")),
      import_react.default.createElement(
        "span",
        { key: "b", style: { color: C.label2, fontWeight: 600, ...NUM } },
        `${money(snap.todayEarned, 2)} / ${money(snap.todayTarget, 2)}`
      )
    ])
  ]);
}
function CountdownRow(props) {
  const t = props.t;
  const snap = props.snap;
  const chip = (key, label, value, accent) => import_react.default.createElement("div", {
    key,
    style: {
      flex: "1 1 120px",
      minWidth: 116,
      display: "flex",
      alignItems: "baseline",
      justifyContent: "space-between",
      gap: 8,
      padding: "9px 12px",
      borderRadius: 12,
      background: accent ? `color-mix(in srgb, ${GOLD_TINT} 9%, ${C.layer1})` : C.layer1,
      border: `1px solid ${accent ? `color-mix(in srgb, ${GOLD_TINT} 38%, ${C.border1})` : C.border1}`,
      boxSizing: "border-box"
    }
  }, [
    import_react.default.createElement("span", {
      key: "l",
      style: { fontSize: 11, color: accent ? C.label2 : C.label3, whiteSpace: "nowrap" }
    }, label),
    import_react.default.createElement("span", {
      key: "v",
      style: { fontSize: 13.5, fontWeight: 700, color: C.label, ...NUM }
    }, value)
  ]);
  return import_react.default.createElement("div", {
    style: { display: "flex", flexWrap: "wrap", gap: 9 }
  }, [
    chip("start", t("toStart"), Number(snap.secondsToStart) > 0 ? formatDuration(snap.secondsToStart) : "\u2014"),
    chip("end", t("toEnd"), Number(snap.secondsToEnd) > 0 ? formatDuration(snap.secondsToEnd) : "\u2014"),
    chip("month", t("monthEarned"), money(snap.monthEarned, 2), true)
  ]);
}
var RATE_CARDS = [
  { key: "secondWage", label: "secondWage", digits: 4 },
  { key: "minuteWage", label: "minuteWage", digits: 4 },
  { key: "hourlyWage", label: "hourlyWage", digits: 2 },
  { key: "dailyWage", label: "dailyWage", digits: 2 },
  { key: "weeklyWage", label: "weeklyWage", digits: 2 },
  { key: "monthlyWage", label: "monthlyWage", digits: 2 }
];
function RatesGrid(props) {
  const cards = Array.isArray(props.cards) ? props.cards : [];
  return import_react.default.createElement("div", {
    style: { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }
  }, cards.map((card, index) => {
    const accent = card.accent === true;
    return import_react.default.createElement("div", {
      key: card.key,
      "data-stat": `stat-${index}`,
      style: {
        ...CARD,
        padding: "10px 11px",
        borderRadius: 12,
        ...accent ? {
          border: `1px solid color-mix(in srgb, ${GOLD_TINT} 46%, ${C.border1})`,
          background: `color-mix(in srgb, ${GOLD_TINT} 9%, ${C.layer1})`
        } : {}
      }
    }, [
      import_react.default.createElement("div", {
        key: "l",
        style: { fontSize: 11, color: accent ? C.label2 : C.label3, fontWeight: accent ? 600 : 400 }
      }, card.label),
      import_react.default.createElement("div", {
        key: "v",
        style: {
          fontSize: 15.5,
          fontWeight: 700,
          letterSpacing: "-.2px",
          color: accent ? C.label : C.label,
          marginTop: 2,
          ...NUM
        }
      }, card.value)
    ]);
  }));
}
function PeriodSelect(props) {
  const t = props.t;
  const year = props.year;
  const months = props.months;
  const style = {
    appearance: "none",
    WebkitAppearance: "none",
    border: `1px solid ${C.border}`,
    background: C.layer2,
    color: C.label,
    borderRadius: 8,
    padding: "4px 9px",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    outline: "none",
    maxWidth: 220
  };
  return import_react.default.createElement("select", {
    value: props.value,
    "aria-label": t("viewLabel"),
    onChange: (event) => props.onChange(event.target.value),
    style
  }, [
    import_react.default.createElement("option", { key: "current", value: "current" }, t("viewCurrent")),
    ...months.map((month) => import_react.default.createElement("option", {
      key: `m${month.month}`,
      value: `m${month.month}`
    }, `${month.month}${t("monthUnit")} \xB7 ${month.workdays}${t("dayUnit")} \xB7 ${t("holidayShort")}${month.holidayDays}`)),
    import_react.default.createElement("option", { key: "year", value: "year" }, `${year} ${t("viewYear")}`)
  ]);
}
function DetailsFooter(props) {
  const t = props.t;
  const snap = props.snap;
  const rates = snap.rates;
  const items = [
    { key: "salary", label: t("monthlySalaryLabel"), value: money(rates.monthlySalary, 2) },
    { key: "workdays", label: t("workdaysThisMonth"), value: `${rates.monthlyWorkdays}${t("dayUnit")}` },
    { key: "hours", label: t("paidHoursPerDay"), value: `${trimNumber(rates.paidHours, 2)}${t("hourUnit")}` },
    { key: "target", label: t("todayTarget"), value: money(snap.todayTarget, 2) },
    { key: "month", label: t("monthEarned"), value: money(snap.monthEarned, 2) }
  ];
  return import_react.default.createElement("div", {
    style: {
      background: C.layer1,
      border: `1px solid ${C.border1}`,
      borderRadius: 12,
      padding: "10px 12px",
      fontSize: 11,
      color: C.label3,
      lineHeight: 1.6
    }
  }, [
    import_react.default.createElement("div", {
      key: "items",
      style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(118px, 1fr))", gap: "7px 12px" }
    }, items.map((item) => import_react.default.createElement("div", {
      key: item.key,
      style: { minWidth: 0 }
    }, [
      import_react.default.createElement("div", { key: "l", style: { fontSize: 10.5, color: C.label3 } }, item.label),
      import_react.default.createElement("div", {
        key: "v",
        style: { fontSize: 13, fontWeight: 650, color: C.label2, ...NUM }
      }, item.value)
    ])))
  ]);
}
var HOLIDAY_LABEL_KEYS = {
  newYear: "holidayNewYear",
  spring: "holidaySpring",
  qingming: "holidayQingming",
  labour: "holidayLabour",
  dragon: "holidayDragon",
  midAutumn: "holidayMidAutumn",
  national: "holidayNational"
};
function HolidaysCard(props) {
  const t = props.t;
  const source = props.holidaySource || HOLIDAY_SOURCE;
  const extra = Array.isArray(props.extraWorkdays) ? props.extraWorkdays : [];
  const countYear = (year) => extra.filter((key) => String(key).startsWith(`${year}-`)).length;
  const shortDate = (key) => key.slice(5).replace("-", "/");
  const sections = [
    {
      key: "official",
      label: t("holidays2026Label"),
      blocks: HOLIDAY_BLOCKS,
      estimated: false,
      extraCount: countYear(2026),
      tag: null
    },
    {
      key: "estimate",
      label: t("holidays2027Label"),
      blocks: HOLIDAY_BLOCKS_2027_ESTIMATED,
      estimated: true,
      extraCount: countYear(2027),
      tag: t("holidayEstimateTag")
    }
  ];
  const sumDays = (blocks) => blocks.reduce((sum, block) => sum + block.days, 0);
  const renderSection = (section) => import_react.default.createElement("div", { key: section.key, style: { marginTop: section.key === "official" ? 8 : 12 } }, [
    import_react.default.createElement("div", {
      key: "head",
      style: { display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: 8 }
    }, [
      import_react.default.createElement("span", { key: "l", style: { fontSize: 11.5, fontWeight: 700, color: C.label2 } }, section.label),
      section.tag ? import_react.default.createElement("span", {
        key: "tag",
        style: {
          fontSize: 9.5,
          fontWeight: 700,
          color: C.label2,
          border: `1px dashed color-mix(in srgb, ${GOLD_TINT} 60%, transparent)`,
          borderRadius: 999,
          padding: "0 6px",
          lineHeight: 1.6
        }
      }, section.tag) : null,
      import_react.default.createElement(
        "span",
        { key: "s", style: { marginLeft: "auto", fontSize: 10, color: C.label3, ...NUM } },
        t("holidaysCardSub").replace("{days}", String(sumDays(section.blocks))).replace("{extra}", String(section.extraCount))
      )
    ]),
    import_react.default.createElement("div", {
      key: "grid",
      style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(118px, 1fr))", gap: 7, marginTop: 6 }
    }, section.blocks.map((block) => import_react.default.createElement("div", {
      key: block.id,
      style: {
        border: section.estimated ? `1px dashed color-mix(in srgb, ${GOLD_TINT} 40%, ${C.border1})` : `1px solid ${C.border1}`,
        borderRadius: 9,
        padding: "6px 8px",
        background: `color-mix(in srgb, ${GOLD_TINT} ${section.estimated ? 3 : 6}%, transparent)`
      }
    }, [
      import_react.default.createElement("div", {
        key: "row",
        style: { display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 6 }
      }, [
        import_react.default.createElement(
          "span",
          { key: "n", style: { fontSize: 11.5, fontWeight: 650, color: C.label } },
          t(HOLIDAY_LABEL_KEYS[block.id])
        ),
        import_react.default.createElement("span", {
          key: "d",
          style: {
            fontSize: 10,
            fontWeight: 700,
            color: C.label2,
            background: `color-mix(in srgb, ${GOLD_TINT} 16%, transparent)`,
            borderRadius: 999,
            padding: "0 6px",
            ...NUM
          }
        }, t("holidaysDaysShort").replace("{days}", String(block.days)))
      ]),
      import_react.default.createElement(
        "div",
        { key: "r", style: { fontSize: 10, color: C.label3, marginTop: 2, ...NUM } },
        `${shortDate(block.from)} \u2013 ${shortDate(block.to)}`
      )
    ]))),
    section.estimated ? import_react.default.createElement("div", {
      key: "est-note",
      style: { marginTop: 6, fontSize: 10.5, color: C.label3, lineHeight: 1.5 }
    }, `\u26A0 ${t("holidayEstimateNote")}`) : null
  ]);
  return import_react.default.createElement("div", {
    style: {
      background: C.layer1,
      border: `1px solid ${C.border1}`,
      borderRadius: 12,
      padding: "10px 12px"
    }
  }, [
    import_react.default.createElement("div", {
      key: "title",
      style: { display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }
    }, [
      import_react.default.createElement(
        "span",
        { key: "t", style: { fontSize: 12.5, fontWeight: 700, color: C.label2, letterSpacing: ".2px" } },
        t("holidaysCardTitle")
      ),
      import_react.default.createElement("a", {
        key: "a",
        href: source.url,
        target: "_blank",
        rel: "noreferrer",
        title: source.title,
        style: { fontSize: 10.5, color: C.brand, textDecoration: "none", fontWeight: 600 }
      }, `${source.year} ${t("holidaySourceLink")} \u2197`)
    ]),
    sections.map(renderSection),
    import_react.default.createElement("div", {
      key: "foot",
      style: { marginTop: 8, fontSize: 10.5, color: C.label3 }
    }, t("holidaysExtraNote").replace("{extra}", String(extra.length)))
  ]);
}
function SettingsSection(props) {
  const t = props.t;
  const form = props.form;
  const setField = props.setField;
  const setCheck = props.setCheck;
  const save = props.save;
  const onSave = props.onSave;
  const inputStyle = {
    width: "100%",
    boxSizing: "border-box",
    padding: "6px 9px",
    borderRadius: 8,
    border: `1px solid ${C.border}`,
    background: C.layer2,
    color: C.label,
    fontSize: 13,
    fontVariantNumeric: "tabular-nums",
    outline: "none"
  };
  const labelStyle = { fontSize: 10.5, color: C.label3, fontWeight: 500 };
  const textField = (field, labelKey, placeholder) => import_react.default.createElement("label", {
    key: field,
    style: { display: "flex", flexDirection: "column", gap: 4, flex: "1 1 130px", minWidth: 112 }
  }, [
    import_react.default.createElement("span", { key: "l", style: labelStyle }, t(labelKey)),
    import_react.default.createElement("input", {
      key: "i",
      type: "text",
      value: form[field],
      placeholder: placeholder || "HH:mm",
      onChange: (event) => setField(field, event.target.value),
      style: inputStyle
    })
  ]);
  const checkField = (field, labelKey) => import_react.default.createElement("label", {
    key: field,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      flex: "1 1 140px",
      fontSize: 12,
      color: C.label2,
      cursor: "pointer",
      minHeight: 30
    }
  }, [
    import_react.default.createElement("input", {
      key: "i",
      type: "checkbox",
      checked: Boolean(form[field]),
      onChange: (event) => setCheck(field, event.target.checked)
    }),
    import_react.default.createElement("span", { key: "l" }, t(labelKey))
  ]);
  return import_react.default.createElement("details", {
    style: { background: C.layer1, border: `1px solid ${C.border1}`, borderRadius: 12, padding: "11px 13px" }
  }, [
    import_react.default.createElement("summary", {
      key: "sum",
      style: { cursor: "pointer", fontSize: 13, fontWeight: 650, color: C.label, userSelect: "none" }
    }, t("settings")),
    import_react.default.createElement("div", {
      key: "hint",
      style: { fontSize: 10.5, color: C.label3, margin: "5px 0 10px" }
    }, t("settingsHint")),
    import_react.default.createElement("div", {
      key: "dataNote",
      style: { fontSize: 10.5, color: C.label3, margin: "-4px 0 10px", lineHeight: 1.55 }
    }, t("settingsDataNote")),
    import_react.default.createElement("div", {
      key: "fields",
      style: { display: "flex", flexWrap: "wrap", gap: 9 }
    }, [
      textField("monthlySalary", "salaryField", "10000"),
      textField("workStart", "workStartField", "09:00"),
      textField("workEnd", "workEndField", "18:00"),
      textField("lunchStart", "lunchStartField", "12:00"),
      textField("lunchEnd", "lunchEndField", "13:00"),
      checkField("lunchEnabled", "lunchEnabledField"),
      checkField("lunchPaid", "lunchPaidField")
    ]),
    import_react.default.createElement("div", {
      key: "actions",
      style: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 11 }
    }, [
      import_react.default.createElement("button", {
        key: "save",
        type: "button",
        onClick: onSave,
        disabled: save.status === "saving",
        style: {
          // 金色按钮：与主卡金额、节假日强调同一套金色系；深棕字保证任何主题下都有对比度
          border: `1px solid color-mix(in srgb, ${GOLD_TINT} 72%, rgba(0,0,0,.18))`,
          color: "#3A2A05",
          background: save.status === "saving" ? `color-mix(in srgb, ${GOLD_TINT} 52%, #fff)` : "linear-gradient(180deg, #F8DC86 0%, #EFC258 52%, #D99D2C 100%)",
          borderRadius: 8,
          padding: "7px 20px",
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: ".3px",
          cursor: save.status === "saving" ? "default" : "pointer",
          opacity: save.status === "saving" ? 0.72 : 1,
          boxShadow: `0 2px 10px color-mix(in srgb, ${GOLD_TINT} 36%, transparent), inset 0 1px 0 rgba(255,255,255,.45)`,
          textShadow: "0 1px 0 rgba(255,255,255,.28)"
        }
      }, save.status === "saving" ? t("saving") : t("save")),
      save.status === "ok" ? import_react.default.createElement("span", { key: "ok", style: { fontSize: 12, color: C.ok } }, save.message || t("saved")) : null,
      save.status === "error" ? import_react.default.createElement("span", {
        key: "err",
        style: { fontSize: 12, color: C.error, flex: "1 1 220px", whiteSpace: "pre-wrap" }
      }, `${t("saveFailed")}${save.errors.join("\uFF1B")}`) : null
    ])
  ]);
}
function NiumaPanel(props) {
  const t = props && typeof props.t === "function" ? props.t : fallbackTranslate;
  const remote = useRemoteConfig();
  const now = useSecondClock();
  const cfg = import_react.default.useMemo(() => {
    const raw = remote.data && remote.data.config ? remote.data.config : null;
    if (!raw) return DEFAULTS;
    try {
      const result = normalizeConfig(raw);
      return result.config || DEFAULTS;
    } catch (error) {
      return DEFAULTS;
    }
  }, [remote.data]);
  const snap = import_react.default.useMemo(() => earnedToday(cfg, now), [cfg, now]);
  const rates = snap && snap.rates ? snap.rates : computeRates(cfg, snap && snap.dateKey);
  const baseForm = import_react.default.useMemo(() => formFromConfig(cfg), [cfg]);
  const viewYear = Number(String(snap && snap.dateKey ? snap.dateKey : "").slice(0, 4)) || (/* @__PURE__ */ new Date()).getFullYear();
  const yearEstimated = viewYear === HOLIDAY_ESTIMATE_2027.year;
  const yearData = import_react.default.useMemo(() => yearSummary(cfg, viewYear), [cfg, viewYear]);
  const [view, setView] = import_react.default.useState("current");
  const selectedMonth = view.startsWith("m") ? yearData.months[Number(view.slice(1)) - 1] : null;
  const maxHolidayMonth = yearData.maxHolidayMonth;
  const maxHolidayText = t("maxHolidayNote").replace("{month}", String(maxHolidayMonth.month)).replace("{days}", String(maxHolidayMonth.holidayDays));
  let viewCards;
  let viewHint;
  let viewNote;
  if (view === "year") {
    viewCards = [
      { key: "avgDaily", label: t("averageDaily"), value: money(yearData.averageDailyWage, 2), accent: true },
      { key: "avgHourly", label: t("averageHourly"), value: money(yearData.averageHourlyWage, 2) },
      { key: "avgMinute", label: t("averageMinute"), value: money(yearData.averageMinuteWage, 4) },
      { key: "avgSecond", label: t("averageSecond"), value: money(yearData.averageSecondWage, 4) },
      { key: "yearWorkdays", label: t("yearWorkdays"), value: `${yearData.totalWorkdays}${t("dayUnit")}` },
      { key: "yearIncome", label: t("yearIncome"), value: money(yearData.annualIncome, 2) }
    ];
    viewHint = `${t("yearHint").replace("{year}", String(viewYear)).replace("{workdays}", String(yearData.totalWorkdays))} \xB7 ${t("viewOnlyHint")}` + (yearEstimated ? ` \xB7 ${t("holidayEstimateShort")}` : "");
    viewNote = yearEstimated ? t("holidayEstimateNote") : maxHolidayText;
  } else if (selectedMonth) {
    viewCards = [
      { key: "monthlyWage", label: t("monthlyWage"), value: money(selectedMonth.monthlySalary, 2) },
      { key: "dailyWage", label: t("dailyWage"), value: money(selectedMonth.dailyWage, 2), accent: true },
      { key: "hourlyWage", label: t("hourlyWage"), value: money(selectedMonth.hourlyWage, 2) },
      { key: "minuteWage", label: t("minuteWage"), value: money(selectedMonth.minuteWage, 4) },
      { key: "secondWage", label: t("secondWage"), value: money(selectedMonth.secondWage, 4) },
      { key: "monthWorkdays", label: t("monthWorkdaysCard"), value: `${selectedMonth.workdays}${t("dayUnit")}` }
    ];
    viewHint = `${t("monthHint").replace("{year}", String(viewYear)).replace("{month}", String(selectedMonth.month)).replace("{workdays}", String(selectedMonth.workdays)).replace("{holidays}", String(selectedMonth.holidayDays))} \xB7 ${t("viewOnlyHint")}` + (yearEstimated ? ` \xB7 ${t("holidayEstimateShort")}` : "");
    viewNote = yearEstimated ? t("holidayEstimateNote") : selectedMonth.month === maxHolidayMonth.month ? `\u2605 ${t("maxHolidayThis").replace("{days}", String(maxHolidayMonth.holidayDays))}` : maxHolidayText;
  } else {
    viewCards = RATE_CARDS.map((spec) => ({
      key: spec.key,
      label: t(spec.label),
      value: money(rates[spec.key], spec.digits),
      accent: spec.key === "secondWage"
    }));
    viewHint = t("currentHint").replace("{days}", String(rates.monthlyWorkdays)).replace("{hours}", trimNumber(rates.paidHours, 2));
    viewNote = maxHolidayText;
  }
  const [draft, setDraft] = import_react.default.useState(null);
  const [save, setSave] = import_react.default.useState({ status: "idle", errors: [], message: "" });
  const form = draft || baseForm;
  const setField = (field, value) => {
    setDraft((prev) => ({ ...prev || baseForm, [field]: value }));
    if (save.status !== "idle") setSave({ status: "idle", errors: [], message: "" });
  };
  const setCheck = (field, checked) => setField(field, checked);
  const onSave = () => {
    const patch = patchFromForm(form);
    const checked = normalizeConfig(patch);
    if (checked.errors && checked.errors.length > 0) {
      setSave({ status: "error", errors: checked.errors, message: "" });
      return;
    }
    if (typeof fetch !== "function") {
      setSave({ status: "error", errors: ["fetch unavailable"], message: "" });
      return;
    }
    setSave({ status: "saving", errors: [], message: "" });
    fetch(`${ROUTE_BASE}/settings`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(patch)
    }).then(async (response) => {
      let body = null;
      try {
        body = await response.json();
      } catch (error) {
        body = null;
      }
      if (!response.ok || !body || body.ok !== true) {
        throw new Error(body && body.error || `HTTP ${response.status}`);
      }
      return body;
    }).then(() => {
      setDraft(null);
      setSave({ status: "ok", errors: [], message: t("saved") });
      remote.refresh();
    }).catch((error) => {
      setSave({ status: "error", errors: [String(error && error.message || error)], message: "" });
    });
  };
  const holidaySource = remote.data && remote.data.holidaySource || HOLIDAY_SOURCE;
  const banner = remote.status === "failed" ? {
    color: C.warn,
    text: `${t("configFailed")}${remote.error ? `\uFF08${remote.error}\uFF09` : ""}`,
    retry: true
  } : remote.status === "loading" ? { color: C.label3, text: t("configLoading"), retry: false } : null;
  return import_react.default.createElement("div", {
    style: {
      // DSH 的 main slot 给的是定高容器：插件必须自己当滚动容器，否则展开设置后底部会被裁掉。
      // 注意：这里用 block + 内层 flex 的写法 —— 如果根直接 display:flex，子项会在定高容器里
      // 被 flex-shrink 压扁（展开设置时整张主卡高度被压缩、内容被 overflow 裁掉）。
      height: "100%",
      width: "100%",
      overflowY: "auto",
      overflowX: "hidden",
      overscrollBehavior: "contain",
      scrollbarGutter: "stable",
      boxSizing: "border-box",
      fontSize: 13,
      lineHeight: 1.45,
      color: C.label,
      fontFamily: "inherit"
    }
  }, [
    import_react.default.createElement(StyleTag, { key: "css" }),
    import_react.default.createElement("div", {
      key: "inner",
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 11,
        width: "100%",
        maxWidth: 820,
        margin: "0 auto",
        padding: "16px 18px 40px",
        boxSizing: "border-box",
        minWidth: 0
      }
    }, [
      // 品牌头：图标块 + 标题/副标题 + 状态徽标
      import_react.default.createElement("div", {
        key: "head",
        style: { display: "flex", alignItems: "center", gap: 11, flexWrap: "wrap" }
      }, [
        import_react.default.createElement("div", {
          key: "icon",
          style: {
            width: 38,
            height: 38,
            borderRadius: 12,
            flex: "0 0 auto",
            display: "grid",
            placeItems: "center",
            color: C.brand,
            background: `color-mix(in srgb, ${C.brand} 13%, transparent)`,
            border: `1px solid color-mix(in srgb, ${C.brand} 26%, transparent)`
          }
        }, import_react.default.createElement(NiumaIcon, { size: 21 })),
        import_react.default.createElement("div", { key: "tt", style: { marginRight: "auto", minWidth: 0 } }, [
          import_react.default.createElement("div", {
            key: "t",
            style: { fontSize: 17.5, fontWeight: 800, letterSpacing: "-.3px", color: C.label }
          }, t("title")),
          import_react.default.createElement("div", {
            key: "s",
            style: { fontSize: 11, color: C.label3, marginTop: 1 }
          }, t("subtitle"))
        ]),
        import_react.default.createElement(StatusBadge, { key: "badge", t, status: snap.status })
      ]),
      // 配置读取状态
      banner ? import_react.default.createElement("div", {
        key: "banner",
        style: {
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
          fontSize: 12,
          color: banner.color,
          padding: "6px 10px",
          borderRadius: 9,
          border: `1px solid color-mix(in srgb, ${banner.color} 45%, transparent)`,
          background: `color-mix(in srgb, ${banner.color} 10%, transparent)`
        }
      }, [
        import_react.default.createElement("span", { key: "txt", style: { flex: "1 1 160px" } }, banner.text),
        banner.retry ? import_react.default.createElement("button", {
          key: "retry",
          type: "button",
          onClick: remote.refresh,
          style: {
            border: `1px solid ${banner.color}`,
            color: banner.color,
            background: "transparent",
            borderRadius: 6,
            padding: "2px 10px",
            fontSize: 12,
            cursor: "pointer"
          }
        }, t("retry")) : null
      ]) : null,
      import_react.default.createElement(HeroCard, { key: "hero", t, snap }),
      import_react.default.createElement(CountdownRow, { key: "countdown", t, snap }),
      import_react.default.createElement("div", {
        key: "ratesHead",
        style: {
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          flexWrap: "wrap",
          margin: "2px 1px -1px"
        }
      }, [
        import_react.default.createElement("span", {
          key: "t",
          style: { fontSize: 12.5, fontWeight: 700, color: C.label2, letterSpacing: ".2px" }
        }, t("sectionRates")),
        import_react.default.createElement(PeriodSelect, {
          key: "period",
          t,
          value: view,
          onChange: setView,
          year: viewYear,
          months: yearData.months
        })
      ]),
      import_react.default.createElement("div", {
        key: "ratesHint",
        style: { fontSize: 10.5, color: C.label3, ...NUM }
      }, viewHint),
      import_react.default.createElement(RatesGrid, { key: "rates", cards: viewCards }),
      viewNote ? import_react.default.createElement("div", {
        key: "ratesNote",
        style: { fontSize: 10.5, color: C.label3, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }
      }, [
        import_react.default.createElement("span", {
          key: "badge",
          style: {
            color: C.label2,
            fontWeight: 600,
            background: `color-mix(in srgb, ${GOLD_TINT} 14%, transparent)`,
            border: `1px solid color-mix(in srgb, ${GOLD_TINT} 32%, transparent)`,
            borderRadius: 999,
            padding: "1px 8px"
          }
        }, t("maxHolidayBadge")),
        import_react.default.createElement("span", { key: "txt" }, viewNote)
      ]) : null,
      import_react.default.createElement(SectionTitle, { key: "detailTitle", title: t("sectionDetail") }),
      import_react.default.createElement(DetailsFooter, { key: "footer", t, snap, holidaySource }),
      import_react.default.createElement(HolidaysCard, {
        key: "holidays",
        t,
        holidaySource,
        extraWorkdays: cfg.extraWorkdays
      }),
      import_react.default.createElement(SettingsSection, {
        key: "settings",
        t,
        form,
        setField,
        setCheck,
        save,
        onSave
      })
    ])
  ]);
}
var inject = ["slots", "locale"];
function apply(ctx) {
  ctx.effect(() => ctx.locale.register(LOCALE_NS, { zh, en }), `${LOCALE_NS}: dictionaries`);
  ctx.slots.inject("sidebar.panellist", () => ctx.slots.register({
    name: "sidebar.panellist",
    id: SLOT_ID,
    order: 120,
    label: () => "\u725B\u9A6C",
    locale: LOCALE_NS
  }, NiumaIcon));
  ctx.slots.inject("main", () => ctx.slots.register({
    name: "main",
    key: SLOT_ID,
    locale: LOCALE_NS
  }, NiumaPanel));
}
return module.exports; } });
//# sourceMappingURL=client.js.map
