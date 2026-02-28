
import React, { useRef, useEffect, useState, useMemo } from 'react'
import { Input, Button, Avatar, Typography, Tooltip, theme } from 'antd'
import { SendOutlined, UserOutlined, RobotOutlined, CopyOutlined, CheckOutlined, BulbOutlined } from '@ant-design/icons'
import ReactMarkdown, { type Components } from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import type { Message } from '../types'

const { TextArea } = Input
const { Title, Text } = Typography

// Preprocess LaTeX delimiters to be compatible with remark-math
const preprocessLaTeX = (content: string) => {
  if (typeof content !== 'string') return ''
  return content
    .replace(/\\\[/g, '$$$$')
    .replace(/\\\]/g, '$$$$')
    .replace(/\\\(/g, '$')
    .replace(/\\\)/g, '$')
}

interface ChatAreaProps {
  messages: Message[]
  loading: boolean
  onSendMessage: (content: string) => void
  onStopGeneration: () => void
}

type CodeBlockProps = {
  language?: string
  children: React.ReactNode
}

const CodeBlock = ({ language, children }: CodeBlockProps) => {
  const [copied, setCopied] = useState(false)
  const { token } = theme.useToken()

  const handleCopy = () => {
    navigator.clipboard.writeText(String(children)).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div style={{ 
      margin: '12px 0', 
      borderRadius: 12, 
      overflow: 'hidden',
      border: `1px solid ${token.colorBorderSecondary}`,
      boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
      backgroundColor: '#1e1e1e' // Force dark background for code
    }}>
      {/* macOS Style Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 16px',
        backgroundColor: '#2d2d2d',
        borderBottom: '1px solid #333'
      }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#ff5f56' }} />
          <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#ffbd2e' }} />
          <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#27c93f' }} />
        </div>
        <div style={{ 
          color: '#aaa', 
          fontSize: 12, 
          fontFamily: 'monospace',
          textTransform: 'uppercase'
        }}>
          {language || 'text'}
        </div>
        <Tooltip title={copied ? '已复制' : '复制代码'}>
          <Button
            type="text"
            size="small"
            icon={copied ? <CheckOutlined style={{ color: '#27c93f' }} /> : <CopyOutlined style={{ color: '#aaa' }} />}
            onClick={handleCopy}
            style={{ 
              color: '#fff', 
              width: 24, 
              height: 24, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}
          />
        </Tooltip>
      </div>
      <SyntaxHighlighter
        style={vscDarkPlus}
        language={language}
        PreTag="div"
        customStyle={{ 
          margin: 0, 
          padding: '16px', 
          fontSize: 14,
          lineHeight: 1.5,
          background: 'transparent'
        }}
        showLineNumbers={true}
        lineNumberStyle={{ minWidth: '2.5em', paddingRight: '1em', color: '#666', textAlign: 'right' }}
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
  const shouldAutoScrollRef = useRef(true)
  const prevMessagesLength = useRef(0)
  const isUserScrolling = useRef(false)

  // Scroll to bottom helper
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior, block: 'end' })
  }

  // Handle scroll events to detect if user is scrolling up
  const handleScroll = () => {
    if (!scrollRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100
    
    // If user scrolls up, disable auto-scroll
    if (!isAtBottom) {
      isUserScrolling.current = true
      shouldAutoScrollRef.current = false
    } else {
      isUserScrolling.current = false
      shouldAutoScrollRef.current = true
    }
  }

  // Auto-scroll logic: only scroll if user hasn't scrolled up or it's a new message from user
  useEffect(() => {
    const isNewMessage = messages.length > prevMessagesLength.current
    const lastMessage = messages[messages.length - 1]
    const isUserMessage = lastMessage?.role === 'user'

    if (isNewMessage) {
      if (isUserMessage || shouldAutoScrollRef.current) {
        // Force scroll for user messages or if already at bottom
        scrollToBottom('smooth')
        shouldAutoScrollRef.current = true
        isUserScrolling.current = false
      }
      prevMessagesLength.current = messages.length
    } else if (loading && shouldAutoScrollRef.current) {
      // Smooth scroll during streaming if user hasn't scrolled up
      scrollToBottom('auto')
    }
  }, [messages, loading])

  const handleSend = () => {
    if (!input.trim()) return
    onSendMessage(input)
    setInput('')
    // Reset scroll state
    isUserScrolling.current = false
    shouldAutoScrollRef.current = true
    setTimeout(() => scrollToBottom(), 100)
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

  const markdownComponents = useMemo<Components>(() => ({
    code({ className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || '')
      return match ? (
        <CodeBlock language={match[1]}>{children}</CodeBlock>
      ) : (
        <code
          className={className}
          {...props}
          style={{
            backgroundColor: token.colorFillTertiary,
            padding: '2px 6px',
            borderRadius: 4,
            fontFamily: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace',
            fontSize: '0.9em',
            color: token.colorText,
          }}
        >
          {children}
        </code>
      )
    },
  }), [token.colorFillTertiary, token.colorText])

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%', 
      position: 'relative',
      backgroundColor: token.colorBgLayout,
      overflow: 'hidden'
    }}>
      {/* Global Styles for Animations & Scrollbar */}
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .message-bubble {
          animation: fadeInUp 0.3s ease-out forwards;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: ${token.colorFillSecondary};
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: ${token.colorFill};
        }
        .input-area-glass {
          background: ${token.colorBgContainer}CC; /* 80% opacity */
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-top: 1px solid ${token.colorBorderSecondary};
          box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.02);
        }
        .typing-cursor::after {
          content: '▋';
          display: inline-block;
          animation: blink 1s step-end infinite;
          margin-left: 2px;
          vertical-align: baseline;
          color: ${token.colorPrimary};
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>

      {/* Messages Area */}
      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        className="custom-scrollbar"
        style={{ 
          flex: 1, 
          overflowY: 'auto', 
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
          scrollBehavior: 'smooth'
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
              background: `linear-gradient(135deg, ${token.colorPrimaryBg}, ${token.colorFillSecondary})`,
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              marginBottom: 24,
              boxShadow: '0 8px 16px rgba(0,0,0,0.05)'
            }}>
              <RobotOutlined style={{ fontSize: 32, color: token.colorPrimary }} />
            </div>
            <Title level={3} style={{ marginBottom: 8, fontWeight: 600 }}>有什么可以帮你的吗？</Title>
            <Text type="secondary" style={{ marginBottom: 32, fontSize: 15 }}>我可以协助你进行压铸工艺分析、代码编写或解答技术问题</Text>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, maxWidth: 700, width: '100%' }}>
              {suggestions.map((s, i) => (
                <div 
                  key={i}
                  onClick={() => onSendMessage(s)}
                  style={{
                    padding: '16px 20px',
                    backgroundColor: token.colorBgContainer,
                    border: `1px solid ${token.colorBorder}`,
                    borderRadius: 16,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    fontSize: 14,
                    boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                  }}
                  className="suggestion-card"
                >
                  <BulbOutlined style={{ color: token.colorWarning, fontSize: 18 }} />
                  <Text ellipsis>{s}</Text>
                </div>
              ))}
            </div>
            <style>{`
              .suggestion-card:hover {
                background-color: ${token.colorFillQuaternary} !important;
                border-color: ${token.colorPrimary} !important;
                transform: translateY(-2px);
                box-shadow: 0 8px 20px rgba(0,0,0,0.08) !important;
              }
            `}</style>
          </div>
        ) : (
          messages.map((msg, index) => (
            <div 
              key={msg.id} 
              className="message-bubble"
              style={{ 
                display: 'flex', 
                gap: 16, 
                maxWidth: '100%', 
                width: '100%', 
                margin: '0 auto',
                flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                animationDelay: `${index * 0.05}s` // Stagger animation
              }}
            >
              <Avatar 
                size="default"
                icon={msg.role === 'user' ? <UserOutlined /> : <RobotOutlined />} 
                style={{ 
                  backgroundColor: msg.role === 'user' ? token.colorPrimary : token.colorSuccess,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  flexShrink: 0
                }} 
              />
              <div style={{ 
                flex: 1, 
                maxWidth: '85%',
                backgroundColor: msg.role === 'user' ? token.colorPrimaryBg : token.colorBgContainer,
                padding: '14px 18px',
                borderRadius: 16,
                borderTopLeftRadius: msg.role === 'assistant' ? 4 : 16,
                borderTopRightRadius: msg.role === 'user' ? 4 : 16,
                boxShadow: msg.role === 'user' ? 'none' : '0 2px 8px rgba(0,0,0,0.04)',
                border: msg.role === 'user' ? 'none' : `1px solid ${token.colorBorderSecondary}`,
                overflow: 'hidden',
                position: 'relative'
              }}>
                {msg.role === 'user' ? (
                  <Text style={{ whiteSpace: 'pre-wrap', fontSize: 15, lineHeight: 1.6 }}>{msg.content}</Text>
                ) : (
                  <div className={`markdown-body ${loading && index === messages.length - 1 ? 'typing-cursor' : ''}`} style={{ fontSize: 15, lineHeight: 1.7 }}>
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm, remarkMath]}
                      rehypePlugins={[rehypeKatex]}
                      components={markdownComponents}
                    >
                      {preprocessLaTeX(msg.content || '')}
                    </ReactMarkdown>
                    {/* Only show loading spinner if content is empty (initial wait) */}
                    {loading && !msg.content && (
                      <div style={{ display: 'flex', gap: 4, padding: '4px 0' }}>
                        <div style={{ width: 8, height: 8, background: token.colorTextSecondary, borderRadius: '50%', animation: 'blink 1.4s infinite both 0s' }}></div>
                        <div style={{ width: 8, height: 8, background: token.colorTextSecondary, borderRadius: '50%', animation: 'blink 1.4s infinite both 0.2s' }}></div>
                        <div style={{ width: 8, height: 8, background: token.colorTextSecondary, borderRadius: '50%', animation: 'blink 1.4s infinite both 0.4s' }}></div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} style={{ height: 1, marginTop: 10 }} />
      </div>

      {/* Input Area - Fixed at Bottom with Glassmorphism */}
      <div className="input-area-glass" style={{ 
        padding: '20px 24px 24px', 
        width: '100%',
        position: 'relative',
        zIndex: 100
      }}>
        <div style={{ 
          backgroundColor: token.colorBgContainer, 
          borderRadius: 16, 
          padding: 8,
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          border: `1px solid ${token.colorBorder}`,
          display: 'flex',
          flexDirection: 'column',
          transition: 'box-shadow 0.3s',
        }}
        onFocus={(e) => e.currentTarget.style.boxShadow = `0 0 0 2px ${token.colorPrimary}20`}
        onBlur={(e) => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)'}
        >
          <TextArea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入您的问题..."
            autoSize={{ minRows: 1, maxRows: 8 }}
            bordered={false}
            style={{ 
              resize: 'none', 
              padding: '12px 12px 8px', 
              fontSize: 15,
              lineHeight: 1.6,
              marginBottom: 4
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 8px 6px' }}>
            <div style={{ display: 'flex', gap: 8 }}>
              {/* Tool buttons can go here */}
              <Tooltip title="上传文件 (开发中)">
                <Button type="text" size="small" icon={<i className="ri-attachment-line" />} disabled style={{ color: token.colorTextTertiary }} />
              </Tooltip>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
               {loading && (
                <Button 
                  shape="round"
                  size="small" 
                  onClick={onStopGeneration}
                  icon={<span style={{ width: 8, height: 8, background: token.colorError, borderRadius: 2, display: 'inline-block' }} />}
                  style={{ 
                    borderColor: token.colorErrorBorder, 
                    color: token.colorError,
                    background: token.colorErrorBg,
                    fontSize: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  停止
                </Button>
              )}
              <Button 
                type="primary" 
                shape="circle" 
                size="large"
                icon={<SendOutlined style={{ fontSize: 18, marginLeft: input.trim() ? 2 : 0 }} />} 
                onClick={handleSend}
                disabled={!input.trim() || loading}
                style={{ 
                  boxShadow: !input.trim() || loading ? 'none' : `0 4px 12px ${token.colorPrimary}66`,
                  width: 36,
                  height: 36,
                  minWidth: 36,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  transform: input.trim() && !loading ? 'scale(1)' : 'scale(0.9)',
                  opacity: input.trim() && !loading ? 1 : 0.6
                }}
              />
            </div>
          </div>
        </div>
        <Text type="secondary" style={{ fontSize: 12, textAlign: 'center', display: 'block', marginTop: 12, opacity: 0.6 }}>
          AI 生成的内容可能包含错误，请核实重要信息。
        </Text>
      </div>
    </div>
  )
}
