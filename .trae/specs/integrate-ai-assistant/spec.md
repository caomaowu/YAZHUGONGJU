# 压铸工具箱 AI 助手（沉浸式对话）Spec

## Why
压铸工艺参数复杂、排障与调参依赖经验，用户希望在工具箱内获得即时、可追溯的“压铸工艺专家”辅助，并可接入任意兼容 OpenAI 协议的模型服务。

## What Changes
- 新增 AI 助手入口：在左侧侧边栏底部常驻“AI 助手”入口，点击进入沉浸式对话界面
- 新增沉浸式 AI 对话页面：会话列表 + 对话区 + 输入区，支持流式打字机输出、停止生成
- 新增 Markdown + LaTeX 渲染：支持表格/列表/代码块与数学公式；代码块提供复制能力
- 新增 Token 统计：展示本次回复与会话累计的 token 估算/统计
- 新增本地持久化：AI 配置与聊天记录以 JSON 形式保存到 `server/data/`
- 新增后端 API：配置管理、会话管理、流式对话接口（兼容 OpenAI 协议/Streaming）
- **BREAKING**：无（新增能力）

## Impact
- Affected specs: 侧边栏/导航扩展、权限与路由守卫、沉浸式页面布局、消息渲染与流式状态管理、后端数据持久化与代理转发
- Affected code:
  - 后端：[server/index.js](file:///c:/Users/gcb/Desktop/%E5%8E%8B%E9%93%B8%E7%A8%8B%E5%BA%8F/server/index.js)（新增 AI 相关路由与数据文件）
  - 前端：工具注册/导航（`src/tools/*`）、主布局（`src/App.tsx`）、新增 AI 页面与组件（`src/pages/*` / `src/components/*`）、主题与样式（`src/theme/*` / `src/App.css`）

## ADDED Requirements

### Requirement: AI 助手入口与沉浸式体验
系统 SHALL 在左侧侧边栏底部提供常驻“AI 助手”入口，并在进入 AI 助手后提供沉浸式对话体验（对话为主，干扰最小）。

#### Scenario: 从任意页面进入 AI 助手
- **WHEN** 用户点击左侧侧边栏底部的“AI 助手”入口
- **THEN** 系统进入 AI 助手页面，展示会话列表与对话区，并默认选中最近会话或自动创建新会话

#### Scenario: 沉浸式布局
- **WHEN** 用户处于 AI 助手页面
- **THEN** 主区域以 AI 对话为核心呈现（双栏：会话列表 + 对话主区域），信息密度舒适、留白充足，且与 Lavender Pastel 主题一致

### Requirement: AI 角色预设（压铸工艺专家）
系统 SHALL 默认使用“压铸工艺专家”的系统预设提示词（System Prompt），并允许在配置中修改。

#### Scenario: 默认角色生效
- **WHEN** 用户首次使用 AI 助手且未修改系统提示词
- **THEN** AI 回复以压铸工艺专家风格输出（结构化、可操作、尽量给出工艺依据与风险提示）

### Requirement: OpenAI 协议兼容配置
系统 SHALL 支持配置兼容 OpenAI 协议的 API Base URL、API Key、默认模型、上下文条数限制，并保存在本地项目中。

#### Scenario: 保存与读取配置
- **WHEN** 用户在“设置”中保存 Base URL / API Key / 默认模型
- **THEN** 配置被持久化到 `server/data/ai_config.json`，刷新页面后仍可使用

#### Scenario: API Key 安全展示
- **WHEN** 用户打开配置页面
- **THEN** 系统不直接回显完整 API Key（仅显示“已设置/未设置”或掩码）

### Requirement: 会话与聊天记录本地持久化
系统 SHALL 将会话列表与消息记录持久化到 `server/data/ai_chats.json`，并支持会话的创建、列表读取与删除。

#### Scenario: 新建会话
- **WHEN** 用户点击“新建对话”
- **THEN** 系统创建一个新会话并切换到该会话，对话区清空并可立即输入

#### Scenario: 删除会话
- **WHEN** 用户在会话列表删除某一会话并确认
- **THEN** 该会话与其消息从本地存储删除，UI 更新且不影响其它会话

### Requirement: 流式对话（Streaming）与停止生成
系统 SHALL 通过后端代理调用兼容 OpenAI 的接口，并以流式方式向前端输出增量内容，前端提供“停止”按钮中断生成。

#### Scenario: 流式输出成功
- **WHEN** 用户在某会话中发送消息
- **THEN** 系统立刻开始显示 AI 的流式增量内容（打字机效果），直至完成

#### Scenario: 停止生成
- **WHEN** AI 正在生成且用户点击“停止”
- **THEN** 本次生成被中断，UI 停止追加内容，并将已生成片段按一次回复保存到该会话

### Requirement: Markdown 与 LaTeX 渲染
系统 SHALL 在 AI 消息气泡中渲染 Markdown（含 GFM 表格/列表/代码块）与 LaTeX 数学公式，并提供代码块复制能力。

#### Scenario: 渲染代码块与公式
- **WHEN** AI 输出包含 Markdown 代码块或 LaTeX 公式
- **THEN** UI 正确渲染代码块样式与公式排版，且代码块提供一键复制

### Requirement: Token 统计展示
系统 SHALL 统计并展示 Token 消耗量，至少包含“本次回复 token（估算/接口返回）”与“会话累计 token”。

#### Scenario: 统计可用
- **WHEN** 一次 AI 回复完成（或被停止）
- **THEN** UI 显示该次回复 token 与会话累计 token，并在会话列表中可展示累计值（可选）

### Requirement: 权限与访问控制（最小安全）
系统 SHALL 复用现有登录体系，对 AI 配置与聊天记录相关接口启用鉴权，避免未登录访问与读取敏感配置。

#### Scenario: 未登录访问被拒绝
- **WHEN** 未登录用户请求 AI 配置或聊天记录 API
- **THEN** 服务端返回 401/403，前端提示需要登录

## MODIFIED Requirements

### Requirement: 导航/工具入口展示
系统 SHOULD 在不破坏现有工具导航的前提下新增“AI 助手”入口，并保持与现有 UI 视觉语言一致。

## REMOVED Requirements

### Requirement: 无
**Reason**: 无
**Migration**: 无

