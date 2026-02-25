import { useEffect, useMemo, useState } from 'react'
import { Input, Menu, Tag, ConfigProvider, Drawer, Button } from 'antd'
import {
  SearchOutlined,
  MenuOutlined,
} from '@ant-design/icons'
import { useHashPath } from './core/router/hash'
import { SharedStateProvider } from './core/state/SharedStateProvider'
import { builtinToolRegistry } from './tools/builtinRegistry'
import { ThemeProvider } from './core/state/ThemeContext'
import { useTheme } from './core/state/themeState'
import { lavenderTheme } from './theme/lavenderTheme'
import { darkTheme } from './theme/darkTheme'
import { ThemeToggle } from './components/ThemeToggle'
import './App.css'

function MainLayout() {
  const { path, navigate } = useHashPath()
  const [query, setQuery] = useState('')
  const { theme } = useTheme()
  const [drawerOpen, setDrawerOpen] = useState(false)

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

  const menuContent = (
    <div className="menuContent">
      <div className="leftHeader">
        <div className="brand">
          <div className="brandMark" />
          <div className="brandText">
            <div className="brandTitle">压铸工具箱</div>
            <div className="brandSub">Lavender Workbench</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
           <ThemeToggle />
           <Tag color="purple">Alpha</Tag>
        </div>
      </div>

      <Input
        prefix={<SearchOutlined />}
        placeholder="搜索工具 / 参数 / 模板"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="searchInput"
      />

      <div className="menuWrap">
        <Menu
          selectedKeys={[activeTool?.id ?? 'dashboard']}
          onClick={({ key }) => {
            const tool = builtinToolRegistry.getById(String(key))
            if (!tool) return
            navigate(tool.route)
            setDrawerOpen(false)
          }}
          items={menuItems}
        />
      </div>
    </div>
  )

  return (
    <ConfigProvider theme={theme === 'dark' ? darkTheme : lavenderTheme}>
      <div className="appFrame">
        <div className="mobileHeader">
             <Button 
                icon={<MenuOutlined />} 
                onClick={() => setDrawerOpen(true)} 
                type="text"
                size="large"
             />
             <div className="brandTitle">压铸工具箱</div>
             <ThemeToggle />
        </div>

        <Drawer
            placement="left"
            onClose={() => setDrawerOpen(false)}
            open={drawerOpen}
            width={280}
            className="mobileDrawer"
            styles={{ body: { padding: 0 } }}
        >
            <div className="drawerInner">
                {menuContent}
            </div>
        </Drawer>

        <div className="appGrid">
          <aside className="panel panelLeft">
            <div className="panelInner">
              {menuContent}
            </div>
          </aside>

          <main className="panel panelMain">
            <div key={activeTool?.id} className="panelInner page-transition">
                {activeTool?.element}
            </div>
          </main>
        </div>
      </div>
    </ConfigProvider>
  )
}

function App() {
  return (
    <SharedStateProvider>
      <ThemeProvider>
        <MainLayout />
      </ThemeProvider>
    </SharedStateProvider>
  )
}

export default App
