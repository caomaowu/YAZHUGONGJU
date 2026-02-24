import { Button, Card, Input, Space, Tag, Typography } from 'antd'
import { useMemo, useState } from 'react'
import { useSharedStateStore, useSharedValue } from '../core/state/hooks'
import type { SharedStatePersistenceAdapter } from '../core/state/sharedStore'

export function SettingsPage() {
  const store = useSharedStateStore()
  const [machineName, setMachineName] = useSharedValue<string>('global', 'machineName', '')
  const [materialName, setMaterialName] = useSharedValue<string>('global', 'materialName', 'A380')
  const [workspaceName, setWorkspaceName] = useSharedValue<string>('templates', 'workspaceName', '默认工作区')
  const [adapterStatus, setAdapterStatus] = useState<'未配置' | '已配置'>('未配置')

  const demoAdapter = useMemo<SharedStatePersistenceAdapter>(() => {
    return {
      async load(namespace) {
        if (!namespace) return null
        return null
      },
      async save(namespace, snapshot) {
        if (!namespace) return
        if (Object.keys(snapshot).length === -1) return
      },
    }
  }, [])

  return (
    <>
      <div className="centerHeader">
        <div className="centerTitle">
          <Typography.Text type="secondary">系统</Typography.Text>
          <h1>设置</h1>
          <p>用于演示共享状态的命名空间写入与订阅刷新。</p>
        </div>
      </div>

      <div className="centerBody">
        <div className="cardGrid">
          <Card className="softCard span8" title="共享状态（global / templates）" extra={<Tag color="purple">State</Tag>}>
            <Space direction="vertical" size={10} style={{ width: '100%' }}>
              <div className="pill">
                <Typography.Text type="secondary">机台名称（global.machineName）</Typography.Text>
                <div style={{ height: 6 }} />
                <Input
                  value={machineName ?? ''}
                  placeholder="例如：280T-DC-03"
                  onChange={(e) => setMachineName(e.target.value)}
                />
              </div>

              <div className="pill">
                <Typography.Text type="secondary">材料（global.materialName）</Typography.Text>
                <div style={{ height: 6 }} />
                <Input
                  value={materialName ?? ''}
                  placeholder="例如：A380"
                  onChange={(e) => setMaterialName(e.target.value)}
                />
              </div>

              <div className="pill">
                <Typography.Text type="secondary">模板工作区名称（templates.workspaceName）</Typography.Text>
                <div style={{ height: 6 }} />
                <Input
                  value={workspaceName ?? ''}
                  placeholder="例如：薄壁件项目组"
                  onChange={(e) => setWorkspaceName(e.target.value)}
                />
              </div>
            </Space>
          </Card>

          <Card className="softCard span4" title="持久化接口预留">
            <Typography.Paragraph style={{ marginBottom: 10 }} type="secondary">
              共享状态支持注入持久化适配器（load/save），当前仅演示接口接入点，不默认写入浏览器存储。
            </Typography.Paragraph>
            <Space direction="vertical" size={10} style={{ width: '100%' }}>
              <div className="pill">
                <Typography.Text type="secondary">适配器状态</Typography.Text>
                <div />
                <Typography.Text strong>{adapterStatus}</Typography.Text>
              </div>
              <Button
                block
                type="primary"
                onClick={() => {
                  store.setPersistenceAdapter(demoAdapter)
                  setAdapterStatus('已配置')
                }}
              >
                连接（演示）
              </Button>
              <Button
                block
                onClick={() => {
                  store.setPersistenceAdapter(null)
                  setAdapterStatus('未配置')
                }}
              >
                断开
              </Button>
            </Space>
          </Card>
        </div>
      </div>
    </>
  )
}
