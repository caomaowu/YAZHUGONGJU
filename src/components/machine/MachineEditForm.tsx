import React, { useState, useRef } from 'react';
import { Form, Input, InputNumber, Select, Button, Space, Divider, Row, Col, Upload, message } from 'antd';
import { UploadOutlined, SaveOutlined } from '@ant-design/icons';
import type { UploadChangeParam, UploadFile } from 'antd/es/upload/interface';
import type { DieCastingMachine, MachineModelSpecs } from '../../types/machine';

interface MachineEditFormProps {
  initialValues: DieCastingMachine;
  onSave: (values: DieCastingMachine) => void;
  onCancel: () => void;
  locations?: string[];
  machineModels?: MachineModelSpecs[];
}

type MachineFormValues = Omit<DieCastingMachine, 'specs' | 'rawSpecs'> & {
  specs: {
    clampingForce: number;
    dieHeightMin: number;
    dieHeightMax: number;
    ejectionStroke: number;
    injectionRate?: number;
    tieBarSpacingH: number;
    tieBarSpacingV: number;
  };
  rawSpecs?: MachineModelSpecs;
};

export const MachineEditForm: React.FC<MachineEditFormProps> = ({ initialValues, onSave, onCancel, locations = [], machineModels = [] }) => {
  const [form] = Form.useForm();
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>(initialValues.avatar);
  const baseRawSpecsRef = useRef<MachineModelSpecs | undefined>(initialValues.rawSpecs);

  const handleModelSelect = (modelName: string) => {
    const originalModel = machineModels.find((m) => m["型号"] === modelName);
    if (originalModel) {
      // Deep clone to ensure we don't modify the source template
      const selectedModel = JSON.parse(JSON.stringify(originalModel));
      
      // Update base raw specs to the new model
      baseRawSpecsRef.current = selectedModel;
      
      // Parse tie bar spacing from "740x740" format
      let tieBarH = 0;
      let tieBarV = 0;
      // Use 容模尺寸_mm (Mold accommodation size) as tie bar spacing approximation if not explicit
      // Or try to find explicit mapping. The JSON has "模板尺寸_mm" and "容模尺寸_mm"
      // Usually "容模尺寸" (Mold Space) is the space between tie bars.
      if (selectedModel["容模尺寸_mm"]) {
        const dims = selectedModel["容模尺寸_mm"].split(/×|x/);
        if (dims.length === 2) {
          tieBarH = parseFloat(dims[0]);
          tieBarV = parseFloat(dims[1]);
        }
      }

      form.setFieldsValue({
        model: selectedModel["型号"],
        tonnage: selectedModel["锁模力_KN"] ? Math.round(selectedModel["锁模力_KN"] / 10) : 0, // Approx conversion KN -> Ton
        specs: {
          clampingForce: selectedModel["锁模力_KN"],
          tieBarSpacingH: tieBarH,
          tieBarSpacingV: tieBarV,
          dieHeightMin: selectedModel["模具厚度_mm"]?.["最小"] || 0,
          dieHeightMax: selectedModel["模具厚度_mm"]?.["最大"] || 0,
          ejectionStroke: selectedModel["顶出行程_mm"] || 0,
          // Injection rate logic might be complex as it's an array in JSON. 
          // We can pick the max from the array or leave empty.
          injectionRate: undefined 
        },
        rawSpecs: selectedModel
      });
      message.success(`已加载 ${modelName} 的参数模板`);
    }
  };

  // Initialize form values
  const getInitialValues = () => ({
    ...initialValues,
    specs: {
      ...initialValues.specs,
      tieBarSpacingH: initialValues.specs.tieBarSpacing[0],
      tieBarSpacingV: initialValues.specs.tieBarSpacing[1],
    }
  });

  const handleFinish = (values: MachineFormValues) => {
    // Merge base raw specs (either initial or from selected model) with form values
    const mergedRawSpecs: MachineModelSpecs | undefined =
      baseRawSpecsRef.current || values.rawSpecs
        ? ({
            ...(baseRawSpecsRef.current ?? {}),
            ...(values.rawSpecs ?? {})
          } as MachineModelSpecs)
        : undefined;

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
      },
      rawSpecs: mergedRawSpecs
    };
    onSave(updatedMachine);
  };

  const handleAvatarUpload = (info: UploadChangeParam<UploadFile>) => {
    // Handle manual upload without auto-post
    const file = info.file.originFileObj;
    if (file instanceof File) {
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
        <Divider>基本信息</Divider>
        <Form.Item label="快速选择型号模板">
          <Select 
            placeholder="从数据库选择标准型号以自动填充参数" 
            onChange={handleModelSelect}
            showSearch
            optionFilterProp="children"
          >
            {machineModels.map((m) => (
              <Select.Option key={m["型号"]} value={m["型号"]}>
                {m["型号"]} ({Math.round(m["锁模力_KN"]/10)}T)
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

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
                {locations && locations.length > 0 ? (
                  locations.map(loc => (
                    <Select.Option key={loc} value={loc}>{loc}</Select.Option>
                  ))
                ) : (
                  <>
                    <Select.Option value="一车间">一车间</Select.Option>
                    <Select.Option value="二车间">二车间</Select.Option>
                    <Select.Option value="新厂区">新厂区</Select.Option>
                  </>
                )}
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

        <Divider>工艺参数</Divider>
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

        <Form.Item name="rawSpecs" hidden>
          <Input />
        </Form.Item>

        <Divider>详细规格参数 (可覆写)</Divider>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name={['rawSpecs', '模具厚度_mm', '最小']} label="最小模厚 (mm)">
              <InputNumber style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name={['rawSpecs', '模具厚度_mm', '最大']} label="最大模厚 (mm)">
              <InputNumber style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name={['rawSpecs', '模板尺寸_mm']} label="模板尺寸 (mm)">
              <Input />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name={['rawSpecs', '容模尺寸_mm']} label="容模尺寸 (mm)">
              <Input />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name={['rawSpecs', '最大铸造面积_40MPa_cm2']} label="最大铸造面积 (cm²)">
              <InputNumber style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name={['rawSpecs', '压射位置_mm']} label="压射位置 (mm)">
              <Input />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name={['rawSpecs', '冲头行程_mm']} label="冲头行程 (mm)">
              <InputNumber style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name={['rawSpecs', '顶出力_KN']} label="顶出力 (KN)">
              <InputNumber style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name={['rawSpecs', '压室法兰直径_mm']} label="压室法兰直径 (mm)">
              <InputNumber style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name={['rawSpecs', '法兰高度_mm']} label="法兰高度 (mm)">
              <InputNumber style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name={['rawSpecs', '顶出行程_mm']} label="顶出行程 (mm)">
              <InputNumber style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item>
          <Space style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button onClick={onCancel}>取消</Button>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>
              保存更改
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </div>
  );
};
