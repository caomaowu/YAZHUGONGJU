import { useEffect, useMemo, useState } from 'react'
import { Card, Input, Menu, Space, Statistic, Tag, Typography } from 'antd'
import {
  SearchOutlined,
} from '@ant-design/icons'
import { useHashPath } from './core/router/hash'
import { SharedStateProvider } from './core/state/SharedStateProvider'
import { builtinToolRegistry } from './tools/builtinRegistry'
import './App.css'

function App() {
  const { path, navigate } = useHashPath()
  const [query, setQuery] = useState('')

  const tools = useMemo(() => builtinToolRegistry.list(), [])
  const activeTool = useMemo(() => {
    return builtinToolRegistry.getByRoute(path) ?? builtinToolRegistry.getById('dashboard') ?? tools[0]
  }, [path, tools])

  useEffect(() => {
    const hasHash = window.location.hash && window.location.hash !== '#'
    if (!hasHash) navigate('/dashboard', { replace: true })
  }, [navigate])

  useEffect(() => {
    if (builtinToolRegistry.getByRoute(path)) return
    navigate('/dashboard', { replace: true })
  }, [navigate, path])

  const menuItems = useMemo(() => {
    const q = query.trim()
    const list = q
      ? tools.filter((t) => t.title.includes(q) || t.navLabel.includes(q) || (t.description ?? '').includes(q))
      : tools
    return list.map((t) => ({ key: t.id, icon: t.icon, label: t.navLabel }))
  }, [query, tools])

  return (
    <SharedStateProvider>
      <div className="appFrame">
        <div className="appGrid">
          <aside className="panel panelLeft">
            <div className="panelInner">
              <div className="leftHeader">
                <div className="brand">
                  <div className="brandMark" />
                  <div className="brandText">
                    <div className="brandTitle">压铸工具箱</div>
                    <div className="brandSub">Lavender Workbench</div>
                  </div>
                </div>
                <Tag color="purple">Alpha</Tag>
              </div>

              <Input
                prefix={<SearchOutlined />}
                placeholder="搜索工具 / 参数 / 模板"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />

              <div className="menuWrap">
                <Menu
                  selectedKeys={[activeTool?.id ?? 'dashboard']}
                  onClick={({ key }) => {
                    const tool = builtinToolRegistry.getById(String(key))
                    if (!tool) return
                    navigate(tool.route)
                  }}
                  items={menuItems}
                />
              </div>
            </div>
          </aside>

          <main className="panel">
            <div className="panelInner">{activeTool?.element}</div>
          </main>

          <aside className="panel panelRight">
            <div className="panelInner">
              <div className="rightStack">
                <Card className="softCard" title="今日概览">
                  <div className="metricRow">
                    <div className="pill">
                      <Statistic title="能耗趋势" value={-3.6} precision={1} suffix="%" />
                    </div>
                    <div className="pill">
                      <Statistic title="良品率" value={98.2} precision={1} suffix="%" />
                    </div>
                  </div>
                  <div style={{ height: 10 }} />
                  <div className="pill">
                    <Typography.Text type="secondary">建议</Typography.Text>
                    <Typography.Paragraph style={{ margin: '6px 0 0 0' }}>
                      优先检查浇口截面积与充型时间窗口，避免压力峰值上跳。
                    </Typography.Paragraph>
                  </div>
                </Card>

                <Card className="softCard" title="最近操作">
                  <Space direction="vertical" size={10} style={{ width: '100%' }}>
                    <div className="pill">
                      <Typography.Text strong>模板：A380_薄壁_01</Typography.Text>
                      <Typography.Paragraph type="secondary" style={{ margin: '4px 0 0 0' }}>
                        保存于 2 小时前
                      </Typography.Paragraph>
                    </div>
                    <div className="pill">
                      <Typography.Text strong>PQ²：批次 2026-02-24</Typography.Text>
                      <Typography.Paragraph type="secondary" style={{ margin: '4px 0 0 0' }}>
                        生成图表与导出参数
                      </Typography.Paragraph>
                    </div>
                  </Space>
                </Card>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </SharedStateProvider>
  )
}

export default App
