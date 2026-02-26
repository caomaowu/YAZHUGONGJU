import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Button, message } from 'antd';
import { useBailian } from '../hooks/useBailian';

interface BailianConfigModalProps {
  visible: boolean;
  onClose: () => void;
  config: any;
  onSave: (config: any) => void;
}

export const BailianConfigModal: React.FC<BailianConfigModalProps> = ({ visible, onClose, config, onSave }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && config) {
      form.setFieldsValue(config);
    }
  }, [visible, config, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      await onSave(values);
      setLoading(false);
      onClose();
    } catch (error) {
      console.error('Validate Failed:', error);
      setLoading(false);
    }
  };

  return (
    <Modal
      title="阿里云百炼配置"
      open={visible}
      onOk={handleOk}
      onCancel={onClose}
      confirmLoading={loading}
      width={600}
    >
      <Form
        form={form}
        layout="vertical"
        name="bailian_config"
        initialValues={config}
      >
        <Form.Item
          name="accessKeyId"
          label="AccessKey ID"
          rules={[{ required: true, message: '请输入 AccessKey ID' }]}
          help="阿里云 RAM 用户 AccessKey，通常以 LTAI 开头"
        >
          <Input placeholder="LTAI..." />
        </Form.Item>

        <Form.Item
          name="accessKeySecret"
          label="AccessKey Secret"
          rules={[{ required: true, message: '请输入 AccessKey Secret' }]}
        >
          <Input.Password placeholder="******" />
        </Form.Item>

        <Form.Item
          name="workspaceId"
          label="Workspace ID (业务空间 ID)"
          rules={[{ required: true, message: '请输入 Workspace ID' }]}
          help="可以在阿里云百炼控制台查看业务空间 ID"
        >
          <Input placeholder="ws-..." />
        </Form.Item>
        
        <Form.Item
          name="appId"
          label="App ID (应用 ID - 用于百炼大模型)"
          help="如果您想使用百炼的智能体对话，请填此项"
        >
          <Input placeholder="app-..." />
        </Form.Item>

        <Form.Item
            name="knowledgeBaseId"
            label="Knowledge Base ID (知识库索引 ID - 用于第三方模型)"
            help="如果您想使用自己的模型(DeepSeek/OpenAI) + 百炼知识库，请填此项 (idx-...)"
        >
            <Input placeholder="idx-..." />
        </Form.Item>

        <Form.Item
          name="apiKey"
          label="API-KEY (用于对话)"
          help="如果您使用百炼模型对话，请填此项 (sk-...)"
        >
          <Input.Password placeholder="sk-..." />
        </Form.Item>
      </Form>
    </Modal>
  );
};
