import { expect, test } from '@playwright/test'

test('ai 助手页面可进入并完成一次流式对话（mock）', async ({ page }) => {
  const roles = [
    { id: 'admin', name: '管理员', description: '', permissions: ['*'], canEdit: true, canDelete: true },
  ]

  const state = {
    chats: [] as Array<{
      id: string
      owner: string
      title: string
      createdAt: string
      updatedAt: string
      totalTokens: number
      messages: Array<{ id: string; role: 'user' | 'assistant'; content: string; createdAt: string; tokens?: number; promptTokens?: number }>
    }>,
  }

  const nowIso = () => new Date().toISOString()
  const json = (data: unknown) => ({ status: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) })

  await page.route('**/api/roles', async (route) => {
    return route.fulfill(json(roles))
  })

  await page.route('**/api/ai/config', async (route) => {
    const req = route.request()
    if (req.method() === 'GET') {
      return route.fulfill(
        json({
          provider: 'openai-compatible',
          baseUrl: 'https://mock.local/v1',
          defaultModel: 'mock-model',
          systemPrompt: '你是压铸工艺专家',
          maxContextMessages: 12,
          apiKeySet: true,
          apiKeyMasked: 'mock****key',
        }),
      )
    }
    if (req.method() === 'PUT') {
      const body = req.postDataJSON() as Record<string, unknown>
      return route.fulfill(
        json({
          provider: 'openai-compatible',
          baseUrl: String(body.baseUrl ?? 'https://mock.local/v1'),
          defaultModel: String(body.defaultModel ?? 'mock-model'),
          systemPrompt: String(body.systemPrompt ?? '你是压铸工艺专家'),
          maxContextMessages: Number(body.maxContextMessages ?? 12),
          apiKeySet: true,
          apiKeyMasked: 'mock****key',
        }),
      )
    }
    return route.fallback()
  })

  await page.route('**/api/ai/chats', async (route) => {
    const req = route.request()
    if (req.method() === 'GET') {
      const list = state.chats
        .map((c) => ({
          id: c.id,
          owner: c.owner,
          title: c.title,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
          totalTokens: c.totalTokens,
        }))
        .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
      return route.fulfill(json(list))
    }
    if (req.method() === 'POST') {
      const id = `chat-${Date.now()}`
      const chat = {
        id,
        owner: 'admin',
        title: '新对话',
        createdAt: nowIso(),
        updatedAt: nowIso(),
        totalTokens: 0,
        messages: [],
      }
      state.chats.push(chat)
      return route.fulfill(
        json({
          id: chat.id,
          owner: chat.owner,
          title: chat.title,
          createdAt: chat.createdAt,
          updatedAt: chat.updatedAt,
          totalTokens: chat.totalTokens,
        }),
      )
    }
    return route.fallback()
  })

  await page.route(/.*\/api\/ai\/chats\/[^/]+$/, async (route) => {
    const req = route.request()
    const url = new URL(req.url())
    const chatId = url.pathname.split('/').pop() || ''
    const chat = state.chats.find((c) => c.id === chatId)

    if (req.method() === 'GET') {
      if (!chat) return route.fulfill({ status: 404, body: JSON.stringify({ error: 'Chat not found' }) })
      return route.fulfill(json(chat))
    }

    if (req.method() === 'DELETE') {
      const before = state.chats.length
      state.chats = state.chats.filter((c) => c.id !== chatId)
      if (state.chats.length === before) return route.fulfill({ status: 404, body: JSON.stringify({ error: 'Chat not found' }) })
      return route.fulfill(json({ success: true }))
    }

    return route.fallback()
  })

  await page.route('**/api/ai/chat/stream', async (route) => {
    const req = route.request()
    if (req.method() !== 'POST') return route.fallback()
    const body = req.postDataJSON() as { chatId: string; message: string }
    const chat = state.chats.find((c) => c.id === body.chatId)
    if (!chat) return route.fulfill({ status: 404, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ error: 'Chat not found' }) })

    const userText = body.message.trim()
    chat.messages.push({ id: `m-${Date.now()}-u`, role: 'user', content: userText, createdAt: nowIso(), tokens: 8 })

    const assistant = '已收到。建议先确认：合金牌号、浇注温度、压射速度、增压压力与排气条件。'
    const promptTokens = 12
    const completionTokens = 18
    chat.totalTokens += promptTokens + completionTokens
    chat.updatedAt = nowIso()
    chat.messages.push({
      id: `m-${Date.now()}-a`,
      role: 'assistant',
      content: assistant,
      createdAt: nowIso(),
      tokens: completionTokens,
      promptTokens,
    })

    const sseBody =
      `event: meta\ndata: ${JSON.stringify({ chatId: chat.id, model: 'mock-model' })}\n\n` +
      `event: delta\ndata: ${JSON.stringify({ delta: assistant.slice(0, 18) })}\n\n` +
      `event: delta\ndata: ${JSON.stringify({ delta: assistant.slice(18) })}\n\n` +
      `event: done\ndata: ${JSON.stringify({
        usage: { promptTokens, completionTokens, totalTokens: promptTokens + completionTokens },
        chatTotalTokens: chat.totalTokens,
      })}\n\n`

    return route.fulfill({
      status: 200,
      headers: { 'content-type': 'text/event-stream; charset=utf-8' },
      body: sseBody,
    })
  })

  await page.addInitScript(() => {
    localStorage.setItem(
      'auth_data',
      JSON.stringify({
        token: 'mock-token',
        user: { username: 'admin', role: 'admin', name: 'Administrator' },
      }),
    )
  })

  await page.goto('/#/ai')
  await expect(page).toHaveURL(/#\/ai/, { timeout: 15_000 })

  await expect(page.getByText('压铸工艺专家')).toBeVisible({ timeout: 15_000 })

  const input = page.getByPlaceholder('输入你的问题（Enter 发送，Ctrl+Enter 换行）')
  await input.fill('我遇到气孔怎么办？')
  await page.getByRole('button', { name: '发送' }).click()

  await expect(page.getByText('建议先确认')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText(/本次:\s*\d+\s*tok/)).toBeVisible({ timeout: 15_000 })
})
