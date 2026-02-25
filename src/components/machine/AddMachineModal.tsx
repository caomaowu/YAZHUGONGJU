import React, { useState, useMemo } from 'react';
import { Modal, Input, List, Button, Tag, Typography, Empty, Card } from 'antd';
import { SearchOutlined, CheckCircleFilled } from '@ant-design/icons';
import type { MachineModelSpecs } from '../../types/machine';

const { Text, Title } = Typography;

interface AddMachineModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (modelName: string) => void;
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

  const filteredModels = useMemo(() => {
    if (!searchQuery) return machineModels;
    return machineModels.filter(m =>
      m["型号"].toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [machineModels, searchQuery]);

  const handleCreate = () => {
    if (selectedModel) {
      onCreate(selectedModel);
      // Reset state
      setSelectedModel(null);
      setSearchQuery('');
    }
  };

  return (
    <Modal
      title={<Title level={3} style={{ margin: 0 }}>选择设备型号</Title>}
      open={open}
      onCancel={onClose}
      width={800}
      footer={[
        <Button key="cancel" size="large" onClick={onClose}>
          取消
        </Button>,
        <Button 
          key="create" 
          type="primary" 
          size="large" 
          disabled={!selectedModel} 
          onClick={handleCreate}
        >
          确认创建
        </Button>
      ]}
    >
      <div style={{ marginBottom: 24 }}>
        <Input 
          size="large" 
          prefix={<SearchOutlined />} 
          placeholder="搜索型号，如 DCC300..." 
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      <div style={{ height: 400, overflowY: 'auto', paddingRight: 8 }}>
        {filteredModels.length > 0 ? (
          <List
            grid={{ gutter: 16, column: 3 }}
            dataSource={filteredModels}
            renderItem={item => {
              const isSelected = selectedModel === item["型号"];
              return (
                <List.Item>
                  <Card 
                    hoverable 
                    style={{ 
                      borderColor: isSelected ? '#722ED1' : undefined,
                      background: isSelected ? '#F9F0FF' : undefined,
                      cursor: 'pointer'
                    }}
                    bodyStyle={{ padding: 16 }}
                    onClick={() => setSelectedModel(item["型号"])}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Text strong style={{ fontSize: 16 }}>{item["型号"]}</Text>
                      {isSelected && <CheckCircleFilled style={{ color: '#722ED1', fontSize: 18 }} />}
                    </div>
                    <div style={{ marginTop: 8 }}>
                       <Tag color="purple">{Math.round(item["锁模力_KN"] / 10)}T</Tag>
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
    </Modal>
  );
};
