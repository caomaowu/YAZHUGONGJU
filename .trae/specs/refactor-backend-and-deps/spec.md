# 后端重构与依赖修复 Spec

## Why
目前项目的后端逻辑全部堆积在 `server/index.js` 中，导致代码难以维护和扩展。同时，关键的运行时依赖（如 `express`）被错误地放置在 `devDependencies` 中，这可能导致在某些生产环境部署时依赖丢失，服务无法启动。

## What Changes
1.  **依赖管理修复**：
    -   将 `express`, `cors`, `body-parser`, `fs-extra`, `jsonwebtoken`, `bcryptjs`, `openai`, `node-fetch` 以及 `@alicloud/*` 相关 SDK 从 `package.json` 的 `devDependencies` 移动到 `dependencies`。

2.  **后端架构重构**：
    -   将 `server/index.js` 拆分为模块化的结构：
        -   `server/routes/`: 存放路由定义。
        -   `server/controllers/`: 存放业务逻辑处理。
        -   `server/middleware/`: 存放中间件（如 Auth, CORS）。
        -   `server/config/`: 存放配置加载逻辑。
        -   `server/utils/`: 存放工具函数（如文件路径助手）。
    -   主要拆分模块：
        -   **Auth**: 登录验证。
        -   **Data**: 机器、位置、用户、角色数据的 CRUD。
        -   **AI (Bailian)**: 阿里云百炼集成及 OpenAI 兼容接口。
        -   **Files**: 文件上传与列表。

## Impact
-   **受影响代码**: `package.json`, `server/index.js`，以及新增的 `server/` 子目录文件。
-   **API 契约**: 保持不变。前端无需修改。
-   **部署**: `npm ci --production` 将能正确安装所需依赖。

## ADDED Requirements
### Requirement: Modular Backend Structure
后端代码应遵循 MVC 分层（或类似的路由-控制器分离）模式，确保每个文件职责单一。

## MODIFIED Requirements
### Requirement: Dependency Configuration
所有在生产环境运行所需的 npm 包必须列在 `dependencies` 中。
