import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  Button,
  Card,
  Divider,
  Form,
  Input,
  InputNumber,
  List,
  Modal,
  Popconfirm,
  Select,
  Space,
  Spin,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd'
import { ArrowLeftOutlined, DeleteOutlined, PlusOutlined, SettingOutlined, ThunderboltOutlined } from '@ant-design/icons'
import { useAuth } from '../core/auth/useAuth'
import { useHashPath } from '../core/router/hash'
import { AiMarkdown } from '../components/ai/AiMarkdown'
import './AIAssistantPage.css'

type AiConfig = {
  provider: string
  baseUrl: string
  defaultModel: string
  systemPrompt: string
  maxContextMessages: number
  apiKeySet: boolean
  apiKeyMasked: string
}

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
  tokens?: number
  promptTokens?: number
  pending?: boolean
}

type Chat = {
  id: string
  owner: string
  title: string
  createdAt: string
  updatedAt: string
  totalTokens: number
  messages: ChatMessage[]
}

type ChatSummary = Omit<Chat, 'messages'>

function isSameDate(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function getChatGroupLabel(updatedAt: string) {
  const d = new Date(updatedAt)
  const now = new Date()
  if (isSameDate(d, now)) return '今天'
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (isSameDate(d, yesterday)) return '昨天'
  return '更早'
}

function safeJsonParse<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T
  } catch {
    return null
  }
}

export function AIAssistantPage() {
  const { token, hasPermission } = useAuth()
  const { navigate } = useHashPath()

  const [config, setConfig] = useState<AiConfig | null>(null)
  const [configLoading, setConfigLoading] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [configForm] = Form.useForm()

  const [chats, setChats] = useState<ChatSummary[]>([])
  const [chatsLoading, setChatsLoading] = useState(false)
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const [activeChat, setActiveChat] = useState<Chat | null>(null)
  const [chatLoading, setChatLoading] = useState(false)

  const [draft, setDraft] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [lastUsage, setLastUsage] = useState<{ promptTokens: number; completionTokens: number; totalTokens: number } | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const messagesWrapRef = useRef<HTMLDivElement | null>(null)
  const isAtBottomRef = useRef(true)

  const [hasInitialized, setHasInitialized] = useState(false)

  const groupedChats = useMemo(() => {
    const groups: Record<string, ChatSummary[]> = { 今天: [], 昨天: [], 更早: [] }
    for (const c of chats) groups[getChatGroupLabel(c.updatedAt) ?? '更早']?.push(c)
    return groups
  }, [chats])

  const currentModel = useMemo(() => {
    return config?.defaultModel ?? ''
  }, [config])

  const fetchConfig = useCallback(async () => {
    if (!token) return
    setConfigLoading(true)
    try {
      const res = await fetch('/api/ai/config', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed')
      const data = (await res.json()) as AiConfig
      setConfig(data)
    } catch {
      message.error('读取 AI 配置失败（可能需要管理员/工程师权限）')
    } finally {
      setConfigLoading(false)
    }
  }, [token])

  const fetchChats = useCallback(async () => {
    if (!token) return
    setChatsLoading(true)
    try {
      const res = await fetch('/api/ai/chats', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed')
      const data = (await res.json()) as ChatSummary[]
      setChats(data)
      setHasInitialized(true)
      // 如果没有选中的会话
      if (!activeChatId) {
        if (data.length > 0) {
          // 有历史会话，选中最新的
          setActiveChatId(data[0].id)
        } else {
          // 没有会话，创建一个新的（只在初始化完成后执行一次，避免重复创建）
          // 但要注意这里不要直接调用 createChat()，因为 createChat 也会调用 fetchChats
          // 可以通过 useEffect 监听 hasInitialized 来处理，或者在这里手动触发创建逻辑
          // 为了避免副作用链，我们在这里不做自动创建，而是让 useEffect 处理
        }
      }
    } catch {
      message.error('读取会话列表失败')
    } finally {
      setChatsLoading(false)
    }
  }, [token, activeChatId])

  const fetchChat = useCallback(
    async (chatId: string) => {
      if (!token) return
      setChatLoading(true)
      try {
        const res = await fetch(`/api/ai/chats/${chatId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) {
          if (res.status === 404) {
            // 如果会话不存在，静默清除 activeChatId，不要报错
            setActiveChatId(null)
            setActiveChat(null)
            await fetchChats() // 刷新列表
            return
          }
          throw new Error('Failed')
        }
        const data = (await res.json()) as Chat
        setActiveChat(data)
      } catch {
        // message.error('读取会话失败') // 移除报错，避免刷屏
        console.error('Fetch chat failed')
      } finally {
        setChatLoading(false)
      }
    },
    [token, fetchChats],
  )

  const createChat = useCallback(async () => {
    if (!token) return null
    try {
      const res = await fetch('/api/ai/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
      })
      if (!res.ok) throw new Error('Failed')
      const chat = (await res.json()) as ChatSummary
      await fetchChats()
      setActiveChatId(chat.id)
      return chat.id
    } catch {
      message.error('创建会话失败')
      return null
    }
  }, [token, fetchChats])

  const deleteChat = useCallback(
    async (chatId: string) => {
      if (!token) return
      try {
        const res = await fetch(`/api/ai/chats/${chatId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error('Failed')
        message.success('会话已删除')
        if (activeChatId === chatId) {
          setActiveChatId(null)
          setActiveChat(null)
        }
        await fetchChats()
      } catch {
        message.error('删除会话失败')
      }
    },
    [token, activeChatId, fetchChats],
  )

  const openSettings = useCallback(async () => {
    setSettingsOpen(true)
    await fetchConfig()
  }, [fetchConfig])

  const saveSettings = useCallback(async () => {
    if (!token) return
    try {
      const values = await configForm.validateFields()
      const res = await fetch('/api/ai/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(values),
      })
      if (!res.ok) throw new Error('Failed')
      const data = (await res.json()) as AiConfig
      setConfig(data)
      message.success('配置已保存')
      setSettingsOpen(false)
    } catch {
      message.error('保存配置失败')
    }
  }, [token, configForm])

  const stopStreaming = useCallback(() => {
    if (abortRef.current) abortRef.current.abort()
    abortRef.current = null
    setStreaming(false)
    setActiveChat((prev) => {
      if (!prev) return prev
      const next = { ...prev, messages: [...prev.messages] }
      const last = next.messages[next.messages.length - 1]
      if (last && last.role === 'assistant' && last.pending) {
        last.pending = false
      }
      return next
    })
  }, [])

  const scrollMessagesToBottom = useCallback((mode?: 'auto' | 'force') => {
    const el = messagesWrapRef.current
    if (!el) return
    if (mode !== 'force' && !isAtBottomRef.current) return
    el.scrollTop = el.scrollHeight
  }, [])

  const streamChat = useCallback(
    async (chatId: string, content: string) => {
      if (!token) return
      const controller = new AbortController()
      abortRef.current = controller
      setStreaming(true)

      const userMsg: ChatMessage = {
        id: `local-${Date.now()}-u`,
        role: 'user',
        content,
        createdAt: new Date().toISOString(),
      }
      const assistantMsg: ChatMessage = {
        id: `local-${Date.now()}-a`,
        role: 'assistant',
        content: '',
        createdAt: new Date().toISOString(),
        pending: true,
      }
      setActiveChat((prev) => {
        if (!prev) return prev
        if (prev.id !== chatId) return prev
        return { ...prev, messages: [...prev.messages, userMsg, assistantMsg] }
      })
      scrollMessagesToBottom('force')

      try {
        const res = await fetch('/api/ai/chat/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ chatId, message: content }),
          signal: controller.signal,
        })
        if (!res.ok || !res.body) {
          const t = await res.text().catch(() => '')
          throw new Error(t || 'Stream failed')
        }

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        const applyDelta = (delta: string) => {
          setActiveChat((prev) => {
            if (!prev || prev.id !== chatId) return prev
            const next = { ...prev, messages: [...prev.messages] }
            const last = next.messages[next.messages.length - 1]
            if (last && last.role === 'assistant') {
              last.content = (last.content ?? '') + delta
            }
            return next
          })
          scrollMessagesToBottom('auto')
        }

        const finalize = () => {
          setActiveChat((prev) => {
            if (!prev || prev.id !== chatId) return prev
            const next = { ...prev, messages: [...prev.messages] }
            const last = next.messages[next.messages.length - 1]
            if (last && last.role === 'assistant') last.pending = false
            return next
          })
        }

        let currentEventName = 'message'
        let currentEventData: string[] = []

        while (true) {
          const { value, done } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })

          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed) {
              if (currentEventData.length > 0) {
                const dataText = currentEventData.join('\n')

                if (currentEventName === 'delta') {
                  const payload = safeJsonParse<{ delta?: string }>(dataText)
                  if (payload?.delta) applyDelta(payload.delta)
                } else if (currentEventName === 'error') {
                  finalize()
                  const payload = safeJsonParse<{ message?: string; detail?: string }>(dataText)
                  message.error(payload?.message || 'AI 请求失败')
                } else if (currentEventName === 'stopped') {
                  finalize()
                } else if (currentEventName === 'done') {
                  finalize()
                  const payload = safeJsonParse<{
                    usage?: { promptTokens: number; completionTokens: number; totalTokens: number }
                    chatTotalTokens?: number
                  }>(dataText)
                  if (payload?.usage) setLastUsage(payload.usage)
                  if (typeof payload?.chatTotalTokens === 'number') {
                    const chatTotalTokens = payload.chatTotalTokens
                    setActiveChat((prev) => {
                      if (!prev || prev.id !== chatId) return prev
                      return { ...prev, totalTokens: chatTotalTokens }
                    })
                  }
                }

                currentEventName = 'message'
                currentEventData = []
              }
              continue
            }

            if (line.startsWith('event:')) {
              currentEventName = line.slice(6).trim()
            } else if (line.startsWith('data:')) {
              currentEventData.push(line.slice(5).trim())
            }
          }
        }
      } catch {
        if (!controller.signal.aborted) {
          message.error('流式连接失败')
        }
      } finally {
        abortRef.current = null
        setStreaming(false)
        await fetchChats()
        await fetchChat(chatId)
      }
    },
    [token, fetchChats, fetchChat, scrollMessagesToBottom],
  )

  const handleSend = useCallback(async () => {
    if (streaming) return
    const content = draft.trim()
    if (!content) return
    if (!hasPermission('ai')) {
      message.info('暂未开放')
      return
    }
    const chatId = activeChatId ?? (await createChat())
    if (!chatId) return
    setDraft('')
    await streamChat(chatId, content)
  }, [streaming, draft, hasPermission, activeChatId, createChat, streamChat])

  // 初始加载列表
  useEffect(() => {
    fetchChats()
    // 注意：这里不再依赖 activeChatId，防止无限循环
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]) // 仅当 token 变化时重新加载

  useEffect(() => {
    fetchConfig()
  }, [fetchConfig])

  // 自动选中或创建会话
  useEffect(() => {
    // 只有在初始化完成且列表加载完毕后执行
    if (!hasInitialized || chatsLoading) return

    // 如果没有会话，创建一个新的
    if (chats.length === 0) {
      createChat()
    } else if (!activeChatId) {
      // 有会话但没选中，选中最新的
      setActiveChatId(chats[0].id)
    }
  }, [hasInitialized, chatsLoading, chats, activeChatId, createChat])

  useEffect(() => {
    if (activeChatId) fetchChat(activeChatId)
  }, [activeChatId, fetchChat])

  useLayoutEffect(() => {
    scrollMessagesToBottom('auto')
  }, [activeChat?.messages.length, streaming, scrollMessagesToBottom])

  useEffect(() => {
    if (settingsOpen && config) {
      configForm.setFieldsValue({
        provider: config.provider,
        baseUrl: config.baseUrl,
        apiKey: '',
        defaultModel: config.defaultModel,
        systemPrompt: config.systemPrompt,
        maxContextMessages: config.maxContextMessages,
      })
    }
  }, [settingsOpen, config, configForm])

  const canChat = config?.apiKeySet && currentModel

  return (
    <div className="aiShell">
      <div className="aiSidebar">
        <Card className="aiSidebarCard" bordered={false}>
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Space size={10}>
              <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/dashboard')} />
              <div style={{ display: 'grid' }}>
                <Typography.Text strong>AI 助手</Typography.Text>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  压铸工艺专家
                </Typography.Text>
              </div>
            </Space>
            <Space>
              <Tooltip title="设置">
                <Button icon={<SettingOutlined />} onClick={openSettings} loading={configLoading} />
              </Tooltip>
              <Tooltip title="新建对话">
                <Button icon={<PlusOutlined />} onClick={createChat} />
              </Tooltip>
            </Space>
          </Space>
          <Divider style={{ margin: '12px 0' }} />
          <div className="aiChatList">
            {chatsLoading ? (
              <div style={{ padding: 12, display: 'flex', justifyContent: 'center' }}>
                <Spin />
              </div>
            ) : (
              <>
                {(['今天', '昨天', '更早'] as const).map((g) => {
                  const list = groupedChats[g] ?? []
                  if (list.length === 0) return null
                  return (
                    <div key={g}>
                      <div className="aiGroupTitle">{g}</div>
                      <List
                        size="small"
                        dataSource={list}
                        renderItem={(item) => (
                          <List.Item
                            style={{
                              padding: '8px 10px',
                              borderRadius: 12,
                              cursor: 'pointer',
                              background: item.id === activeChatId ? 'rgba(139, 92, 246, 0.10)' : 'transparent',
                              border: item.id === activeChatId ? '1px solid rgba(139, 92, 246, 0.22)' : '1px solid transparent',
                              marginBottom: 6,
                            }}
                            onClick={() => setActiveChatId(item.id)}
                            extra={
                              <Popconfirm
                                title="删除该会话？"
                                okText="删除"
                                cancelText="取消"
                                onConfirm={(e) => {
                                  e?.stopPropagation()
                                  deleteChat(item.id)
                                }}
                              >
                                <Button
                                  type="text"
                                  size="small"
                                  icon={<DeleteOutlined />}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </Popconfirm>
                            }
                          >
                            <div style={{ minWidth: 0 }}>
                              <Typography.Text ellipsis style={{ maxWidth: 170 }}>
                                {item.title || '新对话'}
                              </Typography.Text>
                              <div style={{ marginTop: 4 }}>
                                <Tag color="purple" style={{ marginInlineEnd: 0 }}>
                                  {item.totalTokens ?? 0} tok
                                </Tag>
                              </div>
                            </div>
                          </List.Item>
                        )}
                      />
                    </div>
                  )
                })}
              </>
            )}
          </div>
        </Card>
      </div>

      <div className="aiMain">
        <div className="aiTopbar">
          <Space size={10} wrap>
            <Tag color="purple">
              模型: {currentModel || '未设置'}
            </Tag>
            <Tag color={config?.apiKeySet ? 'green' : 'red'}>{config?.apiKeySet ? '密钥已设置' : '未设置密钥'}</Tag>
            <Tag color="geekblue">会话 Token: {activeChat?.totalTokens ?? 0}</Tag>
            {lastUsage ? <Tag color="purple">本次: {lastUsage.totalTokens} tok</Tag> : null}
          </Space>
          <Space>
            <Tooltip title="发送（Enter）">
              <Button
                type="primary"
                icon={<ThunderboltOutlined />}
                onClick={handleSend}
                disabled={streaming || !canChat || !draft.trim()}
              >
                发送
              </Button>
            </Tooltip>
            <Button danger onClick={stopStreaming} disabled={!streaming}>
              停止
            </Button>
          </Space>
        </div>

        <div
          className="aiMessages"
          ref={messagesWrapRef}
          onScroll={() => {
            const el = messagesWrapRef.current
            if (!el) return
            const distance = el.scrollHeight - el.scrollTop - el.clientHeight
            const isBottom = distance < 80
            isAtBottomRef.current = isBottom
          }}
        >
          {chatLoading && !activeChat ? (
            <div style={{ padding: 18, display: 'flex', justifyContent: 'center' }}>
              <Spin />
            </div>
          ) : (
            (activeChat?.messages ?? []).map((m) => (
              <div key={m.id} className={`aiBubbleRow ${m.role}`}>
                <div className={`aiBubble ${m.role}`}>
                  {m.role === 'assistant' ? <AiMarkdown content={m.content} /> : m.content}
                  {m.pending ? <span style={{ opacity: 0.6 }}>▍</span> : null}
                </div>
              </div>
            ))
          )}
          {/* Add a spacer to ensure the last message is visible above the absolute input box */}
          <div style={{ height: 20 }} />
        </div>

        <div className="aiComposer">
          <Input.TextArea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="输入你的问题（Enter 发送，Ctrl+Enter 换行）"
            autoSize={{ minRows: 3, maxRows: 8 }}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return

              if (e.ctrlKey || e.metaKey) {
                e.preventDefault()
                const el = e.currentTarget
                const start = el.selectionStart ?? draft.length
                const end = el.selectionEnd ?? draft.length
                const next = draft.slice(0, start) + '\n' + draft.slice(end)
                setDraft(next)
                const cursor = start + 1
                queueMicrotask(() => {
                  if (typeof el.selectionStart === 'number') el.selectionStart = cursor
                  if (typeof el.selectionEnd === 'number') el.selectionEnd = cursor
                })
                return
              }

              if (e.shiftKey) return

              e.preventDefault()
              handleSend()
            }}
            disabled={streaming}
          />
          <div className="aiComposerActions">
            <Space size={8} wrap>
              <Tag color="purple">API: {config?.baseUrl ? '已配置' : '未配置'}</Tag>
              <Tag color="purple">Key: {config?.apiKeySet ? config?.apiKeyMasked || '已设置' : '未设置'}</Tag>
              <Tag color="purple">快捷键: Enter 发送 / Ctrl+Enter 换行</Tag>
            </Space>
            <Space size={8}>
              <Select
                value={currentModel || undefined}
                placeholder="默认模型"
                style={{ width: 240 }}
                options={currentModel ? [{ value: currentModel, label: currentModel }] : []}
                disabled
              />
              <Button onClick={openSettings} icon={<SettingOutlined />}>
                配置
              </Button>
            </Space>
          </div>
        </div>

        <Modal
          title="AI 助手设置"
          open={settingsOpen}
          onCancel={() => setSettingsOpen(false)}
          onOk={saveSettings}
          okText="保存"
          cancelText="取消"
          width={760}
        >
          <Form layout="vertical" form={configForm} requiredMark={false}>
            <Form.Item name="baseUrl" label="API Base URL" rules={[{ required: true, message: '请输入 Base URL' }]}>
              <Input placeholder="例如 https://api.openai.com/v1" />
            </Form.Item>
            <Form.Item name="apiKey" label="API Key（不回显，留空则保持不变；输入空格可清空）">
              <Input.Password placeholder={config?.apiKeySet ? '已设置（如需更换请重新输入）' : '请输入 API Key'} />
            </Form.Item>
            <Form.Item name="defaultModel" label="默认模型" rules={[{ required: true, message: '请输入默认模型' }]}>
              <Input placeholder="例如 gpt-4o-mini / deepseek-chat" />
            </Form.Item>
            <Form.Item name="maxContextMessages" label="上下文条数限制">
              <InputNumber min={0} max={100} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="systemPrompt" label="系统预设提示词（System Prompt）">
              <Input.TextArea autoSize={{ minRows: 4, maxRows: 10 }} />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </div>
  )
}
