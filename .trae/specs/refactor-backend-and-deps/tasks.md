# Tasks

- [x] Task 1: 修复 package.json 依赖配置
  - [x] 将 express, cors, body-parser 等运行时依赖移至 dependencies
  - [x] 运行 npm install 确保 lock 文件更新

- [x] Task 2: 创建后端目录结构
  - [x] 创建 server/routes
  - [x] 创建 server/controllers
  - [x] 创建 server/middleware
  - [x] 创建 server/config
  - [x] 创建 server/utils

- [x] Task 3: 提取通用配置与工具
  - [x] 提取环境配置与常量到 server/config/index.js
  - [x] 提取 helper 函数 (如 safeFileExt, readJsonWithDefault) 到 server/utils/helpers.js

- [x] Task 4: 提取中间件
  - [x] 提取 CORS 配置到 server/middleware/cors.js
  - [x] 提取 authenticateToken 到 server/middleware/auth.js

- [x] Task 5: 重构 Auth 模块
  - [x] 创建 server/controllers/authController.js (Login logic)
  - [x] 创建 server/routes/authRoutes.js

- [x] Task 6: 重构 Data 模块 (机器/用户/角色/位置)
  - [x] 创建 server/controllers/dataController.js (CRUD logic)
  - [x] 创建 server/routes/dataRoutes.js

- [x] Task 7: 重构 AI/Bailian 模块
  - [x] 创建 server/controllers/aiController.js (Bailian config, chat, RAG)
  - [x] 创建 server/routes/aiRoutes.js

- [x] Task 8: 重构文件模块
  - [x] 创建 server/controllers/fileController.js (Upload, List)
  - [x] 创建 server/routes/fileRoutes.js

- [x] Task 9: 更新入口文件 server/index.js
  - [x] 引入并使用上述所有路由
  - [x] 移除已提取的逻辑
  - [x] 确保静态文件服务逻辑保留

- [x] Task 10: 验证服务
  - [x] 启动服务器并验证各 API 端点功能正常

# Task Dependencies
- Task 5-8 依赖 Task 2, 3, 4
- Task 9 依赖 Task 5-8
