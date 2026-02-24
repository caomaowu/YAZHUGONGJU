# 压铸程序 (Die-Casting Tool)

一个基于 React + TypeScript + Vite 构建的专业压铸工艺计算与管理工具。

## ✨ 项目特点
- **Lavender Pastel UI**: 采用明亮、柔和的淡紫色调设计，提供精致且轻量的视觉体验
- **响应式三栏布局**: 优化的卡片式分组，确保信息层级清晰、留白得当
- **PQ2 工艺分析**: 集成专业的 PQ2 压铸计算与图表分析功能，支持参数实时联动
- **多材料支持**: 内置 A380 / ADC12 / AZ91D / ALSi9Cu3 等常用压铸材料参数
- **数据导出**: 支持导出 PNG 图表与 JSON 参数文件
- **模板管理**: 支持工艺模板的本地存取与快速调用

## 🚀 技术栈
- **Frontend**: React 18, TypeScript, Vite
- **UI Framework**: Ant Design
- **Charts**: ECharts
- **State Management**: React Context + Custom Hooks

## 📁 项目结构
```
src/
├── components/    # 通用组件（图表等）
├── core/          # 核心架构（路由、状态管理、工具注册）
├── pages/         # 页面组件（Dashboard、PQ2、Templates、Settings）
├── theme/         # 主题配置
├── tools/         # 工具模块（PQ2计算、模板管理）
└── types/         # 类型定义
```

## 🛠️ 开发环境
```powershell
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 类型检查
npm run typecheck

# 代码检查
npm run lint

# 运行测试
npm run test

# 构建生产版本
npm run build

# 预览生产构建
npm run preview
```
