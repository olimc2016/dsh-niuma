# Third-Party Notices

dsh-niuma 本身以 MIT 协议发布（见 `LICENSE`）。

## 运行时依赖

**无。** 插件运行时不带任何第三方 npm 依赖：宿主半侧只 import DSH 本体提供的服务
（`@deepseek-ai/schemastery` 为可选依赖，动态加载失败即降级），浏览器半侧由 DSH 外壳注入 React。

## 构建期依赖

| 包 | 用途 | 协议 |
|---|---|---|
| [esbuild](https://esbuild.github.io/) | 构建 `lib/client.js` | MIT |
| [@deepseek-ai/schemastery](https://www.npmjs.com/package/@deepseek-ai/schemastery) | 宿主侧设置 schema（来自 DSH 本体） | 见 DSH 许可 |

## 数据来源

- 2026 年法定节假日与调休上班日：国务院办公厅《关于2026年部分节假日安排的通知》（国办发明电〔2025〕7号），
  <https://www.gov.cn/zhengce/content/202511/content_7047090.htm>（政府公开信息）。
