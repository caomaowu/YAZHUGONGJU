import { useEffect, useMemo, useState } from 'react'
import { Input, Menu, Tag, ConfigProvider, Drawer, Button, Spin, Tooltip, message } from 'antd'
import {
  SearchOutlined,
  MenuOutlined,
  LogoutOutlined,
  LockOutlined,
} from '@ant-design/icons'
import { useHashPath } from './core/router/hash'
import { SharedStateProvider } from './core/state/SharedStateProvider'
import { builtinToolRegistry } from './tools/builtinRegistry'
import { ThemeProvider } from './core/state/ThemeContext'
import { useTheme } from './core/state/themeState'
import { lavenderTheme } from './theme/lavenderTheme'
import { darkTheme } from './theme/darkTheme'
import { ThemeToggle } from './components/ThemeToggle'
import { AuthProvider } from './core/auth/AuthContext'
import { useAuth } from './core/auth/useAuth'
import { LoginPage } from './components/auth/Login'
import './App.css'

function normalizeSearchText(value: string) {
  return value.normalize('NFKC').toLowerCase().replace(/\s+/g, '')
}

function MainLayout() {
  const { path, navigate } = useHashPath()
  const [query, setQuery] = useState('')
  const { theme } = useTheme()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [kbImmersiveMode, setKbImmersiveMode] = useState(false)
  const { user, isAuthenticated, isLoading, logout, hasPermission } = useAuth()
  const isAiMode = path === '/ai'

  const allTools = useMemo(() => builtinToolRegistry.list(), [])
  
  // Calculate allowed tools for routing guard only
  const allowedTools = useMemo(() => {
    if (!user) return []
    return allTools.filter(t => !t.allowedRoles || hasPermission(t.id))
  }, [allTools, user, hasPermission])

  // Display ALL tools in menu, but mark restricted ones
  const tools = allTools;

  const activeTool = useMemo(() => {
    const current = builtinToolRegistry.getByRoute(path)
    // Check if current tool is allowed (routing guard)
    if (current && allowedTools.find(t => t.id === current.id)) {
      return current
    }
    // Fallback
    return allowedTools.length > 0 ? allowedTools[0] : undefined
  }, [path, allowedTools])

  useEffect(() => {
    if (isLoading || !isAuthenticated) return
    
    const hasHash = window.location.hash && window.location.hash !== '#'
    if (!hasHash && allowedTools.length > 0) {
      navigate(allowedTools[0].route, { replace: true })
      return
    }

    // If current path is not allowed, redirect
    const currentTool = builtinToolRegistry.getByRoute(path)
    if (currentTool && !allowedTools.find(t => t.id === currentTool.id) && allowedTools.length > 0) {
      navigate(allowedTools[0].route, { replace: true })
    }
  }, [navigate, path, allowedTools, isLoading, isAuthenticated])

  useEffect(() => {
    const onKbImmersiveChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ active?: boolean }>
      setKbImmersiveMode(Boolean(customEvent.detail?.active))
    }

    window.addEventListener('kb-immersive-change', onKbImmersiveChange as EventListener)
    return () => {
      window.removeEventListener('kb-immersive-change', onKbImmersiveChange as EventListener)
    }
  }, [])

  const menuItems = useMemo(() => {
    const q = normalizeSearchText(query.trim())
    const list = (q
      ? tools.filter((t) => {
          const candidates = [t.title, t.navLabel, t.description ?? '']
          return candidates.some((text) => normalizeSearchText(text).includes(q))
        })
      : tools).filter((t) => t.id !== 'ai')
      
    return list.map((t) => {
      const isAllowed = (!t.allowedRoles || hasPermission(t.id)) && !t.disabled
      const isAI = t.id === 'ai-knowledge'
      
      return { 
        key: t.id, 
        icon: isAllowed ? t.icon : <LockOutlined style={{ color: '#ff4d4f' }} />, 
        label: isAI ? (
            <span style={{
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '15px',
              letterSpacing: '0.5px',
              textShadow: '0 1px 2px rgba(0,0,0,0.1)'
            }}>
              AI助手
            </span>
        ) : (
          <span style={{ color: isAllowed ? 'inherit' : '#999' }}>
            {t.navLabel} {isAllowed ? '' : '(暂未开放)'}
          </span>
        ),
        disabled: false, // We handle click manually
        className: isAI ? 'ai-menu-item' : ''
      };
    })
  }, [query, tools, hasPermission])

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f0f2f5' }}>
        <Spin size="large" />
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
      
      <div className="userBadgeWrap" style={{ padding: '0 16px 8px 16px' }}>
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
          mode="inline"
          selectedKeys={[activeTool?.id ?? '']}
          onClick={({ key }) => {
            const tool = builtinToolRegistry.getById(String(key))
            if (!tool) return
            
            // Permission check
            if ((tool.allowedRoles && !hasPermission(tool.id)) || tool.disabled) {
              message.info('暂未开放');
              return;
            }

            navigate(tool.route)
            setDrawerOpen(false)
          }}
          items={menuItems}
        />
      </div>

      <div className="menuFooter">
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

        <div className={`appGrid${isAiMode ? ' aiMode' : ''}${kbImmersiveMode ? ' kbImmersiveMode' : ''}`}>
          {!isAiMode && (
            <aside className="panel panelLeft">
              <div className="panelInner panelInnerLeft">
                {menuContent}
              </div>
            </aside>
          )}

          <main className="panel panelMain">
            <div key={activeTool?.id} className={`panelInner page-transition${isAiMode ? ' aiPanelInner' : ''}`}>
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
