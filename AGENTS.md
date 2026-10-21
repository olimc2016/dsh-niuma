# AGENTS.md — dsh-niuma

> 给编码 agent 的路由层：只写「权威文档在哪」「怎么跑」「哪些动作会真坏」。保持 ≤100 行。

## 这个项目是什么

DSH（DeepSeek Harness）插件「牛马加速器」：把实收月薪换算成每秒跳动的现金计数器。
面板 = 今日已赚（秒级滚动）+ 六档工资（秒/分/时/日/周/月）+ 状态/进度/倒计时 + 可折叠设置。

- 实现契约：`SPEC.md`（口径、配置、宿主/客户端接口、验收数字）
- 用户文档：`README.md` / `README.en.md`；变更：`CHANGELOG.md`

## 文件地图（改之前先看这里，别整读大文件）

| 文件 | 职责 |
|---|---|
| `src/core.mjs` | 纯逻辑：时间解析、工作日判定、工资率、今日已赚、格式化（宿主+客户端共用） |
| `src/holidays.mjs` | 2026 法定节假日 / 调休上班日数据（来源：国办发明电〔2025〕7号） |
| `lib/index.js` | 宿主半侧：settings schema、三条 HTTP 路由（config/settings/health）、守卫 |
| `src/client/index.js` | 浏览器半侧源码（`React.createElement`，无 JSX）：slot 注册 + 面板 UI |
| `lib/client.js` | **构建产物，必须入库**（用户安装时不会现场构建） |
| `tools/*.mjs` | 构建、模块链接、5 项自检、页面预览 |

## 常用命令

```bash
npm run setup    # 链接 @deepseek-ai/*（DSH 本体）+ esbuild；pnpm add 之后必须重跑
npm run build    # 构建 lib/client.js（改了 src/client/** 必须跑）
npm test         # verify-core / verify-holidays / smoke-host / smoke-client / smoke-render
npm run preview  # 真 bundle + 真 React 的页面预览（浅色/深色）
```

`node` / `npm` 不在 PATH 时（DSH 桌面端常态）：
`NODE=~/.dsh/dsh-runtimes/dsh-primary-runtime/dependencies/node/bin/node`，
`"$NODE" tools/<脚本>.mjs` 单项跑；`"$NODE" tools/setup-modules.mjs` 代替 setup。

## 守卫（做错会真坏）

1. **构建失败必须硬失败**：esbuild 曾装在 `/tmp` 被清理 → build 失败但烟测仍测旧产物（假绿）。改完先确认 build 真的产出了新文件。
2. **改了判定逻辑必须反向验证**：故意破坏一次，确认测试变红，再恢复；没验证过的测试不入库。
3. **产物与源码同一次提交**：`lib/client.js` + `.map` 必须与 `src/` 同 commit。
4. **宿主改动必须重启 DSH 才生效**；只改客户端也要重新 build（桌面端插件是启动时加载的）。
5. **工资口径只改 `src/core.mjs`**，并同步 `SPEC.md` §1/§8 与 `tools/verify-core.mjs` 的断言；不要在两处各写一份公式。
6. **节假日数据**只改 `src/holidays.mjs`，并让 `tools/verify-holidays.mjs` 同步断言（数据错了所有数字一起错）。
7. **公开仓库禁止出现**：账号 / 邮箱 / token / 本机绝对路径 / 未脱敏的私人配置。发版前 `grep -rn "/Users/"`。
8. **webServer 路由写在 effect 里**：注册返回 dispose，卸载要摘干净；handler 内异常只 warn，绝不能让 apply 抛错拖垮 DSH 启动。
9. **面板颜色只用 `var(--dsw-alias-*)`**，深浅主题都要可读；数字用 `tabular-nums` + `nowrap`。
10. **发版**：`npm pack --dry-run` 先看白名单；版本号 + CHANGELOG 同一次提交；tag 指向发布 commit。发布动作需维护者手动确认。

## 验收口径（摘 SPEC §8）

默认配置、月薪 22000 时：2026-10 工作日 18 天，日工资 1222.2222…，时工资 152.7778，秒工资 0.042438；
10-21 12:30 处于午休（金额冻结在 3 小时）；18:00 后封顶日工资；周六/国庆为休息日；10-10 调休上班。
