/**
 * 真 bundle + 真 React 的页面预览（不装进 DSH 也能看版式）。
 *
 * 用法：
 *   node tools/preview.mjs                 # 生成页面并打印本地路径
 *   node tools/preview.mjs --open          # 生成后调用系统默认浏览器打开
 *   node tools/preview.mjs --screenshot out.png   # 用本机 Chromium/Edge 无头截图
 *
 * 说明：
 *   - 用 lib/client.js 的真实构建产物，通过桩 ModuleLoader + 桩 fetch 挂载 main slot；
 *     计时器也是真实的，所以页面上的「今日已赚」会每秒跳动。
 *   - React/ReactDOM 的 UMD 产物在首次运行时下载到 ~/.dsh/tools/preview-cache（预览专用，不入库）。
 *   - 同时渲染浅色/深色两套 --dsw-* 变量，便于检查两套主题下的可读性。
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { DEFAULT_HOLIDAYS, DEFAULT_EXTRA_WORKDAYS } from '../src/holidays.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..');
const args = process.argv.slice(2);
const open = args.includes('--open');
const screenshotIndex = args.indexOf('--screenshot');
const screenshotPath = screenshotIndex >= 0 ? args[screenshotIndex + 1] : null;
const expand = args.includes('--expand');
const dshViewport = args.includes('--dsh');
const scrollIndex = args.indexOf('--scroll');
const scrollTo = scrollIndex >= 0 ? String(args[scrollIndex + 1] || '') : '';
const viewIndex = args.indexOf('--view');
const initialView = viewIndex >= 0 ? String(args[viewIndex + 1] || 'current') : 'current';

const cacheDir = join(homedir(), '.dsh', 'tools', 'preview-cache', 'react-18.3.1');
const CDN = {
  react: 'https://unpkg.com/react@18.3.1/umd/react.development.js',
  reactDom: 'https://unpkg.com/react-dom@18.3.1/umd/react-dom.development.js',
};

async function ensureReact() {
  mkdirSync(cacheDir, { recursive: true });
  const files = {};
  for (const [key, url] of Object.entries(CDN)) {
    const name = url.split('/').pop();
    const target = join(cacheDir, name);
    if (existsSync(target) && readFileSync(target, 'utf8').length > 10_000) {
      files[key] = readFileSync(target, 'utf8');
      continue;
    }
    const res = await fetch(url);
    if (!res.ok) throw new Error(`下载 ${url} 失败：HTTP ${res.status}`);
    const text = await res.text();
    if (text.length < 10_000) throw new Error(`下载 ${url} 得到的内容过小`);
    writeFileSync(target, text);
    console.log(`cached ${name} (${(text.length / 1024).toFixed(0)} KB)`);
    files[key] = text;
  }
  return files;
}

/** 预览用的配置：22000 月薪，与 SPEC §8 的验收数字一致 */
const FIXTURE_CONFIG = {
  monthlySalary: 22000,
  workStart: '09:00',
  workEnd: '18:00',
  lunchEnabled: true,
  lunchStart: '12:00',
  lunchEnd: '13:00',
  lunchPaid: false,
  holidays: [...DEFAULT_HOLIDAYS],
  extraWorkdays: [...DEFAULT_EXTRA_WORKDAYS],
};

const LIGHT = {
  '--dsw-alias-bg-layer-1': '#f6f7f9',
  '--dsw-alias-bg-layer-2': '#eef0f3',
  '--dsw-alias-border-l1': 'rgba(31,35,41,.10)',
  '--dsw-alias-border-l2': 'rgba(31,35,41,.18)',
  '--dsw-alias-brand-primary': '#2f7dff',
  '--dsw-alias-label-primary': '#1f2329',
  '--dsw-alias-label-secondary': '#5a6472',
  '--dsw-alias-label-tertiary': '#8a94a6',
  '--dsw-alias-state-error-primary': '#d1242f',
  '--dsw-alias-state-success-primary': '#1a7f37',
  '--dsw-alias-state-warn-primary': '#b45309',
  '--dsw-font-family': '-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif',
  'background': '#ffffff',
};
const DARK = {
  '--dsw-alias-bg-layer-1': '#161a20',
  '--dsw-alias-bg-layer-2': '#1f252d',
  '--dsw-alias-border-l1': 'rgba(255,255,255,.10)',
  '--dsw-alias-border-l2': 'rgba(255,255,255,.18)',
  '--dsw-alias-brand-primary': '#5b9bff',
  '--dsw-alias-label-primary': '#e8eaed',
  '--dsw-alias-label-secondary': '#b6bcc6',
  '--dsw-alias-label-tertiary': '#8a94a6',
  '--dsw-alias-state-error-primary': '#ff6b6b',
  '--dsw-alias-state-success-primary': '#4ade80',
  '--dsw-alias-state-warn-primary': '#fbbf24',
  '--dsw-font-family': '-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif',
  'background': '#0e1115',
};

function themeVars(record) {
  return Object.entries(record)
    .map(([key, value]) => `${key}: ${String(value).replace(/\"/g, '&quot;')};`)
    .join('\n      ');
}

function buildHtml(reactUmd, reactDomUmd, bundle, expand, initialView, dshViewport, scrollTo) {
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<title>dsh-niuma preview</title>
<style>
  html, body { margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif; }
  .stage { display: flex; flex-wrap: wrap; gap: 24px; padding: 24px; align-items: flex-start; }
  .pane { flex: 1 1 420px; max-width: 640px; border-radius: 16px; overflow: hidden; padding: 20px; }
  .viewport { height: 980px; overflow: hidden; border-radius: 12px; }
  .pane-title { font: 600 12px/1.4 sans-serif; opacity: .55; letter-spacing: .06em; text-transform: uppercase; margin-bottom: 8px; }
  #root-light, #root-dark { min-height: 200px; }
</style>
</head>
<body>
<div class="stage">
  <div class="pane" id="pane-light" style="color-scheme: light; ${themeVars(LIGHT)}">
    <div class="pane-title" style="color:#5a6472">LIGHT THEME</div>
    <div class="${dshViewport ? 'viewport' : ''}" id="viewport-light"><div id="root-light" style="height:100%"></div></div>
  </div>
  <div class="pane" id="pane-dark" style="color-scheme: dark; ${themeVars(DARK)}">
    <div class="pane-title" style="color:#8a94a6">DARK THEME</div>
    <div class="${dshViewport ? 'viewport' : ''}" id="viewport-dark"><div id="root-dark" style="height:100%"></div></div>
  </div>
</div>
<script>
  // 桩模块加载器：捕获真实 bundle 的 factory
  window.__ModuleLoader__ = { load(entry) { window.__NIUMA_ENTRY__ = entry; } };
  // 桩 fetch：面板只请求两条路由
  const FIXTURE = ${JSON.stringify(FIXTURE_CONFIG)};
  window.fetch = async (url) => {
    const path = String(url);
    if (path === '/niuma/config' || path.endsWith('/niuma/config')) {
      return { ok: true, status: 200, json: async () => ({ ok: true, data: { config: FIXTURE, defaults: FIXTURE, holidaySource: { year: 2026, title: '国务院办公厅关于2026年部分节假日安排的通知（国办发明电〔2025〕7号）', url: 'https://www.gov.cn/zhengce/content/202511/content_7047090.htm' } } }) };
    }
    if (path === '/niuma/settings' || path.endsWith('/niuma/settings')) {
      return { ok: true, status: 200, json: async () => ({ ok: true, data: { config: FIXTURE } }) };
    }
    return { ok: false, status: 404, json: async () => ({ ok: false, error: 'not found' }) };
  };
</script>
<script>${reactUmd}</script>
<script>${reactDomUmd}</script>
<script>${bundle}</script>
<script>
  const React = window.React;
  const ReactDOM = window.ReactDOM;
  const EXPAND = ${expand ? 'true' : 'false'};
  const INITIAL_VIEW = ${JSON.stringify(initialView)};
  const DSH_VIEWPORT = ${dshViewport ? 'true' : 'false'};
  const SCROLL_TO = ${JSON.stringify(scrollTo)};
  const ZH = (key) => key;
  function mount(rootId) {
    const root = ReactDOM.createRoot(document.getElementById(rootId));
    const slots = [];
    const locales = {};
    const ctx = {
      effect(factory) { try { return factory(); } catch (error) { console.error(error); } },
      locale: { register(namespace, dictionaries) { locales[namespace] = dictionaries; } },
      slots: {
        inject(name, factory) { return factory(); },
        register(spec, component) { slots.push({ spec, component }); return () => {}; },
      },
    };
    const entry = window.__NIUMA_ENTRY__;
    if (!entry) throw new Error('bundle 没有注册 __ModuleLoader__');
    const mod = entry.factory((name) => {
      if (name === 'react') return React;
      throw new Error('unexpected require: ' + name);
    });
    mod.apply(ctx);
    const main = slots.find((slot) => slot.spec.name === 'main');
    if (!main) throw new Error('没有注册 main slot');
    const zh = locales['niuma'] && locales['niuma'].zh ? locales['niuma'].zh : {};
    const t = (key) => (zh[key] == null ? ZH(key) : zh[key]);
    root.render(React.createElement(main.component, { t, locale: 'zh' }));
    if (EXPAND) setTimeout(() => { document.querySelectorAll('details').forEach((d) => { d.open = true; }); }, 60);
    if (SCROLL_TO === 'bottom') {
      setTimeout(() => {
        ['root-light', 'root-dark'].forEach((id) => {
          const host = document.getElementById(id);
          const panel = host && host.firstElementChild;
          if (panel) panel.scrollTop = panel.scrollHeight;
        });
      }, 220);
    }
    if (INITIAL_VIEW && INITIAL_VIEW !== 'current') {
      setTimeout(() => {
        // 浅色/深色两个根各挂了一份面板：两个 select 都要切，否则截图两边状态不一致
        document.querySelectorAll('select').forEach((select) => {
          select.value = INITIAL_VIEW;
          select.dispatchEvent(new Event('change', { bubbles: true }));
        });
      }, 120);
    }
  }
  window.addEventListener('error', (event) => {
    const pre = document.createElement('pre');
    pre.textContent = 'RUNTIME ERROR: ' + (event.message || event.error);
    pre.style.cssText = 'color:#d1242f;white-space:pre-wrap;font-size:12px;grid-column:1/-1';
    document.querySelector('.stage').appendChild(pre);
  });
  mount('root-light');
  mount('root-dark');
</script>
</body>
</html>`;
}

const react = await ensureReact();
const bundle = readFileSync(join(repo, 'lib', 'client.js'), 'utf8');
const outDir = join(tmpdir(), `dsh-niuma-preview-${process.pid}`);
mkdirSync(outDir, { recursive: true });
const htmlPath = join(outDir, 'index.html');
writeFileSync(htmlPath, buildHtml(react.react, react.reactDom, bundle, expand, initialView, dshViewport, scrollTo));
console.log(`preview: file://${htmlPath}`);

if (screenshotPath) {
  const candidates = [
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ];
  const browser = candidates.find((p) => existsSync(p));
  if (!browser) throw new Error('找不到 Chromium/Edge，无法无头截图');
  const result = spawnSync(browser, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=2',
    `--window-size=1160,${expand ? '1950' : '760'}`,
    '--virtual-time-budget=2500',
    `--screenshot=${screenshotPath}`, `file://${htmlPath}`,
  ], { stdio: 'inherit' });
  if (result.status !== 0) throw new Error(`无头截图失败，退出码 ${result.status}`);
  console.log(`screenshot: ${screenshotPath}`);
}

if (open) {
  spawnSync('open', [`file://${htmlPath}`], { stdio: 'ignore' });
}
