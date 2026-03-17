import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  FloatButton,
  Form,
  Input,
  Modal,
  Space,
  Spin,
  Tag,
  Typography,
  message,
  theme,
} from 'antd'
import {
  ArrowRightOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  GlobalOutlined,
  PlusOutlined,
  SettingOutlined,
} from '@ant-design/icons'
import { useAuth } from '../core/auth/useAuth'

type MoldflowKnowledgeCard = {
  id: string
  title: string
  url: string
  description: string
}

type MoldflowKnowledgeConfig = {
  cards: MoldflowKnowledgeCard[]
}

type MoldflowKnowledgeFormValues = {
  cards: Array<{
    title: string
    url: string
    description: string
  }>
}

const DEFAULT_CARD: MoldflowKnowledgeCard = {
  id: 'default-card',
  title: '模流知识库',
  url: '',
  description: '在这里集中进入外部模流分析知识站点。',
}

const DEFAULT_CONFIG: MoldflowKnowledgeConfig = {
  cards: [DEFAULT_CARD],
}

function makeCardId(index = 0) {
  return `card-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`
}

function normalizeConfig(input: unknown): MoldflowKnowledgeConfig {
  const raw = input && typeof input === 'object' ? (input as Record<string, unknown>) : {}
  const rawCards = Array.isArray(raw.cards) ? raw.cards : null

  if (rawCards && rawCards.length > 0) {
    const cards = rawCards.map((item, index) => {
      const card = item && typeof item === 'object' ? (item as Record<string, unknown>) : {}
      return {
        id: String(card.id || makeCardId(index)),
        title: String(card.title || `模流知识库 ${index + 1}`),
        url: String(card.url || ''),
        description: String(card.description || ''),
      }
    })

    return { cards }
  }

  return {
    cards: [
      {
        id: String(raw.id || DEFAULT_CARD.id),
        title: String(raw.title || DEFAULT_CARD.title),
        url: String(raw.url || ''),
        description: String(raw.description || DEFAULT_CARD.description),
      },
    ],
  }
}

export function MoldflowKnowledgePage() {
  const { token } = theme.useToken()
  const { token: authToken, user } = useAuth()
  const [form] = Form.useForm<MoldflowKnowledgeFormValues>()
  const [config, setConfig] = useState<MoldflowKnowledgeConfig>(DEFAULT_CONFIG)
  const [activeCardId, setActiveCardId] = useState(DEFAULT_CARD.id)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    if (!authToken) return

    const load = async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/moldflow-knowledge/config', {
          headers: { Authorization: `Bearer ${authToken}` },
        })
        if (!res.ok) throw new Error('获取模流知识库配置失败')
        const data = normalizeConfig(await res.json())
        setConfig(data)
      } catch (e) {
        message.error(e instanceof Error ? e.message : '获取模流知识库配置失败')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [authToken])

  useEffect(() => {
    if (config.cards.length === 0) {
      setActiveCardId('')
      return
    }

    const activeStillExists = config.cards.some((item) => item.id === activeCardId)
    if (!activeStillExists) {
      setActiveCardId(config.cards[0].id)
    }
  }, [activeCardId, config.cards])

  const activeCard = useMemo(() => {
    return config.cards.find((item) => item.id === activeCardId) || config.cards[0] || DEFAULT_CARD
  }, [activeCardId, config.cards])

  const hasUrl = !!activeCard?.url.trim()
  const configuredCount = config.cards.filter((item) => item.url.trim()).length

  const openExternalSite = (url?: string) => {
    const targetUrl = String(url || activeCard?.url || '').trim()
    if (!targetUrl) return
    window.open(targetUrl, '_blank', 'noopener,noreferrer')
  }

  const openSettings = () => {
    form.setFieldsValue({
      cards: config.cards.map((item) => ({
        title: item.title,
        url: item.url,
        description: item.description,
      })),
    })
    setSettingsOpen(true)
  }

  const saveSettings = async () => {
    if (!authToken) return
    try {
      const values = await form.validateFields()
      setSaving(true)
      const payload = {
        cards: (values.cards || []).map((item) => ({
          title: String(item.title || '').trim(),
          url: String(item.url || '').trim(),
          description: String(item.description || '').trim(),
        })),
      }
      const res = await fetch('/api/moldflow-knowledge/config', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || '保存模流知识库配置失败')
      setConfig(normalizeConfig(data))
      message.success('模流知识库设置已保存')
      setSettingsOpen(false)
    } catch (e) {
      if (e && typeof e === 'object' && 'errorFields' in e) return
      message.error(e instanceof Error ? e.message : '保存模流知识库配置失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="centerHeader">
        <div className="centerTitle">
          <Typography.Text type="secondary">模流知识库</Typography.Text>
          <h1>模流知识库外链入口</h1>
          <p>支持配置多个第三方模流分析卡片，点击下方卡片即可切换右侧展示并打开对应网站。</p>
        </div>

        <Space wrap size={10}>
          <Tag color="green">已配置 {configuredCount} / {config.cards.length}</Tag>
          <Button
            type="primary"
            icon={<GlobalOutlined />}
            onClick={() => openExternalSite()}
            disabled={!hasUrl}
            style={{
              borderRadius: 14,
              border: 'none',
              background: 'linear-gradient(135deg, #34d399 0%, #4ade80 55%, #86efac 120%)',
              boxShadow: '0 12px 28px rgba(74, 222, 128, 0.24)',
            }}
          >
            立即访问当前卡片
          </Button>
        </Space>
      </div>

      <div className="centerBody">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '72px 0' }}>
            <Spin />
          </div>
        ) : (
          <div className="cardGrid">
            <Card
              className="softCard span8"
              title="右侧展示区"
              extra={<Tag color="green">External</Tag>}
              styles={{ body: { paddingTop: 16 } }}
            >
              <div
                style={{
                  minHeight: 280,
                  borderRadius: 20,
                  padding: 24,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  background:
                    'radial-gradient(circle at top right, rgba(134,239,172,0.45), transparent 36%), linear-gradient(135deg, rgba(240,253,244,0.98), rgba(220,252,231,0.88))',
                  border: '1px solid rgba(34, 197, 94, 0.18)',
                }}
              >
                <div>
                  <Typography.Text style={{ color: '#15803d', fontWeight: 700 }}>
                    第三方模流平台
                  </Typography.Text>
                  <Typography.Title level={3} style={{ marginTop: 8, marginBottom: 10 }}>
                    {activeCard.title || DEFAULT_CARD.title}
                  </Typography.Title>
                  <Typography.Paragraph
                    style={{
                      maxWidth: 520,
                      color: 'rgba(20, 83, 45, 0.78)',
                      fontSize: 16,
                      lineHeight: 1.75,
                      marginBottom: 0,
                    }}
                  >
                    {activeCard.description || '管理员尚未填写简介。'}
                  </Typography.Paragraph>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                    flexWrap: 'wrap',
                  }}
                >
                  <Button
                    type="default"
                    size="large"
                    onClick={() => openExternalSite()}
                    disabled={!hasUrl}
                    icon={<ArrowRightOutlined />}
                    style={{
                      height: 48,
                      borderRadius: 999,
                      paddingInline: 20,
                      fontWeight: 700,
                      color: hasUrl ? '#166534' : undefined,
                      borderColor: hasUrl ? 'rgba(34, 197, 94, 0.28)' : undefined,
                      background: hasUrl ? 'rgba(255,255,255,0.88)' : undefined,
                    }}
                  >
                    {hasUrl ? '打开第三方网站' : isAdmin ? '请先配置当前卡片链接' : '当前卡片未配置访问地址'}
                  </Button>
                  <Tag
                    style={{
                      marginInlineEnd: 0,
                      padding: '8px 12px',
                      borderRadius: 999,
                      color: '#166534',
                      background: 'rgba(187, 247, 208, 0.7)',
                      borderColor: 'rgba(34, 197, 94, 0.22)',
                    }}
                  >
                    {hasUrl ? '点击后新标签页打开' : '未检测到有效链接'}
                  </Tag>
                </div>
              </div>
            </Card>

            <Card className="softCard span4" title="卡片信息">
              <Space direction="vertical" size={14} style={{ width: '100%' }}>
                <div className="pill">
                  <Typography.Text type="secondary">当前卡片</Typography.Text>
                  <div style={{ height: 6 }} />
                  <Typography.Text strong>{activeCard.title || DEFAULT_CARD.title}</Typography.Text>
                </div>
                <div className="pill">
                  <Typography.Text type="secondary">简介说明</Typography.Text>
                  <div style={{ height: 6 }} />
                  <Typography.Paragraph style={{ marginBottom: 0 }}>
                    {activeCard.description || '管理员尚未填写简介。'}
                  </Typography.Paragraph>
                </div>
                <div className="pill">
                  <Typography.Text type="secondary">链接状态</Typography.Text>
                  <div style={{ height: 6 }} />
                  {hasUrl ? (
                    <Tag color="success" icon={<CheckCircleOutlined />}>
                      已配置
                    </Tag>
                  ) : (
                    <Tag color="default">未配置</Tag>
                  )}
                </div>
              </Space>
            </Card>

            <Card
              className="softCard span12"
              title="卡片列表"
              extra={<Tag color="green">共 {config.cards.length} 个</Tag>}
            >
              <div className="moldflowCardGrid">
                {config.cards.map((item, index) => {
                  const isActive = item.id === activeCard.id
                  const itemHasUrl = !!item.url.trim()
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`moldflowSwitchCard${isActive ? ' active' : ''}`}
                      onClick={() => setActiveCardId(item.id)}
                    >
                      <div className="moldflowSwitchCardHeader">
                        <span className="moldflowSwitchCardIndex">卡片 {index + 1}</span>
                        <Tag color={itemHasUrl ? 'success' : 'default'}>{itemHasUrl ? '已配置' : '未配置'}</Tag>
                      </div>
                      <Typography.Title level={5} style={{ marginTop: 6, marginBottom: 8 }}>
                        {item.title || `模流知识库 ${index + 1}`}
                      </Typography.Title>
                      <Typography.Paragraph ellipsis={{ rows: 2 }} style={{ marginBottom: 14 }}>
                        {item.description || '暂无简介'}
                      </Typography.Paragraph>
                      <Button
                        size="small"
                        type={isActive ? 'primary' : 'default'}
                        icon={<ArrowRightOutlined />}
                        disabled={!itemHasUrl}
                        onClick={(event) => {
                          event.stopPropagation()
                          openExternalSite(item.url)
                        }}
                      >
                        打开网站
                      </Button>
                    </button>
                  )
                })}
              </div>
            </Card>

            {config.cards.every((item) => !item.url.trim()) ? (
              <Card className="softCard span12">
                <Alert
                  type={isAdmin ? 'info' : 'warning'}
                  showIcon
                  message={isAdmin ? '模流知识库卡片都还没有配置链接' : '模流知识库暂未开放链接'}
                  description={
                    isAdmin
                      ? '请点击页面右下角的设置按钮，新增或编辑多个卡片，并填写每张卡片的第三方网站 URL。'
                      : '请联系管理员完成模流知识库链接配置后再访问。'
                  }
                />
              </Card>
            ) : null}
          </div>
        )}
      </div>

      {isAdmin ? (
        <FloatButton
          icon={<SettingOutlined />}
          tooltip="模流知识库设置"
          onClick={openSettings}
          style={{
            insetInlineEnd: 28,
            insetBlockEnd: 28,
          }}
        />
      ) : null}

      <Modal
        title="模流知识库设置"
        open={settingsOpen}
        onCancel={() => setSettingsOpen(false)}
        onOk={() => void saveSettings()}
        okText="保存"
        cancelText="取消"
        confirmLoading={saving}
        width={840}
      >
        <Form form={form} layout="vertical" initialValues={config}>
          <Form.List name="cards">
            {(fields, { add, remove }) => (
              <Space direction="vertical" size={16} style={{ width: '100%' }}>
                {fields.map((field, index) => (
                  <Card
                    key={field.key}
                    size="small"
                    title={`卡片 ${index + 1}`}
                    extra={
                      fields.length > 1 ? (
                        <Button danger type="text" icon={<DeleteOutlined />} onClick={() => remove(field.name)}>
                          删除
                        </Button>
                      ) : null
                    }
                  >
                    <Form.Item
                      {...field}
                      name={[field.name, 'title']}
                      label="网站名称"
                      rules={[{ required: true, message: '请输入网站名称' }]}
                    >
                      <Input placeholder="例如：Moldflow 知识中心" maxLength={80} />
                    </Form.Item>
                    <Form.Item
                      {...field}
                      name={[field.name, 'url']}
                      label="第三方网站 URL"
                      extra="支持 http:// 或 https://，保存后卡片会以新标签页打开该地址。"
                      rules={[
                        {
                          validator: (_, value: string) => {
                            const url = String(value || '').trim()
                            if (!url) return Promise.resolve()
                            try {
                              const parsed = new URL(url)
                              if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error()
                              return Promise.resolve()
                            } catch {
                              return Promise.reject(new Error('请输入有效的网站链接'))
                            }
                          },
                        },
                      ]}
                    >
                      <Input placeholder="https://example.com" maxLength={1000} />
                    </Form.Item>
                    <Form.Item
                      {...field}
                      name={[field.name, 'description']}
                      label="简介"
                      rules={[{ max: 500, message: '简介最多 500 个字符' }]}
                    >
                      <Input.TextArea
                        placeholder="用于页面信息卡片展示，例如网站用途、适用场景或访问说明。"
                        autoSize={{ minRows: 4, maxRows: 8 }}
                        maxLength={500}
                        showCount
                      />
                    </Form.Item>
                  </Card>
                ))}

                <Button
                  block
                  icon={<PlusOutlined />}
                  onClick={() =>
                    add({
                      title: `模流知识库 ${fields.length + 1}`,
                      url: '',
                      description: '',
                    })
                  }
                >
                  新增卡片
                </Button>
              </Space>
            )}
          </Form.List>
        </Form>
      </Modal>

      <style>{`
        .span12 {
          grid-column: span 12;
        }

        .moldflowCardGrid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 14px;
        }

        .moldflowSwitchCard {
          width: 100%;
          text-align: left;
          border: 1px solid rgba(34, 197, 94, 0.14);
          border-radius: 18px;
          padding: 16px;
          background: linear-gradient(135deg, rgba(255,255,255,0.96), rgba(240,253,244,0.9));
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
          cursor: pointer;
        }

        .moldflowSwitchCard:hover {
          transform: translateY(-3px);
          box-shadow: 0 14px 26px rgba(34, 197, 94, 0.1);
          border-color: rgba(34, 197, 94, 0.28);
        }

        .moldflowSwitchCard.active {
          border-color: rgba(34, 197, 94, 0.42);
          box-shadow: 0 16px 32px rgba(34, 197, 94, 0.14);
          background: linear-gradient(135deg, rgba(236, 253, 245, 1), rgba(220, 252, 231, 0.95));
        }

        .moldflowSwitchCardHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .moldflowSwitchCardIndex {
          font-size: 12px;
          font-weight: 700;
          color: #15803d;
        }

        .ant-float-btn {
          --antd-wave-shadow-color: ${token.colorPrimary};
        }

        .ant-float-btn .ant-float-btn-body {
          background: linear-gradient(135deg, #16a34a 0%, #22c55e 60%, #86efac 120%);
          box-shadow: 0 16px 28px rgba(34, 197, 94, 0.28);
        }

        .ant-float-btn .ant-float-btn-body .ant-float-btn-content {
          color: #fff;
        }
      `}</style>
    </>
  )
}
