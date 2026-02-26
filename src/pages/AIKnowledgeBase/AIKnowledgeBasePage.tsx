
import React, { useState } from 'react'
import { Layout, Button, Tooltip, theme, Switch, Space } from 'antd'
import { SettingOutlined, MenuFoldOutlined, MenuUnfoldOutlined, CloudServerOutlined, FileTextOutlined } from '@ant-design/icons'
import { ChatSidebar } from './components/ChatSidebar'
import { ChatArea } from './components/ChatArea'
import { SettingsModal } from './components/SettingsModal'
import { BailianConfigModal } from './components/BailianConfigModal'
import { KnowledgeBaseDrawer } from './components/KnowledgeBaseDrawer'
import { useAIChat } from './hooks/useAIChat'
import { useBailian } from './hooks/useBailian'

const { Sider, Content } = Layout

export const AIKnowledgeBasePage: React.FC = () => {
  const { token } = theme.useToken()
  const {
    sessions,
    currentSessionId,
    setCurrentSessionId,
    settings,
    updateSettings,
    createNewSession,
    deleteSession,
    sendMessage,
    loading,
    stopGeneration,
    clearHistory
  } = useAIChat()

  const {
    config: bailianConfig,
    files: bailianFiles,
    loadingFiles,
    uploading,
    saveConfig: saveBailianConfig,
    fetchFiles,
    uploadFile
  } = useBailian()

  const [settingsVisible, setSettingsVisible] = useState(false)
  const [bailianConfigVisible, setBailianConfigVisible] = useState(false)
  const [kbDrawerVisible, setKbDrawerVisible] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [useRAG, setUseRAG] = useState(false)

  const currentSession = sessions.find(s => s.id === currentSessionId)
  const messages = currentSession ? currentSession.messages : []

  const handleSendMessage = (content: string) => {
    sendMessage(content, { useBailian: useRAG })
  }

  return (
    <Layout style={{ height: 'calc(100vh - 64px)', background: token.colorBgLayout, overflow: 'hidden' }}>
      <Sider
        width={260}
        theme="light"
        collapsed={sidebarCollapsed}
        collapsedWidth={0}
        trigger={null}
        style={{
          borderRight: `1px solid ${token.colorBorder}`,
          height: '100%',
          position: 'relative'
        }}
      >
        <ChatSidebar
          sessions={sessions}
          currentSessionId={currentSessionId}
          onSelectSession={setCurrentSessionId}
          onNewChat={createNewSession}
          onDeleteSession={deleteSession}
          onClearHistory={clearHistory}
          footer={
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}>
              {!sidebarCollapsed && (
                 <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 8px', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: token.colorTextSecondary }}>知识库模式</span>
                    <Switch size="small" checked={useRAG} onChange={setUseRAG} />
                 </div>
              )}
              
              <Button 
                block={!sidebarCollapsed}
                type={useRAG ? "primary" : "text"}
                icon={<CloudServerOutlined />} 
                onClick={() => setBailianConfigVisible(true)}
                style={{ textAlign: 'left', justifyContent: sidebarCollapsed ? 'center' : 'flex-start' }}
              >
                {!sidebarCollapsed && "百炼配置"}
              </Button>

              <Button 
                block={!sidebarCollapsed}
                type="text" 
                icon={<FileTextOutlined />} 
                onClick={() => {
                    setKbDrawerVisible(true);
                    fetchFiles();
                }}
                style={{ textAlign: 'left', justifyContent: sidebarCollapsed ? 'center' : 'flex-start' }}
              >
                 {!sidebarCollapsed && "知识库文件"}
              </Button>

               <Button 
                block={!sidebarCollapsed}
                type="text" 
                icon={<SettingOutlined />} 
                onClick={() => setSettingsVisible(true)}
                style={{ textAlign: 'left', justifyContent: sidebarCollapsed ? 'center' : 'flex-start', color: token.colorTextSecondary }}
              >
                 {!sidebarCollapsed && "通用设置"}
              </Button>
            </div>
          }
        />
      </Sider>

      <Layout style={{ position: 'relative', height: '100%' }}>
        {/* Toggle Sidebar Button */}
        <div style={{
          position: 'absolute',
          top: 16,
          left: 16,
          zIndex: 100
        }}>
          <Button
            type="text"
            icon={sidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            style={{ color: token.colorTextSecondary }}
          />
        </div>

        <Content style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <ChatArea
            messages={messages}
            loading={loading}
            onSendMessage={handleSendMessage}
            onStopGeneration={stopGeneration}
          />
        </Content>
      </Layout>

      <SettingsModal
        visible={settingsVisible}
        settings={settings}
        onClose={() => setSettingsVisible(false)}
        onSave={updateSettings}
      />
      
      <BailianConfigModal
        visible={bailianConfigVisible}
        config={bailianConfig}
        onClose={() => setBailianConfigVisible(false)}
        onSave={saveBailianConfig}
      />

      <KnowledgeBaseDrawer
        visible={kbDrawerVisible}
        onClose={() => setKbDrawerVisible(false)}
        files={bailianFiles}
        loading={loadingFiles || uploading}
        onUpload={uploadFile}
        onRefresh={fetchFiles}
      />
    </Layout>
  )
}

