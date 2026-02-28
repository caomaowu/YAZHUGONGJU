# Tasks

- [x] Task 1: 后端新增知识库数据模型与存储
  - [x] SubTask 1.1: 定义 library.json 元数据结构与读写工具
  - [x] SubTask 1.2: 规划文件落盘目录与命名策略（避免重名冲突）

- [x] Task 2: 后端实现知识库 API（鉴权保护）
  - [x] SubTask 2.1: 实现资料列表/搜索/筛选接口
  - [x] SubTask 2.2: 实现上传接口（文件接收、大小限制、类型白名单）
  - [x] SubTask 2.3: 实现下载与预览接口（按类型返回合适的 Content-Type）
  - [x] SubTask 2.4: 实现删除接口（删除落盘文件与元数据记录）

- [x] Task 3: 前端新增“知识库”入口与路由
  - [x] SubTask 3.1: 在左侧导航增加“知识库”卡片入口（与 Lavender UI 一致）
  - [x] SubTask 3.2: 新增知识库页面路由与页面容器

- [x] Task 4: 前端实现知识库列表（超级好看的卡片/画廊）
  - [x] SubTask 4.1: 卡片网格视图：缩略图/类型图标/元信息/悬停动效
  - [x] SubTask 4.2: 搜索与筛选 UI（类型/分类/标签）
  - [x] SubTask 4.3: 空状态/加载态/错误态设计（保持高级质感）

- [x] Task 5: 前端实现上传与管理能力
  - [x] SubTask 5.1: 拖拽上传 + 进度条 + 失败重试
  - [x] SubTask 5.2: 管理动作：删除/重命名/编辑描述与标签（按权限显示）

- [x] Task 6: 前端实现在线预览体验
  - [x] SubTask 6.1: 预览弹窗/抽屉组件（PDF/图片/Markdown/TXT）
  - [x] SubTask 6.2: 下载按钮与快捷操作（键盘 Esc 关闭等）

- [x] Task 7: 联调与验证
  - [x] SubTask 7.1: 验证鉴权：未登录拦截、权限差异
  - [x] SubTask 7.2: 验证远程访问（同网段设备登录后可预览/下载）
  - [x] SubTask 7.3: 补充必要的自动化检查（lint/typecheck/build 或 e2e 冒烟）
  - [x] SubTask 7.4: 完成 checklist.md 勾选

# Task Dependencies
- Task 2 depends on Task 1
- Task 4 depends on Task 3
- Task 5 depends on Task 2 and Task 4
- Task 6 depends on Task 2 and Task 4
- Task 7 depends on Task 5 and Task 6
