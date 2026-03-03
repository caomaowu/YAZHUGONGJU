import React, { useState, useMemo } from 'react';
import { Modal, Input, List, Button, Tag, Typography, Empty, Card, Row, Col, InputNumber, Divider, Form, Tooltip, Select } from 'antd';
import { SearchOutlined, CheckCircleFilled, InfoCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import type { MachineModelSpecs } from '../../types/machine';

const { Text, Title } = Typography;

interface AddMachineModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (machines: { model: string; name: string }[]) => void;
  machineModels: MachineModelSpecs[];
}

export const AddMachineModal: React.FC<AddMachineModalProps> = ({
  open,
  onClose,
  onCreate,
  machineModels,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<string>('全部');
  
  // Extract unique brands
  const brands = useMemo(() => {
    const brandSet = new Set(machineModels.map(m => m.brand || '力劲 (LK)'));
    return ['全部', ...Array.from(brandSet)];
  }, [machineModels]);
  
  // Batch Config State
  const [count, setCount] = useState<number>(1);
  const [namingConfig, setNamingConfig] = useState({
    prefix: '',
    start: 1,
    padding: 2, // e.g. 01, 02
    suffix: '#',
  });
  const [generatedNames, setGeneratedNames] = useState<string[]>([]);

  const handleSelectModel = (model: string | null) => {
    setSelectedModel(model);
    if (model) {
      setCount(1);
      setNamingConfig({
        prefix: `${model}-`,
        start: 1,
        padding: 0,
        suffix: '#',
      });
      setGeneratedNames([`${model} - 新设备`]);
      return;
    }
    setCount(1);
    setGeneratedNames([]);
  };

  // Handle count change
  const handleCountChange = (value: number | null) => {
    const newCount = value || 1;
    setCount(newCount);
    
    // Regenerate names based on current config but preserve manual edits if count increases?
    // For simplicity, we regenerate the new entries or truncate
    setGeneratedNames(prev => {
      const newNames = [...prev];
      if (newCount > prev.length) {
        // Append new names based on pattern
        for (let i = prev.length; i < newCount; i++) {
          const num = namingConfig.start + i;
          const numStr = String(num).padStart(namingConfig.padding, '0');
          newNames.push(`${namingConfig.prefix}${numStr}${namingConfig.suffix}`);
        }
      } else {
        // Truncate
        newNames.length = newCount;
      }
      return newNames;
    });
  };

  // Apply naming pattern to all
  const applyNamingPattern = () => {
    const newNames =Array.from({ length: count }).map((_, i) => {
      const num = namingConfig.start + i;
      const numStr = String(num).padStart(namingConfig.padding, '0');
      return `${namingConfig.prefix}${numStr}${namingConfig.suffix}`;
    });
    setGeneratedNames(newNames);
  };

  const filteredModels = useMemo(() => {
    return machineModels.filter(m => {
      const matchQuery = !searchQuery || m["型号"].toLowerCase().includes(searchQuery.toLowerCase());
      const matchBrand = selectedBrand === '全部' || (m.brand || '力劲 (LK)') === selectedBrand;
      return matchQuery && matchBrand;
    });
  }, [machineModels, searchQuery, selectedBrand]);

  const handleCreate = () => {
    if (selectedModel && generatedNames.length > 0) {
      const machines = generatedNames.map(name => ({
        model: selectedModel,
        name: name,
      }));
      onCreate(machines);
      // Reset state
      handleSelectModel(null);
      setSearchQuery('');
    }
  };

  return (
    <Modal
      title={<Title level={3} style={{ margin: 0 }}>选择设备型号</Title>}
      open={open}
      onCancel={onClose}
      width={1000}
      centered
      footer={[
        <Button key="cancel" size="large" onClick={onClose}>
          取消
        </Button>,
        <Button 
          key="create" 
          type="primary" 
          size="large" 
          disabled={!selectedModel || generatedNames.length === 0} 
          onClick={handleCreate}
        >
          确认创建 {count > 1 ? `(${count})` : ''}
        </Button>
      ]}
    >
      <Row gutter={24} style={{ height: 500 }}>
        {/* Left Column: Model Selection */}
        <Col span={15} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ marginBottom: 16, display: 'flex', gap: 16 }}>
            <Select
              style={{ width: 150 }}
              placeholder="品牌筛选"
              value={selectedBrand}
              onChange={setSelectedBrand}
            >
              {brands.map(brand => (
                <Select.Option key={brand} value={brand}>{brand}</Select.Option>
              ))}
            </Select>
            <Input 
              style={{ flex: 1 }}
              size="large" 
              prefix={<SearchOutlined />} 
              placeholder="搜索型号，如 DCC300..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <div style={{ flex: 1, overflowY: 'auto', paddingRight: 8 }}>
            {filteredModels.length > 0 ? (
              <List
                grid={{ gutter: 16, column: 2 }}
                dataSource={filteredModels}
                renderItem={item => {
                  const isSelected = selectedModel === item["型号"];
                  return (
                    <List.Item style={{ marginBottom: 16 }}>
                      <Card 
                        hoverable 
                        style={{ 
                          borderColor: isSelected ? '#722ED1' : undefined,
                          background: isSelected ? '#F9F0FF' : undefined,
                          cursor: 'pointer',
                          transition: 'all 0.3s'
                        }}
                        bodyStyle={{ padding: 16 }}
                        onClick={() => handleSelectModel(item["型号"])}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <Text strong style={{ fontSize: 16 }}>{item["型号"]}</Text>
                          {isSelected && <CheckCircleFilled style={{ color: '#722ED1', fontSize: 18 }} />}
                        </div>
                        <div style={{ marginTop: 8 }}>
                           <Tag color="purple">{Math.round(item["锁模力_KN"] / 10)}T</Tag>
                           <Tag color="blue">{item.brand || '力劲 (LK)'}</Tag>
                        </div>
                        <div style={{ marginTop: 12, fontSize: 12, color: '#666' }}>
                           <div>锁模力: {item["锁模力_KN"]} kN</div>
                           <div>容模: {item["容模尺寸_mm"] || item["模板尺寸_mm"]}</div>
                        </div>
                      </Card>
                    </List.Item>
                  );
                }}
              />
            ) : (
              <Empty description="未找到匹配的型号" />
            )}
          </div>
        </Col>

        {/* Right Column: Configuration */}
        <Col span={9} style={{ height: '100%', borderLeft: '1px solid #f0f0f0', paddingLeft: 24, display: 'flex', flexDirection: 'column' }}>
          {!selectedModel ? (
             <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#999' }}>
               <InfoCircleOutlined style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }} />
               <Text type="secondary">请先在左侧选择一个设备型号</Text>
             </div>
          ) : (
             <>
               <Title level={5} style={{ marginTop: 0, marginBottom: 16 }}>批量设置</Title>
               
               <Form layout="vertical" size="small">
                 <Form.Item label="生成数量">
                   <InputNumber 
                     min={1} 
                     max={50} 
                     value={count} 
                     onChange={handleCountChange} 
                     style={{ width: '100%' }} 
                   />
                 </Form.Item>
                 
                 <Divider style={{ margin: '12px 0' }} dashed />
                 
                 <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text strong>命名规则</Text>
                    <Tooltip title="应用规则将覆盖手动修改的名称">
                      <Button type="link" size="small" icon={<ReloadOutlined />} onClick={applyNamingPattern}>
                        生成预览
                      </Button>
                    </Tooltip>
                 </div>
                 
                 <Row gutter={8}>
                   <Col span={12}>
                     <Form.Item label="前缀" style={{ marginBottom: 8 }}>
                       <Input 
                         value={namingConfig.prefix} 
                         onChange={e => setNamingConfig({...namingConfig, prefix: e.target.value})} 
                         placeholder="如 DCC-"
                       />
                     </Form.Item>
                   </Col>
                   <Col span={12}>
                     <Form.Item label="后缀" style={{ marginBottom: 8 }}>
                       <Input 
                         value={namingConfig.suffix} 
                         onChange={e => setNamingConfig({...namingConfig, suffix: e.target.value})} 
                         placeholder="如 #"
                       />
                     </Form.Item>
                   </Col>
                 </Row>
                 <Row gutter={8}>
                   <Col span={12}>
                     <Form.Item label="起始编号" style={{ marginBottom: 8 }}>
                       <InputNumber 
                         min={1} 
                         value={namingConfig.start} 
                         onChange={v => setNamingConfig({...namingConfig, start: v || 1})} 
                         style={{ width: '100%' }}
                       />
                     </Form.Item>
                   </Col>
                   <Col span={12}>
                     <Form.Item label="位数补零" style={{ marginBottom: 8 }}>
                       <InputNumber 
                         min={0} 
                         max={5}
                         value={namingConfig.padding} 
                         onChange={v => setNamingConfig({...namingConfig, padding: v || 0})} 
                         style={{ width: '100%' }}
                         placeholder="如 2 (01)"
                       />
                     </Form.Item>
                   </Col>
                 </Row>
               </Form>

               <Divider style={{ margin: '12px 0' }} />
               
               <div style={{ marginBottom: 8 }}>
                 <Text strong>名称预览 ({generatedNames.length})</Text>
               </div>
               
               <div style={{ flex: 1, overflowY: 'auto', background: '#fafafa', borderRadius: 8, padding: 8, border: '1px solid #f0f0f0' }}>
                 <List
                   size="small"
                   dataSource={generatedNames}
                   renderItem={(name, index) => (
                     <List.Item style={{ padding: '4px 0' }}>
                       <Input 
                         value={name} 
                         onChange={(e) => {
                           const newNames = [...generatedNames];
                           newNames[index] = e.target.value;
                           setGeneratedNames(newNames);
                         }}
                         prefix={<Text type="secondary" style={{ fontSize: 12, marginRight: 4 }}>{index + 1}.</Text>}
                         style={{ fontSize: 13 }}
                       />
                     </List.Item>
                   )}
                 />
               </div>
             </>
          )}
        </Col>
      </Row>
    </Modal>
  );
};
