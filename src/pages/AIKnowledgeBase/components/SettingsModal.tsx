
import React, { useEffect, useState } from 'react'
import { Modal, Form, Input, Select, Slider, Typography, Divider, message, Button, Space, Card, Row, Col, Popconfirm } from 'antd'
import { PlusOutlined, DeleteOutlined, EditOutlined, SaveOutlined, CloseOutlined } from '@ant-design/icons'
import type { AISettings, AIProviderConfig } from '../types'

const { Text, Title } = Typography

interface SettingsModalProps {
  visible: boolean
  settings: AISettings
  onClose: () => void
  onSave: (settings: AISettings) => void
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  visible,
  settings,
  onClose,
  onSave,
}) => {
  const [form] = Form.useForm()
  const [localSettings, setLocalSettings] = useState<AISettings>(settings)
  const [editingProviderId, setEditingProviderId] = useState<string | null>(null)
  const [newProviderName, setNewProviderName] = useState('')

  useEffect(() => {
    if (visible) {
      // Deep copy settings to local state to avoid mutating props directly
      setLocalSettings(JSON.parse(JSON.stringify(settings)))
    }
  }, [visible, settings])

  // Sync form with current provider data whenever currentProviderId changes
  useEffect(() => {
    if (visible && localSettings.currentProviderId) {
      const currentConfig = localSettings.providers[localSettings.currentProviderId]
      if (currentConfig) {
        form.setFieldsValue(currentConfig)
      }
    }
  }, [localSettings.currentProviderId, visible, form, localSettings.providers])

  const handleProviderChange = (providerId: string) => {
    // Before switching, save current form values to local state
    form.validateFields().then(values => {
      setLocalSettings(prev => ({
        ...prev,
        providers: {
          ...prev.providers,
          [prev.currentProviderId]: {
            ...prev.providers[prev.currentProviderId],
            ...values
          }
        },
        currentProviderId: providerId
      }))
    }).catch(() => {
      // If validation fails, force switch anyway (user might be fixing another provider)
      // Or we could block switching. Let's block switching if current is invalid but that's annoying.
      // Better: Just switch ID, the useEffect will load new values. 
      // BUT we lose unsaved changes if we don't save.
      // Let's try to save what we can, ignoring errors for now.
      const values = form.getFieldsValue()
      setLocalSettings(prev => ({
        ...prev,
        providers: {
          ...prev.providers,
          [prev.currentProviderId]: {
            ...prev.providers[prev.currentProviderId],
            ...values
          }
        },
        currentProviderId: providerId
      }))
    })
  }

  const handleAddProvider = () => {
    const id = `custom-${Date.now()}`
    const newProvider: AIProviderConfig = {
      id,
      name: '自定义供应商',
      apiKey: '',
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-3.5-turbo',
      temperature: 0.7,
      isCustom: true
    }
    
    setLocalSettings(prev => ({
      ...prev,
      providers: {
        ...prev.providers,
        [id]: newProvider
      },
      currentProviderId: id
    }))
    setEditingProviderId(id)
    setNewProviderName('自定义供应商')
  }

  const handleDeleteProvider = (id: string) => {
    if (localSettings.currentProviderId === id) {
      // If deleting current, switch to deepseek or first available
      const otherIds = Object.keys(localSettings.providers).filter(k => k !== id)
      const nextId = otherIds.includes('deepseek') ? 'deepseek' : otherIds[0]
      
      const newProviders = { ...localSettings.providers }
      delete newProviders[id]
      
      setLocalSettings({
        currentProviderId: nextId,
        providers: newProviders
      })
    } else {
      const newProviders = { ...localSettings.providers }
      delete newProviders[id]
      setLocalSettings(prev => ({
        ...prev,
        providers: newProviders
      }))
    }
  }

  const handleRenameProvider = (id: string) => {
    setEditingProviderId(id)
    setNewProviderName(localSettings.providers[id].name)
  }

  const saveProviderName = (id: string) => {
    if (newProviderName.trim()) {
      setLocalSettings(prev => ({
        ...prev,
        providers: {
          ...prev.providers,
          [id]: {
            ...prev.providers[id],
            name: newProviderName.trim()
          }
        }
      }))
    }
    setEditingProviderId(null)
  }

  const handleOk = async () => {
    try {
      // Validate current form
      const values = await form.validateFields()
      
      // Update local state with latest form values
      const finalSettings: AISettings = {
        ...localSettings,
        providers: {
          ...localSettings.providers,
          [localSettings.currentProviderId]: {
            ...localSettings.providers[localSettings.currentProviderId],
            ...values
          }
        }
      }
      
      onSave(finalSettings)
      message.success('设置已保存')
      onClose()
    } catch (error) {
      // Validation failed
    }
  }

  return (
    <Modal
      title="AI 设置"
      open={visible}
      onOk={handleOk}
      onCancel={onClose}
      width={700}
      okText="保存全部"
      cancelText="取消"
      bodyStyle={{ padding: 0 }}
    >
      <div style={{ display: 'flex', height: 450 }}>
        {/* Left Sidebar: Provider List */}
        <div style={{ 
          width: 220, 
          borderRight: '1px solid #f0f0f0', 
          display: 'flex', 
          flexDirection: 'column',
          backgroundColor: '#fafafa'
        }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text strong>供应商列表</Text>
            <Button type="text" size="small" icon={<PlusOutlined />} onClick={handleAddProvider} />
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
            {Object.values(localSettings.providers).map(provider => (
              <div
                key={provider.id}
                onClick={() => handleProviderChange(provider.id)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  backgroundColor: localSettings.currentProviderId === provider.id ? '#e6f7ff' : 'transparent',
                  color: localSettings.currentProviderId === provider.id ? '#1890ff' : 'inherit',
                  marginBottom: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  border: localSettings.currentProviderId === provider.id ? '1px solid #91caff' : '1px solid transparent'
                }}
              >
                {editingProviderId === provider.id ? (
                  <div style={{ display: 'flex', alignItems: 'center', width: '100%' }} onClick={e => e.stopPropagation()}>
                    <Input 
                      size="small" 
                      value={newProviderName} 
                      onChange={e => setNewProviderName(e.target.value)}
                      onPressEnter={() => saveProviderName(provider.id)}
                      autoFocus
                    />
                    <Button 
                      size="small" 
                      type="text" 
                      icon={<SaveOutlined />} 
                      style={{ marginLeft: 4, color: '#52c41a' }}
                      onClick={() => saveProviderName(provider.id)} 
                    />
                  </div>
                ) : (
                  <>
                    <Text ellipsis style={{ flex: 1, color: 'inherit' }}>{provider.name}</Text>
                    {provider.isCustom && localSettings.currentProviderId === provider.id && (
                      <Space size={2} onClick={e => e.stopPropagation()}>
                        <Button 
                          size="small" 
                          type="text" 
                          icon={<EditOutlined />} 
                          style={{ fontSize: 12 }}
                          onClick={() => handleRenameProvider(provider.id)}
                        />
                        <Popconfirm
                          title="确定删除此供应商配置吗？"
                          onConfirm={() => handleDeleteProvider(provider.id)}
                          okText="是"
                          cancelText="否"
                        >
                          <Button 
                            size="small" 
                            type="text" 
                            danger 
                            icon={<DeleteOutlined />} 
                            style={{ fontSize: 12 }} 
                          />
                        </Popconfirm>
                      </Space>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right Content: Config Form */}
        <div style={{ flex: 1, padding: 24, overflowY: 'auto' }}>
          <Title level={5} style={{ marginBottom: 24 }}>
            {localSettings.providers[localSettings.currentProviderId]?.name} 配置
          </Title>
          
          <Form
            form={form}
            layout="vertical"
          >
            <Form.Item
              label="API Key"
              name="apiKey"
              rules={[{ required: true, message: '请输入 API Key' }]}
              tooltip="您的 Key 仅存储在本地浏览器中，不会上传到服务器"
            >
              <Input.Password placeholder="sk-..." />
            </Form.Item>

            <Form.Item
              label="Base URL"
              name="baseUrl"
              rules={[{ required: true, message: '请输入 Base URL' }]}
              extra="例如：http://localhost:11434/v1 或 https://api.openai.com/v1 (请确保以 /v1 结尾)"
            >
              <Input placeholder="https://api.example.com/v1" />
            </Form.Item>

            <Form.Item
              label="模型名称"
              name="model"
              rules={[{ required: true, message: '请输入模型名称' }]}
            >
              <Input placeholder="gpt-4, deepseek-chat, etc." />
            </Form.Item>

            <Divider />

            <Form.Item
              label="温度 (Temperature)"
              name="temperature"
              tooltip="较高的值会使输出更随机，较低的值会使其更集中和确定"
            >
              <Slider
                min={0}
                max={2}
                step={0.1}
                marks={{ 0: '精确', 0.7: '平衡', 1.5: '创意' }}
              />
            </Form.Item>
          </Form>
        </div>
      </div>
    </Modal>
  )
}
