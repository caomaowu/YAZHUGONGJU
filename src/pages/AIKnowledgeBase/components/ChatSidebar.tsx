
import React from 'react'
import { Button, List, Typography, Space, Tooltip, theme } from 'antd'
import { PlusOutlined, DeleteOutlined, MessageOutlined, ClearOutlined } from '@ant-design/icons'
import type { ChatSession } from '../types'

interface ChatSidebarProps {
  sessions: ChatSession[]
  currentSessionId: string | null
  onSelectSession: (id: string) => void
  onNewChat: () => void
  onDeleteSession: (id: string) => void
  onClearHistory: () => void
  footer?: React.ReactNode
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  sessions,
  currentSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  onClearHistory,
  footer,
}) => {
  const { token } = theme.useToken()

  return (
    <div style={{
      width: 260,
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      borderRight: `1px solid ${token.colorBorder}`,
      backgroundColor: token.colorBgContainer,
      padding: '16px 0',
    }}>
      <div style={{ padding: '0 16px 16px' }}>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          block 
          onClick={onNewChat}
          style={{ 
            height: 44, 
            borderRadius: 8,
            fontSize: 15,
            fontWeight: 500,
            boxShadow: '0 2px 8px rgba(139, 92, 246, 0.2)'
          }}
        >
          开启新对话
        </Button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px' }}>
        <Typography.Text type="secondary" style={{ fontSize: 12, padding: '0 12px', marginBottom: 8, display: 'block' }}>
          历史记录
        </Typography.Text>
        <List
          dataSource={sessions}
          renderItem={(item) => (
            <List.Item
              onClick={() => onSelectSession(item.id)}
              style={{
                padding: '10px 12px',
                cursor: 'pointer',
                borderRadius: 8,
                backgroundColor: item.id === currentSessionId ? token.colorFillTertiary : 'transparent',
                transition: 'all 0.2s',
                marginBottom: 4,
                border: 'none',
                position: 'relative',
              }}
              className="chat-session-item"
            >
              <div style={{ display: 'flex', alignItems: 'center', width: '100%', overflow: 'hidden' }}>
                <MessageOutlined style={{ marginRight: 8, color: token.colorTextSecondary, fontSize: 14 }} />
                <Typography.Text 
                  ellipsis 
                  style={{ 
                    flex: 1, 
                    color: item.id === currentSessionId ? token.colorPrimary : token.colorText,
                    fontWeight: item.id === currentSessionId ? 500 : 400
                  }}
                >
                  {item.title || '新对话'}
                </Typography.Text>
                
                <div 
                  className="delete-btn"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDeleteSession(item.id)
                  }}
                  style={{
                    marginLeft: 8,
                    opacity: 0,
                    transition: 'opacity 0.2s',
                    color: token.colorTextQuaternary,
                  }}
                >
                  <DeleteOutlined />
                </div>
              </div>
            </List.Item>
          )}
        />
        {sessions.length === 0 && (
          <div style={{ textAlign: 'center', marginTop: 40, color: token.colorTextQuaternary }}>
            <MessageOutlined style={{ fontSize: 24, marginBottom: 8 }} />
            <div>暂无历史记录</div>
          </div>
        )}
      </div>

      <div style={{ padding: '16px 16px 0', borderTop: `1px solid ${token.colorBorder}` }}>
        <Button 
          type="text" 
          danger 
          icon={<ClearOutlined />} 
          block 
          onClick={onClearHistory}
          disabled={sessions.length === 0}
        >
          清空记录
        </Button>
      </div>

      {footer && (
        <div style={{ padding: '8px 16px 0' }}>
          {footer}
        </div>
      )}

      <style>{`
        .chat-session-item:hover {
          background-color: ${token.colorFillQuaternary} !important;
        }
        .chat-session-item:hover .delete-btn {
          opacity: 1 !important;
        }
        .delete-btn:hover {
          color: ${token.colorError} !important;
        }
      `}</style>
    </div>
  )
}
