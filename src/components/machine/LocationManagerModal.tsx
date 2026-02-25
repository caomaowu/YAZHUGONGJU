import React, { useState } from 'react';
import { Modal, List, Input, Button, Popconfirm, message, Space } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined, SaveOutlined, CloseOutlined } from '@ant-design/icons';

interface LocationManagerModalProps {
  open: boolean;
  onClose: () => void;
  locations: string[];
  onUpdateLocations: (newLocations: string[]) => void;
  onRenameLocation: (oldName: string, newName: string) => void;
}

export const LocationManagerModal: React.FC<LocationManagerModalProps> = ({
  open,
  onClose,
  locations,
  onUpdateLocations,
  onRenameLocation,
}) => {
  const [newLocation, setNewLocation] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');

  const handleAdd = () => {
    if (!newLocation.trim()) {
      message.warning('请输入车间名称');
      return;
    }
    if (locations.includes(newLocation.trim())) {
      message.warning('该车间已存在');
      return;
    }
    onUpdateLocations([...locations, newLocation.trim()]);
    setNewLocation('');
    message.success('已添加新车间');
  };

  const handleDelete = (location: string) => {
    onUpdateLocations(locations.filter(l => l !== location));
    message.success('已删除车间');
  };

  const startEdit = (index: number, location: string) => {
    setEditingIndex(index);
    setEditValue(location);
  };

  const saveEdit = (index: number) => {
    if (!editValue.trim()) {
      message.warning('车间名称不能为空');
      return;
    }
    if (locations.includes(editValue.trim()) && locations[index] !== editValue.trim()) {
      message.warning('该车间名称已存在');
      return;
    }

    const oldName = locations[index];
    const newName = editValue.trim();

    if (oldName !== newName) {
      const newLocations = [...locations];
      newLocations[index] = newName;
      onUpdateLocations(newLocations);
      onRenameLocation(oldName, newName);
      message.success('车间名称已修改');
    }
    
    setEditingIndex(null);
    setEditValue('');
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditValue('');
  };

  return (
    <Modal
      title="管理车间/区域"
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          关闭
        </Button>
      ]}
    >
      <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
        <Input
          placeholder="输入新车间名称"
          value={newLocation}
          onChange={e => setNewLocation(e.target.value)}
          onPressEnter={handleAdd}
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          添加
        </Button>
      </div>

      <List
        bordered
        dataSource={locations}
        renderItem={(item, index) => (
          <List.Item
            actions={
              editingIndex === index ? [
                <Button type="text" icon={<SaveOutlined />} style={{ color: '#52c41a' }} onClick={() => saveEdit(index)} />,
                <Button type="text" icon={<CloseOutlined />} onClick={cancelEdit} />
              ] : [
                <Button type="text" icon={<EditOutlined />} onClick={() => startEdit(index, item)} />,
                <Popconfirm
                  title="删除车间"
                  description={`确定要删除“${item}”吗？`}
                  onConfirm={() => handleDelete(item)}
                  okText="删除"
                  cancelText="取消"
                  okButtonProps={{ danger: true }}
                >
                  <Button type="text" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              ]
            }
          >
            {editingIndex === index ? (
              <Input
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                onPressEnter={() => saveEdit(index)}
                autoFocus
              />
            ) : (
              item
            )}
          </List.Item>
        )}
        style={{ maxHeight: 400, overflowY: 'auto' }}
      />
    </Modal>
  );
};
