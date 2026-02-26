
import React, { useRef, useEffect, useState } from 'react'
import { Input, Button, Avatar, Spin, Typography, Space, Tooltip, message, theme } from 'antd'
import { SendOutlined, UserOutlined, RobotOutlined, CopyOutlined, CheckOutlined, BulbOutlined } from '@ant-design/icons'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import type { Message } from '../types'

const { TextArea } = Input
const { Title, Text } = Typography

interface ChatAreaProps {
  messages: Message[]
  loading: boolean
  onSendMessage: (content: string) => void
  onStopGeneration: () => void
}

const CodeBlock = ({ language, children }: any) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(children).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div style={{ position: 'relative', margin: '8px 0', borderRadius: 8, overflow: 'hidden' }}>
      <div style={{
        position: 'absolute',
        top: 8,
        right: 8,
        zIndex: 10,
      }}>
        <Button
          type="text"
          size="small"
          icon={copied ? <CheckOutlined /> : <CopyOutlined />}
          onClick={handleCopy}
          style={{ color: '#fff', background: 'rgba(255,255,255,0.1)' }}
        >
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
      <SyntaxHighlighter
        style={vscDarkPlus}
        language={language}
        PreTag="div"
        customStyle={{ margin: 0, padding: 16, borderRadius: 8 }}
      >
        {String(children).replace(/\n$/, '')}
      </SyntaxHighlighter>
    </div>
  )
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  messages,
  loading,
  onSendMessage,
  onStopGeneration,
}) => {
  const { token } = theme.useToken()
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, loading])

  const handleSend = () => {
    if (!input.trim()) return
    onSendMessage(input)
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Suggestion prompts for empty state
  const suggestions = [
    '帮我分析一下压铸模具的冷却系统设计要点',
    '如何优化铝合金压铸件的气孔问题？',
    '解释一下 PQ² 图的原理和应用',
    '写一段计算压铸机锁模力的 Python 代码',
  ]

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%', 
      position: 'relative',
      backgroundColor: token.colorBgLayout 
    }}>
      {/* Messages Area */}
      <div 
        ref={scrollRef}
        style={{ 
          flex: 1, 
          overflowY: 'auto', 
          padding: '24px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
        }}
      >
        {messages.length === 0 ? (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '100%',
            opacity: 0.8 
          }}>
            <div style={{ 
              width: 64, 
              height: 64, 
              borderRadius: '50%', 
              backgroundColor: token.colorPrimaryBg,
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              marginBottom: 24
            }}>
              <RobotOutlined style={{ fontSize: 32, color: token.colorPrimary }} />
            </div>
            <Title level={3} style={{ marginBottom: 8 }}>有什么可以帮你的吗？</Title>
            <Text type="secondary" style={{ marginBottom: 32 }}>我可以协助你进行压铸工艺分析、代码编写或解答技术问题</Text>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, maxWidth: 600, width: '100%' }}>
              {suggestions.map((s, i) => (
                <div 
                  key={i}
                  onClick={() => onSendMessage(s)}
                  style={{
                    padding: '12px 16px',
                    backgroundColor: token.colorBgContainer,
                    border: `1px solid ${token.colorBorder}`,
                    borderRadius: 12,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12
                  }}
                  className="suggestion-card"
                >
                  <BulbOutlined style={{ color: token.colorWarning }} />
                  <Text ellipsis>{s}</Text>
                </div>
              ))}
            </div>
            <style>{`
              .suggestion-card:hover {
                background-color: ${token.colorFillQuaternary} !important;
                border-color: ${token.colorPrimary} !important;
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0,0,0,0.05);
              }
            `}</style>
          </div>
        ) : (
          messages.map((msg) => (
            <div 
              key={msg.id} 
              style={{ 
                display: 'flex', 
                gap: 16, 
                maxWidth: 800, 
                width: '100%', 
                margin: '0 auto',
                flexDirection: msg.role === 'user' ? 'row-reverse' : 'row'
              }}
            >
              <Avatar 
                icon={msg.role === 'user' ? <UserOutlined /> : <RobotOutlined />} 
                style={{ 
                  backgroundColor: msg.role === 'user' ? token.colorPrimary : token.colorSuccess,
                  flexShrink: 0
                }} 
              />
              <div style={{ 
                flex: 1, 
                backgroundColor: msg.role === 'user' ? token.colorPrimaryBg : token.colorBgContainer,
                padding: '12px 16px',
                borderRadius: 12,
                borderTopLeftRadius: msg.role === 'assistant' ? 2 : 12,
                borderTopRightRadius: msg.role === 'user' ? 2 : 12,
                boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                border: `1px solid ${token.colorBorderSecondary}`,
                overflow: 'hidden'
              }}>
                {msg.role === 'user' ? (
                  <Text style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</Text>
                ) : (
                  <div className="markdown-body" style={{ fontSize: 15, lineHeight: 1.6 }}>
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm, remarkMath]}
                      rehypePlugins={[rehypeKatex]}
                      components={{
                        code({ node, inline, className, children, ...props }: any) {
                          const match = /language-(\w+)/.exec(className || '')
                          return !inline && match ? (
                            <CodeBlock language={match[1]}>{children}</CodeBlock>
                          ) : (
                            <code className={className} {...props} style={{ 
                              backgroundColor: 'rgba(150, 150, 150, 0.1)', 
                              padding: '2px 4px', 
                              borderRadius: 4,
                              fontFamily: 'monospace'
                            }}>
                              {children}
                            </code>
                          )
                        }
                      }}
                    >
                      {msg.content || 'Thinking...'}
                    </ReactMarkdown>
                    {loading && !msg.content && <Spin size="small" style={{ marginLeft: 8 }} />}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} style={{ height: 1 }} />
      </div>

      {/* Input Area */}
      <div style={{ 
        padding: '16px 24px 24px', 
        backgroundColor: token.colorBgLayout,
        borderTop: `1px solid ${token.colorBorder}`,
        maxWidth: 900,
        margin: '0 auto',
        width: '100%',
        position: 'relative'
      }}>
        <div style={{ 
          backgroundColor: token.colorBgContainer, 
          borderRadius: 16, 
          padding: 8,
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
          border: `1px solid ${token.colorBorder}`,
          display: 'flex',
          flexDirection: 'column'
        }}>
          <TextArea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入您的问题..."
            autoSize={{ minRows: 1, maxRows: 6 }}
            bordered={false}
            style={{ 
              resize: 'none', 
              padding: '8px 12px', 
              fontSize: 16,
              marginBottom: 4
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 8px' }}>
            <div style={{ display: 'flex', gap: 8 }}>
              {/* Future: Attachment button */}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
               {loading && (
                <Button 
                  danger 
                  size="small" 
                  onClick={onStopGeneration}
                  style={{ borderRadius: 8 }}
                >
                  停止生成
                </Button>
              )}
              <Button 
                type="primary" 
                shape="circle" 
                icon={<SendOutlined />} 
                onClick={handleSend}
                disabled={!input.trim() || loading}
                style={{ 
                  boxShadow: '0 2px 8px rgba(139, 92, 246, 0.4)' 
                }}
              />
            </div>
          </div>
        </div>
        <Text type="secondary" style={{ fontSize: 12, textAlign: 'center', display: 'block', marginTop: 8 }}>
          AI 生成的内容可能包含错误，请核实重要信息。
        </Text>
      </div>
    </div>
  )
}
