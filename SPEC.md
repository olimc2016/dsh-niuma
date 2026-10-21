# dsh-niuma 规格与接口契约（实现冻结版 v0.1）

> 本文件是并行开发的**唯一契约**。任何实现与本文冲突，以本文为准；确需改动先改本文。
> 产品名：**牛马加速器**（dsh-niuma）。定位：DSH 侧栏一个「工资换算现金计数器」面板。

---

## 1. 产品行为

面板每秒刷新一次「今日已赚」金额。用户配置一次工资与作息，之后所有派生数字自动重算：

- 输入**实收月薪**（税后到手，单位元/月）
- 上下班时间、午休起止时间均可设置；午休可勾选「启用」，并可勾选「午休算工时」
- 自动计算：**秒工资 / 分工资 / 时工资 / 日工资 / 周工资 / 月工资**
- 工作日口径：周一至周五上班，**法定节假日不算工作日**，**调休上班日算工作日**
- 「节假日不算」→ 当月工作日变少 → 日工资、时工资、秒工资变高

核心数字定义（必须逐条实现，测试会按这些断言）：

| 名称 | 公式 |
|---|---|
| 日有效工时 `paidMinutes` | `(下班-上班) - (午休启用 且 午休不算工时 ? (午休结束-午休开始) : 0)`，单位分钟 |
| 当月工作日数 `monthlyWorkdays` | 该自然月内 `isWorkday` 为真的天数 |
| 日工资 `dailyWage` | `monthlySalary / monthlyWorkdays` |
| 时工资 `hourlyWage` | `dailyWage / (paidMinutes / 60)` |
| 分工资 `minuteWage` | `hourlyWage / 60` |
| 秒工资 `secondWage` | `hourlyWage / 3600` |
| 周工资 `weeklyWage` | `dailyWage × weekWorkdays`（含今天所在自然周，周一~周日） |
| 月工资 `monthlyWage` | `monthlySalary` |
| 今日已赚 `todayEarned` | 今日有效工作秒数 × `secondWage`，上限 `dailyWage` |

`isWorkday(dateKey)` 判定优先级：
1. 在 `extraWorkdays`（调休上班日）里 → 是
2. 在 `holidays`（法定放假日）里 → 否
3. 否则周一~周五 → 是，周六周日 → 否

今日状态 `status`：
- `rest`：今天不是工作日（周末/节假日）。今日已赚 = 0
- `before`：工作日且当前时间早于上班时间。今日已赚 = 0
- `working`：班内且不在（不计薪的）午休
- `lunch`：午休启用且午休不算工时，且当前在午休区间。今日已赚冻结在午休开始时的值
- `off`：已过下班时间。今日已赚 = 日工资

边界：时间一律用**本机本地时区**；日期键是本地 `YYYY-MM-DD`。只支持当天内上下班（不支持跨夜班，v0.1 明确不支持，设置校验拒绝 `下班 <= 上班`）。

---

## 2. 配置（settings）

配置对象 `config`，默认值单点定义在 `src/core.mjs` 的 `DEFAULTS`：

```js
DEFAULTS = {
  monthlySalary: 10000,        // 元/月，实收，>0，上限 10_000_000
  workStart: '09:00',          // 'HH:mm'
  workEnd: '18:00',            // 'HH:mm'，必须 > workStart
  lunchEnabled: true,          // 是否启用午休
  lunchStart: '12:00',         // 启用午休时必填；必须 >= workStart
  lunchEnd: '13:00',           // 必须 <= workEnd 且 > lunchStart
  lunchPaid: false,            // 午休是否算工时
  holidays: [ ...2026 法定放假日... ],   // string[] 'YYYY-MM-DD'
  extraWorkdays: [ ...2026 调休上班日... ] // string[] 'YYYY-MM-DD'
}
```

校验（宿主 `POST /niuma/settings` 与 `normalizeConfig` 都执行）：
- `monthlySalary` 有限正数，范围 `(0, 1e7]`
- 时间格式 `HH:mm`（00:00–23:59），`workEnd > workStart`
- `lunchEnabled=true` 时：`workStart <= lunchStart < lunchEnd <= workEnd`；若违反，`normalizeConfig` **抛错**
- 日期列表每项匹配 `^\d{4}-\d{2}-\d{2}$` 且是真实日期；去重、升序
- 未知字段忽略
- 返回 `{ config, errors: string[] }` 的辅助函数不抛错（便于面板即时提示）；抛错的 `validateConfig` 用于宿主写接口

2026 法定节假日（来源：国务院办公厅国办发明电〔2025〕7号，已核实）：
- 元旦 01-01 ~ 01-03；**01-04(周日)上班**
- 春节 02-15 ~ 02-23；**02-14(周六)、02-28(周六)上班**
- 清明 04-04 ~ 04-06
- 劳动节 05-01 ~ 05-05；**05-09(周六)上班**
- 端午 06-19 ~ 06-21
- 中秋 09-25 ~ 09-27
- 国庆 10-01 ~ 10-07；**09-20(周日)、10-10(周六)上班**

---

## 3. `src/holidays.mjs`（纯数据）

```js
export const DEFAULT_HOLIDAYS = ['2026-01-01', '2026-01-02', ...];      // 33 天
export const DEFAULT_EXTRA_WORKDAYS = ['2026-01-04', '2026-02-14', '2026-02-28', '2026-05-09', '2026-09-20', '2026-10-10'];
export const HOLIDAY_SOURCE = {
  year: 2026,
  title: '国务院办公厅关于2026年部分节假日安排的通知（国办发明电〔2025〕7号）',
  url: 'https://www.gov.cn/zhengce/content/202511/content_7047090.htm',
};
```

## 4. `src/core.mjs`（纯逻辑，宿主+客户端共用，禁止依赖 DOM/Node API）

被测导出（后续新增只能加，不能改签名）：

```js
export const DEFAULTS;                                  // 见 §2
export function parseHm(text): number | null            // '09:30' -> 570；非法 -> null
export function formatHm(minutes): string               // 570 -> '09:30'
export function dateKeyOf(date: Date): string           // 本地 YYYY-MM-DD
export function parseDateKey(key): Date | null          // 本地 00:00
export function normalizeConfig(patch): { config, errors: string[] }   // 合并 DEFAULTS + 校验，不抛
export function validateConfig(patch): Config           // 抛错版本
export function isWorkday(key, cfg): boolean
export function workdaysInMonth(year, monthIndex /*0-11*/, cfg): number
export function workdaysInWeek(key, cfg): number        // 周一~周日
export function paidMinutesPerDay(cfg): number          // >0，法定假日无关
export function computeRates(cfg, dateKey): {
  monthlySalary, monthlyWorkdays, dailyWage, hourlyWage, minuteWage,
  secondWage, weeklyWage, monthlyWage, weekWorkdays, paidMinutes, paidHours
}
export function earnedToday(cfg, now /*Date*/): {
  dateKey, isWorkday, status: 'rest'|'before'|'working'|'lunch'|'off',
  paidSecondsElapsed, paidSecondsTotal, todayEarned, todayTarget,
  todayProgress,        // 0..1
  monthEarned,          // 本月已赚（今天之前完整工作日 × 日工资 + 今日已赚）
  secondsToStart,       // >0 表示还没上班，否则 0
  secondsToEnd,         // >0 表示还没下班，否则 0
  rates                 // computeRates 同款对象
}
export function formatMoney(value, digits = 2): string  // 千分位 + 固定小数位
export function formatDuration(seconds): string         // '1小时 23分 45秒' / '45秒'
export function holidayDaysInMonth(year, monthIndex, cfg): number
export function monthSummary(cfg, year, monthIndex): {
  year, monthIndex, month, daysInMonth, workdays, holidayDays, restDays,
  monthlySalary, paidMinutes, paidHours, dailyWage, hourlyWage, minuteWage, secondWage
}
export function yearSummary(cfg, year): {
  year, months /*12 个 monthSummary*/, totalWorkdays, totalHolidayDays,
  monthlySalary, annualIncome, averageMonthlyWage, averageDailyWage,
  averageHourlyWage, averageMinuteWage, averageSecondWage,
  maxHolidayMonth /*假日最多的月（并列时工作日更少者优先）*/
}
```

「月度 / 全年视角」的换算口径：
- 选某月：日工资 = 实收月薪 ÷ 该月工作日；时/分/秒工资再按日有效工时逐级除
- 选全年平均：年收入 = 实收月薪 × 12；平均日薪 = 年收入 ÷ 全年工作日；平均时薪 = 平均日薪 ÷ 日有效工时
- 「全年假日最多」= 该年 12 个月里法定节假日天数最多的月份（并列时取工作日更少的、再取更早的月份）

`formatMoney` 规则：金额 `<1000` 用 `digits` 位小数（默认 2；计数器建议传 4）；`>=1000` 同样固定小数位但加千分位。

## 5. 宿主半侧 `lib/index.js`

```js
export const name = 'niuma';
export const inject = ['webServer'];
export async function apply(ctx, config = {}) { ... }
```

- settings 服务可选：`ctx.inject(['settings'], cb)` 里 `settings.register('niuma', Schema, { base: config })`；拿不到 settings 时就用 `config`+`DEFAULTS`，不得让插件加载失败。
- schemastery 用**动态 import**，失败则退化为「只读默认值，设置写接口返回 400」。
- 路由（全部走 `ctx.get('connection')?.requestRejection` 守卫，注册在 `ctx.effect` 里并返回 dispose）：
  - `GET /niuma/config` → `{ ok: true, data: { config, defaults: DEFAULTS, holidaySource: HOLIDAY_SOURCE } }`
  - `POST /niuma/settings`（JSON body = 部分配置）→ 校验通过 `{ ok: true, data: { config } }`；非法 `{ ok: false, error }` 400；body 上限 64KB
  - `GET /niuma/health` → `{ ok: true, data: { name, version, aliveAt } }`（version 读自身 package.json）
  - 只允许声明的 method，其它返回 405 + allow 头
- 参考实现：同作者的 `dsh-token-meter-panel` 仓库 `lib/index.js`（settings 注册、路由守卫、sendJson/queryOf 工具）。
- `cordis.patch.yml` 行 id 固定 `niuma`，name `dsh-niuma`，config 留 `{}`。

## 6. 浏览器半侧 `src/client/index.js`

构建见 `tools/build-client.mjs`（banner/footer 由构建注入包名；**不得手写模块包装**）。源码要求：

```js
export const inject = ['slots', 'locale'];
export function apply(ctx) {
  ctx.effect(() => ctx.locale.register('niuma', { zh, en }), 'niuma: dictionaries');
  ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({ name: 'sidebar.panellist', id: 'niuma', order: 120, label: () => '牛马', locale: 'niuma' }, Icon));
  ctx.slots.inject('main', () => ctx.slots.register({ name: 'main', key: 'niuma', locale: 'niuma' }, NiumaPanel));
}
```

- 只用 `React.createElement`（无 JSX），`import React from 'react'`。
- 启动时 `fetch('/niuma/config', { cache: 'no-store', credentials: 'same-origin' })`；失败时用内置 `DEFAULTS` 并显示「设置读取失败，使用默认值」，仍然秒级计时。
- 计时：`setInterval` 每 250ms 检查秒变化，每整秒用 `earnedToday(cfg, new Date())` 重算，卸载时清理。
- 面板 UI（可见验收见 §8）：
  1. 顶部大标题 + 状态徽标（休息日/未上班/搬砖中/午休中/已下班）
  2. **今日已赚** 超大数字（4 位小数，每秒跳动，`tabular-nums` + `nowrap`）
  3. 今日进度条 + 距上班/距下班倒计时
  4. 六宫格：秒工资、分工资、时工资、日工资、周工资、月工资
  5. 明细脚注：实收月薪、当月工作日数、日有效工时、今日目标
  6. 设置区（可折叠）：月薪、上下班、午休开关/起止/是否算工时、节假日与调休上班日（多行文本，一行一个 `YYYY-MM-DD`）；「保存」POST `/niuma/settings`，成功后就地刷新；非法输入就地提示，不白屏
- 样式：只用 DSH 主题变量 `var(--dsw-alias-*)`（参考 C 常量在参考实现的 335–355 行）；数字 `fontVariantNumeric: 'tabular-nums'`、`whiteSpace: 'nowrap'`；卡片圆角/阴影/底色统一。
- 中英双语 `zh`/`en` 字典须覆盖所有可见文案。

## 7. 测试与工具（必须全绿）

- `tools/verify-core.mjs`：纯逻辑断言（见 §8 数字验收）
- `tools/verify-holidays.mjs`：数据完整性（33 个放假日期 + 6 个调休上班日、升序去重、范围正确）
- `tools/smoke-host.mjs`：假 ctx（webServer 收集路由、settings 桩、effect 桩），不真实出网
- `tools/smoke-client.mjs`：用 `window.__ModuleLoader__` 加载 `lib/client.js`，验证 id/导出/两个 slot 注册
- `tools/smoke-render.mjs`：真实 bundle + 桩 React 状态，以「有数据」状态渲染整棵面板树（抓渲染期异常）
- `npm test` = 以上五项顺序跑，任一失败非零退出

## 8. 关键数字验收（固定样例，测试必须用这些）

`cfg = DEFAULTS` 且把 `monthlySalary` 设为 **22000**：

- 2026-10 月工作日：**18 天**（10/1–10/7 国庆 7 天、10/1 周四起；10/10 周六调休上班，10/24/25、31 周末不算，其余周一至周五算）
  - 校验：10 月共 31 天，其中 10/1(四) 10/2(五) 10/5(一) 10/6(二) 10/7(三) 为工作日却被国庆放假排除，另 10/12–16、10/19–23、10/26–30 各 5 天，10/8、10/9 两天，加 10/10 调休 1 天 → 5+5+5+2+1 = 18
- 日工资 = 22000 / 18 ≈ **1222.2222…**
- 日有效工时默认 = 8h（9:00–18:00 减午休 1h），时工资 ≈ **152.7778**，分工资 ≈ 2.5463，秒工资 ≈ 0.042438
- 2026-10-21（周三）09:00 → 今日已赚 0，status=before
- 2026-10-21 12:30 → 午休不算工时 → 已赚 = 3h × 时工资，status=lunch
- 2026-10-21 18:30 → 今日已赚 = 日工资，status=off，进度 1
- 2026-10-24（周六）11:00 → status=rest，今日已赚 0
- 2026-10-01（国庆）11:00 → status=rest
- 2026-10-10（周六调休上班）11:00 → status=working（2h）
- 午休算工时（lunchPaid=true）→ 日有效工时 = 9h，时工资变小；12:30 仍在 working
- 午休停用（lunchEnabled=false）→ 日有效工时 = 9h
- 「节假日不算让日工资变高」：把 10 月国庆 7 天从 holidays 移除后，10 月工作日 25 天，日工资变小（回归测试断言两种口径的比值）
- 2026 各月工作日：`[21,16,22,21,19,21,23,21,22,18,21,23]`（合计 **248 天**）；各月法定假日：`[3,9,0,3,5,3,0,0,3,7,0,0]`（合计 **33 天**）
- 全年平均（月薪 22000）：年收入 264000，平均日薪 = 264000 ÷ 248 ≈ **1064.5161**，平均时薪 ≈ **133.0645**
- 假日最多月份 = **2 月**（9 天法定假、16 个工作日）；去掉 2 月节假日后期望变成 10 月（回归测试断言）

## 9. 非目标（v0.1 不做）

- 跨夜班、多段休息、按周/按天不同的作息
- 加班费/调休时长累计、报税、五险一金明细
- 服务端定时任务；一切计算在客户端本地完成（宿主只存配置）
