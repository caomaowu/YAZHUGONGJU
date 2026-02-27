# 修复 AI 知识库公式渲染问题方案

## 1. 问题分析
用户反馈 AI 知识库（LLM）输出的数学公式无法正常显示，直接显示为 `( \int ... )` 或 `[ ... ]` 的形式。
**原因诊断**：
- DeepSeek 或阿里云百炼等 LLM 模型通常使用 LaTeX 标准定界符：
  - 行内公式：`\( ... \)`
  - 块级公式：`\[ ... \]`
- 当前项目使用的 `react-markdown` + `remark-math` 插件默认仅支持 `$` (行内) 和 `$$` (块级) 作为定界符。
- 因此，Markdown 渲染器将 `\(` 识别为转义的括号 `(`，导致公式未被识别为数学内容，而是作为普通文本显示。

## 2. 解决方案
在将消息内容传递给 `ReactMarkdown` 组件之前，对内容进行预处理，将 LaTeX 标准定界符转换为 `remark-math` 支持的格式。

### 修改文件
- `src/pages/AIKnowledgeBase/components/ChatArea.tsx`

### 具体步骤
1.  **新增预处理函数** `preprocessLaTeX`：
    - 将 `\[` 和 `\]` 替换为 `$$`
    - 将 `\(` 和 `\)` 替换为 `$`
    - *注意*：需要使用正则表达式确保正确匹配，避免误伤普通文本。

2.  **应用预处理**：
    - 在渲染 `ReactMarkdown` 时，将 `children={msg.content}` 修改为 `children={preprocessLaTeX(msg.content)}`。

## 3. 代码变更示例

```typescript
// src/pages/AIKnowledgeBase/components/ChatArea.tsx

// 添加预处理函数
const preprocessLaTeX = (content: string) => {
  if (!content) return ''
  return content
    .replace(/\\\[/g, '$$$$') // 替换 \[ 为 $$
    .replace(/\\\]/g, '$$$$') // 替换 \] 为 $$
    .replace(/\\\(/g, '$')    // 替换 \( 为 $
    .replace(/\\\)/g, '$')    // 替换 \) 为 $
}

// 在组件中使用
<ReactMarkdown
  remarkPlugins={[remarkGfm, remarkMath]}
  rehypePlugins={[rehypeKatex]}
  // ... 其他配置
>
  {preprocessLaTeX(msg.content)}
</ReactMarkdown>
```

## 4. 验证计划
- 修改完成后，用户需重新向 AI 提问包含数学公式的问题（如“解释微积分基本定理”）。
- 预期结果：公式应正确渲染为数学排版，不再显示原始的 `( ... )` 或 `[ ... ]`。
