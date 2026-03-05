import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  Alert,
  Button,
  Card,
  Drawer,
  Dropdown,
  Empty,
  Form,
  Grid,
  Input,
  Layout,
  Modal,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
  Upload,
  message,
  theme,
} from 'antd'
import {
  CloudUploadOutlined,
  DeleteOutlined,
  DoubleRightOutlined,
  DownloadOutlined,
  EditOutlined,
  ExpandAltOutlined,
  FileImageOutlined,
  FileMarkdownOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  FileWordOutlined,
  LeftOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MoreOutlined,
  ReloadOutlined,
  RightOutlined,
  SearchOutlined,
  ShrinkOutlined,
} from '@ant-design/icons'
import { useAuth } from '../../core/auth/useAuth'
import { PdfPreview } from './components/PdfPreview'

type SearchStatus = 'pending' | 'processing' | 'ready' | 'failed'

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
  searchStatus?: SearchStatus
  searchUpdatedAt?: string
  searchError?: string
  searchVersion?: number
}

type SearchHit = {
  page: number
  snippet: string
  source: 'native' | 'ocr'
  indexInPage?: number
}

type SearchResult = {
  query: string
  totalHits: number
  hits: SearchHit[]
  truncated?: boolean
}

const UPLOAD_MAX_MB = 150
const UPLOAD_MAX_BYTES = UPLOAD_MAX_MB * 1024 * 1024

function normalizeDisplayName(name: string) {
  const value = String(name || '').trim()
  const m = value.match(/^(.+)(\.[a-z0-9]{1,8})\2$/i)
  if (!m) return value
  return `${m[1]}${m[2]}`
}

const SEARCH_STATUS_LABEL: Record<SearchStatus, string> = {
  pending: '待建立索引',
  processing: '索引处理中',
  ready: '可检索',
  failed: '索引失败',
}

export function KnowledgeBasePage() {
  const { token } = theme.useToken()
  const screens = Grid.useBreakpoint()
  const { user, token: authToken, roles } = useAuth()

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
  const [searchStatus, setSearchStatus] = useState<SearchStatus>('pending')
  const [searchError, setSearchError] = useState('')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [searching, setSearching] = useState(false)
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null)
  const [activeHitIndex, setActiveHitIndex] = useState(0)
  const [targetPdfPage, setTargetPdfPage] = useState<number>(1)
  const [showSidePanel, setShowSidePanel] = useState(false)
  const [dockExpanded, setDockExpanded] = useState(false) // 新增：控制底部 Dock 展开/折叠

  const pollTimerRef = useRef<number | null>(null)
  const textHitRefs = useRef<Record<number, HTMLSpanElement | null>>({})

  const immersiveLeftOffset = screens.md ? 92 : 0
  const immersiveWidth = screens.md ? `calc(100vw - ${immersiveLeftOffset}px)` : '100vw'

  const userRole = useMemo(() => roles.find((r) => r.id === user?.role), [roles, user?.role])
  const canManage = userRole?.canEdit || false

  const clearPollTimer = () => {
    if (pollTimerRef.current) {
      window.clearTimeout(pollTimerRef.current)
      pollTimerRef.current = null
    }
  }

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

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('kb-immersive-change', { detail: { active: !!previewItem } }))
  }, [previewItem])

  useEffect(() => {
    return () => {
      clearPollTimer()
      window.dispatchEvent(new CustomEvent('kb-immersive-change', { detail: { active: false } }))
    }
  }, [])

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
    if (type === 'docx') return <FileWordOutlined style={{ fontSize: 20, color: '#2563eb' }} />
    return <FileTextOutlined style={{ fontSize: 20, color: '#22c55e' }} />
  }

  const renderTypeLabel = (t: string) => {
    const type = String(t || '').toLowerCase()
    if (type === 'pdf') return 'PDF'
    if (type === 'image') return '图片'
    if (type === 'markdown') return 'MD'
    if (type === 'docx') return 'Word'
    return 'TXT'
  }

  const fetchSearchStatus = useCallback(
    async (fileId: string, needPoll = true) => {
      if (!authToken || !fileId) return
      clearPollTimer()
      try {
        const res = await fetch(`/api/library/files/${encodeURIComponent(fileId)}/search-status`, {
          headers: { Authorization: `Bearer ${authToken}` },
        })
        if (!res.ok) throw new Error('获取索引状态失败')
        const data = (await res.json()) as { searchStatus?: SearchStatus; searchError?: string }
        const nextStatus: SearchStatus = (data.searchStatus as SearchStatus) || 'pending'
        setSearchStatus(nextStatus)
        setSearchError(String(data.searchError || ''))
        if (needPoll && (nextStatus === 'pending' || nextStatus === 'processing')) {
          pollTimerRef.current = window.setTimeout(() => {
            void fetchSearchStatus(fileId, true)
          }, 2000)
        }
      } catch (e) {
        setSearchStatus('failed')
        setSearchError(e instanceof Error ? e.message : '获取索引状态失败')
      }
    },
    [authToken]
  )

  const runSearch = useCallback(async () => {
    if (!authToken || !previewItem) return
    const keyword = searchKeyword.trim()
    if (!keyword) {
      setSearchResult(null)
      setActiveHitIndex(0)
      return
    }
    setSearching(true)
    try {
      const url = `/api/library/files/${encodeURIComponent(previewItem.id)}/search?q=${encodeURIComponent(keyword)}&limit=200`
      const res = await fetch(url, { headers: { Authorization: `Bearer ${authToken}` } })
      if (res.status === 202) {
        setSearchStatus('processing')
        setSearchResult(null)
        return
      }
      if (res.status === 409) {
        const data = (await res.json()) as { searchError?: string }
        setSearchStatus('failed')
        setSearchError(String(data.searchError || '索引失败'))
        setSearchResult(null)
        return
      }
      if (!res.ok) throw new Error('搜索失败')
      const data = (await res.json()) as SearchResult
      setSearchStatus('ready')
      setSearchResult(data)
      setActiveHitIndex(0)
      if (data.hits.length > 0) {
        setTargetPdfPage(Math.max(1, Number(data.hits[0].page) || 1))
        setShowSidePanel(true)
      } else {
        setShowSidePanel(false)
      }
    } catch (e) {
      message.error(e instanceof Error ? e.message : '搜索失败')
    } finally {
      setSearching(false)
    }
  }, [authToken, previewItem, searchKeyword])
  const downloadItem = async (it: LibraryItem) => {
    if (!authToken || downloadingId) return
    try {
      setDownloadingId(it.id)
      message.loading({ content: '正在启动下载...', key: 'download', duration: 0 })
      
      // 使用 URL 直接下载，避免 fetch 阻塞页面和占用内存
      const url = `/api/library/files/${encodeURIComponent(it.id)}/download?token=${encodeURIComponent(authToken)}`
      const a = document.createElement('a')
      a.href = url
      a.download = it.originalName || 'file'
      document.body.appendChild(a)
      a.click()
      a.remove()
      
      // 延迟关闭 Loading，因为无法确切知道下载何时开始传输
      setTimeout(() => {
        message.success({ content: '已添加到下载任务', key: 'download', duration: 2 })
        setDownloadingId(null)
      }, 1500)
    } catch {
      message.error({ content: '启动下载失败', key: 'download' })
      setDownloadingId(null)
    }
  }

  const closePreview = () => {
    clearPollTimer()
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setPreviewText('')
    setPreviewItem(null)
    setPreviewLoading(false)
    setSearchResult(null)
    setSearchKeyword('')
    setActiveHitIndex(0)
    setSearchError('')
    setSearchStatus('pending')
    setShowSidePanel(false)
    setDockExpanded(false)
  }

  const openPreview = async (it: LibraryItem) => {
    if (!authToken) return
    clearPollTimer()
    setPreviewItem(it)
    setPreviewLoading(true)
    setPreviewText('')
    setSearchResult(null)
    setSearchKeyword('')
    setActiveHitIndex(0)
    setSearchError('')
    setSearchStatus(it.searchStatus || 'pending')
    setShowSidePanel(false)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setTargetPdfPage(1)

    void fetchSearchStatus(it.id, true)

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

  const reindexItem = async (it: LibraryItem) => {
    if (!authToken) return
    try {
      const res = await fetch(`/api/library/files/${encodeURIComponent(it.id)}/reindex`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      })
      if (!res.ok) throw new Error('重建索引失败')
      message.success('已提交重建索引任务')
      await fetchSearchStatus(it.id, true)
      void fetchList()
    } catch (e) {
      message.error(e instanceof Error ? e.message : '重建索引失败')
    }
  }

  const deleteItem = async (it: LibraryItem) => {
    if (!authToken) return
    Modal.confirm({
      title: '删除资料',
      content: `确定删除「${it.originalName}」吗？该操作不可恢复。`,
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

  const activeHit = searchResult?.hits[activeHitIndex] || null
  useEffect(() => {
    if (!activeHit || !previewItem) return
    if (previewItem.type === 'pdf') {
      setTargetPdfPage(Math.max(1, Number(activeHit.page) || 1))
      return
    }
    const node = textHitRefs.current[activeHitIndex]
    if (node) {
      node.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [activeHit, activeHitIndex, previewItem])

  const switchHit = (delta: number) => {
    if (!searchResult || searchResult.hits.length === 0) return
    const total = searchResult.hits.length
    const next = (activeHitIndex + delta + total) % total
    setActiveHitIndex(next)
  }

  const renderHighlightedText = (text: string, keyword: string) => {
    textHitRefs.current = {}
    const qv = keyword.trim()
    if (!qv) {
      return (
        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 13 }}>
          {text}
        </pre>
      )
    }
    const lower = text.toLowerCase()
    const needle = qv.toLowerCase()
    const nodes: ReactNode[] = []
    let cursor = 0
    let hitIndex = 0
    while (cursor < text.length) {
      const idx = lower.indexOf(needle, cursor)
      if (idx < 0) {
        nodes.push(text.slice(cursor))
        break
      }
      if (idx > cursor) nodes.push(text.slice(cursor, idx))
      const start = idx
      const end = idx + needle.length
      const currentHitIndex = hitIndex
      const isActive = currentHitIndex === activeHitIndex
      nodes.push(
        <mark
          key={`${start}-${end}`}
          ref={(el) => {
            textHitRefs.current[currentHitIndex] = el
          }}
          style={{
            background: isActive ? '#fde68a' : '#fef08a',
            padding: '0 2px',
            borderRadius: 2,
          }}
        >
          {text.slice(start, end)}
        </mark>
      )
      cursor = end
      hitIndex += 1
    }
    return (
      <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 13 }}>
        {nodes}
      </pre>
    )
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
            placeholder="搜索文件名/描述"
            allowClear
            style={{ maxWidth: 420 }}
          />
          <Select
            value={typeFilter}
            onChange={(v) => {
              setTypeFilter(v)
              void fetchList({ type: v })
            }}
            style={{ width: 160 }}
            options={[
              { label: '全部类型', value: '' },
              { label: 'PDF', value: 'pdf' },
              { label: '图片', value: 'image' },
              { label: 'Word', value: 'docx' },
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
              <Empty description="暂无资料，先上传文档吧" />
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
              {items.map((it) => (
                <Card key={it.id} hoverable className="kbGlassCard" styles={{ body: { padding: 14 } }}>
                  <div className="kbCover">
                    {renderTypeIcon(it.type)}
                    <Tag color="purple" style={{ margin: 0, borderRadius: 999, border: 0 }}>
                      {renderTypeLabel(it.type)}
                    </Tag>
                  </div>
                  <Typography.Text strong style={{ display: 'block' }} ellipsis>
                    {normalizeDisplayName(it.originalName)}
                  </Typography.Text>
                  <div className="kbMeta">
                    <Typography.Text type="secondary" style={{ fontSize: 12 }} ellipsis>
                      {it.uploadedBy}
                    </Typography.Text>
                    <Typography.Text type="secondary" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                      {formatBytes(it.sizeBytes)}
                    </Typography.Text>
                  </div>
                  <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                    {new Date(it.uploadedAt).toLocaleString()}
                  </Typography.Text>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {SEARCH_STATUS_LABEL[(it.searchStatus || 'pending') as SearchStatus]}
                  </Typography.Text>
                  <div className="kbActions">
                    <Space size={8}>
                      <Button size="small" type="primary" ghost onClick={() => void openPreview(it)}>
                        预览
                      </Button>
                      <Button 
                        size="small" 
                        icon={downloadingId === it.id ? <Spin size="small" /> : <DownloadOutlined />} 
                        onClick={() => void downloadItem(it)}
                        disabled={!!downloadingId}
                      >
                        {downloadingId === it.id ? '下载中' : '下载'}
                      </Button>
                    </Space>
                    {canManage ? (
                      <Dropdown
                        trigger={['click']}
                        menu={{
                          items: [
                            { key: 'edit', icon: <EditOutlined />, label: '编辑信息' },
                            { key: 'reindex', icon: <ReloadOutlined />, label: '重建索引' },
                            { key: 'delete', icon: <DeleteOutlined />, label: '删除', danger: true },
                          ],
                          onClick: ({ key }) => {
                            if (key === 'edit') openEdit(it)
                            if (key === 'reindex') void reindexItem(it)
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
            onUploaded={() => {
              setUploadOpen(false)
              void fetchList()
            }}
          />
        </Modal>

        <Drawer
          title={null}
          extra={null}
          closable={false}
          open={!!previewItem}
          onClose={closePreview}
          mask={false}
          width={immersiveWidth}
          styles={{ body: { padding: 0, background: token.colorBgLayout, height: '100%' } }}
        >
          {previewItem ? (
            <div style={{ display: 'flex', height: '100%', position: 'relative', overflow: 'hidden' }}>
              <div
                style={{
                  position: 'absolute',
                  top: 20,
                  left: 20,
                  zIndex: 110,
                  padding: 4,
                  borderRadius: 14,
                  background: 'rgba(255, 255, 255, 0.86)',
                  border: `1px solid ${token.colorBorderSecondary}`,
                  backdropFilter: 'blur(10px)',
                  boxShadow: '0 10px 28px rgba(15, 23, 42, 0.12)',
                }}
              >
                <Button
                  type="text"
                  icon={<LeftOutlined />}
                  onClick={closePreview}
                  style={{ borderRadius: 10, fontWeight: 600 }}
                >
                  退出预览
                </Button>
              </div>

              {/* 底部悬浮 Dock 工具栏 */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 24,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  zIndex: 100,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 8px',
                  background: 'rgba(0, 0, 0, 0.65)',
                  backdropFilter: 'blur(16px)',
                  borderRadius: 24,
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  maxWidth: dockExpanded ? 600 : 'auto',
                }}
              >
                {/* 基础按钮组 */}
                <Button
                  type="text"
                  icon={<MenuFoldOutlined style={{ color: '#fff' }} />}
                  onClick={closePreview}
                  title="关闭预览"
                  style={{ color: '#fff' }}
                  size="small"
                />

                <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.2)', margin: '0 4px' }} />

                {dockExpanded ? (
                  <>
                    <Input
                      value={searchKeyword}
                      onChange={(e) => setSearchKeyword(e.target.value)}
                      onPressEnter={() => void runSearch()}
                      allowClear
                      placeholder="全文检索..."
                      variant="borderless"
                      size="small"
                      style={{ width: 160, color: '#fff', background: 'rgba(255,255,255,0.1)', borderRadius: 4 }}
                      suffix={searching ? <Spin size="small" /> : null}
                    />
                    <Button
                      size="small"
                      type="text"
                      icon={<SearchOutlined style={{ color: '#fff' }} />}
                      loading={searching}
                      onClick={() => void runSearch()}
                    />
                    
                    <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.2)', margin: '0 4px' }} />

                    <Space.Compact size="small">
                      <Button
                        type="text"
                        icon={<LeftOutlined style={{ color: '#fff' }} />}
                        disabled={!searchResult || searchResult.hits.length === 0}
                        onClick={() => switchHit(-1)}
                      />
                      <Button
                        type="text"
                        icon={<RightOutlined style={{ color: '#fff' }} />}
                        disabled={!searchResult || searchResult.hits.length === 0}
                        onClick={() => switchHit(1)}
                      />
                    </Space.Compact>
                    
                    {searchResult && searchResult.hits.length > 0 && (
                       <Typography.Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, minWidth: 40, textAlign: 'center' }}>
                        {activeHitIndex + 1}/{searchResult.hits.length}
                      </Typography.Text>
                    )}

                    <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.2)', margin: '0 4px' }} />

                    <Button
                      size="small"
                      type="text"
                      icon={showSidePanel ? <MenuFoldOutlined style={{ color: '#fff' }} /> : <MenuUnfoldOutlined style={{ color: '#fff' }} />}
                      onClick={() => setShowSidePanel(!showSidePanel)}
                      title={showSidePanel ? '收起结果' : '展开结果'}
                      disabled={!searchResult}
                    />
                    
                    <Button
                      size="small"
                      type="text"
                      icon={downloadingId === previewItem.id ? <Spin size="small" /> : <DownloadOutlined style={{ color: '#fff' }} />}
                      onClick={() => void downloadItem(previewItem)}
                      disabled={!!downloadingId}
                      title="下载文件"
                    />
                    
                    <Button
                      size="small"
                      type="text"
                      icon={<ShrinkOutlined style={{ color: '#fff' }} />}
                      onClick={() => setDockExpanded(false)}
                      title="收起工具栏"
                    />
                  </>
                ) : (
                  <>
                    <Typography.Text 
                       style={{ color: '#fff', maxWidth: 160, fontSize: 13 }} 
                       ellipsis
                       onClick={() => setDockExpanded(true)} // 点击文件名也能展开
                    >
                      {normalizeDisplayName(previewItem.originalName)}
                    </Typography.Text>
                    <Button
                      size="small"
                      type="text"
                      icon={<ExpandAltOutlined style={{ color: '#fff' }} />}
                      onClick={() => setDockExpanded(true)}
                      title="展开工具栏"
                    />
                  </>
                )}
              </div>

              <div
                style={{
                  flex: 1,
                  height: '100%',
                  overflow: 'auto',
                  padding: 0, // 移除 padding，全屏显示
                  transition: 'padding-top 0.3s ease',
                }}
              >
                {searchStatus !== 'ready' ? (
                  <Alert
                    style={{ marginBottom: 12 }}
                    type={searchStatus === 'failed' ? 'error' : 'info'}
                    message={`全文索引状态：${SEARCH_STATUS_LABEL[searchStatus]}`}
                    description={searchError || '首次上传后会自动建立索引，可在索引完成后进行全文检索。'}
                    action={
                      canManage ? (
                        <Button size="small" onClick={() => void reindexItem(previewItem)}>
                          重建索引
                        </Button>
                      ) : undefined
                    }
                  />
                ) : null}
                {previewLoading ? (
                  <div style={{ padding: 48, display: 'flex', justifyContent: 'center' }}>
                    <Spin />
                  </div>
                ) : previewItem.type === 'pdf' ? (
                  previewUrl ? (
                    <PdfPreview fileUrl={previewUrl} targetPage={targetPdfPage} />
                  ) : null
                ) : previewItem.type === 'image' ? (
                  previewUrl ? (
                    <div
                      style={{
                        background: token.colorBgContainer,
                        width: '100%',
                        height: '100%',
                        padding: 20,
                        overflow: 'auto',
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'center',
                      }}
                    >
                      <img
                        src={previewUrl}
                        alt={previewItem.originalName}
                        style={{ maxWidth: '100%', height: 'auto', borderRadius: 12, display: 'block' }}
                      />
                    </div>
                  ) : null
                ) : (
                  <div
                    style={{
                      background: token.colorBgContainer,
                      width: '100%',
                      minHeight: '100%',
                      padding: 24,
                      overflow: 'auto',
                    }}
                  >
                    {renderHighlightedText(previewText || '', searchResult ? searchResult.query : '')}
                  </div>
                )}
              </div>
              <div
                style={{
                  width: 320,
                  height: '100%',
                  borderLeft: `1px solid ${token.colorBorderSecondary}`,
                  background: token.colorBgContainer,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  marginRight: showSidePanel ? 0 : -321,
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: showSidePanel ? '-4px 0 12px rgba(0,0,0,0.05)' : 'none',
                  zIndex: 10,
                }}
              >
                <div
                  style={{
                    padding: '12px 16px',
                    borderBottom: `1px solid ${token.colorBorderSecondary}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Typography.Text strong>命中结果 ({searchResult?.hits.length || 0})</Typography.Text>
                  <Button
                    type="text"
                    size="small"
                    icon={<DoubleRightOutlined />}
                    onClick={() => setShowSidePanel(false)}
                  />
                </div>
                <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
                  {searchResult ? (
                    <>
                      <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                        总命中：{searchResult.totalHits}
                        {searchResult.truncated ? '（已截断）' : ''}
                      </Typography.Text>
                      {searchResult.hits.length === 0 ? (
                        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="未命中" />
                      ) : (
                        <Space direction="vertical" size={8} style={{ width: '100%' }}>
                          {searchResult.hits.map((hit, idx) => (
                            <Card
                              key={`${hit.page}-${idx}`}
                              size="small"
                              styles={{
                                body: {
                                  padding: 10,
                                  border: idx === activeHitIndex ? `1px solid ${token.colorPrimary}` : undefined,
                                },
                              }}
                              hoverable
                              onClick={() => setActiveHitIndex(idx)}
                            >
                              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                                第 {hit.page} 页 · {hit.source === 'ocr' ? 'OCR' : '文本层'}
                              </Typography.Text>
                              <Typography.Paragraph ellipsis={{ rows: 3 }} style={{ marginBottom: 0 }}>
                                {hit.snippet}
                              </Typography.Paragraph>
                            </Card>
                          ))}
                        </Space>
                      )}
                    </>
                  ) : (
                    <div style={{ padding: 24, textAlign: 'center' }}>
                      <Typography.Text type="secondary">输入关键词开始搜索</Typography.Text>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}
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
            <Form.Item name="originalName" label="文件名" rules={[{ required: true, message: '请输入文件名' }]}> 
              <Input placeholder="例如：压铸机操作手册.pdf" />
            </Form.Item>
            <Form.Item name="category" label="分类">
              <Input placeholder="例如：设备手册 / 标准 / 培训资料" />
            </Form.Item>
            <Form.Item name="tags" label="标签（逗号分隔）">
              <Input placeholder="例如：压铸, 工艺, 维护" />
            </Form.Item>
            <Form.Item name="description" label="描述">
              <Input.TextArea placeholder="便于后续检索" autoSize={{ minRows: 3, maxRows: 6 }} />
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
      accept=".pdf,.docx,.png,.jpg,.jpeg,.webp,.gif,.md,.markdown,.txt"
      customRequest={async (options) => {
        if (!authToken) {
          options.onError?.(new Error('未登录'))
          return
        }
        try {
          setUploading(true)
          const file = options.file as File
          if (file.size > UPLOAD_MAX_BYTES) throw new Error(`单个文件不能超过 ${UPLOAD_MAX_MB}MB`)
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
          if (!res.ok) {
            let errText = '上传失败'
            try {
              const payload = await res.json()
              if (payload?.error) errText = String(payload.error)
            } catch {
              errText = `上传失败（${res.status}）`
            }
            throw new Error(errText)
          }
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
          支持 PDF / Word(.docx) / 图片 / Markdown / 文本，单文件最大 {UPLOAD_MAX_MB}MB。上传需要编辑权限，删除需要删除权限。
        </Typography.Text>
      </div>
    </Upload.Dragger>
  )
}
