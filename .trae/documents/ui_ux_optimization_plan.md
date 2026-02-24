# UI/UX 优化方案

本方案旨在提升压铸工具箱的视觉体验和交互流畅度，重点关注响应式适配、动画效果、暗色模式及微交互细节。

## 1. 基础设施：主题系统与暗色模式

为了支持暗色模式并统一管理主题，我们将建立一套基于 Ant Design Token 和 CSS 变量的主题系统。

### 新增文件

* **`src/theme/darkTheme.ts`**: 定义暗色模式下的 Ant Design Token 配置（如 `colorBgBase`, `colorTextBase` 等）。

* **`src/context/ThemeContext.tsx`**: 创建 Context 用于管理当前主题状态（`light` | `dark`），并持久化存储到 `localStorage`。

* **`src/components/ThemeToggle.tsx`**: 一个精美的主题切换按钮组件。

### 修改文件

* **`src/App.tsx`**:

  * 引入 `ThemeProvider` 包裹应用。

  * 使用 Ant Design 的 `ConfigProvider` 动态应用 `lavenderTheme` 或 `darkTheme`。

* **`src/index.css`** **&** **`src/App.css`**:

  * 定义 CSS 变量（Custom Properties）来管理背景渐变、面板背景色、边框颜色等。

  * 例如：`--app-bg-gradient`, `--panel-bg`, `--panel-border`, `--text-primary`。

  * 适配 `[data-theme='dark']` 选择器，确保非 Ant Design 组件也能响应暗色模式。

##

## 3. 动画与过渡效果

添加细腻的动画，提升应用的生动感。

### CSS 动画 (`src/App.css`)

* **定义关键帧**:

  * `@keyframes fadeIn`: 用于页面内容的渐显。

  * `@keyframes slideUp`: 用于内容的向上滑入效果。

* **过渡类**:

  * `.page-enter`: 应用组合动画（fade + slide）。

  * `.card-hover`: 定义卡片悬停时的平滑过渡。

### 组件应用 (`src/App.tsx`)

* **页面切换**:

  * 在主内容区域 (`activeTool?.element`) 的容器上应用动画类。

  * 使用 `key={activeTool.id}` 确保切换工具时触发动画重播。

* **卡片加载**:

  * 如果数据加载有延迟，使用 `Skeleton` 组件提供视觉占位。

## 4. 微交互增强

提升用户操作的反馈感。

### CSS 增强 (`src/App.css`)

* **卡片交互**:

  * `.softCard`: 添加 `:hover` 状态，轻微上浮 (`transform: translateY(-4px)`) 并加深阴影。

* **按钮与胶囊**:

  * `.pill`: 添加 `:hover` 变色效果，增加点击时的缩放反馈 (`transform: scale(0.98)` on active)。

* **菜单项**:

  * 优化菜单项的悬停和选中背景色过渡。

## 执行计划

1. **准备阶段**: 创建 Theme Context 和 Dark Theme 配置。
2. **样式重构**: 将现有硬编码颜色替换为 CSS 变量，并实现暗色模式样式。
3. **动画与交互**: 添加 CSS 动画和微交互效果。
4. **验证**: 在不同分辨率和主题下测试 UI 表现。

