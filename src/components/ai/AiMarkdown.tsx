import { Button, message } from 'antd'
import { CopyOutlined } from '@ant-design/icons'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { useTheme } from '../../core/state/themeState'
import 'katex/dist/katex.min.css'
import './AiMarkdown.css'

export function AiMarkdown(props: { content: string }) {
  const { theme } = useTheme()
  const style = theme === 'dark' ? oneDark : oneLight

  return (
    <div className="aiMarkdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          code({ className, children, ...rest }) {
            const raw = String(children ?? '')
            const match = /language-(\w+)/.exec(className ?? '')
            const lang = match?.[1] ?? ''
            const isInline = !(className && className.includes('language-'))
            if (isInline) {
              return (
                <code className="aiInlineCode" {...rest}>
                  {raw}
                </code>
              )
            }

            const text = raw.replace(/\n$/, '')
            return (
              <div className="aiCodeBlock">
                <div className="aiCodeBlockTopbar">
                  <div className="aiCodeBlockLang">{lang || 'code'}</div>
                  <Button
                    size="small"
                    type="text"
                    icon={<CopyOutlined />}
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(text)
                        message.success('已复制')
                      } catch {
                        message.error('复制失败')
                      }
                    }}
                  >
                    复制
                  </Button>
                </div>
                <SyntaxHighlighter
                  style={style}
                  language={lang || undefined}
                  customStyle={{ margin: 0, padding: '12px 12px', background: 'transparent' }}
                  codeTagProps={{
                    style: {
                      fontFamily:
                        "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
                      fontSize: 13,
                      lineHeight: 1.6,
                    },
                  }}
                >
                  {text}
                </SyntaxHighlighter>
              </div>
            )
          },
        }}
      >
        {props.content}
      </ReactMarkdown>
    </div>
  )
}

