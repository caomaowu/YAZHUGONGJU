import React, { useState } from 'react';
import { Form, Input, InputNumber, Select, Button, Space, Divider, Row, Col, Upload, message, Typography } from 'antd';
import { UploadOutlined, SaveOutlined, CloseOutlined } from '@ant-design/icons';
import type { DieCastingMachine } from '../../types/machine';

const { Title } = Typography;

interface MachineEditFormProps {
  initialValues: DieCastingMachine;
  onSave: (values: DieCastingMachine) => void;
  onCancel: () => void;
}

export const MachineEditForm: React.FC<MachineEditFormProps> = ({ initialValues, onSave, onCancel }) => {
  const [form] = Form.useForm();
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>(initialValues.avatar);

  // Initialize form values
  const getInitialValues = () => ({
    ...initialValues,
    specs: {
      ...initialValues.specs,
      tieBarSpacingH: initialValues.specs.tieBarSpacing[0],
      tieBarSpacingV: initialValues.specs.tieBarSpacing[1],
    }
  });

  const handleFinish = (values: any) => {
    // Reconstruct the machine object
    const updatedMachine: DieCastingMachine = {
      ...initialValues,
      ...values,
      specs: {
        clampingForce: values.specs.clampingForce,
        dieHeightMin: values.specs.dieHeightMin,
        dieHeightMax: values.specs.dieHeightMax,
        ejectionStroke: values.specs.ejectionStroke,
        injectionRate: values.specs.injectionRate,
        tieBarSpacing: [values.specs.tieBarSpacingH, values.specs.tieBarSpacingV],
      }
    };
    onSave(updatedMachine);
  };

  const handleAvatarUpload = (info: any) => {
    // Handle manual upload without auto-post
    const file = info.file;
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const url = e.target?.result as string;
        form.setFieldValue('avatar', url);
        setAvatarPreview(url);
        message.success('图片已读取');
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div style={{ padding: '0 24px 24px' }}>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        initialValues={getInitialValues()}
      >
        <Divider orientation="left">基本信息</Divider>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="name" label="设备名称" rules={[{ required: true }]}>
              <Input placeholder="例如：1# 压铸机" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="brand" label="品牌" rules={[{ required: true }]}>
              <Input placeholder="例如：力劲 (LK)" />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="model" label="型号" rules={[{ required: true }]}>
              <Input placeholder="例如：DCC300" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="tonnage" label="吨位 (T)" rules={[{ required: true }]}>
              <InputNumber style={{ width: '100%' }} min={0} />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="location" label="所属车间">
              <Select>
                <Select.Option value="一车间">一车间</Select.Option>
                <Select.Option value="二车间">二车间</Select.Option>
                <Select.Option value="新厂区">新厂区</Select.Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="status" label="状态">
              <Select>
                <Select.Option value="running">运行中</Select.Option>
                <Select.Option value="idle">待机</Select.Option>
                <Select.Option value="maintenance">维护中</Select.Option>
                <Select.Option value="offline">离线</Select.Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item label="设备图片">
           <Space direction="vertical" style={{ width: '100%' }}>
             {avatarPreview && (
                <div style={{ marginBottom: 8, borderRadius: 8, overflow: 'hidden', width: '100%', height: 160, border: '1px solid #f0f0f0' }}>
                   <img src={avatarPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
             )}
             <Form.Item name="avatar" noStyle>
               <Input placeholder="输入图片 URL 或上传本地图片" onChange={e => setAvatarPreview(e.target.value)} />
             </Form.Item>
             <Upload 
                accept="image/*" 
                showUploadList={false}
                beforeUpload={() => false} // Prevent auto upload
                onChange={handleAvatarUpload}
             >
                <Button icon={<UploadOutlined />}>选择本地图片</Button>
             </Upload>
           </Space>
        </Form.Item>

        <Divider orientation="left">工艺参数</Divider>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name={['specs', 'clampingForce']} label="锁模力 (kN)" rules={[{ required: true }]}>
              <InputNumber style={{ width: '100%' }} min={0} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name={['specs', 'injectionRate']} label="最大射出速度 (m/s)">
              <InputNumber style={{ width: '100%' }} min={0} step={0.1} />
            </Form.Item>
          </Col>
        </Row>
        
        <Row gutter={16}>
           <Col span={12}>
              <Form.Item name={['specs', 'tieBarSpacingH']} label="哥林柱间距 H (mm)" rules={[{ required: true }]}>
                 <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
           </Col>
           <Col span={12}>
              <Form.Item name={['specs', 'tieBarSpacingV']} label="哥林柱间距 V (mm)" rules={[{ required: true }]}>
                 <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
           </Col>
        </Row>

        <Row gutter={16}>
           <Col span={12}>
              <Form.Item name={['specs', 'dieHeightMin']} label="最小模厚 (mm)" rules={[{ required: true }]}>
                 <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
           </Col>
           <Col span={12}>
              <Form.Item name={['specs', 'dieHeightMax']} label="最大模厚 (mm)" rules={[{ required: true }]}>
                 <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
           </Col>
        </Row>

        <Form.Item name={['specs', 'ejectionStroke']} label="顶出行程 (mm)" rules={[{ required: true }]}>
          <InputNumber style={{ width: '100%' }} min={0} />
        </Form.Item>

        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          <Button type="primary" htmlType="submit" icon={<SaveOutlined />} block size="large">
            保存修改
          </Button>
          <Button onClick={onCancel} icon={<CloseOutlined />} block size="large">
            取消
          </Button>
        </div>
      </Form>
    </div>
  );
};
