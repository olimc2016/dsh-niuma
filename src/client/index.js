import React from 'react';
import {
  DEFAULTS,
  computeRates,
  earnedToday,
  formatDuration,
  formatMoney,
  monthSummary,
  normalizeConfig,
  yearSummary,
} from '../core.mjs';
import { HOLIDAY_SOURCE } from '../holidays.mjs';

/**
 * dsh-niuma 浏览器半侧：DSH 侧栏「牛马」入口 + 中栏工资实时计数器面板。
 *
 * 数据来源：
 *   GET  /niuma/config   —— 宿主侧配置（拿不到就用内置 DEFAULTS，仍然计时）
 *   POST /niuma/settings —— 面板内改配置
 *
 * 计算一律调用 ../core.mjs 的纯函数（宿主半侧同源），这里只做渲染与交互。
 * 样式只用 DSH 主题变量 --dsw-alias-*，深浅色主题下都跟随界面，无需主题检测。
 */

/** 包名在构建期由 tools/build-client.mjs 注入（define: __DSH_PLUGIN_NAME__）。 */
const PKG_NAME = typeof __DSH_PLUGIN_NAME__ === 'string' ? __DSH_PLUGIN_NAME__ : 'dsh-niuma';
const SHORT_NAME = PKG_NAME.replace(/^dsh-/, '');
/** 侧栏 id 与 main 面板 key 必须同名；SPEC 冻结为 'niuma'。 */
const SLOT_ID = SHORT_NAME === 'niuma' ? 'niuma' : SHORT_NAME;
const LOCALE_NS = SLOT_ID;
const ROUTE_BASE = `/${SHORT_NAME}`;

/* ------------------------------------------------------------------ *
 * 主题色（全部基于 DSH 的 --dsw-alias-* 变量，括号里是变量的兜底值）
 * ------------------------------------------------------------------ */
const C = {
  label: 'var(--dsw-alias-label-primary, #1f2329)',
  label2: 'var(--dsw-alias-label-secondary, #5a6472)',
  label3: 'var(--dsw-alias-label-tertiary, #8a94a6)',
  border: 'var(--dsw-alias-border-l2, rgba(128,128,128,.28))',
  border1: 'var(--dsw-alias-border-l1, rgba(128,128,128,.16))',
  layer1: 'var(--dsw-alias-bg-layer-1, rgba(128,128,128,.06))',
  layer2: 'var(--dsw-alias-bg-layer-2, rgba(128,128,128,.10))',
  brand: 'var(--dsw-alias-brand-primary, #2f7dff)',
  ok: 'var(--dsw-alias-state-success-primary, #3fb950)',
  warn: 'var(--dsw-alias-state-warn-primary, #e3b341)',
  error: 'var(--dsw-alias-state-error-primary, #f85149)',
};

/** 同排卡片统一：圆角 / 阴影 / 底色 / 边框完全一致。 */
const CARD = {
  border: `1px solid ${C.border1}`,
  borderRadius: 12,
  background: C.layer1,
  boxShadow: '0 1px 2px rgba(0,0,0,.07)',
  padding: '10px 12px',
  boxSizing: 'border-box',
};

/** 数字：等宽数位 + 不换行（每秒跳动时宽度不抖）。 */
const NUM = { fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' };

/** 金色金额：渐变金属质感 + 单色回退（不支持 background-clip:text 时显示金色）。 */
const GOLD = {
  color: '#D9A441',
  backgroundImage: 'linear-gradient(180deg, #FFE9A8 0%, #F2C14E 40%, #D79A2B 72%, #B87A16 100%)',
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  textShadow: '0 1px 0 rgba(0,0,0,.05)',
};
const GOLD_TINT = '#E7B84D';

/** 状态徽标配色：颜色与语义一致，深浅色都靠主题变量。 */
const STATUS_META = {
  rest: { key: 'statusRest', color: C.label3 },
  before: { key: 'statusBefore', color: C.warn },
  working: { key: 'statusWorking', color: C.ok },
  lunch: { key: 'statusLunch', color: C.brand },
  off: { key: 'statusOff', color: C.label2 },
};

/* ------------------------------------------------------------------ *
 * 文案（zh / en 覆盖面板所有可见文案）
 * ------------------------------------------------------------------ */
const zh = {
  'nav': '牛马',
  'title': '牛马加速器',
  'subtitle': '今日工资实时计数器',
  'earnedToday': '今日已赚',
  'todayOn': '今天',
  'perSecond': '每秒进账',
  'statusRest': '休息日',
  'statusBefore': '未上班',
  'statusWorking': '搬砖中',
  'statusLunch': '午休中',
  'statusOff': '已下班',
  'todayProgress': '今日进度',
  'progressOfTarget': '已赚 / 目标',
  'toStart': '距上班',
  'toEnd': '距下班',
  'secondWage': '秒工资',
  'minuteWage': '分工资',
  'hourlyWage': '时工资',
  'dailyWage': '日工资',
  'weeklyWage': '周工资',
  'monthlyWage': '月工资',
  'details': '明细',
  'monthlySalaryLabel': '实收月薪',
  'workdaysThisMonth': '当月工作日',
  'paidHoursPerDay': '日有效工时',
  'todayTarget': '今日目标',
  'monthEarned': '本月已赚',
  'holidaySource': '节假日来源',
  'holidaySourceLink': '国务院办公厅 2026 年节假日安排',
  'configLoading': '正在读取设置…',
  'configFailed': '设置读取失败，使用默认值',
  'retry': '重试',
  'settings': '设置',
  'settingsHint': '改完点「保存」生效；格式不对会在下方红字提示，不影响计时。',
  'salaryField': '实收月薪（元/月）',
  'workStartField': '上班时间',
  'workEndField': '下班时间',
  'lunchEnabledField': '启用午休',
  'lunchStartField': '午休开始',
  'lunchEndField': '午休结束',
  'lunchPaidField': '午休算工时',
  'holidaysField': '节假日（一行一个 YYYY-MM-DD）',
  'extraWorkdaysField': '调休上班日（一行一个 YYYY-MM-DD）',
  'itemsCount': '{n} 条',
  'save': '保存',
  'saving': '保存中…',
  'saved': '已保存',
  'saveFailed': '保存失败：',
  'dayUnit': '天',
  'hourUnit': '小时',
  'viewLabel': '查看',
  'viewCurrent': '本月',
  'viewYear': '全年平均',
  'monthUnit': '月',
  'holidayShort': '假',
  'currentHint': '按每月 {days} 个工作日、每天 {hours} 小时计',
  'monthHint': '{year} 年 {month} 月 · 工作日 {workdays} 天 · 法定假日 {holidays} 天',
  'yearHint': '{year} 全年 · {workdays} 个工作日 · 按年收入折算',
  'viewOnlyHint': '仅换算，不影响今日计数器',
  'yearWorkdays': '全年工作日',
  'yearIncome': '全年收入',
  'averageDaily': '平均日薪',
  'averageHourly': '平均时薪',
  'averageMinute': '平均分薪',
  'averageSecond': '平均秒薪',
  'monthWorkdaysCard': '工作日',
  'maxHolidayBadge': '全年假日最多',
  'maxHolidayNote': '全年假日最多：{month} 月（法定假日 {days} 天）',
  'maxHolidayThis': '全年假日最多的月份（法定假日 {days} 天）',
  'sectionRates': '工资换算',
  'sectionRatesHint': '按每月 {days} 个工作日、每天 {hours} 小时计',
  'sectionDetail': '今日口径明细',
  'restHint': '今天休息，好好躺平',
  'liveNow': '实时',
};

const en = {
  'nav': 'Niuma',
  'title': 'Niuma Booster',
  'subtitle': 'Real-time salary ticker',
  'earnedToday': 'Earned today',
  'todayOn': 'Today',
  'perSecond': 'Per second',
  'statusRest': 'Day off',
  'statusBefore': 'Not started',
  'statusWorking': 'Working',
  'statusLunch': 'Lunch break',
  'statusOff': 'Off work',
  'todayProgress': 'Today progress',
  'progressOfTarget': 'Earned / target',
  'toStart': 'Until start',
  'toEnd': 'Until off',
  'secondWage': 'Per second',
  'minuteWage': 'Per minute',
  'hourlyWage': 'Per hour',
  'dailyWage': 'Per day',
  'weeklyWage': 'Per week',
  'monthlyWage': 'Per month',
  'details': 'Details',
  'monthlySalaryLabel': 'Net monthly salary',
  'workdaysThisMonth': 'Workdays this month',
  'paidHoursPerDay': 'Paid hours / day',
  'todayTarget': "Today's target",
  'monthEarned': 'Earned this month',
  'holidaySource': 'Holiday data',
  'holidaySourceLink': 'State Council 2026 holiday schedule',
  'configLoading': 'Loading settings…',
  'configFailed': 'Failed to load settings, using defaults',
  'retry': 'Retry',
  'settings': 'Settings',
  'settingsHint': 'Click Save to apply. Invalid input is shown in red below; the ticker keeps running.',
  'salaryField': 'Net monthly salary (CNY)',
  'workStartField': 'Work start',
  'workEndField': 'Work end',
  'lunchEnabledField': 'Enable lunch break',
  'lunchStartField': 'Lunch start',
  'lunchEndField': 'Lunch end',
  'lunchPaidField': 'Lunch is paid',
  'holidaysField': 'Holidays (one YYYY-MM-DD per line)',
  'extraWorkdaysField': 'Make-up workdays (one YYYY-MM-DD per line)',
  'itemsCount': '{n} items',
  'save': 'Save',
  'saving': 'Saving…',
  'saved': 'Saved',
  'saveFailed': 'Save failed: ',
  'dayUnit': 'd',
  'hourUnit': 'h',
  'viewLabel': 'View',
  'viewCurrent': 'This month',
  'viewYear': 'Year average',
  'monthUnit': 'M',
  'holidayShort': 'hol.',
  'currentHint': '{days} workdays / month · {hours} h / day',
  'monthHint': '{year}-{month} · {workdays} workdays · {holidays} statutory holidays',
  'yearHint': '{year} · {workdays} workdays · averaged over the year',
  'viewOnlyHint': 'Conversion only — today\'s ticker is unaffected',
  'yearWorkdays': 'Workdays / year',
  'yearIncome': 'Annual income',
  'averageDaily': 'Avg per day',
  'averageHourly': 'Avg per hour',
  'averageMinute': 'Avg per minute',
  'averageSecond': 'Avg per second',
  'monthWorkdaysCard': 'Workdays',
  'maxHolidayBadge': 'Most holidays',
  'maxHolidayNote': 'Most holidays: month {month} ({days} statutory days)',
  'maxHolidayThis': 'The month with the most holidays ({days} statutory days)',
  'sectionRates': 'Pay rates',
  'sectionRatesHint': '{days} workdays / month · {hours} h / day',
  'sectionDetail': "Today's basis",
  'restHint': 'Day off — enjoy it',
  'liveNow': 'LIVE',
};

/** 组件在没有 locale 注入 t 时（测试 / 兜底）直接读中文表，绝不白屏。 */
const fallbackTranslate = (key) => (zh[key] != null ? zh[key] : key);

/* ------------------------------------------------------------------ *
 * 格式化小工具
 * ------------------------------------------------------------------ */
const money = (value, digits = 2) => `¥${formatMoney(value, digits)}`;

/** 8.00 -> '8'，8.50 -> '8.5'（工时展示用） */
function trimNumber(value, digits = 2) {
  const fixed = Number(value || 0).toFixed(digits);
  return fixed.replace(/\.?0+$/, '') || '0';
}

function splitDateLines(text) {
  return String(text == null ? '' : text)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/** 配置 -> 设置表单草稿（所有输入框都是字符串 / 布尔，编辑中不打断计时）。 */
function formFromConfig(config) {
  return {
    monthlySalary: String(config.monthlySalary == null ? '' : config.monthlySalary),
    workStart: String(config.workStart == null ? '' : config.workStart),
    workEnd: String(config.workEnd == null ? '' : config.workEnd),
    lunchEnabled: config.lunchEnabled !== false,
    lunchStart: String(config.lunchStart == null ? '' : config.lunchStart),
    lunchEnd: String(config.lunchEnd == null ? '' : config.lunchEnd),
    lunchPaid: config.lunchPaid === true,
    holidaysText: (config.holidays || []).join('\n'),
    extraWorkdaysText: (config.extraWorkdays || []).join('\n'),
  };
}

/** 设置表单草稿 -> 提交给宿主的配置 patch。 */
function patchFromForm(form) {
  const salaryText = String(form.monthlySalary == null ? '' : form.monthlySalary).trim();
  return {
    monthlySalary: salaryText === '' ? Number.NaN : Number(salaryText),
    workStart: String(form.workStart || '').trim(),
    workEnd: String(form.workEnd || '').trim(),
    lunchEnabled: Boolean(form.lunchEnabled),
    lunchStart: String(form.lunchStart || '').trim(),
    lunchEnd: String(form.lunchEnd || '').trim(),
    lunchPaid: Boolean(form.lunchPaid),
    holidays: splitDateLines(form.holidaysText),
    extraWorkdays: splitDateLines(form.extraWorkdaysText),
  };
}

/* ------------------------------------------------------------------ *
 * 数据获取
 * ------------------------------------------------------------------ */
/**
 * 读取宿主配置。失败时 state.status='failed'，面板用 DEFAULTS 继续计时并给出可读提示。
 * 轮询：只有「重试」按钮会 refresh。
 */
function useRemoteConfig() {
  const [state, setState] = React.useState({ status: 'loading', data: null, error: null });
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => {
    let alive = true;
    if (typeof fetch !== 'function') {
      setState({ status: 'failed', data: null, error: 'fetch unavailable' });
      return undefined;
    }
    setState((prev) => ({ status: prev.data ? 'ready' : 'loading', data: prev.data, error: null }));
    fetch(`${ROUTE_BASE}/config`, { cache: 'no-store', credentials: 'same-origin' })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const body = await response.json();
        if (!body || body.ok !== true) throw new Error((body && body.error) || 'bad payload');
        return body.data || null;
      })
      .then((data) => {
        if (alive) setState({ status: 'ready', data, error: null });
      })
      .catch((error) => {
        if (alive) {
          setState((prev) => ({
            status: 'failed',
            data: prev.data,
            error: String((error && error.message) || error),
          }));
        }
      });
    return () => { alive = false; };
  }, [tick]);
  const refresh = React.useCallback(() => setTick((n) => n + 1), []);
  return { ...state, refresh };
}

/** 当前时间：每 250ms 检查一次，只有整秒变化才 setState（每秒重算一次）。 */
function useSecondClock() {
  const [now, setNow] = React.useState(() => new Date());
  React.useEffect(() => {
    let lastSecond = -1;
    const timer = setInterval(() => {
      const second = Math.floor(Date.now() / 1000);
      if (second === lastSecond) return;
      lastSecond = second;
      setNow(new Date());
    }, 250);
    return () => clearInterval(timer);
  }, []);
  return now;
}

/* ------------------------------------------------------------------ *
 * 小组件
 * ------------------------------------------------------------------ */
/** 侧栏入口图标：钞票 + 硬币（自绘 SVG，不依赖 primitives）。 */
function NiumaIcon(props) {
  const size = (props && props.size) || 16;
  const active = props && props.active;
  return React.createElement('svg', {
    width: size,
    height: size,
    viewBox: '0 0 16 16',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.3,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    style: { opacity: active ? 1 : 0.82 },
    'aria-hidden': 'true',
  }, [
    React.createElement('rect', { key: 'a', x: '1.4', y: '3.6', width: '13.2', height: '8.8', rx: '1.8' }),
    React.createElement('circle', { key: 'b', cx: '8', cy: '8', r: '2.1' }),
    React.createElement('path', { key: 'c', d: 'M4 8h.01M12 8h.01' }),
  ]);
}

/** 全局小样式：只放动效 keyframes（内联 style 写不了 keyframes）。组件内联样式仍是主体。 */
const PANEL_CSS = `
@keyframes niumaPulse { 0%,100% { opacity: .95; transform: scale(1); } 50% { opacity: .3; transform: scale(.68); } }
@media (prefers-reduced-motion: reduce) { .niuma-live-dot { animation: none !important; } }
`;

function StyleTag() {
  return React.createElement('style', null, PANEL_CSS);
}

/** 状态徽标：休息日 / 未上班 / 搬砖中 / 午休中 / 已下班。 */
function StatusBadge(props) {
  const t = props.t;
  const meta = STATUS_META[props.status] || STATUS_META.rest;
  const live = props.status === 'working';
  return React.createElement('span', {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '4px 11px 4px 9px',
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 600,
      lineHeight: 1.5,
      color: meta.color,
      border: `1px solid color-mix(in srgb, ${meta.color} 42%, transparent)`,
      background: `color-mix(in srgb, ${meta.color} 12%, transparent)`,
      whiteSpace: 'nowrap',
    },
  }, [
    React.createElement('i', {
      key: 'dot',
      className: live ? 'niuma-live-dot' : undefined,
      style: { width: 6, height: 6, borderRadius: '50%', background: meta.color, display: 'inline-block' },
    }),
    t(meta.key),
  ]);
}

/** 小节标题：左标题 + 右口径提示（同一行，窄屏自动换行）。 */
function SectionTitle(props) {
  return React.createElement('div', {
    style: {
      display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
      gap: 8, flexWrap: 'wrap', margin: '2px 1px -1px',
    },
  }, [
    React.createElement('span', {
      key: 't',
      style: { fontSize: 12.5, fontWeight: 700, color: C.label2, letterSpacing: '.2px' },
    }, props.title),
    props.hint
      ? React.createElement('span', { key: 'h', style: { fontSize: 10.5, color: C.label3, ...NUM } }, props.hint)
      : null,
  ]);
}

/** 今日已赚主卡：渐变底 + 超大金额 + 进度条（视觉焦点只有这一处）。 */
function HeroCard(props) {
  const t = props.t;
  const snap = props.snap;
  const rates = snap.rates;
  const progress = Math.max(0, Math.min(1, Number(snap.todayProgress) || 0));
  const percentText = `${(progress * 100).toFixed(1)}%`;
  const live = snap.status === 'working';
  const rest = snap.status === 'rest';
  const heroBackground = 'linear-gradient(135deg, '
    + 'color-mix(in srgb, ' + C.brand + ' 17%, ' + C.layer1 + ') 0%, '
    + C.layer1 + ' 58%, ' + C.layer1 + ' 100%)';
  return React.createElement('div', {
    style: {
      position: 'relative',
      overflow: 'hidden',
      borderRadius: 18,
      padding: '16px 18px 14px',
      border: `1px solid color-mix(in srgb, ${GOLD_TINT} 34%, ${C.border1})`,
      background: heroBackground,
      boxShadow: '0 12px 30px rgba(0,0,0,.10)',
      boxSizing: 'border-box',
      minWidth: 0,
    },
  }, [
    React.createElement('div', {
      key: 'glow',
      'aria-hidden': 'true',
      style: {
        position: 'absolute', right: -52, top: -72, width: 188, height: 188, borderRadius: '50%',
        background: `radial-gradient(circle, color-mix(in srgb, ${GOLD_TINT} 30%, transparent) 0%, transparent 68%)`,
        pointerEvents: 'none',
      },
    }),
    React.createElement('div', {
      key: 'head',
      style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
    }, [
      React.createElement('span', {
        key: 'a',
        style: { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, color: C.label2 },
      }, [
        live
          ? React.createElement('i', {
            key: 'dot',
            className: 'niuma-live-dot',
            style: { width: 7, height: 7, borderRadius: '50%', background: C.ok, display: 'inline-block' },
          })
          : null,
        t('earnedToday'),
      ]),
      React.createElement('span', { key: 'b', style: { fontSize: 11, color: C.label3, ...NUM } },
        `${t('todayOn')} ${snap.dateKey}`),
    ]),
    React.createElement('div', {
      key: 'amt',
      style: { display: 'flex', alignItems: 'baseline', gap: 7, marginTop: 4, flexWrap: 'wrap' },
    }, [
      React.createElement('span', {
        key: 'cur',
        style: { fontSize: 24, fontWeight: 650, color: C.label2, ...NUM },
      }, '¥'),
      React.createElement('span', {
        key: 'val',
        style: {
          fontSize: 46, lineHeight: 1.12, fontWeight: 800, letterSpacing: '-1.2px',
          ...GOLD,
          ...NUM,
          ...(rest ? { opacity: 0.62 } : {}),
        },
      }, formatMoney(snap.todayEarned, 4)),
    ]),
    React.createElement('div', {
      key: 'chips',
      style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 5, flexWrap: 'wrap' },
    }, [
      React.createElement('span', {
        key: 'per',
        style: {
          display: 'inline-flex', alignItems: 'center', gap: 4,
          fontSize: 11.5, fontWeight: 600, color: C.label2,
          background: `color-mix(in srgb, ${C.brand} 11%, transparent)`,
          border: `1px solid color-mix(in srgb, ${C.brand} 22%, transparent)`,
          borderRadius: 999, padding: '2px 9px', ...NUM,
        },
      }, `${t('perSecond')} +${money(rates.secondWage, 4)}`),
      React.createElement('span', { key: 'target', style: { fontSize: 11, color: C.label3, ...NUM } },
        rest ? t('restHint') : `${t('todayTarget')} ${money(snap.todayTarget, 2)}`),
    ]),
    React.createElement('div', {
      key: 'progTop',
      style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginTop: 13, flexWrap: 'wrap' },
    }, [
      React.createElement('span', { key: 'l', style: { fontSize: 11.5, color: C.label3 } }, t('todayProgress')),
      React.createElement('span', { key: 'p', style: { fontSize: 12.5, fontWeight: 700, color: C.brand, ...NUM } }, percentText),
    ]),
    React.createElement('div', {
      key: 'bar',
      style: { marginTop: 5, height: 9, borderRadius: 999, background: `color-mix(in srgb, ${C.label} 9%, transparent)`, overflow: 'hidden' },
    }, [
      React.createElement('div', {
        key: 'fill',
        style: {
          width: `${(progress * 100).toFixed(2)}%`, height: '100%', borderRadius: 999,
          background: `linear-gradient(90deg, ${C.brand} 0%, color-mix(in srgb, ${C.brand} 55%, ${C.ok}) 100%)`,
          transition: 'width .35s linear',
        },
      }),
    ]),
    React.createElement('div', {
      key: 'progNum',
      style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginTop: 5, flexWrap: 'wrap', fontSize: 10.5, color: C.label3 },
    }, [
      React.createElement('span', { key: 'a' }, t('progressOfTarget')),
      React.createElement('span', { key: 'b', style: { color: C.label2, fontWeight: 600, ...NUM } },
        `${money(snap.todayEarned, 2)} / ${money(snap.todayTarget, 2)}`),
    ]),
  ]);
}

/** 倒计时两张小卡：距上班 / 距下班。 */
function CountdownRow(props) {
  const t = props.t;
  const snap = props.snap;
  const chip = (key, label, value, accent) => React.createElement('div', {
    key,
    style: {
      flex: '1 1 150px', minWidth: 132,
      display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8,
      padding: '9px 12px', borderRadius: 12,
      background: accent ? `color-mix(in srgb, ${GOLD_TINT} 9%, ${C.layer1})` : C.layer1,
      border: `1px solid ${accent ? `color-mix(in srgb, ${GOLD_TINT} 38%, ${C.border1})` : C.border1}`,
      boxSizing: 'border-box',
    },
  }, [
    React.createElement('span', {
      key: 'l',
      style: { fontSize: 11, color: accent ? C.label2 : C.label3, whiteSpace: 'nowrap' },
    }, label),
    React.createElement('span', {
      key: 'v',
      style: { fontSize: 13.5, fontWeight: 700, color: C.label, ...NUM },
    }, value),
  ]);
  return React.createElement('div', {
    style: { display: 'flex', flexWrap: 'wrap', gap: 9 },
  }, [
    chip('start', t('toStart'), Number(snap.secondsToStart) > 0 ? formatDuration(snap.secondsToStart) : '—'),
    chip('end', t('toEnd'), Number(snap.secondsToEnd) > 0 ? formatDuration(snap.secondsToEnd) : '—'),
    chip('month', t('monthEarned'), money(snap.monthEarned, 2), true),
  ]);
}

/** 六宫格：秒 / 分 / 时 / 日 / 周 / 月工资；第一张「秒工资」用品牌色强调。 */
const RATE_CARDS = [
  { key: 'secondWage', label: 'secondWage', digits: 4 },
  { key: 'minuteWage', label: 'minuteWage', digits: 4 },
  { key: 'hourlyWage', label: 'hourlyWage', digits: 2 },
  { key: 'dailyWage', label: 'dailyWage', digits: 2 },
  { key: 'weeklyWage', label: 'weeklyWage', digits: 2 },
  { key: 'monthlyWage', label: 'monthlyWage', digits: 2 },
];

/** 工资换算网格：由调用方给出 {key,label,value,accent} 卡片（本月 / 指定月 / 全年平均三种视角）。 */
function RatesGrid(props) {
  const cards = Array.isArray(props.cards) ? props.cards : [];
  return React.createElement('div', {
    style: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 },
  }, cards.map((card, index) => {
    const accent = card.accent === true;
    return React.createElement('div', {
      key: card.key,
      'data-stat': `stat-${index}`,
      style: {
        ...CARD,
        padding: '10px 11px',
        borderRadius: 12,
        ...(accent ? {
          border: `1px solid color-mix(in srgb, ${GOLD_TINT} 46%, ${C.border1})`,
          background: `color-mix(in srgb, ${GOLD_TINT} 9%, ${C.layer1})`,
        } : {}),
      },
    }, [
      React.createElement('div', {
        key: 'l',
        style: { fontSize: 11, color: accent ? C.label2 : C.label3, fontWeight: accent ? 600 : 400 },
      }, card.label),
      React.createElement('div', {
        key: 'v',
        style: {
          fontSize: 15.5, fontWeight: 700, letterSpacing: '-.2px',
          color: accent ? C.label : C.label, marginTop: 2, ...NUM,
        },
      }, card.value),
    ]);
  }));
}

/** 月份 / 全年视角选择器（原生 select，深浅色都用主题变量）。 */
function PeriodSelect(props) {
  const t = props.t;
  const year = props.year;
  const months = props.months;
  const style = {
    appearance: 'none',
    WebkitAppearance: 'none',
    border: `1px solid ${C.border}`,
    background: C.layer2,
    color: C.label,
    borderRadius: 8,
    padding: '4px 9px',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    outline: 'none',
    maxWidth: 220,
  };
  return React.createElement('select', {
    value: props.value,
    'aria-label': t('viewLabel'),
    onChange: (event) => props.onChange(event.target.value),
    style,
  }, [
    React.createElement('option', { key: 'current', value: 'current' }, t('viewCurrent')),
    ...months.map((month) => React.createElement('option', {
      key: `m${month.month}`,
      value: `m${month.month}`,
    }, `${month.month}${t('monthUnit')} · ${month.workdays}${t('dayUnit')} · ${t('holidayShort')}${month.holidayDays}`)),
    React.createElement('option', { key: 'year', value: 'year' }, `${year} ${t('viewYear')}`),
  ]);
}

/** 口径明细：月薪 / 工作日 / 日工时 / 今日目标 / 本月已赚 + 节假日来源。 */
function DetailsFooter(props) {
  const t = props.t;
  const snap = props.snap;
  const rates = snap.rates;
  const source = props.holidaySource || HOLIDAY_SOURCE;
  const items = [
    { key: 'salary', label: t('monthlySalaryLabel'), value: money(rates.monthlySalary, 2) },
    { key: 'workdays', label: t('workdaysThisMonth'), value: `${rates.monthlyWorkdays}${t('dayUnit')}` },
    { key: 'hours', label: t('paidHoursPerDay'), value: `${trimNumber(rates.paidHours, 2)}${t('hourUnit')}` },
    { key: 'target', label: t('todayTarget'), value: money(snap.todayTarget, 2) },
    { key: 'month', label: t('monthEarned'), value: money(snap.monthEarned, 2) },
  ];
  return React.createElement('div', {
    style: {
      background: C.layer1, border: `1px solid ${C.border1}`, borderRadius: 12,
      padding: '10px 12px', fontSize: 11, color: C.label3, lineHeight: 1.6,
    },
  }, [
    React.createElement('div', {
      key: 'items',
      style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(118px, 1fr))', gap: '7px 12px' },
    }, items.map((item) => React.createElement('div', {
      key: item.key,
      style: { minWidth: 0 },
    }, [
      React.createElement('div', { key: 'l', style: { fontSize: 10.5, color: C.label3 } }, item.label),
      React.createElement('div', {
        key: 'v',
        style: { fontSize: 13, fontWeight: 650, color: C.label2, ...NUM },
      }, item.value),
    ]))),
    React.createElement('div', {
      key: 'src',
      style: { display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 4, marginTop: 8, fontSize: 10.5 },
    }, [
      React.createElement('span', { key: 'l' }, `${t('holidaySource')}：`),
      React.createElement('a', {
        key: 'a',
        href: source.url,
        target: '_blank',
        rel: 'noreferrer',
        title: source.title,
        style: { color: C.brand, textDecoration: 'none', fontWeight: 600 },
      }, `${source.year} · ${t('holidaySourceLink')} ↗`),
      React.createElement('span', { key: 'n', style: { color: C.label3 } }, `（${source.title}）`),
    ]),
  ]);
}

/* ------------------------------------------------------------------ *
 * 设置区（<details> 原生折叠，不额外占一个 hook）
 * ------------------------------------------------------------------ */
function SettingsSection(props) {
  const t = props.t;
  const form = props.form;
  const setField = props.setField;
  const setCheck = props.setCheck;
  const save = props.save;
  const onSave = props.onSave;

  const inputStyle = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '6px 9px',
    borderRadius: 8,
    border: `1px solid ${C.border}`,
    background: C.layer2,
    color: C.label,
    fontSize: 13,
    fontVariantNumeric: 'tabular-nums',
    outline: 'none',
  };
  const labelStyle = { fontSize: 10.5, color: C.label3, fontWeight: 500 };

  const textField = (field, labelKey, placeholder) => React.createElement('label', {
    key: field,
    style: { display: 'flex', flexDirection: 'column', gap: 4, flex: '1 1 130px', minWidth: 112 },
  }, [
    React.createElement('span', { key: 'l', style: labelStyle }, t(labelKey)),
    React.createElement('input', {
      key: 'i',
      type: 'text',
      value: form[field],
      placeholder: placeholder || 'HH:mm',
      onChange: (event) => setField(field, event.target.value),
      style: inputStyle,
    }),
  ]);

  const checkField = (field, labelKey) => React.createElement('label', {
    key: field,
    style: {
      display: 'flex', alignItems: 'center', gap: 6, flex: '1 1 140px',
      fontSize: 12, color: C.label2, cursor: 'pointer', minHeight: 30,
    },
  }, [
    React.createElement('input', {
      key: 'i',
      type: 'checkbox',
      checked: Boolean(form[field]),
      onChange: (event) => setCheck(field, event.target.checked),
    }),
    React.createElement('span', { key: 'l' }, t(labelKey)),
  ]);

  const textareaField = (field, labelKey, rows = 5) => {
    const list = splitDateLines(form[field]);
    return React.createElement('label', {
      key: field,
      style: { display: 'flex', flexDirection: 'column', gap: 4, flex: '1 1 220px', minWidth: 200 },
    }, [
      React.createElement('span', {
        key: 'l',
        style: { ...labelStyle, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
      }, [
        React.createElement('span', { key: 'k' }, t(labelKey)),
        React.createElement('span', {
          key: 'n',
          style: { fontSize: 10, color: C.label3, fontWeight: 400, ...NUM },
        }, t('itemsCount').replace('{n}', String(list.length))),
      ]),
      React.createElement('textarea', {
        key: 'i',
        rows,
        value: form[field],
        spellCheck: false,
        onChange: (event) => setField(field, event.target.value),
        style: {
          ...inputStyle,
          resize: 'vertical',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
          lineHeight: 1.5,
          fontSize: 12,
        },
      }),
    ]);
  };

  return React.createElement('details', {
    style: { background: C.layer1, border: `1px solid ${C.border1}`, borderRadius: 12, padding: '11px 13px' },
  }, [
    React.createElement('summary', {
      key: 'sum',
      style: { cursor: 'pointer', fontSize: 13, fontWeight: 650, color: C.label, userSelect: 'none' },
    }, t('settings')),
    React.createElement('div', {
      key: 'hint',
      style: { fontSize: 10.5, color: C.label3, margin: '5px 0 10px' },
    }, t('settingsHint')),
    React.createElement('div', {
      key: 'fields',
      style: { display: 'flex', flexWrap: 'wrap', gap: 9 },
    }, [
      textField('monthlySalary', 'salaryField', '10000'),
      textField('workStart', 'workStartField', '09:00'),
      textField('workEnd', 'workEndField', '18:00'),
      textField('lunchStart', 'lunchStartField', '12:00'),
      textField('lunchEnd', 'lunchEndField', '13:00'),
      checkField('lunchEnabled', 'lunchEnabledField'),
      checkField('lunchPaid', 'lunchPaidField'),
    ]),
    React.createElement('div', {
      key: 'lists',
      style: { display: 'flex', flexWrap: 'wrap', gap: 9, marginTop: 9 },
    }, [
      textareaField('holidaysText', 'holidaysField', 8),
      textareaField('extraWorkdaysText', 'extraWorkdaysField', 6),
    ]),
    React.createElement('div', {
      key: 'actions',
      style: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 11 },
    }, [
      React.createElement('button', {
        key: 'save',
        type: 'button',
        onClick: onSave,
        disabled: save.status === 'saving',
        style: {
          border: 'none',
          color: 'var(--dsw-alias-brand-primary-foreground, #fff)',
          background: save.status === 'saving' ? `color-mix(in srgb, ${C.brand} 60%, transparent)` : C.brand,
          borderRadius: 8,
          padding: '7px 18px',
          fontSize: 13,
          fontWeight: 650,
          cursor: save.status === 'saving' ? 'default' : 'pointer',
          boxShadow: `0 2px 8px color-mix(in srgb, ${C.brand} 28%, transparent)`,
        },
      }, save.status === 'saving' ? t('saving') : t('save')),
      save.status === 'ok'
        ? React.createElement('span', { key: 'ok', style: { fontSize: 12, color: C.ok } }, save.message || t('saved'))
        : null,
      save.status === 'error'
        ? React.createElement('span', {
          key: 'err',
          style: { fontSize: 12, color: C.error, flex: '1 1 220px', whiteSpace: 'pre-wrap' },
        }, `${t('saveFailed')}${save.errors.join('；')}`)
        : null,
    ]),
  ]);
}

/* ------------------------------------------------------------------ *
 * 面板主体
 * ------------------------------------------------------------------ */
function NiumaPanel(props) {
  const t = props && typeof props.t === 'function' ? props.t : fallbackTranslate;

  const remote = useRemoteConfig();
  const now = useSecondClock();

  // 服务端配置 -> 规范化配置；坏数据/缺字段一律退回 DEFAULTS（计算不会抛）。
  const cfg = React.useMemo(() => {
    const raw = remote.data && remote.data.config ? remote.data.config : null;
    if (!raw) return DEFAULTS;
    try {
      const result = normalizeConfig(raw);
      return result.config || DEFAULTS;
    } catch (error) {
      return DEFAULTS;
    }
  }, [remote.data]);

  // 每秒重算（core 是纯函数，重算代价极小；已下班/休息日会稳定在日工资或 0）。
  const snap = React.useMemo(() => earnedToday(cfg, now), [cfg, now]);
  const rates = snap && snap.rates ? snap.rates : computeRates(cfg, snap && snap.dateKey);
  const baseForm = React.useMemo(() => formFromConfig(cfg), [cfg]);

  /**
   * 「工资换算」视角：本月（跟随今日口径）/ 指定月份 / 全年平均。
   * 只影响换算展示，不影响顶部「今日已赚」计数器（计数器永远按今天算）。
   */
  const viewYear = Number(String(snap && snap.dateKey ? snap.dateKey : '').slice(0, 4)) || new Date().getFullYear();
  const yearData = React.useMemo(() => yearSummary(cfg, viewYear), [cfg, viewYear]);
  const [view, setView] = React.useState('current');
  const selectedMonth = view.startsWith('m') ? yearData.months[Number(view.slice(1)) - 1] : null;
  const maxHolidayMonth = yearData.maxHolidayMonth;
  const maxHolidayText = t('maxHolidayNote')
    .replace('{month}', String(maxHolidayMonth.month))
    .replace('{days}', String(maxHolidayMonth.holidayDays));
  let viewCards;
  let viewHint;
  let viewNote;
  if (view === 'year') {
    viewCards = [
      { key: 'avgDaily', label: t('averageDaily'), value: money(yearData.averageDailyWage, 2), accent: true },
      { key: 'avgHourly', label: t('averageHourly'), value: money(yearData.averageHourlyWage, 2) },
      { key: 'avgMinute', label: t('averageMinute'), value: money(yearData.averageMinuteWage, 4) },
      { key: 'avgSecond', label: t('averageSecond'), value: money(yearData.averageSecondWage, 4) },
      { key: 'yearWorkdays', label: t('yearWorkdays'), value: `${yearData.totalWorkdays}${t('dayUnit')}` },
      { key: 'yearIncome', label: t('yearIncome'), value: money(yearData.annualIncome, 2) },
    ];
    viewHint = `${t('yearHint').replace('{year}', String(viewYear)).replace('{workdays}', String(yearData.totalWorkdays))} · ${t('viewOnlyHint')}`;
    viewNote = maxHolidayText;
  } else if (selectedMonth) {
    viewCards = [
      { key: 'monthlyWage', label: t('monthlyWage'), value: money(selectedMonth.monthlySalary, 2) },
      { key: 'dailyWage', label: t('dailyWage'), value: money(selectedMonth.dailyWage, 2), accent: true },
      { key: 'hourlyWage', label: t('hourlyWage'), value: money(selectedMonth.hourlyWage, 2) },
      { key: 'minuteWage', label: t('minuteWage'), value: money(selectedMonth.minuteWage, 4) },
      { key: 'secondWage', label: t('secondWage'), value: money(selectedMonth.secondWage, 4) },
      { key: 'monthWorkdays', label: t('monthWorkdaysCard'), value: `${selectedMonth.workdays}${t('dayUnit')}` },
    ];
    viewHint = `${t('monthHint')
      .replace('{year}', String(viewYear))
      .replace('{month}', String(selectedMonth.month))
      .replace('{workdays}', String(selectedMonth.workdays))
      .replace('{holidays}', String(selectedMonth.holidayDays))} · ${t('viewOnlyHint')}`;
    viewNote = selectedMonth.month === maxHolidayMonth.month
      ? `★ ${t('maxHolidayThis').replace('{days}', String(maxHolidayMonth.holidayDays))}`
      : maxHolidayText;
  } else {
    viewCards = RATE_CARDS.map((spec) => ({
      key: spec.key,
      label: t(spec.label),
      value: money(rates[spec.key], spec.digits),
      accent: spec.key === 'secondWage',
    }));
    viewHint = t('currentHint')
      .replace('{days}', String(rates.monthlyWorkdays))
      .replace('{hours}', trimNumber(rates.paidHours, 2));
    viewNote = maxHolidayText;
  }

  // 设置表单草稿：null = 还没改过，直接显示当前配置。
  const [draft, setDraft] = React.useState(null);
  const [save, setSave] = React.useState({ status: 'idle', errors: [], message: '' });
  const form = draft || baseForm;

  const setField = (field, value) => {
    setDraft((prev) => ({ ...(prev || baseForm), [field]: value }));
    if (save.status !== 'idle') setSave({ status: 'idle', errors: [], message: '' });
  };
  const setCheck = (field, checked) => setField(field, checked);

  const onSave = () => {
    const patch = patchFromForm(form);
    // 先在本地跑同一套校验：非法输入就地红字，不发请求也不会白屏。
    const checked = normalizeConfig(patch);
    if (checked.errors && checked.errors.length > 0) {
      setSave({ status: 'error', errors: checked.errors, message: '' });
      return;
    }
    if (typeof fetch !== 'function') {
      setSave({ status: 'error', errors: ['fetch unavailable'], message: '' });
      return;
    }
    setSave({ status: 'saving', errors: [], message: '' });
    fetch(`${ROUTE_BASE}/settings`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(patch),
    })
      .then(async (response) => {
        let body = null;
        try {
          body = await response.json();
        } catch (error) {
          body = null;
        }
        if (!response.ok || !body || body.ok !== true) {
          throw new Error((body && body.error) || `HTTP ${response.status}`);
        }
        return body;
      })
      .then(() => {
        setDraft(null);
        setSave({ status: 'ok', errors: [], message: t('saved') });
        remote.refresh();
      })
      .catch((error) => {
        setSave({ status: 'error', errors: [String((error && error.message) || error)], message: '' });
      });
  };

  const holidaySource = (remote.data && remote.data.holidaySource) || HOLIDAY_SOURCE;
  const banner = remote.status === 'failed'
    ? {
      color: C.warn,
      text: `${t('configFailed')}${remote.error ? `（${remote.error}）` : ''}`,
      retry: true,
    }
    : remote.status === 'loading'
      ? { color: C.label3, text: t('configLoading'), retry: false }
      : null;

  return React.createElement('div', {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 11,
      minWidth: 0,
      maxWidth: 760,
      margin: '0 auto',
      padding: '4px 2px 18px',
      fontSize: 13,
      lineHeight: 1.45,
      color: C.label,
      fontFamily: 'inherit',
    },
  }, [
    React.createElement(StyleTag, { key: 'css' }),
    // 品牌头：图标块 + 标题/副标题 + 状态徽标
    React.createElement('div', {
      key: 'head',
      style: { display: 'flex', alignItems: 'center', gap: 11, flexWrap: 'wrap' },
    }, [
      React.createElement('div', {
        key: 'icon',
        style: {
          width: 38, height: 38, borderRadius: 12, flex: '0 0 auto',
          display: 'grid', placeItems: 'center',
          color: C.brand,
          background: `color-mix(in srgb, ${C.brand} 13%, transparent)`,
          border: `1px solid color-mix(in srgb, ${C.brand} 26%, transparent)`,
        },
      }, React.createElement(NiumaIcon, { size: 21 })),
      React.createElement('div', { key: 'tt', style: { marginRight: 'auto', minWidth: 0 } }, [
        React.createElement('div', {
          key: 't',
          style: { fontSize: 17.5, fontWeight: 800, letterSpacing: '-.3px', color: C.label },
        }, t('title')),
        React.createElement('div', {
          key: 's',
          style: { fontSize: 11, color: C.label3, marginTop: 1 },
        }, t('subtitle')),
      ]),
      React.createElement(StatusBadge, { key: 'badge', t, status: snap.status }),
    ]),

    // 配置读取状态
    banner
      ? React.createElement('div', {
        key: 'banner',
        style: {
          display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
          fontSize: 12, color: banner.color, padding: '6px 10px',
          borderRadius: 9, border: `1px solid color-mix(in srgb, ${banner.color} 45%, transparent)`,
          background: `color-mix(in srgb, ${banner.color} 10%, transparent)`,
        },
      }, [
        React.createElement('span', { key: 'txt', style: { flex: '1 1 160px' } }, banner.text),
        banner.retry
          ? React.createElement('button', {
            key: 'retry',
            type: 'button',
            onClick: remote.refresh,
            style: {
              border: `1px solid ${banner.color}`, color: banner.color, background: 'transparent',
              borderRadius: 6, padding: '2px 10px', fontSize: 12, cursor: 'pointer',
            },
          }, t('retry'))
          : null,
      ])
      : null,

    React.createElement(HeroCard, { key: 'hero', t, snap }),
    React.createElement(CountdownRow, { key: 'countdown', t, snap }),
    React.createElement('div', {
      key: 'ratesHead',
      style: {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 8, flexWrap: 'wrap', margin: '2px 1px -1px',
      },
    }, [
      React.createElement('span', {
        key: 't',
        style: { fontSize: 12.5, fontWeight: 700, color: C.label2, letterSpacing: '.2px' },
      }, t('sectionRates')),
      React.createElement(PeriodSelect, {
        key: 'period',
        t,
        value: view,
        onChange: setView,
        year: viewYear,
        months: yearData.months,
      }),
    ]),
    React.createElement('div', {
      key: 'ratesHint',
      style: { fontSize: 10.5, color: C.label3, ...NUM },
    }, viewHint),
    React.createElement(RatesGrid, { key: 'rates', cards: viewCards }),
    viewNote
      ? React.createElement('div', {
        key: 'ratesNote',
        style: { fontSize: 10.5, color: C.label3, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
      }, [
        React.createElement('span', {
          key: 'badge',
          style: {
            color: C.label2, fontWeight: 600,
            background: `color-mix(in srgb, ${GOLD_TINT} 14%, transparent)`,
            border: `1px solid color-mix(in srgb, ${GOLD_TINT} 32%, transparent)`,
            borderRadius: 999, padding: '1px 8px',
          },
        }, t('maxHolidayBadge')),
        React.createElement('span', { key: 'txt' }, viewNote),
      ])
      : null,
    React.createElement(SectionTitle, { key: 'detailTitle', title: t('sectionDetail') }),
    React.createElement(DetailsFooter, { key: 'footer', t, snap, holidaySource }),
    React.createElement(SettingsSection, {
      key: 'settings',
      t,
      form,
      setField,
      setCheck,
      save,
      onSave,
    }),
  ]);
}

/* ------------------------------------------------------------------ *
 * 插件体
 * ------------------------------------------------------------------ */
export const inject = ['slots', 'locale'];

export function apply(ctx) {
  ctx.effect(() => ctx.locale.register(LOCALE_NS, { zh, en }), `${LOCALE_NS}: dictionaries`);

  // 侧栏入口：id 必须与 main 面板的 key 同名，否则点侧栏选不中面板。
  ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
    name: 'sidebar.panellist',
    id: SLOT_ID,
    order: 120,
    label: () => '牛马',
    locale: LOCALE_NS,
  }, NiumaIcon));

  // 中栏独立面板
  ctx.slots.inject('main', () => ctx.slots.register({
    name: 'main',
    key: SLOT_ID,
    locale: LOCALE_NS,
  }, NiumaPanel));
}
