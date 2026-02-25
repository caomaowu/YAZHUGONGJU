import { useEffect, useMemo, useState } from 'react'
import { Input, Menu, Tag, ConfigProvider, Drawer, Button, Spin, Tooltip } from 'antd'
import {
  SearchOutlined,
  MenuOutlined,
  LogoutOutlined,
} from '@ant-design/icons'
import { useHashPath } from './core/router/hash'
import { SharedStateProvider } from './core/state/SharedStateProvider'
import { builtinToolRegistry } from './tools/builtinRegistry'
import { ThemeProvider } from './core/state/ThemeContext'
import { useTheme } from './core/state/themeState'
import { lavenderTheme } from './theme/lavenderTheme'
import { darkTheme } from './theme/darkTheme'
import { ThemeToggle } from './components/ThemeToggle'
import { AuthProvider, useAuth } from './core/auth/AuthContext'
import { LoginPage } from './components/auth/Login'
import './App.css'

function MainLayout() {
  const { path, navigate } = useHashPath()
  const [query, setQuery] = useState('')
  const { theme } = useTheme()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { user, isAuthenticated, isLoading, logout } = useAuth()

  const allTools = useMemo(() => builtinToolRegistry.list(), [])
  
  const tools = useMemo(() => {
    if (!user) return []
    return allTools.filter(t => !t.allowedRoles || t.allowedRoles.includes(user.role))
  }, [allTools, user])

  const activeTool = useMemo(() => {
    const current = builtinToolRegistry.getByRoute(path)
    // Check if current tool is allowed
    if (current && tools.find(t => t.id === current.id)) {
      return current
    }
    // Fallback
    return tools.length > 0 ? tools[0] : undefined
  }, [path, tools])

  useEffect(() => {
    if (isLoading || !isAuthenticated) return
    
    const hasHash = window.location.hash && window.location.hash !== '#'
    if (!hasHash && tools.length > 0) {
      navigate(tools[0].route, { replace: true })
      return
    }

    // If current path is not allowed, redirect
    const currentTool = builtinToolRegistry.getByRoute(path)
    if (currentTool && !tools.find(t => t.id === currentTool.id) && tools.length > 0) {
      navigate(tools[0].route, { replace: true })
    }
  }, [navigate, path, tools, isLoading, isAuthenticated])

  const menuItems = useMemo(() => {
    const q = query.trim()
    const list = q
      ? tools.filter((t) => t.title.includes(q) || t.navLabel.includes(q) || (t.description ?? '').includes(q))
      : tools
    return list.map((t) => ({ key: t.id, icon: t.icon, label: t.navLabel }))
  }, [query, tools])

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f0f2f5' }}>
        <Spin size="large" tip="加载中..." />
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <ConfigProvider theme={theme === 'dark' ? darkTheme : lavenderTheme}>
        <LoginPage />
      </ConfigProvider>
    )
  }

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
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
           <ThemeToggle />
           <Tooltip title="退出登录">
             <Button type="text" icon={<LogoutOutlined />} onClick={logout} size="small" />
           </Tooltip>
        </div>
      </div>
      
      <div style={{ padding: '0 16px 8px 16px' }}>
        <Tag color="purple">用户: {user?.name || user?.username} ({user?.role})</Tag>
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
          selectedKeys={[activeTool?.id ?? '']}
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
             <div style={{ display: 'flex', gap: 8 }}>
               <ThemeToggle />
               <Button type="text" icon={<LogoutOutlined />} onClick={logout} />
             </div>
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
        <AuthProvider>
          <MainLayout />
        </AuthProvider>
      </ThemeProvider>
    </SharedStateProvider>
  )
}

export default App
