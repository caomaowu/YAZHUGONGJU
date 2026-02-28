import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Card, Drawer, Dropdown, Empty, Form, Input, Layout, Modal, Select, Space, Spin, Tag, Typography, Upload, theme, message } from 'antd'
import {
  CloudUploadOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  FileImageOutlined,
  FileMarkdownOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  MoreOutlined,
  ReloadOutlined,
  SearchOutlined
} from '@ant-design/icons'
import { useAuth } from '../../core/auth/useAuth'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

type LibraryItem = {
  id: string
  originalName: string
  mimeType: string
  type: string
  sizeBytes: number
  uploadedAt: string
  uploadedBy: string
  description?: string
  category?: string
  tags?: string[]
}

export function KnowledgeBasePage() {
  const { token } = theme.useToken()
  const { user, token: authToken } = useAuth()
  const [q, setQ] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<LibraryItem[]>([])
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [editingItem, setEditingItem] = useState<LibraryItem | null>(null)
  const [editSaving, setEditSaving] = useState(false)
  const [editForm] = Form.useForm()
  const [previewItem, setPreviewItem] = useState<LibraryItem | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewText, setPreviewText] = useState('')

  const canManage = user?.role === 'admin'

  const formatBytes = (bytes: number) => {
    const n = Number(bytes || 0)
    if (!Number.isFinite(n) || n <= 0) return '0 B'
    const units = ['B', 'KB', 'MB', 'GB']
    const idx = Math.min(units.length - 1, Math.floor(Math.log(n) / Math.log(1024)))
    const value = n / Math.pow(1024, idx)
    return `${value >= 10 ? value.toFixed(0) : value.toFixed(1)} ${units[idx]}`
  }

  const fetchList = useCallback(
    async (next?: { q?: string; type?: string; category?: string }) => {
      if (!authToken) return
      setLoading(true)
      try {
        const qs: string[] = []
        const qq = (next?.q ?? q).trim()
        const tt = (next?.type ?? typeFilter).trim()
        const cc = (next?.category ?? categoryFilter).trim()
        if (qq) qs.push(`q=${encodeURIComponent(qq)}`)
        if (tt) qs.push(`type=${encodeURIComponent(tt)}`)
        if (cc) qs.push(`category=${encodeURIComponent(cc)}`)
        const url = qs.length ? `/api/library/files?${qs.join('&')}` : '/api/library/files'
        const res = await fetch(url, { headers: { Authorization: `Bearer ${authToken}` } })
        if (!res.ok) throw new Error('获取资料列表失败')
        const data = (await res.json()) as LibraryItem[]
        setItems(Array.isArray(data) ? data : [])
      } catch (e) {
        message.error(e instanceof Error ? e.message : '获取资料列表失败')
      } finally {
        setLoading(false)
      }
    },
    [authToken, categoryFilter, q, typeFilter]
  )

  useEffect(() => {
    void fetchList()
  }, [fetchList])

  const categoryOptions = useMemo(() => {
    const map = new Map<string, number>()
    for (const it of items) {
      const c = String(it.category || '').trim()
      if (!c) continue
      map.set(c, (map.get(c) || 0) + 1)
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([c, count]) => ({ label: `${c} (${count})`, value: c }))
  }, [items])

  const renderTypeIcon = (t: string) => {
    const type = String(t || '').toLowerCase()
    if (type === 'pdf') return <FilePdfOutlined style={{ fontSize: 20, color: '#ef4444' }} />
    if (type === 'image') return <FileImageOutlined style={{ fontSize: 20, color: '#3b82f6' }} />
    if (type === 'markdown') return <FileMarkdownOutlined style={{ fontSize: 20, color: '#a855f7' }} />
    return <FileTextOutlined style={{ fontSize: 20, color: '#22c55e' }} />
  }

  const downloadItem = async (it: LibraryItem) => {
    if (!authToken) return
    try {
      const res = await fetch(`/api/library/files/${encodeURIComponent(it.id)}/download`, {
        headers: { Authorization: `Bearer ${authToken}` },
      })
      if (!res.ok) throw new Error('下载失败')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = it.originalName || 'file'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      message.error(e instanceof Error ? e.message : '下载失败')
    }
  }

  const closePreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setPreviewText('')
    setPreviewItem(null)
    setPreviewLoading(false)
  }

  const openPreview = async (it: LibraryItem) => {
    if (!authToken) return
    setPreviewItem(it)
    setPreviewLoading(true)
    setPreviewText('')
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    try {
      const res = await fetch(`/api/library/files/${encodeURIComponent(it.id)}/preview`, {
        headers: { Authorization: `Bearer ${authToken}` },
      })
      if (!res.ok) throw new Error('预览失败')
      if (it.type === 'pdf' || it.type === 'image') {
        const blob = await res.blob()
        setPreviewUrl(URL.createObjectURL(blob))
      } else {
        setPreviewText(await res.text())
      }
    } catch (e) {
      message.error(e instanceof Error ? e.message : '预览失败')
      closePreview()
    } finally {
      setPreviewLoading(false)
    }
  }

  const deleteItem = async (it: LibraryItem) => {
    if (!authToken) return
    Modal.confirm({
      title: '删除资料',
      content: `确定删除「${it.originalName}」吗？此操作不可恢复。`,
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        try {
          const res = await fetch(`/api/library/files/${encodeURIComponent(it.id)}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${authToken}` },
          })
          if (!res.ok) throw new Error('删除失败')
          message.success('已删除')
          void fetchList()
        } catch (e) {
          message.error(e instanceof Error ? e.message : '删除失败')
        }
      },
    })
  }

  const openEdit = (it: LibraryItem) => {
    setEditingItem(it)
    editForm.setFieldsValue({
      originalName: it.originalName,
      category: it.category || '',
      description: it.description || '',
      tags: (it.tags || []).join(', '),
    })
  }

  const saveEdit = async () => {
    if (!authToken || !editingItem) return
    try {
      const values = await editForm.validateFields()
      setEditSaving(true)
      const payload = {
        originalName: String(values.originalName || '').trim(),
        category: String(values.category || '').trim(),
        description: String(values.description || ''),
        tags: String(values.tags || ''),
      }
      const res = await fetch(`/api/library/files/${encodeURIComponent(editingItem.id)}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('保存失败')
      message.success('已保存')
      setEditingItem(null)
      void fetchList()
    } catch (e) {
      if (e && typeof e === 'object' && 'errorFields' in e) return
      message.error(e instanceof Error ? e.message : '保存失败')
    } finally {
      setEditSaving(false)
    }
  }

  const header = useMemo(() => {
    return (
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flex: '1 1 760px', flexWrap: 'wrap' }}>
          <Typography.Title level={4} style={{ margin: 0, whiteSpace: 'nowrap' }}>
            知识库
          </Typography.Title>
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onPressEnter={() => void fetchList()}
            prefix={<SearchOutlined />}
            placeholder="搜索文件名/描述…"
            allowClear
            style={{ maxWidth: 420 }}
          />
          <Select
            value={typeFilter}
            onChange={(v) => {
              setTypeFilter(v)
              void fetchList({ type: v })
            }}
            style={{ width: 150 }}
            options={[
              { label: '全部类型', value: '' },
              { label: 'PDF', value: 'pdf' },
              { label: '图片', value: 'image' },
              { label: 'Markdown', value: 'markdown' },
              { label: '文本', value: 'text' },
            ]}
          />
          <Select
            value={categoryFilter}
            onChange={(v) => {
              setCategoryFilter(v)
              void fetchList({ category: v })
            }}
            style={{ width: 220 }}
            placeholder="分类"
            allowClear
            options={categoryOptions}
          />
          <Button icon={<ReloadOutlined />} onClick={() => void fetchList()} />
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Button type="primary" icon={<CloudUploadOutlined />} disabled={!canManage} onClick={() => setUploadOpen(true)}>
            上传资料
          </Button>
        </div>
      </div>
    )
  }, [q, canManage, typeFilter, categoryFilter, categoryOptions, fetchList])

  return (
    <Layout style={{ height: 'calc(100vh - 64px)', background: token.colorBgLayout }}>
      <Layout.Content style={{ padding: 16 }}>
        <style>{`
          .kbGlassCard {
            border-radius: 16px;
            border: 1px solid ${token.colorBorderSecondary};
            background: linear-gradient(135deg, rgba(255,255,255,0.72), rgba(255,255,255,0.52));
            backdrop-filter: blur(10px);
            transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease;
            box-shadow: 0 10px 30px rgba(31, 41, 55, 0.08);
          }
          .kbGlassCard:hover {
            transform: translateY(-3px);
            border-color: rgba(168, 85, 247, 0.35);
            box-shadow: 0 18px 50px rgba(168, 85, 247, 0.14), 0 12px 30px rgba(31, 41, 55, 0.10);
          }
          .kbCover {
            border-radius: 14px;
            height: 88px;
            padding: 12px;
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            background: radial-gradient(120px 80px at 20% 20%, rgba(168, 85, 247, 0.26), rgba(168, 85, 247, 0) 60%),
                        radial-gradient(120px 80px at 80% 0%, rgba(59, 130, 246, 0.24), rgba(59, 130, 246, 0) 60%),
                        linear-gradient(135deg, rgba(255,255,255,0.70), rgba(255,255,255,0.45));
            border: 1px solid rgba(255,255,255,0.45);
          }
          .kbMeta {
            margin-top: 10px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
          }
          .kbActions {
            margin-top: 12px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
          }
        `}</style>
        <Card
          title={header}
          styles={{ body: { padding: 16 } }}
          style={{
            borderRadius: 16,
            overflow: 'hidden',
            background: token.colorBgContainer,
            border: `1px solid ${token.colorBorderSecondary}`,
          }}
        >
          {loading ? (
            <div style={{ padding: 48, display: 'flex', justifyContent: 'center' }}>
              <Spin />
            </div>
          ) : items.length === 0 ? (
            <div style={{ padding: 48 }}>
              <Empty description="暂无资料，先上传一些文档吧" />
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
              {items.map((it) => (
                <Card
                  key={it.id}
                  hoverable
                  className="kbGlassCard"
                  styles={{ body: { padding: 14 } }}
                >
                  <div className="kbCover">
                    {renderTypeIcon(it.type)}
                    <Tag color="purple" style={{ margin: 0, borderRadius: 999, border: 0 }}>
                      {it.type === 'pdf' ? 'PDF' : it.type === 'image' ? '图片' : it.type === 'markdown' ? 'MD' : 'TXT'}
                    </Tag>
                  </div>
                  <Typography.Text strong style={{ display: 'block' }} ellipsis>
                    {it.originalName}
                  </Typography.Text>
                  <div className="kbMeta">
                    <Typography.Text type="secondary" style={{ fontSize: 12 }} ellipsis>
                      {it.uploadedBy}
                    </Typography.Text>
                    <Typography.Text type="secondary" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                      {formatBytes(it.sizeBytes)}
                    </Typography.Text>
                  </div>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {new Date(it.uploadedAt).toLocaleString()}
                  </Typography.Text>
                  <div className="kbActions">
                    <Space size={8}>
                      <Button size="small" type="primary" ghost onClick={() => void openPreview(it)}>
                        预览
                      </Button>
                      <Button size="small" icon={<DownloadOutlined />} onClick={() => void downloadItem(it)}>
                        下载
                      </Button>
                    </Space>
                    {canManage ? (
                      <Dropdown
                        trigger={['click']}
                        menu={{
                          items: [
                            { key: 'edit', icon: <EditOutlined />, label: '编辑信息' },
                            { key: 'delete', icon: <DeleteOutlined />, label: '删除', danger: true },
                          ],
                          onClick: ({ key }) => {
                            if (key === 'edit') openEdit(it)
                            if (key === 'delete') void deleteItem(it)
                          },
                        }}
                      >
                        <Button size="small" icon={<MoreOutlined />} />
                      </Dropdown>
                    ) : null}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Card>
        <Modal
          title="上传资料"
          open={uploadOpen}
          onCancel={() => setUploadOpen(false)}
          footer={null}
          width={720}
          styles={{ body: { paddingTop: 8 } }}
        >
          <UploadContent
            canManage={canManage}
            uploading={uploading}
            setUploading={setUploading}
            authToken={authToken}
            onUploaded={() => void fetchList()}
          />
        </Modal>
        <Drawer
          title={previewItem?.originalName || '预览'}
          open={!!previewItem}
          onClose={closePreview}
          width={980}
          styles={{ body: { padding: 16, background: token.colorBgLayout } }}
          extra={
            previewItem ? (
              <Space>
                <Button icon={<DownloadOutlined />} onClick={() => void downloadItem(previewItem)}>
                  下载
                </Button>
              </Space>
            ) : null
          }
        >
          {previewLoading ? (
            <div style={{ padding: 48, display: 'flex', justifyContent: 'center' }}>
              <Spin />
            </div>
          ) : previewItem?.type === 'pdf' ? (
            previewUrl ? (
              <div
                style={{
                  borderRadius: 16,
                  overflow: 'hidden',
                  border: `1px solid ${token.colorBorderSecondary}`,
                  background: token.colorBgContainer,
                }}
              >
                <iframe
                  title={previewItem.originalName}
                  src={previewUrl}
                  style={{ width: '100%', height: 'calc(100vh - 160px)', border: 0 }}
                />
              </div>
            ) : null
          ) : previewItem?.type === 'image' ? (
            previewUrl ? (
              <div
                style={{
                  borderRadius: 16,
                  padding: 12,
                  border: `1px solid ${token.colorBorderSecondary}`,
                  background: token.colorBgContainer,
                }}
              >
                <img
                  src={previewUrl}
                  alt={previewItem.originalName}
                  style={{ width: '100%', height: 'auto', borderRadius: 12, display: 'block' }}
                />
              </div>
            ) : null
          ) : (
            <div
              style={{
                borderRadius: 16,
                padding: 16,
                border: `1px solid ${token.colorBorderSecondary}`,
                background: token.colorBgContainer,
              }}
            >
              {previewItem?.type === 'markdown' ? (
                <div style={{ maxWidth: 920, margin: '0 auto' }}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{previewText || ''}</ReactMarkdown>
                </div>
              ) : (
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 13 }}>
                  {previewText}
                </pre>
              )}
            </div>
          )}
        </Drawer>
        <Modal
          title="编辑资料信息"
          open={!!editingItem}
          onCancel={() => setEditingItem(null)}
          onOk={() => void saveEdit()}
          okText="保存"
          cancelText="取消"
          confirmLoading={editSaving}
          width={720}
        >
          <Form form={editForm} layout="vertical">
            <Form.Item
              name="originalName"
              label="文件名"
              rules={[{ required: true, message: '请输入文件名' }]}
            >
              <Input placeholder="例如：压铸机操作手册.pdf" />
            </Form.Item>
            <Form.Item name="category" label="分类">
              <Input placeholder="例如：设备手册 / 标准 / 培训资料" />
            </Form.Item>
            <Form.Item name="tags" label="标签（逗号分隔）">
              <Input placeholder="例如：压铸, 工艺, 维护" />
            </Form.Item>
            <Form.Item name="description" label="描述">
              <Input.TextArea placeholder="写点备注，后续更好检索…" autoSize={{ minRows: 3, maxRows: 6 }} />
            </Form.Item>
          </Form>
        </Modal>
      </Layout.Content>
    </Layout>
  )
}

function UploadContent(props: {
  canManage: boolean
  uploading: boolean
  setUploading: (v: boolean) => void
  authToken: string | null
  onUploaded: () => void
}) {
  const { canManage, uploading, setUploading, authToken, onUploaded } = props

  return (
    <Upload.Dragger
      multiple
      disabled={!canManage || uploading}
      showUploadList
      accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.md,.markdown,.txt"
      customRequest={async (options) => {
        if (!authToken) {
          options.onError?.(new Error('未登录'))
          return
        }
        try {
          setUploading(true)
          const file = options.file as File
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(String(reader.result || ''))
            reader.onerror = () => reject(new Error('读取文件失败'))
            reader.readAsDataURL(file)
          })
          const res = await fetch('/api/library/files', {
            method: 'POST',
            headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileName: file.name, mimeType: file.type, base64: dataUrl }),
          })
          if (!res.ok) throw new Error('上传失败')
          options.onSuccess?.(await res.json(), file)
          onUploaded()
        } catch (e) {
          options.onError?.(e as Error)
          message.error(e instanceof Error ? e.message : '上传失败')
        } finally {
          setUploading(false)
        }
      }}
    >
      <div style={{ padding: 18 }}>
        <Typography.Title level={5} style={{ marginTop: 0 }}>
          拖拽文件到此处上传
        </Typography.Title>
        <Typography.Text type="secondary">
          支持 PDF / 图片 / Markdown / 文本。上传与删除需要管理员权限。
        </Typography.Text>
      </div>
    </Upload.Dragger>
  )
}
