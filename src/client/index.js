import React from 'react';
import {
  DEFAULTS,
  computeRates,
  earnedToday,
  formatDuration,
  formatMoney,
  normalizeConfig,
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
  'save': '保存',
  'saving': '保存中…',
  'saved': '已保存',
  'saveFailed': '保存失败：',
  'dayUnit': '天',
  'hourUnit': '小时',
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
  'save': 'Save',
  'saving': 'Saving…',
  'saved': 'Saved',
  'saveFailed': 'Save failed: ',
  'dayUnit': 'd',
  'hourUnit': 'h',
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

/** 状态徽标：休息日 / 未上班 / 搬砖中 / 午休中 / 已下班。 */
function StatusBadge(props) {
  const t = props.t;
  const meta = STATUS_META[props.status] || STATUS_META.rest;
  return React.createElement('span', {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '3px 10px',
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 600,
      lineHeight: 1.5,
      color: meta.color,
      border: `1px solid ${meta.color}`,
      background: C.layer1,
      whiteSpace: 'nowrap',
    },
  }, [
    React.createElement('i', {
      key: 'dot',
      style: { width: 6, height: 6, borderRadius: '50%', background: meta.color, display: 'inline-block' },
    }),
    t(meta.key),
  ]);
}

/** 今日已赚：超大数字，每秒跳动。 */
function HeroCard(props) {
  const t = props.t;
  const snap = props.snap;
  return React.createElement('div', { style: { ...CARD, padding: '13px 15px 12px' } }, [
    React.createElement('div', {
      key: 'head',
      style: {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 8, flexWrap: 'wrap', fontSize: 12, color: C.label2,
      },
    }, [
      React.createElement('span', { key: 'a' }, t('earnedToday')),
      React.createElement('span', { key: 'b', style: { fontSize: 11, color: C.label3, ...NUM } },
        `${t('todayOn')} ${snap.dateKey}`),
    ]),
    React.createElement('div', {
      key: 'amt',
      style: { display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 1, flexWrap: 'wrap' },
    }, [
      React.createElement('span', {
        key: 'cur',
        style: { fontSize: 22, fontWeight: 700, color: C.label2, ...NUM },
      }, '¥'),
      React.createElement('span', {
        key: 'val',
        style: {
          fontSize: 40, lineHeight: 1.15, fontWeight: 760, letterSpacing: '-.5px',
          color: C.ok, ...NUM,
        },
      }, formatMoney(snap.todayEarned, 4)),
    ]),
    React.createElement('div', {
      key: 'sub',
      style: { fontSize: 11, color: C.label3, marginTop: 2, ...NUM },
    }, `${t('perSecond')} ${money(snap.rates.secondWage, 4)}`),
  ]);
}

/** 今日进度条 + 距上班 / 距下班倒计时。 */
function ProgressCard(props) {
  const t = props.t;
  const snap = props.snap;
  const progress = Math.max(0, Math.min(1, Number(snap.todayProgress) || 0));
  const percentText = `${(progress * 100).toFixed(1)}%`;
  const countdownChip = (key, label, seconds) => React.createElement('div', {
    key,
    style: { ...CARD, flex: '1 1 130px', minWidth: 118, padding: '8px 10px' },
  }, [
    React.createElement('div', { key: 'l', style: { fontSize: 11, color: C.label3 } }, label),
    React.createElement('div', {
      key: 'v',
      style: { fontSize: 14, fontWeight: 650, color: C.label, marginTop: 2, ...NUM },
    }, Number(seconds) > 0 ? formatDuration(seconds) : '—'),
  ]);
  return React.createElement('div', { style: CARD }, [
    React.createElement('div', {
      key: 'top',
      style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
    }, [
      React.createElement('span', { key: 'l', style: { fontSize: 12, color: C.label2 } }, t('todayProgress')),
      React.createElement('span', {
        key: 'p',
        style: { fontSize: 13, fontWeight: 650, color: C.brand, ...NUM },
      }, percentText),
    ]),
    React.createElement('div', {
      key: 'bar',
      style: {
        marginTop: 6, height: 8, borderRadius: 999, background: C.layer2,
        overflow: 'hidden',
      },
    }, [
      React.createElement('div', {
        key: 'fill',
        style: {
          width: `${(progress * 100).toFixed(2)}%`,
          height: '100%',
          borderRadius: 999,
          background: C.brand,
          transition: 'width .4s linear',
        },
      }),
    ]),
    React.createElement('div', {
      key: 'nums',
      style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginTop: 5, flexWrap: 'wrap', fontSize: 11, color: C.label3 },
    }, [
      React.createElement('span', { key: 'a' }, t('progressOfTarget')),
      React.createElement('span', { key: 'b', style: { ...NUM } },
        `${money(snap.todayEarned, 2)} / ${money(snap.todayTarget, 2)}`),
    ]),
    React.createElement('div', {
      key: 'cd',
      style: { display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 },
    }, [
      countdownChip('start', t('toStart'), snap.secondsToStart),
      countdownChip('end', t('toEnd'), snap.secondsToEnd),
    ]),
  ]);
}

/** 六宫格：秒 / 分 / 时 / 日 / 周 / 月工资。 */
const RATE_CARDS = [
  { key: 'secondWage', label: 'secondWage', digits: 4 },
  { key: 'minuteWage', label: 'minuteWage', digits: 4 },
  { key: 'hourlyWage', label: 'hourlyWage', digits: 2 },
  { key: 'dailyWage', label: 'dailyWage', digits: 2 },
  { key: 'weeklyWage', label: 'weeklyWage', digits: 2 },
  { key: 'monthlyWage', label: 'monthlyWage', digits: 2 },
];

function RatesGrid(props) {
  const t = props.t;
  const rates = props.rates;
  return React.createElement('div', {
    style: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 },
  }, RATE_CARDS.map((spec, index) => React.createElement('div', {
    key: spec.key,
    'data-stat': `stat-${index}`,
    style: { ...CARD, padding: '9px 10px' },
  }, [
    React.createElement('div', { key: 'l', style: { fontSize: 11, color: C.label3 } }, t(spec.label)),
    React.createElement('div', {
      key: 'v',
      style: { fontSize: 15, fontWeight: 650, color: C.label, marginTop: 2, ...NUM },
    }, money(rates[spec.key], spec.digits)),
  ])));
}

/** 明细脚注：月薪 / 当月工作日 / 日有效工时 / 今日目标 / 本月已赚 + 节假日来源。 */
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
    style: { ...CARD, padding: '9px 12px', fontSize: 11, color: C.label3, lineHeight: 1.7 },
  }, [
    React.createElement('div', {
      key: 'items',
      style: { display: 'flex', flexWrap: 'wrap', gap: '2px 14px' },
    }, items.map((item) => React.createElement('span', {
      key: item.key,
      style: { display: 'inline-flex', alignItems: 'baseline', gap: 4, whiteSpace: 'nowrap' },
    }, [
      React.createElement('span', { key: 'l' }, `${item.label}`),
      React.createElement('span', {
        key: 'v',
        style: { color: C.label2, fontWeight: 600, ...NUM },
      }, item.value),
    ]))),
    React.createElement('div', {
      key: 'src',
      style: { display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 4, marginTop: 2 },
    }, [
      React.createElement('span', { key: 'l' }, `${t('holidaySource')}：`),
      React.createElement('a', {
        key: 'a',
        href: source.url,
        target: '_blank',
        rel: 'noreferrer',
        title: source.title,
        style: { color: C.brand, textDecoration: 'underline' },
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
    padding: '5px 8px',
    borderRadius: 8,
    border: `1px solid ${C.border}`,
    background: C.layer2,
    color: C.label,
    fontSize: 13,
    fontVariantNumeric: 'tabular-nums',
    outline: 'none',
  };
  const labelStyle = { fontSize: 11, color: C.label3 };

  const textField = (field, labelKey, placeholder) => React.createElement('label', {
    key: field,
    style: { display: 'flex', flexDirection: 'column', gap: 3, flex: '1 1 130px', minWidth: 112 },
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

  const textareaField = (field, labelKey) => React.createElement('label', {
    key: field,
    style: { display: 'flex', flexDirection: 'column', gap: 3, flex: '1 1 220px', minWidth: 200 },
  }, [
    React.createElement('span', { key: 'l', style: labelStyle }, t(labelKey)),
    React.createElement('textarea', {
      key: 'i',
      rows: 4,
      value: form[field],
      spellCheck: false,
      onChange: (event) => setField(field, event.target.value),
      style: {
        ...inputStyle,
        resize: 'vertical',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
        lineHeight: 1.5,
      },
    }),
  ]);

  return React.createElement('details', { style: { ...CARD, padding: '10px 12px' } }, [
    React.createElement('summary', {
      key: 'sum',
      style: { cursor: 'pointer', fontSize: 13, fontWeight: 600, color: C.label, userSelect: 'none' },
    }, t('settings')),
    React.createElement('div', {
      key: 'hint',
      style: { fontSize: 11, color: C.label3, margin: '4px 0 9px' },
    }, t('settingsHint')),
    React.createElement('div', {
      key: 'fields',
      style: { display: 'flex', flexWrap: 'wrap', gap: 8 },
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
      style: { display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 },
    }, [
      textareaField('holidaysText', 'holidaysField'),
      textareaField('extraWorkdaysText', 'extraWorkdaysField'),
    ]),
    React.createElement('div', {
      key: 'actions',
      style: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 10 },
    }, [
      React.createElement('button', {
        key: 'save',
        type: 'button',
        onClick: onSave,
        disabled: save.status === 'saving',
        style: {
          border: `1px solid ${C.brand}`,
          color: C.brand,
          background: 'transparent',
          borderRadius: 8,
          padding: '6px 16px',
          fontSize: 13,
          fontWeight: 600,
          cursor: save.status === 'saving' ? 'default' : 'pointer',
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
      gap: 9,
      minWidth: 0,
      padding: '2px 1px 18px',
      fontSize: 13,
      lineHeight: 1.45,
      color: C.label,
      fontFamily: 'inherit',
    },
  }, [
    // 标题 + 状态徽标
    React.createElement('div', {
      key: 'head',
      style: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    }, [
      React.createElement('div', { key: 'tt', style: { marginRight: 'auto', minWidth: 0 } }, [
        React.createElement('div', {
          key: 't',
          style: { fontSize: 16, fontWeight: 700, color: C.label },
        }, t('title')),
        React.createElement('div', {
          key: 's',
          style: { fontSize: 11, color: C.label3 },
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
          fontSize: 12, color: banner.color, padding: '5px 9px',
          borderRadius: 8, border: `1px solid ${banner.color}`, background: C.layer1,
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
    React.createElement(ProgressCard, { key: 'progress', t, snap }),
    React.createElement(RatesGrid, { key: 'rates', t, rates }),
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
