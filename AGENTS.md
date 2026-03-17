# 仓库指南

## 项目结构与模块组织
本仓库包含一个 Vite + React 19 + TypeScript 前端和一个 Express 后端。

- `src/`: UI 应用程序代码。使用 `components/` 存放可复用的 UI，`pages/` 存放路由级页面，`core/` 存放认证/路由/共享状态，`tools/` 存放领域工具逻辑（如 `pq2`）。
- `server/`: API 服务器、基于 JSON 的存储、认证、文件处理和搜索索引。关键文件夹包括 `controllers/`、`routes/`、`services/`、`middleware/` 以及用于 OCR/文本提取辅助功能的 `python/`。
- `public/`: 由 Vite 服务的静态资源。
- `e2e/`: Playwright 浏览器测试。
- `deploy/` 和 `DEPLOYMENT.md`: 部署脚本和说明。
- `dist/`、`test-results/`、`server/uploads/`、`server/indexes/`: 生成的产物；不要将其视为源码。

## 构建、测试和开发命令
- `npm run dev`: 使用 `.env.local` 同时启动 Vite 和 Express 服务器。
- `npm run start`: 仅在本地运行后端服务器。
- `npm run build`: 类型检查并构建前端包。
- `npm run typecheck`: 运行 TypeScript 项目检查而不输出文件。
- `npm run lint`: 执行 ESLint 规则，不允许有任何警告。
- `npm run test`: 运行 Vitest 单元测试。
- `npm run e2e`: 运行 Playwright 端到端测试。
- `npm run check`: 作为合并前的关卡，运行 lint、类型检查和构建。

## 编码风格与命名约定
Prettier 是格式化的唯一标准：2 空格缩进、无分号、单引号、尾随逗号，行宽 100 字符。在提交大量代码前运行 `npm run format`。

React 组件和页面文件使用 `PascalCase`，函数和工具使用 `camelCase`，并按功能分组使用描述性的文件夹名称。保持后端模块与其职责一致，例如 `server/controllers/` 中的 `authController.js`。

## 测试指南
使用 Vitest 编写单元测试，并将其放置在模块或功能旁边，遵循现有的 `*.test.ts` 模式，例如 `src/tools/pq2/compute.test.ts`。将浏览器流程放在 `e2e/*.spec.ts` 中。

目前仓库中没有强制的覆盖率阈值，因此贡献者应为更改的业务逻辑、认证行为、路由和文件/搜索工作流添加测试。对于面向用户的更改，请运行 `npm run test` 和 `npm run e2e`。

## 提交与拉取请求指南
最近的历史记录遵循 Conventional Commits，包括作用域变体，如 `feat(权限): ...`、`fix(auth): ...` 和 `refactor(auth): ...`。保持主题简短且以行动为导向。

拉取请求应包含简明的摘要、受影响的区域、配置或数据文件更改，以及 UI 更改的截图。如果更改涉及部署、认证或知识库索引，请明确指出并列出您运行的验证命令。

## 安全与配置提示
环境文件位于仓库根目录 (`.env.dev`、`.env.local`、`.env.prod`)。切勿提交真正的密钥。对于 OCR/索引功能，请从 `server/python/requirements.txt` 安装 Python 依赖项，并验证任何读取或写入 `server/uploads/` 或 `server/indexes/` 下文件的更改。
