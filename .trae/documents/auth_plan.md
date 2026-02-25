# 用户认证与权限系统设计方案 (Plan)

## 1. 目标
为压铸工艺计算工具构建一套轻量级、安全的用户认证与权限管理系统。
- **环境适配**: 生产环境（Server部署）强制登录，开发环境（本地）免登录/自动模拟管理员。
- **账号管理**: 仅管理员可添加/管理账号，无公开注册。
- **权限模型**: 基于角色的访问控制 (RBAC)，支持细粒度权限配置（菜单、页面、按钮）。

## 2. 核心架构

### 2.1 后端 (Express Server)
*   **依赖**: 引入 `jsonwebtoken` (JWT) 用于会话管理，`bcryptjs` 用于密码加密。
*   **数据存储**: 新增 `server/users.json` 存储用户数据（加密后的密码）。
*   **API 接口**:
    *   `POST /api/auth/login`: 登录认证，返回 JWT Token 和用户信息。
    *   `GET /api/users`: 获取用户列表（仅管理员）。
    *   `POST /api/users`: 创建新用户（仅管理员）。
    *   `PUT /api/users/:username`: 更新用户（如重置密码、修改角色）。
    *   `DELETE /api/users/:username`: 删除用户。
*   **中间件**:
    *   `authenticateToken`: 验证请求头中的 Bearer Token。
    *   `requireRole(roles)`: 验证用户角色权限。

### 2.2 前端 (React)
*   **状态管理**:
    *   创建 `AuthContext` (位于 `src/core/auth/AuthContext.tsx`)。
    *   管理 `user` 对象、`token`、`login()`、`logout()`。
    *   **开发环境处理**: 利用 `import.meta.env.DEV` 判断，若为真则自动注入模拟的 Admin 用户，跳过登录页。
*   **路由守卫**:
    *   创建 `ProtectedRoute` 组件，包裹需要权限的路由。
    *   根据用户角色判断是否渲染组件或重定向到登录页。
*   **UI 组件**:
    *   `LoginPage`: 登录页面，风格适配 "Lavender Pastel"。
    *   `UserManagementPanel`: 管理员专用组件，用于添加/编辑/删除用户。
*   **权限控制**:
    *   **菜单过滤**: 修改 `Sidebar`，根据当前用户角色过滤 `builtinToolRegistry` 中的条目。
    *   **按钮级权限**: 提供 `AccessControl` 组件或 `usePermission` Hook，控制页面内按钮（如“删除”按钮）的显示/禁用。

## 3. 角色与权限定义 (RBAC)

| 角色 (Role) | 权限描述 | 可访问页面 (Routes) | 操作权限 (Actions) |
| :--- | :--- | :--- | :--- |
| **admin** | 超级管理员 | 所有页面 (含用户管理) | 所有操作 (增删改查) |
| **engineer** | 工程师 | 所有业务页面 (不含用户管理) | 查看、编辑、新增 (禁止删除) |
| **operator** | 操作员 | 仅限 PQ² 图 | 仅查看/操作 PQ² 相关功能 |
| **viewer** | 访客/查看者 | 所有业务页面 (不含用户管理) | 仅查看 (Read-only) |

## 4. 实施步骤

### 第一阶段：后端基础 (Backend)
1.  安装 `jsonwebtoken`, `bcryptjs`。
2.  创建 `server/users.json` 并初始化默认管理员账号 (admin/admin123)。
3.  实现 Auth API (`login`) 和 User API (`CRUD`)。
4.  实现 JWT 验证中间件。

### 第二阶段：前端核心 (Frontend Core)
1.  定义类型 `User`, `Role`, `Permission`。
2.  实现 `AuthContext`：
    *   集成 API 调用。
    *   处理 Token 存储 (localStorage)。
    *   实现开发环境免登录逻辑。
3.  实现 `LoginPage`：
    *   UI 设计：居中卡片，柔和配色。
    *   表单验证与错误提示。

### 第三阶段：权限控制 (Access Control)
1.  修改 `App.tsx` 和路由配置，接入 `AuthContext`。
2.  实现 `Sidebar` 菜单过滤逻辑：
    *   为 `ToolDefinition` 扩展 `allowedRoles` 字段 (或维护独立的映射表)。
3.  实现组件级权限控制：
    *   在 `Dashboard`, `MachineDatabase` 等页面中，根据角色隐藏/禁用“删除”按钮。

### 第四阶段：用户管理功能 (User Management)
1.  创建 `UserManagement` 页面（仅 Admin 可见）。
2.  实现用户列表展示 (Table)。
3.  实现“添加用户”和“编辑权限”模态框 (Modal)。

## 5. 待确认细节
*   **默认管理员密码**: 初始设为 `admin123`，建议首次登录提示修改（可选）。
*   **Token 过期**: 默认设置为 24 小时，过期自动登出。
