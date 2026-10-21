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
import {
  HOLIDAY_BLOCKS,
  HOLIDAY_BLOCKS_2027_ESTIMATED,
  HOLIDAY_ESTIMATE_2027,
  HOLIDAY_SOURCE,
} from '../holidays.mjs';

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
  'monthWorkedDays': '本月已工作',
  'monthRemainingDays': '剩余工作日',
  'holidaySourceLink': '国务院办公厅 2026 年节假日安排',
  'configLoading': '正在读取设置…',
  'configFailed': '设置读取失败，使用默认值',
  'retry': '重试',
  'settings': '设置',
  'settingsHint': '改完点「保存」生效；格式不对会在下方红字提示，不影响计时。',
  'salaryField': '实收月薪',
  'groupSalary': '工资',
  'groupWorkTime': '工作时间',
  'groupLunch': '午休',
  'salaryUnit': '元 / 月',
  'workStartField': '上班时间',
  'workEndField': '下班时间',
  'lunchEnabledField': '启用午休',
  'lunchEnabledShort': '启用',
  'lunchStartField': '午休开始',
  'lunchEndField': '午休结束',
  'lunchPaidField': '午休算工时',
  'lunchPaidShort': '算工时',
  'holidaysCardTitle': '节假日安排',
  'holidays2026Label': '2026 年（官方）',
  'holidays2027Label': '2027 年（预估）',
  'holidayEstimateTag': '预估',
  'holidayEstimateNote': '官方尚未公布，以上为按规则与惯例推算，仅供参考，以国务院通知为准。',
  'holidayEstimateShort': '2027 为预估值',
  'settingsDataNote': '节假日与调休数据见上方「节假日安排」卡片（2027 年为预估值，不可在本页编辑）。',

  'holidaysCardSub': '法定假日 {days} 天 · 调休上班 {extra} 天',
  'holidaysDaysShort': '{days} 天',
  'holidaysExtraNote': '调休上班日 {extra} 天（周末补班，按工作日计）',
  'holidayNewYear': '元旦',
  'holidaySpring': '春节',
  'holidayQingming': '清明',
  'holidayLabour': '劳动节',
  'holidayDragon': '端午',
  'holidayMidAutumn': '中秋',
  'holidayNational': '国庆',
  'save': '保存',
  'saving': '保存中…',
  'saved': '已保存',
  'saveFailed': '保存失败：',
  'dayUnit': '天',
  'hourUnit': '小时',
  'minuteUnit': '分钟',
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
  'monthWorkedDays': 'Worked this month',
  'monthRemainingDays': 'Workdays left',
  'holidaySourceLink': 'State Council 2026 holiday schedule',
  'configLoading': 'Loading settings…',
  'configFailed': 'Failed to load settings, using defaults',
  'retry': 'Retry',
  'settings': 'Settings',
  'settingsHint': 'Click Save to apply. Invalid input is shown in red below; the ticker keeps running.',
  'salaryField': 'Net monthly salary',
  'groupSalary': 'Salary',
  'groupWorkTime': 'Working hours',
  'groupLunch': 'Lunch break',
  'salaryUnit': 'CNY / month',
  'workStartField': 'Work start',
  'workEndField': 'Work end',
  'lunchEnabledField': 'Enable lunch break',
  'lunchEnabledShort': 'On',
  'lunchStartField': 'Lunch start',
  'lunchEndField': 'Lunch end',
  'lunchPaidField': 'Lunch is paid',
  'lunchPaidShort': 'Paid',
  'holidaysCardTitle': 'Holiday calendar',
  'holidays2026Label': '2026 (official)',
  'holidays2027Label': '2027 (estimated)',
  'holidayEstimateTag': 'estimate',
  'holidayEstimateNote': 'Not announced officially yet — estimated from the rules and past practice, for reference only.',
  'holidayEstimateShort': '2027 is estimated',
  'settingsDataNote': 'Holiday data lives in the calendar card above (2027 values are estimates and not editable here).',

  'holidaysCardSub': '{days} statutory days · {extra} make-up workdays',
  'holidaysDaysShort': '{days} d',
  'holidaysExtraNote': '{extra} make-up workdays (weekend shifts, counted as workdays)',
  'holidayNewYear': "New Year's Day",
  'holidaySpring': 'Spring Festival',
  'holidayQingming': 'Qingming',
  'holidayLabour': 'Labour Day',
  'holidayDragon': 'Dragon Boat',
  'holidayMidAutumn': 'Mid-Autumn',
  'holidayNational': 'National Day',
  'save': 'Save',
  'saving': 'Saving…',
  'saved': 'Saved',
  'saveFailed': 'Save failed: ',
  'dayUnit': 'd',
  'hourUnit': 'h',
  'minuteUnit': 'min',
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
const money = (value, digits = 2) => `${formatMoney(value, digits)} 元`;

/** 8.00 -> '8'，8.50 -> '8.5'（工时展示用） */
function trimNumber(value, digits = 2) {
  const fixed = Number(value || 0).toFixed(digits);
  return fixed.replace(/\.?0+$/, '') || '0';
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
        key: 'val',
        style: {
          fontSize: 46, lineHeight: 1.12, fontWeight: 800, letterSpacing: '-1.2px',
          ...GOLD,
          ...NUM,
          ...(rest ? { opacity: 0.62 } : {}),
        },
      }, formatMoney(snap.todayEarned, 4)),
      React.createElement('span', {
        key: 'unit',
        style: { fontSize: 18, fontWeight: 700, color: C.label2, ...NUM },
      }, '元'),
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
      flex: '1 1 120px', minWidth: 116,
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

/** 口径明细：月薪 / 工作日 / 日工时 / 今日目标 / 本月已赚（节假日来源统一放在节假日卡片）。 */
function DetailsFooter(props) {
  const t = props.t;
  const snap = props.snap;
  const rates = snap.rates;
  const items = [
    { key: 'salary', label: t('monthlySalaryLabel'), value: money(rates.monthlySalary, 2) },
    { key: 'workdays', label: t('workdaysThisMonth'), value: `${rates.monthlyWorkdays}${t('dayUnit')}` },
    { key: 'hours', label: t('paidHoursPerDay'), value: `${trimNumber(rates.paidHours, 2)}${t('hourUnit')}` },
    { key: 'target', label: t('todayTarget'), value: money(snap.todayTarget, 2) },
    { key: 'month', label: t('monthEarned'), value: money(snap.monthEarned, 2) },
    { key: 'worked', label: t('monthWorkedDays'), value: `${snap.monthWorkdaysDone}${t('dayUnit')}` },
    { key: 'left', label: t('monthRemainingDays'), value: `${snap.monthWorkdaysLeft}${t('dayUnit')}` },
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
  ]);
}

/** 节假日卡片：2026 官方 / 2027 预估两段，七段假日区段 + 调休上班日统计。 */
const HOLIDAY_LABEL_KEYS = {
  newYear: 'holidayNewYear',
  spring: 'holidaySpring',
  qingming: 'holidayQingming',
  labour: 'holidayLabour',
  dragon: 'holidayDragon',
  midAutumn: 'holidayMidAutumn',
  national: 'holidayNational',
};

function HolidaysCard(props) {
  const t = props.t;
  const source = props.holidaySource || HOLIDAY_SOURCE;
  const extra = Array.isArray(props.extraWorkdays) ? props.extraWorkdays : [];
  const countYear = (year) => extra.filter((key) => String(key).startsWith(`${year}-`)).length;
  const shortDate = (key) => key.slice(5).replace('-', '/');
  const sections = [
    {
      key: 'official',
      label: t('holidays2026Label'),
      blocks: HOLIDAY_BLOCKS,
      estimated: false,
      extraCount: countYear(2026),
      tag: null,
    },
    {
      key: 'estimate',
      label: t('holidays2027Label'),
      blocks: HOLIDAY_BLOCKS_2027_ESTIMATED,
      estimated: true,
      extraCount: countYear(2027),
      tag: t('holidayEstimateTag'),
    },
  ];
  const sumDays = (blocks) => blocks.reduce((sum, block) => sum + block.days, 0);
  const renderSection = (section) => React.createElement('div', { key: section.key, style: { marginTop: section.key === 'official' ? 8 : 12 } }, [
    React.createElement('div', {
      key: 'head',
      style: { display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 },
    }, [
      React.createElement('span', { key: 'l', style: { fontSize: 11.5, fontWeight: 700, color: C.label2 } }, section.label),
      section.tag
        ? React.createElement('span', {
          key: 'tag',
          style: {
            fontSize: 9.5, fontWeight: 700, color: C.label2,
            border: `1px dashed color-mix(in srgb, ${GOLD_TINT} 60%, transparent)`,
            borderRadius: 999, padding: '0 6px', lineHeight: 1.6,
          },
        }, section.tag)
        : null,
      React.createElement('span', { key: 's', style: { marginLeft: 'auto', fontSize: 10, color: C.label3, ...NUM } },
        t('holidaysCardSub').replace('{days}', String(sumDays(section.blocks))).replace('{extra}', String(section.extraCount))),
    ]),
    React.createElement('div', {
      key: 'grid',
      style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(118px, 1fr))', gap: 7, marginTop: 6 },
    }, section.blocks.map((block) => React.createElement('div', {
      key: block.id,
      style: {
        border: section.estimated
          ? `1px dashed color-mix(in srgb, ${GOLD_TINT} 40%, ${C.border1})`
          : `1px solid ${C.border1}`,
        borderRadius: 9,
        padding: '6px 8px',
        background: `color-mix(in srgb, ${GOLD_TINT} ${section.estimated ? 3 : 6}%, transparent)`,
      },
    }, [
      React.createElement('div', {
        key: 'row',
        style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 6 },
      }, [
        React.createElement('span', { key: 'n', style: { fontSize: 11.5, fontWeight: 650, color: C.label } },
          t(HOLIDAY_LABEL_KEYS[block.id])),
        React.createElement('span', {
          key: 'd',
          style: {
            fontSize: 10, fontWeight: 700, color: C.label2,
            background: `color-mix(in srgb, ${GOLD_TINT} 16%, transparent)`,
            borderRadius: 999, padding: '0 6px', ...NUM,
          },
        }, t('holidaysDaysShort').replace('{days}', String(block.days))),
      ]),
      React.createElement('div', { key: 'r', style: { fontSize: 10, color: C.label3, marginTop: 2, ...NUM } },
        `${shortDate(block.from)} – ${shortDate(block.to)}`),
    ]))),
    section.estimated
      ? React.createElement('div', {
        key: 'est-note',
        style: { marginTop: 6, fontSize: 10.5, color: C.label3, lineHeight: 1.5 },
      }, `⚠ ${t('holidayEstimateNote')}`)
      : null,
  ]);
  return React.createElement('div', {
    style: {
      background: C.layer1,
      border: `1px solid ${C.border1}`,
      borderRadius: 12,
      padding: '10px 12px',
    },
  }, [
    React.createElement('div', {
      key: 'title',
      style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
    }, [
      React.createElement('span', { key: 't', style: { fontSize: 12.5, fontWeight: 700, color: C.label2, letterSpacing: '.2px' } },
        t('holidaysCardTitle')),
      React.createElement('a', {
        key: 'a',
        href: source.url,
        target: '_blank',
        rel: 'noreferrer',
        title: source.title,
        style: { fontSize: 10.5, color: C.brand, textDecoration: 'none', fontWeight: 600 },
      }, `${source.year} ${t('holidaySourceLink')} ↗`),
    ]),
    sections.map(renderSection),
    React.createElement('div', {
      key: 'foot',
      style: { marginTop: 8, fontSize: 10.5, color: C.label3 },
    }, t('holidaysExtraNote').replace('{extra}', String(extra.length))),
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

  // E 方案：行式短控件 —— 标签固定左列，控件都按内容定宽（不拉满）
  const rowStyle = {
    display: 'flex', alignItems: 'center', gap: 10,
    minHeight: 33, padding: '2px 0', borderTop: `1px solid ${C.border1}`,
  };
  const rowKeyStyle = { width: 62, flex: '0 0 62px', fontSize: 11.5, color: C.label3 };
  const rowValStyle = { display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', minWidth: 0 };
  const inputStyle = {
    boxSizing: 'border-box', width: 88, minHeight: 28, padding: '4px 8px',
    borderRadius: 7, border: `1px solid ${C.border}`, background: C.layer2,
    color: C.label, fontSize: 12.5, fontVariantNumeric: 'tabular-nums', outline: 'none',
  };
  const selectStyle = {
    boxSizing: 'border-box', width: 48, minHeight: 28, padding: '4px 2px 4px 6px',
    borderRadius: 7, border: `1px solid ${C.border}`, background: C.layer2,
    color: C.label, fontSize: 12.5, fontVariantNumeric: 'tabular-nums', outline: 'none', cursor: 'pointer',
  };
  const unitStyle = { fontSize: 10.5, color: C.label3, whiteSpace: 'nowrap' };
  const dashStyle = { fontSize: 11, color: C.label3, margin: '0 1px' };
  const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

  const row = (key, label, values) => React.createElement('div', { key, style: rowStyle }, [
    React.createElement('span', { key: 'k', style: rowKeyStyle }, label),
    React.createElement('div', { key: 'v', style: rowValStyle }, values),
  ]);

  /** 24 小时制时间：小时/分钟两个下拉，各 46px（不受浏览器 locale 影响）。 */
  const timeSelects = (field, label, disabled = false) => {
    const [rawHour = '00', rawMinute = '00'] = String(form[field] || '00:00').split(':');
    const hour = HOUR_OPTIONS.includes(rawHour) ? rawHour : '00';
    const minute = MINUTE_OPTIONS.includes(rawMinute) ? rawMinute : '00';
    const commit = (nextHour, nextMinute) => setField(field, `${nextHour}:${nextMinute}`);
    const style = { ...selectStyle, opacity: disabled ? 0.45 : 1, cursor: disabled ? 'default' : 'pointer' };
    return React.createElement('span', { key: field, style: { display: 'inline-flex', alignItems: 'center', gap: 2 } }, [
      React.createElement('select', {
        key: 'h', value: hour, disabled, 'aria-label': `${label} ${t('hourUnit')}`,
        onChange: (event) => commit(event.target.value, minute), style,
      }, HOUR_OPTIONS.map((value) => React.createElement('option', { key: value, value }, value))),
      React.createElement('span', { key: 'c', style: { color: C.label3, fontWeight: 700, fontSize: 12 } }, ':'),
      React.createElement('select', {
        key: 'm', value: minute, disabled, 'aria-label': `${label} ${t('minuteUnit')}`,
        onChange: (event) => commit(hour, event.target.value), style,
      }, MINUTE_OPTIONS.map((value) => React.createElement('option', { key: value, value }, value))),
    ]);
  };

  const timeRange = (startField, endField, label, disabled) => React.createElement('span', {
    key: `${startField}-${endField}`,
    style: { display: 'inline-flex', alignItems: 'center', gap: 2 },
  }, [
    timeSelects(startField, label, disabled),
    React.createElement('span', { key: 'dash', style: dashStyle }, '–'),
    timeSelects(endField, label, disabled),
  ]);

  const toggle = (field, labelKey, disabled) => React.createElement('label', {
    key: field,
    style: {
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '2px 6px', borderRadius: 8,
      border: `1px solid ${C.border1}`, background: C.layer2,
      fontSize: 10.5, color: disabled ? C.label3 : C.label2, whiteSpace: 'nowrap',
      cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.55 : 1,
    },
  }, [
    React.createElement('input', {
      key: 'i', type: 'checkbox', checked: Boolean(form[field]), disabled,
      onChange: (event) => setCheck(field, event.target.checked),
      style: { accentColor: GOLD_TINT, width: 13, height: 13, margin: 0, cursor: 'inherit' },
    }),
    React.createElement('span', { key: 'l' }, t(labelKey)),
  ]);

  const lunchDisabled = !form.lunchEnabled;

  return React.createElement('details', {
    open: true,
    style: { background: C.layer1, border: `1px solid ${C.border1}`, borderRadius: 12, padding: '10px 12px' },
  }, [
    React.createElement('summary', {
      key: 'sum',
      style: { cursor: 'pointer', fontSize: 12.5, fontWeight: 650, color: C.label, userSelect: 'none' },
    }, t('settings')),
    React.createElement('div', { key: 'body', style: { marginTop: 7 } }, [
      row('salary', t('salaryField'), [
        React.createElement('input', {
          key: 'i', type: 'text', inputMode: 'decimal', value: form.monthlySalary, placeholder: '10000',
          onChange: (event) => setField('monthlySalary', event.target.value), style: inputStyle,
        }),
        React.createElement('span', { key: 'u', style: unitStyle }, t('salaryUnit')),
      ]),
      row('worktime', t('groupWorkTime'), [
        timeRange('workStart', 'workEnd', t('groupWorkTime'), false),
      ]),
      row('lunch', t('groupLunch'), [
        // 时间在前、两个开关在后（放到行尾）
        timeRange('lunchStart', 'lunchEnd', t('groupLunch'), lunchDisabled),
        toggle('lunchEnabled', 'lunchEnabledShort', false),
        toggle('lunchPaid', 'lunchPaidShort', lunchDisabled),
      ]),
    ]),
    React.createElement('div', {
      key: 'actions',
      style: { display: 'flex', alignItems: 'center', gap: 10, marginTop: 7, paddingTop: 7, borderTop: `1px solid ${C.border1}` },
    }, [
      React.createElement('button', {
        key: 'save',
        type: 'button',
        onClick: onSave,
        disabled: save.status === 'saving',
        style: {
          border: `1px solid color-mix(in srgb, ${GOLD_TINT} 72%, rgba(0,0,0,.18))`,
          color: '#3A2A05',
          background: save.status === 'saving'
            ? `color-mix(in srgb, ${GOLD_TINT} 52%, #fff)`
            : 'linear-gradient(180deg, #F8DC86 0%, #EFC258 52%, #D99D2C 100%)',
          borderRadius: 8,
          padding: '5px 16px',
          fontSize: 12.5,
          fontWeight: 700,
          letterSpacing: '.3px',
          cursor: save.status === 'saving' ? 'default' : 'pointer',
          opacity: save.status === 'saving' ? 0.72 : 1,
          boxShadow: `0 2px 9px color-mix(in srgb, ${GOLD_TINT} 34%, transparent), inset 0 1px 0 rgba(255,255,255,.45)`,
          textShadow: '0 1px 0 rgba(255,255,255,.28)',
        },
      }, save.status === 'saving' ? t('saving') : t('save')),
      save.status === 'ok'
        ? React.createElement('span', { key: 'ok', style: { fontSize: 11.5, color: C.ok } }, save.message || t('saved'))
        : null,
      save.status === 'error'
        ? React.createElement('span', {
          key: 'err',
          style: { fontSize: 11.5, color: C.error, flex: '1 1 200px', whiteSpace: 'pre-wrap' },
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
  const yearEstimated = viewYear === HOLIDAY_ESTIMATE_2027.year;
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
    // 与「本月」保持同一阅读顺序：秒 → 分 → 时 → 日，再放该视角的汇总项
    viewCards = [
      { key: 'avgSecond', label: t('averageSecond'), value: money(yearData.averageSecondWage, 4), accent: true },
      { key: 'avgMinute', label: t('averageMinute'), value: money(yearData.averageMinuteWage, 4) },
      { key: 'avgHourly', label: t('averageHourly'), value: money(yearData.averageHourlyWage, 2) },
      { key: 'avgDaily', label: t('averageDaily'), value: money(yearData.averageDailyWage, 2) },
      { key: 'yearWorkdays', label: t('yearWorkdays'), value: `${yearData.totalWorkdays}${t('dayUnit')}` },
      { key: 'yearIncome', label: t('yearIncome'), value: money(yearData.annualIncome, 2) },
    ];
    viewHint = `${t('yearHint').replace('{year}', String(viewYear)).replace('{workdays}', String(yearData.totalWorkdays))} · ${t('viewOnlyHint')}`
      + (yearEstimated ? ` · ${t('holidayEstimateShort')}` : '');
    viewNote = yearEstimated ? t('holidayEstimateNote') : maxHolidayText;
  } else if (selectedMonth) {
    // 与「本月」保持同一阅读顺序：秒 → 分 → 时 → 日 → 月 → 工作日
    viewCards = [
      { key: 'secondWage', label: t('secondWage'), value: money(selectedMonth.secondWage, 4), accent: true },
      { key: 'minuteWage', label: t('minuteWage'), value: money(selectedMonth.minuteWage, 4) },
      { key: 'hourlyWage', label: t('hourlyWage'), value: money(selectedMonth.hourlyWage, 2) },
      { key: 'dailyWage', label: t('dailyWage'), value: money(selectedMonth.dailyWage, 2) },
      { key: 'monthlyWage', label: t('monthlyWage'), value: money(selectedMonth.monthlySalary, 2) },
      { key: 'monthWorkdays', label: t('monthWorkdaysCard'), value: `${selectedMonth.workdays}${t('dayUnit')}` },
    ];
    viewHint = `${t('monthHint')
      .replace('{year}', String(viewYear))
      .replace('{month}', String(selectedMonth.month))
      .replace('{workdays}', String(selectedMonth.workdays))
      .replace('{holidays}', String(selectedMonth.holidayDays))} · ${t('viewOnlyHint')}`
      + (yearEstimated ? ` · ${t('holidayEstimateShort')}` : '');
    viewNote = yearEstimated
      ? t('holidayEstimateNote')
      : (selectedMonth.month === maxHolidayMonth.month
        ? `★ ${t('maxHolidayThis').replace('{days}', String(maxHolidayMonth.holidayDays))}`
        : maxHolidayText);
  } else {
    // 统一阅读顺序：秒 → 分 → 时 → 日 → 周 → 月（所有视角都从「秒」开始、从小到大）
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
      // DSH 的 main slot 给的是定高容器：插件必须自己当滚动容器，否则展开设置后底部会被裁掉。
      // 注意：这里用 block + 内层 flex 的写法 —— 如果根直接 display:flex，子项会在定高容器里
      // 被 flex-shrink 压扁（展开设置时整张主卡高度被压缩、内容被 overflow 裁掉）。
      height: '100%',
      width: '100%',
      overflowY: 'auto',
      overflowX: 'hidden',
      overscrollBehavior: 'contain',
      scrollbarGutter: 'stable',
      boxSizing: 'border-box',
      fontSize: 13,
      lineHeight: 1.45,
      color: C.label,
      fontFamily: 'inherit',
    },
  }, [
    React.createElement(StyleTag, { key: 'css' }),
    React.createElement('div', {
      key: 'inner',
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 11,
        width: '100%',
        maxWidth: 820,
        margin: '0 auto',
        padding: '16px 18px 40px',
        boxSizing: 'border-box',
        minWidth: 0,
      },
    }, [
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
    React.createElement(HolidaysCard, {
      key: 'holidays',
      t,
      holidaySource,
      extraWorkdays: cfg.extraWorkdays,
    }),
    React.createElement(SettingsSection, {
      key: 'settings',
      t,
      form,
      setField,
      setCheck,
      save,
      onSave,
    }),
    ]),
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
