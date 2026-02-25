import React, { useState } from 'react';
import { Drawer, Descriptions, Tag, Button, Typography, Image, Popconfirm, theme as antTheme, Tabs, Table } from 'antd';
import { CloseOutlined, PrinterOutlined, EditOutlined, ZoomInOutlined, DeleteOutlined } from '@ant-design/icons';
import type { DieCastingMachine, MachineModelSpecs } from '../../types/machine';
import { MachineRadar } from './MachineRadar';
import { MachineEditForm } from './MachineEditForm';

const { Title, Text } = Typography;

interface MachineDetailDrawerProps {
  machine: DieCastingMachine | null;
  open: boolean;
  onClose: () => void;
  onSave?: (updatedMachine: DieCastingMachine) => void;
  onDelete?: (id: string) => void;
  locations?: string[];
  machineModels?: MachineModelSpecs[];
}

export const MachineDetailDrawer: React.FC<MachineDetailDrawerProps> = ({ machine, open, onClose, onSave, onDelete, locations = [], machineModels = [] }) => {
  const { token } = antTheme.useToken();
  const [isEditing, setIsEditing] = useState(false);

  if (!machine) return null;
  const handleClose = () => {
    setIsEditing(false);
    onClose();
  };

  const handleSave = (updatedMachine: DieCastingMachine) => {
    if (onSave) {
      onSave(updatedMachine);
    }
    setIsEditing(false);
  };

  const injectionColumns = [
    { title: '冲头直径 (mm)', dataIndex: '冲头直径_mm', key: '冲头直径_mm', width: 120 },
    { title: '压射力 (KN)', dataIndex: '压射力_KN', key: '压射力_KN', width: 110 },
    { title: '射料行程 (mm)', dataIndex: '射料行程_mm', key: '射料行程_mm', width: 120 },
    { title: '铝容量 (Kg)', dataIndex: '容量_铝_Kg', key: '容量_铝_Kg', width: 110 },
    { title: '铸造压力 (MPa)', dataIndex: '铸造压力_MPa', key: '铸造压力_MPa', width: 130 },
    { title: '铸造面积 (cm²)', dataIndex: '铸造面积_cm2', key: '铸造面积_cm2', width: 130 },
  ];

  const rawSpecs: MachineModelSpecs | undefined = machine.rawSpecs;

  const renderOverview = () => (
    <>
      {/* Avatar / Image Section (if exists) */}
      {machine.avatar && (
        <div style={{ margin: '0 0 24px', borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.06)' }}>
           <Image 
             src={machine.avatar} 
             alt={machine.name} 
             width="100%" 
             height={300}
             style={{ objectFit: 'cover' }}
             preview={{
                mask: <div style={{ fontSize: 14, display: 'flex', alignItems: 'center', gap: 4 }}><ZoomInOutlined /> 查看大图</div>
             }}
           />
        </div>
      )}

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        {/* Radar Chart Section */}
        <div style={{ 
          flex: 1,
          minWidth: 300,
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

        {/* Core Specs List */}
        <div style={{ flex: 1, minWidth: 300 }}>
          <Descriptions title="核心参数" column={1} layout="horizontal" labelStyle={{ width: 120, color: token.colorTextSecondary }}>
            <Descriptions.Item label="锁模力">{machine.specs.clampingForce} kN</Descriptions.Item>
            <Descriptions.Item label="哥林柱间距">{machine.specs.tieBarSpacing[0]} x {machine.specs.tieBarSpacing[1]} mm</Descriptions.Item>
            <Descriptions.Item label="模厚范围">{machine.specs.dieHeightMin} - {machine.specs.dieHeightMax} mm</Descriptions.Item>
            <Descriptions.Item label="顶出行程">{machine.specs.ejectionStroke} mm</Descriptions.Item>
            <Descriptions.Item label="最大射出速度">{machine.specs.injectionRate ?? '-'} m/s</Descriptions.Item>
            <Descriptions.Item label="所属车间">{machine.location}</Descriptions.Item>
          </Descriptions>
        </div>
      </div>
    </>
  );

  const renderDetailedSpecs = () => {
    if (!rawSpecs) return <div style={{ padding: 24, textAlign: 'center', color: token.colorTextSecondary }}>暂无详细参数数据</div>;
    
    return (
      <Descriptions bordered column={2} labelStyle={{ width: 160, background: '#fafafa' }}>
        <Descriptions.Item label="型号">{rawSpecs.型号}</Descriptions.Item>
        <Descriptions.Item label="锁模力">{rawSpecs.锁模力_KN} KN</Descriptions.Item>
        <Descriptions.Item label="锁模行程">{rawSpecs.锁模行程_mm} mm</Descriptions.Item>
        <Descriptions.Item label="模具厚度 (最小/最大)">
          {typeof rawSpecs.模具厚度_mm === 'object' 
            ? `${rawSpecs.模具厚度_mm.最小} / ${rawSpecs.模具厚度_mm.最大} mm`
            : rawSpecs.模具厚度_mm}
        </Descriptions.Item>
        <Descriptions.Item label="模板尺寸">{rawSpecs.模板尺寸_mm} mm</Descriptions.Item>
        <Descriptions.Item label="容模尺寸">{rawSpecs.容模尺寸_mm} mm</Descriptions.Item>
        <Descriptions.Item label="最大铸造面积 (40MPa)">{rawSpecs.最大铸造面积_40MPa_cm2} cm²</Descriptions.Item>
        <Descriptions.Item label="压射位置">{rawSpecs.压射位置_mm} mm</Descriptions.Item>
        <Descriptions.Item label="冲头行程">{rawSpecs.冲头行程_mm} mm</Descriptions.Item>
        <Descriptions.Item label="压室法兰直径">{rawSpecs.压室法兰直径_mm} mm</Descriptions.Item>
        <Descriptions.Item label="法兰高度">{rawSpecs.法兰高度_mm} mm</Descriptions.Item>
        <Descriptions.Item label="顶出力">{rawSpecs.顶出力_KN} KN</Descriptions.Item>
        <Descriptions.Item label="顶出行程">{rawSpecs.顶出行程_mm} mm</Descriptions.Item>
      </Descriptions>
    );
  };

  const renderInjectionConfig = () => {
    if (!rawSpecs?.压射配置) return <div style={{ padding: 24, textAlign: 'center', color: token.colorTextSecondary }}>暂无压射配置数据</div>;

    return (
      <Table 
        columns={injectionColumns} 
        dataSource={rawSpecs.压射配置} 
        pagination={false} 
        rowKey="冲头直径_mm"
        size="small"
        bordered
      />
    );
  };

  const tabItems = [
    {
      key: 'overview',
      label: '设备概览',
      children: renderOverview(),
    },
    {
      key: 'details',
      label: '详细参数',
      children: renderDetailedSpecs(),
    },
    {
      key: 'injection',
      label: '压射配置表',
      children: renderInjectionConfig(),
    },
  ];

  return (
    <Drawer
      title={null}
      placement="right"
      width={900}
      onClose={handleClose}
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
           onClick={handleClose} 
           style={{ borderRadius: '50%', width: 32, height: 32 }}
        />
      </div>

      {isEditing ? (
        <div style={{ padding: '24px' }}>
          <MachineEditForm 
            initialValues={machine} 
            onSave={handleSave} 
            onCancel={() => setIsEditing(false)} 
            locations={locations}
            machineModels={machineModels}
          />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100% - 80px)' }}>
          <div style={{ padding: '0 24px', flex: 1, overflowY: 'auto' }}>
            <Tabs defaultActiveKey="overview" items={tabItems} style={{ marginTop: 12 }} />
          </div>

          <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(0,0,0,0.06)', background: '#fff' }}>
            <div style={{ display: 'flex', gap: 12 }}>
              {onSave && (
                <Button type="primary" icon={<EditOutlined />} style={{ flex: 1 }} size="large" onClick={() => setIsEditing(true)}>
                  编辑
                </Button>
              )}
              <Button icon={<PrinterOutlined />} style={{ flex: 1 }} size="large">
                导出
              </Button>
              {onDelete && (
                <Popconfirm
                  title="删除设备"
                  description="确定要删除这台设备吗？此操作无法撤销。"
                  onConfirm={() => onDelete(machine.id)}
                  okText="删除"
                  cancelText="取消"
                  okButtonProps={{ danger: true }}
                >
                  <Button danger icon={<DeleteOutlined />} size="large" />
                </Popconfirm>
              )}
            </div>
          </div>
        </div>
      )}
    </Drawer>
  );
};
