import React, { useState, useEffect } from 'react';
import { Drawer, Descriptions, Tag, Button, Typography, Divider, Image, theme as antTheme } from 'antd';
import { CloseOutlined, PrinterOutlined, EditOutlined, ZoomInOutlined } from '@ant-design/icons';
import type { DieCastingMachine } from '../../types/machine';
import { MachineRadar } from './MachineRadar';
import { MachineEditForm } from './MachineEditForm';

const { Title, Text } = Typography;

interface MachineDetailDrawerProps {
  machine: DieCastingMachine | null;
  open: boolean;
  onClose: () => void;
  onSave?: (updatedMachine: DieCastingMachine) => void;
}

export const MachineDetailDrawer: React.FC<MachineDetailDrawerProps> = ({ machine, open, onClose, onSave }) => {
  const { token } = antTheme.useToken();
  const [isEditing, setIsEditing] = useState(false);

  // Reset editing state when drawer closes or machine changes
  useEffect(() => {
    if (!open) setIsEditing(false);
  }, [open, machine]);

  if (!machine) return null;

  const handleSave = (updatedMachine: DieCastingMachine) => {
    if (onSave) {
      onSave(updatedMachine);
    }
    setIsEditing(false);
  };

  return (
    <Drawer
      title={null}
      placement="right"
      width={480}
      onClose={onClose}
      open={open}
      closeIcon={null}
      styles={{
        body: { padding: 0 },
        header: { display: 'none' },
      }}
      maskStyle={{ backdropFilter: 'blur(4px)', background: 'rgba(0,0,0,0.1)' }}
    >
      {/* Custom Header */}
      <div style={{ padding: '24px 24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            {isEditing ? '编辑设备' : machine.name}
          </Title>
          {!isEditing && (
            <div style={{ marginTop: 8 }}>
              <Tag color="purple">{machine.brand}</Tag>
              <Tag>{machine.model}</Tag>
            </div>
          )}
        </div>
        <Button 
           type="text" 
           icon={<CloseOutlined />} 
           onClick={onClose} 
           style={{ borderRadius: '50%', width: 32, height: 32 }}
        />
      </div>

      {isEditing ? (
        <div style={{ marginTop: 24 }}>
          <MachineEditForm 
            initialValues={machine} 
            onSave={handleSave} 
            onCancel={() => setIsEditing(false)} 
          />
        </div>
      ) : (
        <>
          {/* Avatar / Image Section (if exists) */}
          {machine.avatar && (
            <div style={{ margin: '24px 24px 0', borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.06)' }}>
               <Image 
                 src={machine.avatar} 
                 alt={machine.name} 
                 width="100%" 
                 height={200}
                 style={{ objectFit: 'cover' }}
                 preview={{
                    mask: <div style={{ fontSize: 14, display: 'flex', alignItems: 'center', gap: 4 }}><ZoomInOutlined /> 查看大图</div>
                 }}
               />
            </div>
          )}

          {/* Radar Chart Section */}
          <div style={{ 
            margin: '24px', 
            padding: '16px', 
            background: 'linear-gradient(180deg, rgba(139,92,246,0.02) 0%, rgba(139,92,246,0.06) 100%)',
            borderRadius: 24,
            position: 'relative'
          }}>
             <div style={{ position: 'absolute', top: 16, left: 16, zIndex: 1 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>能力雷达</Text>
             </div>
             <MachineRadar machine={machine} height={280} />
          </div>

          {/* Specs List */}
          <div style={{ padding: '0 24px 24px' }}>
            <Descriptions title="核心参数" column={1} layout="horizontal" labelStyle={{ width: 120, color: token.colorTextSecondary }}>
              <Descriptions.Item label="锁模力">{machine.specs.clampingForce} kN</Descriptions.Item>
              <Descriptions.Item label="哥林柱间距">{machine.specs.tieBarSpacing[0]} x {machine.specs.tieBarSpacing[1]} mm</Descriptions.Item>
              <Descriptions.Item label="模厚范围">{machine.specs.dieHeightMin} - {machine.specs.dieHeightMax} mm</Descriptions.Item>
              <Descriptions.Item label="顶出行程">{machine.specs.ejectionStroke} mm</Descriptions.Item>
              <Descriptions.Item label="最大射出速度">{machine.specs.injectionRate ?? '-'} m/s</Descriptions.Item>
              <Descriptions.Item label="所属车间">{machine.location}</Descriptions.Item>
            </Descriptions>

            <Divider />

            <div style={{ display: 'flex', gap: 12 }}>
              <Button type="primary" icon={<EditOutlined />} block size="large" onClick={() => setIsEditing(true)}>
                编辑参数
              </Button>
              <Button icon={<PrinterOutlined />} block size="large">
                导出参数卡
              </Button>
            </div>
          </div>
        </>
      )}
    </Drawer>
  );
};
