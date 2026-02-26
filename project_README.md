# 压铸程序 (Die-Casting Tool)

一个基于 React + TypeScript + Vite 构建的专业压铸工艺计算与管理工具。

## ✨ 项目特点
- **Lavender Pastel UI**: 采用明亮、柔和的淡紫色调设计，提供精致且轻量的视觉体验
- **压铸机数据库**: 可视化设备管理系统，支持 2.5D 插画卡片展示、能力雷达图分析、参数在线编辑及实拍图预览
- **响应式三栏布局**: 优化的卡片式分组，确保信息层级清晰、留白得当
- **PQ2 工艺分析**: 集成专业的 PQ2 压铸计算与图表分析功能，支持参数实时联动
- **用户认证系统**: 基于 JWT 的安全登录认证，支持开发环境与生产环境差异化处理
- **RBAC 权限管理**: 细粒度的动态角色权限控制，支持自定义角色、菜单可见性控制及操作权限分配
- **多材料支持**: 内置 A380 / ADC12 / AZ91D / ALSi9Cu3 等常用压铸材料参数
- **数据导出**: 支持导出 PNG 图表与 JSON 参数文件
- **模板管理**: 支持工艺模板的本地存取与快速调用

## 🚀 技术栈
- **Frontend**: React 18, TypeScript, Vite
- **UI Framework**: Ant Design
- **Charts**: ECharts
- **Backend**: Node.js, Express (Local API & Auth)
- **Auth**: JWT, bcryptjs
- **State Management**: React Context + Custom Hooks

## 📁 项目结构
```
src/
├── components/    # 通用组件（图表、认证、设备等）
├── core/          # 核心架构（路由、状态管理、认证上下文、工具注册）
├── pages/         # 页面组件（Dashboard、PQ2、Templates、Settings、UserManagement）
├── theme/         # 主题配置
├── tools/         # 工具模块（PQ2计算、模板管理）
└── types/         # 类型定义
server/            # 后端服务（API、Auth、本地数据存储）
└── data/          # 本地 JSON 数据（机器数据、用户等）
```

## 🛠️ 开发环境
```powershell
# 安装依赖
npm install

# 启动开发服务器 (前端 + 后端 API)
npm run dev

# 代码检查 + 类型检查 + 构建
npm run check

# 构建生产版本
npm run build

# 启动生产服务 (构建后运行)
npm start

# 类型检查
npm run typecheck

# 代码检查
npm run lint

# E2E（Playwright）
npm run e2e
```


