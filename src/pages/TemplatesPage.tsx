import { Button, Card, Descriptions, Divider, Input, List, Modal, Space, Tag, Typography, message } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { DeleteOutlined, ExportOutlined, FolderOpenOutlined, ImportOutlined, ReloadOutlined, SaveOutlined } from '@ant-design/icons'
import { useSharedValue } from '../core/state/hooks'
import { useHashPath } from '../core/router/hash'
import type { PQ2Params } from '../tools/pq2/types'
import { bumpUpdatedAt, parseTemplateJson } from '../tools/templates/codec'
import {
  deleteWorkspaceEntry,
  ensureHandlePermission,
  getHandlePermission,
  listWorkspaceFiles,
  openTemplateFromPicker,
  pickWorkspaceDirectory,
  readWorkspaceFile,
  saveTemplateToFile,
  supportsFileSystemAccessApi,
  writeWorkspaceFile,
  type WorkspaceListingResult,
} from '../tools/templates/fsAccess'
import { createPQ2TemplateDoc, type TemplateDocument } from '../tools/templates/types'
import { addRecentHandle, clearRecentHandles, listRecentHandles, removeRecentHandle, type RecentHandleEntry } from '../tools/templates/recents'

export function TemplatesPage() {
  const { navigate } = useHashPath()
  const [workspaceName] = useSharedValue<string>('templates', 'workspaceName', '默认工作区')
  const [pq2Params, setPq2Params] = useSharedValue<PQ2Params>('pq2', 'params')

  const [currentDoc, setCurrentDoc] = useState<TemplateDocument | null>(null)
  const [currentFileName, setCurrentFileName] = useState<string | null>(null)
  const [currentFileHandle, setCurrentFileHandle] = useState<FileSystemFileHandle | undefined>(undefined)

  const [workspace, setWorkspace] = useState<WorkspaceListingResult | null>(null)
  const [recents, setRecents] = useState<RecentHandleEntry[]>([])
  const [permissionByRecentId, setPermissionByRecentId] = useState<Record<string, PermissionState>>({})

  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [createName, setCreateName] = useState('PQ² 模板')
  const [createDesc, setCreateDesc] = useState('')

  const fsAccessSupported = supportsFileSystemAccessApi()

  const workspaceFileCount = useMemo(() => {
    if (!workspace) return 0
    return workspace.files.length
  }, [workspace])

  const workspaceFileNames = useMemo(() => {
    return (workspace?.files ?? []).map((f) => f.name)
  }, [workspace])

  const canApplyToPq2 = currentDoc?.kind === 'pq2'

  const refreshRecents = async () => {
    try {
      const list = await listRecentHandles(12)
      setRecents(list)
    } catch (e) {
      message.error(e instanceof Error ? e.message : '读取最近使用失败')
    }
  }

  const refreshWorkspace = async (dir?: FileSystemDirectoryHandle) => {
    if (!dir) return
    try {
      const files = await listWorkspaceFiles(dir)
      setWorkspace({ mode: 'fs', directoryHandle: dir, directoryName: dir.name, files })
    } catch (e) {
      message.error(e instanceof Error ? e.message : '刷新工作区失败')
    }
  }

  useEffect(() => {
    const t = window.setTimeout(() => {
      void refreshRecents()
    }, 0)
    return () => window.clearTimeout(t)
  }, [])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      const next: Record<string, PermissionState> = {}
      for (const item of recents) {
        const mode = item.kind === 'directory' ? 'readwrite' : 'read'
        try {
          next[item.id] = await getHandlePermission(item.handle, mode)
        } catch {
          next[item.id] = 'prompt'
        }
      }
      if (cancelled) return
      setPermissionByRecentId(next)
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [recents])

  const openTemplate = async () => {
    try {
      const opened = await openTemplateFromPicker()
      if (!opened) return

      const parsed = parseTemplateJson(opened.docText, { defaultName: opened.fileName })
      for (const w of parsed.warnings) message.warning(w)

      setCurrentDoc(parsed.doc)
      setCurrentFileName(opened.fileName)
      setCurrentFileHandle(opened.fileHandle)

      if (opened.fileHandle) {
        void addRecentHandle({ kind: 'file', name: opened.fileName, handle: opened.fileHandle })
        void refreshRecents()
      }

      message.success('已打开模板')
    } catch (e) {
      message.error(e instanceof Error ? e.message : '打开失败')
    }
  }

  const saveCurrent = async (mode: 'save' | 'saveAs') => {
    if (!currentDoc) {
      message.info('当前没有已打开的模板')
      return
    }
    try {
      const updated = bumpUpdatedAt(currentDoc)
      const fileHandle = mode === 'saveAs' ? undefined : currentFileHandle
      const saved = await saveTemplateToFile({
        doc: updated,
        fileHandle,
        suggestedName: currentFileName ?? `${updated.meta.name}.json`,
      })
      setCurrentDoc(updated)
      setCurrentFileName(saved.fileName)
      setCurrentFileHandle(saved.fileHandle)

      if (saved.fileHandle) {
        void addRecentHandle({ kind: 'file', name: saved.fileName, handle: saved.fileHandle })
        void refreshRecents()
      }

      message.success('已保存模板')
    } catch (e) {
      message.error(e instanceof Error ? e.message : '保存失败')
    }
  }

  const chooseWorkspace = async () => {
    try {
      const picked = await pickWorkspaceDirectory()
      if (!picked) return
      setWorkspace(picked)
      if (picked.mode === 'fs') {
        void addRecentHandle({ kind: 'directory', name: picked.directoryName, handle: picked.directoryHandle })
        void refreshRecents()
      }
      message.success('已选择工作区')
    } catch (e) {
      message.error(e instanceof Error ? e.message : '选择工作区失败')
    }
  }

  const openFromWorkspace = async (fileName: string) => {
    if (!workspace) return
    try {
      if (workspace.mode === 'fs') {
        const entry = workspace.files.find((f) => f.name === fileName)
        if (!entry) return
        const { text } = await readWorkspaceFile(entry)
        const parsed = parseTemplateJson(text, { defaultName: entry.name })
        for (const w of parsed.warnings) message.warning(w)
        setCurrentDoc(parsed.doc)
        setCurrentFileName(entry.name)
        setCurrentFileHandle(entry.fileHandle)
        void addRecentHandle({ kind: 'file', name: entry.name, handle: entry.fileHandle })
        void refreshRecents()
        message.success('已打开模板')
        return
      }

      const entry = workspace.files.find((f) => f.name === fileName)
      if (!entry) return
      const parsed = parseTemplateJson(await entry.file.text(), { defaultName: entry.name })
      for (const w of parsed.warnings) message.warning(w)
      setCurrentDoc(parsed.doc)
      setCurrentFileName(entry.name)
      setCurrentFileHandle(undefined)
      message.success('已打开模板')
    } catch (e) {
      message.error(e instanceof Error ? e.message : '打开失败')
    }
  }

  const deleteFromWorkspace = async (fileName: string) => {
    if (!workspace || workspace.mode !== 'fs') return
    Modal.confirm({
      title: '删除模板文件？',
      content: `将从工作区删除：${fileName}`,
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      async onOk() {
        await deleteWorkspaceEntry({ directoryHandle: workspace.directoryHandle, fileName })
        if (currentFileName === fileName) {
          setCurrentFileName(null)
          setCurrentFileHandle(undefined)
        }
        await refreshWorkspace(workspace.directoryHandle)
        message.success('已删除')
      },
    })
  }

  const applyToPq2 = () => {
    if (!currentDoc || currentDoc.kind !== 'pq2') return
    setPq2Params(currentDoc.payload.params)
    message.success('已同步到 PQ² 参数')
    navigate('/pq2')
  }

  const openRecent = async (item: RecentHandleEntry) => {
    try {
      const mode = item.kind === 'directory' ? 'readwrite' : 'read'
      const ok = await ensureHandlePermission(item.handle, mode)
      if (!ok) {
        message.warning('需要授权后才能打开')
        return
      }

      if (item.kind === 'directory') {
        const dir = item.handle as FileSystemDirectoryHandle
        const files = await listWorkspaceFiles(dir)
        setWorkspace({ mode: 'fs', directoryHandle: dir, directoryName: dir.name, files })
        message.success('已恢复工作区')
        return
      }

      const handle = item.handle as FileSystemFileHandle
      const file = await handle.getFile()
      const parsed = parseTemplateJson(await file.text(), { defaultName: file.name })
      for (const w of parsed.warnings) message.warning(w)
      setCurrentDoc(parsed.doc)
      setCurrentFileName(file.name)
      setCurrentFileHandle(handle)
      message.success('已打开模板')
    } catch (e) {
      message.error(e instanceof Error ? e.message : '打开失败')
    }
  }

  const createFromPq2 = () => {
    if (!pq2Params) {
      message.info('PQ² 参数尚未生成或未保存，先去 PQ² 工具输入一次参数')
      navigate('/pq2')
      return
    }
    setCreateName('PQ² 模板')
    setCreateDesc('')
    setCreateModalOpen(true)
  }

  const confirmCreate = async () => {
    if (!pq2Params) return
    const doc = createPQ2TemplateDoc({ name: createName.trim() || 'PQ² 模板', description: createDesc.trim() || undefined, params: pq2Params })
    setCurrentDoc(doc)
    setCurrentFileName(`${doc.meta.name}.json`)
    setCurrentFileHandle(undefined)
    setCreateModalOpen(false)

    if (workspace?.mode === 'fs') {
      try {
        const fileName = `${doc.meta.name}.json`
        const handle = await writeWorkspaceFile({ directoryHandle: workspace.directoryHandle, fileName, doc })
        setCurrentFileHandle(handle)
        await refreshWorkspace(workspace.directoryHandle)
        void addRecentHandle({ kind: 'file', name: fileName, handle })
        void refreshRecents()
        message.success('已写入工作区')
      } catch (e) {
        message.warning(e instanceof Error ? e.message : '写入工作区失败，已仅在当前会话创建')
      }
    } else {
      message.success('已创建模板（未保存）')
    }
  }

  return (
    <>
      <div className="centerHeader">
        <div className="centerTitle">
          <Typography.Text type="secondary">工具</Typography.Text>
          <h1>模板管理</h1>
          <p>打开/保存模板 · 工作区目录模式 · 最近使用恢复 · 与 PQ² 参数互通。</p>
        </div>
        <Space wrap size={10}>
          <Button icon={<ImportOutlined />} onClick={openTemplate}>
            打开模板
          </Button>
          <Button icon={<SaveOutlined />} type="primary" onClick={() => void saveCurrent('save')} disabled={!currentDoc}>
            保存
          </Button>
          <Button icon={<ExportOutlined />} onClick={() => void saveCurrent('saveAs')} disabled={!currentDoc}>
            另存为
          </Button>
          <Button icon={<FolderOpenOutlined />} onClick={chooseWorkspace}>
            选择工作区
          </Button>
        </Space>
      </div>

      <div className="centerBody">
        <div className="cardGrid">
          <Card
            className="softCard span8"
            title="工作区"
            extra={
              <Space size={8}>
                <Tag color="purple">{fsAccessSupported ? 'File System Access API' : '降级模式'}</Tag>
                <Tag color="default">{workspace ? `${workspaceFileCount} 个文件` : '未选择'}</Tag>
              </Space>
            }
          >
            <Typography.Paragraph style={{ marginBottom: 10 }} type="secondary">
              工作区名称（templates.workspaceName）：<Typography.Text strong>{workspaceName ?? '默认工作区'}</Typography.Text>
            </Typography.Paragraph>

            <Space wrap size={10} style={{ marginBottom: 10 }}>
              <Button icon={<FolderOpenOutlined />} onClick={chooseWorkspace}>
                选择目录
              </Button>
              <Button
                icon={<ReloadOutlined />}
                disabled={!workspace || workspace.mode !== 'fs'}
                onClick={() => void refreshWorkspace(workspace?.mode === 'fs' ? workspace.directoryHandle : undefined)}
              >
                刷新
              </Button>
              <Button type="primary" onClick={createFromPq2}>
                从 PQ² 新建模板
              </Button>
            </Space>

            <List
              size="small"
              dataSource={workspaceFileNames}
              locale={{ emptyText: workspace ? '该目录下暂无 .json 模板文件' : '未选择工作区目录' }}
              renderItem={(fileName) => (
                <List.Item
                  actions={[
                    <Button key="open" size="small" onClick={() => void openFromWorkspace(fileName)}>
                      打开
                    </Button>,
                    workspace?.mode === 'fs' ? (
                      <Button
                        key="delete"
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => void deleteFromWorkspace(fileName)}
                      >
                        删除
                      </Button>
                    ) : null,
                  ].filter(Boolean)}
                >
                  <List.Item.Meta
                    title={
                      <Space size={8}>
                        <Typography.Text strong>{fileName}</Typography.Text>
                        {currentFileName === fileName ? <Tag color="purple">当前</Tag> : null}
                      </Space>
                    }
                    description={workspace?.mode === 'fs' ? '可读写（取决于授权）' : '仅导入预览，无法回写目录'}
                  />
                </List.Item>
              )}
            />
          </Card>

          <Card
            className="softCard span4"
            title="最近使用"
            extra={
              <Space size={8}>
                <Button size="small" onClick={() => void refreshRecents()}>
                  刷新
                </Button>
                <Button
                  size="small"
                  danger
                  onClick={() => {
                    Modal.confirm({
                      title: '清空最近使用？',
                      content: '仅清除本地记录，不会删除任何文件。',
                      okText: '清空',
                      okButtonProps: { danger: true },
                      cancelText: '取消',
                      async onOk() {
                        await clearRecentHandles()
                        await refreshRecents()
                        message.success('已清空')
                      },
                    })
                  }}
                >
                  清空
                </Button>
              </Space>
            }
          >
            <Typography.Paragraph style={{ marginBottom: 10 }} type="secondary">
              记录文件/目录句柄（IndexedDB）。重新打开时可能需要再次授权。
            </Typography.Paragraph>
            <List
              size="small"
              dataSource={recents}
              locale={{ emptyText: '暂无记录' }}
              renderItem={(item) => {
                const perm = permissionByRecentId[item.id]
                const permTag =
                  perm === 'granted' ? (
                    <Tag color="green">已授权</Tag>
                  ) : perm === 'denied' ? (
                    <Tag color="red">已拒绝</Tag>
                  ) : (
                    <Tag>需授权</Tag>
                  )
                return (
                  <List.Item
                    actions={[
                      <Button key="open" size="small" onClick={() => void openRecent(item)}>
                        打开
                      </Button>,
                      <Button
                        key="remove"
                        size="small"
                        danger
                        onClick={() => {
                          void (async () => {
                            await removeRecentHandle(item.id)
                            await refreshRecents()
                          })()
                        }}
                      >
                        移除
                      </Button>,
                    ]}
                  >
                    <List.Item.Meta
                      title={
                        <Space size={8} wrap>
                          <Typography.Text strong>{item.name}</Typography.Text>
                          <Tag color="purple">{item.kind === 'directory' ? '目录' : '文件'}</Tag>
                          {permTag}
                        </Space>
                      }
                      description={new Date(item.lastOpenedAt).toLocaleString()}
                    />
                  </List.Item>
                )
              }}
            />
            <Divider style={{ margin: '12px 0' }} />
            <div className="pill">
              <Typography.Text type="secondary">兼容性</Typography.Text>
              <div style={{ height: 6 }} />
              <Typography.Paragraph style={{ marginBottom: 0 }} type="secondary">
                {fsAccessSupported
                  ? '当前浏览器支持目录/文件句柄读写。'
                  : '当前环境不支持 File System Access API：将使用“导入/下载”作为降级方案。'}
              </Typography.Paragraph>
            </div>
          </Card>

          <Card
            className="softCard span8"
            title="当前模板"
            extra={
              <Space size={8}>
                {currentDoc ? <Tag color="purple">{currentDoc.kind.toUpperCase()}</Tag> : <Tag>未打开</Tag>}
                {currentDoc ? <Tag color="default">v{currentDoc.version}</Tag> : null}
              </Space>
            }
          >
            {currentDoc ? (
              <>
                <Descriptions size="small" column={1} labelStyle={{ color: 'rgba(33, 23, 53, 0.56)' }}>
                  <Descriptions.Item label="名称">{currentDoc.meta.name}</Descriptions.Item>
                  <Descriptions.Item label="描述">{currentDoc.meta.description ?? '-'}</Descriptions.Item>
                  <Descriptions.Item label="创建时间">{new Date(currentDoc.meta.createdAt).toLocaleString()}</Descriptions.Item>
                  <Descriptions.Item label="更新时间">{new Date(currentDoc.meta.updatedAt).toLocaleString()}</Descriptions.Item>
                  <Descriptions.Item label="来源文件">{currentFileName ?? '未保存'}</Descriptions.Item>
                </Descriptions>
                <Divider style={{ margin: '10px 0' }} />
                <Space wrap size={10}>
                  <Button type="primary" disabled={!canApplyToPq2} onClick={applyToPq2}>
                    应用到 PQ²
                  </Button>
                  <Button
                    disabled={!pq2Params || !currentDoc || currentDoc.kind !== 'pq2'}
                    onClick={() => {
                      if (!pq2Params || !currentDoc || currentDoc.kind !== 'pq2') return
                      setCurrentDoc({
                        ...currentDoc,
                        meta: { ...currentDoc.meta, updatedAt: new Date().toISOString() },
                        payload: { params: pq2Params },
                      })
                      message.success('已用当前 PQ² 参数覆盖模板（未保存）')
                    }}
                  >
                    用当前 PQ² 覆盖
                  </Button>
                  <Button onClick={() => void saveCurrent('save')} disabled={!currentDoc}>
                    保存
                  </Button>
                  <Button onClick={() => void saveCurrent('saveAs')} disabled={!currentDoc}>
                    另存为
                  </Button>
                </Space>
              </>
            ) : (
              <div className="pill">
                <Typography.Text type="secondary">提示</Typography.Text>
                <div style={{ height: 6 }} />
                <Typography.Paragraph style={{ marginBottom: 0 }} type="secondary">
                  点击右上角“打开模板”，或从工作区/最近使用中选择一个文件即可开始。
                </Typography.Paragraph>
              </div>
            )}
          </Card>

          <Card className="softCard span4" title="与 PQ² 互通" extra={<Tag color="purple">Bridge</Tag>}>
            <Typography.Paragraph style={{ marginBottom: 10 }} type="secondary">
              模板内容可同步到 PQ² 工具；也可以从 PQ² 参数生成模板并保存。
            </Typography.Paragraph>
            <div className="pill">
              <Typography.Text type="secondary">当前 PQ² 参数</Typography.Text>
              <div style={{ height: 8 }} />
              <Typography.Paragraph style={{ marginBottom: 6 }}>
                {pq2Params
                  ? `${pq2Params.materialId} · t=${pq2Params.fillTimeS}s · A=${pq2Params.gateAreaMm2}mm²`
                  : '暂无（尚未在 PQ² 工具中保存过参数）'}
              </Typography.Paragraph>
              <Space wrap size={10}>
                <Button type="primary" onClick={createFromPq2}>
                  从 PQ² 新建模板
                </Button>
                <Button onClick={() => navigate('/pq2')}>打开 PQ²</Button>
              </Space>
            </div>
          </Card>
        </div>
      </div>

      <Modal
        title="从 PQ² 参数新建模板"
        open={createModalOpen}
        okText="创建"
        cancelText="取消"
        onOk={() => void confirmCreate()}
        onCancel={() => setCreateModalOpen(false)}
      >
        <Space direction="vertical" size={10} style={{ width: '100%' }}>
          <div className="pill">
            <Typography.Text type="secondary">模板名称</Typography.Text>
            <div style={{ height: 6 }} />
            <Input value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder="例如：ADC12_薄壁_01" />
          </div>
          <div className="pill">
            <Typography.Text type="secondary">描述（可选）</Typography.Text>
            <div style={{ height: 6 }} />
            <Input value={createDesc} onChange={(e) => setCreateDesc(e.target.value)} placeholder="例如：0.06s / 40×2" />
          </div>
        </Space>
      </Modal>
    </>
  )
}
