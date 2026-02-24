# Tasks

- [x] Task 1: 初始化前端工程与基础依赖
  - [x] SubTask 1.1: 创建 Vite + React + TypeScript 项目骨架
  - [x] SubTask 1.2: 落地 Lavender Pastel 主题（柔紫主色、渐变高亮、柔阴影、圆角卡片）
  - [x] SubTask 1.3: 搭建三栏布局骨架（左侧图标导航 / 中间内容 / 右侧附加区）
  - [x] SubTask 1.4: 集成 ECharts 并提供通用图表封装
  - [x] SubTask 1.5: 配置基础质量工具（格式化/类型检查/构建）

- [x] Task 2: 搭建工具注册中心与共享状态
  - [x] SubTask 2.1: 定义工具元信息模型与注册表
  - [x] SubTask 2.2: 实现工作台导航与路由挂载
  - [x] SubTask 2.3: 实现共享状态（命名空间、持久化策略预留）

- [x] Task 3: 实现 PQ² 图工具（首版）
  - [x] SubTask 3.1: 实现参数表单（校验、联动、默认值）
  - [x] SubTask 3.2: 实现计算层（可测试、可追溯输出）
  - [x] SubTask 3.3: 绘制 PQ² 图（交互、关键点/线、图例）
  - [x] SubTask 3.4: 导出（图像与参数 JSON）

- [x] Task 4: 实现模板管理（本地文件与工作区）
  - [x] SubTask 4.1: 定义模板数据结构与版本字段
  - [x] SubTask 4.2: 接入 File System Access API（打开/保存）
  - [x] SubTask 4.3: 最近使用与会话恢复（在权限允许范围内）
  - [x] SubTask 4.4: 工作区模式（选择目录、列表、基本管理操作）

- [x] Task 5: 验证与交付
  - [x] SubTask 5.1: 添加关键单元测试（计算层、模板序列化）
  - [x] SubTask 5.2: 添加基础 E2E/交互验证（至少覆盖 PQ² 绘制）
  - [x] SubTask 5.3: 完成 checklist.md 验证并修复遗漏

# Task Dependencies

- Task 2 depends on Task 1
- Task 3 depends on Task 2
- Task 4 depends on Task 2
- Task 5 depends on Task 3 and Task 4
