# Tasks

- [x] Task 1: 后端新增 AI 数据模型与持久化
  - [x] SubTask 1.1: 在 `server/data/` 下定义 `ai_config.json` 与 `ai_chats.json` 模板与读写工具
  - [x] SubTask 1.2: 设计会话/消息 JSON 结构（含时间戳与 token 字段）

- [x] Task 2: 后端实现 AI 配置与会话管理 API
  - [x] SubTask 2.1: 实现配置读取/更新接口（API Key 掩码返回）
  - [x] SubTask 2.2: 实现会话列表读取/创建/删除接口
  - [x] SubTask 2.3: 对 AI 相关接口启用鉴权（复用现有登录机制）

- [x] Task 3: 后端实现 OpenAI 兼容流式对话代理
  - [x] SubTask 3.1: 实现请求拼装：system prompt + 历史消息 + 当前消息（支持上下文条数限制）
  - [x] SubTask 3.2: 实现 Streaming 转发：将上游 SSE/流式响应稳定转发到前端
  - [x] SubTask 3.3: 实现停止生成：客户端中断后端流与上游请求
  - [x] SubTask 3.4: 落地 token 统计策略：优先使用上游 usage，否则本地估算
  - [x] SubTask 3.5: 保存消息与统计到 `ai_chats.json`（完成/停止/失败均可追溯）

- [x] Task 4: 前端新增“AI 助手”入口与路由
  - [x] SubTask 4.1: 在左侧侧边栏底部增加常驻入口（与现有 Lavender Pastel UI 一致）
  - [x] SubTask 4.2: 新增 AI 助手页面路由与沉浸式布局策略（AI 页面双栏布局）

- [x] Task 5: 前端实现 AI 助手页面（会话列表 + 对话区 + 输入区）
  - [x] SubTask 5.1: 会话列表：分组（今天/昨天/更早）、新建、删除、当前选中态
  - [x] SubTask 5.2: 对话区：消息气泡、滚动到底部、加载态、错误提示
  - [x] SubTask 5.3: 输入区：快捷键换行、发送/停止、禁用态与草稿保留（可选）
  - [x] SubTask 5.4: 顶部信息条：模型显示与 token 统计概览

- [x] Task 6: 前端实现消息渲染与代码块体验
  - [x] SubTask 6.1: 接入 Markdown（GFM）与 LaTeX 渲染
  - [x] SubTask 6.2: 代码块语法高亮与复制按钮
  - [x] SubTask 6.3: 暗色模式与主题适配（保持“云朵感”质感）

- [x] Task 7: 联调与验证
  - [x] SubTask 7.1: 联调 Streaming 与停止生成（网络中断/超时/鉴权失效）
  - [x] SubTask 7.2: 验证持久化（刷新后会话与消息不丢失）
  - [x] SubTask 7.3: 补充必要测试与完成 checklist.md 勾选

# Task Dependencies
- Task 2 depends on Task 1
- Task 3 depends on Task 2
- Task 5 depends on Task 4
- Task 6 depends on Task 5
- Task 7 depends on Task 3 and Task 6
