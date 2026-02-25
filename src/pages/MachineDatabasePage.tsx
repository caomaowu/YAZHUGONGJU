import React, { useState, useMemo, useEffect } from 'react';
import { Layout, Input, Segmented, Row, Col, Typography, Button, theme as antTheme, message } from 'antd';
import { SearchOutlined, AppstoreOutlined, EnvironmentOutlined, PlusOutlined } from '@ant-design/icons';
import { MachineCard } from '../components/machine/MachineCard';
import { MachineDetailDrawer } from '../components/machine/MachineDetailDrawer';
import { mockMachines } from '../mock/machines';
import type { DieCastingMachine } from '../types/machine';

const { Content } = Layout;
const { Title, Text } = Typography;

export const MachineDatabasePage: React.FC = () => {
  const { token } = antTheme.useToken();
  const [query, setQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState<string>('全部');
  const [selectedMachine, setSelectedMachine] = useState<DieCastingMachine | null>(null);
  
  // State to hold machines
  const [machines, setMachines] = useState<DieCastingMachine[]>([]);

  // Load machines from API on mount
  useEffect(() => {
    fetch('/api/machines')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setMachines(data);
        } else {
          setMachines(mockMachines); // Fallback to mock if empty
        }
      })
      .catch(err => {
        console.error('Failed to load machines from API', err);
        setMachines(mockMachines); // Fallback on error
      });
  }, []);

  // Persist machines to API whenever they change
  useEffect(() => {
    if (machines.length === 0) return; // Don't save empty state on init

    fetch('/api/machines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(machines),
    })
    .then(res => res.json())
    .catch(err => {
      console.error('Failed to save machines to API', err);
      message.error('保存到本地文件失败，请检查后台服务');
    });
  }, [machines]);

  // Extract unique locations
  const locations = useMemo(() => {
    const locs = new Set(machines.map(m => m.location));
    return ['全部', ...Array.from(locs)];
  }, [machines]);

  // Filter machines
  const filteredMachines = useMemo(() => {
    return machines.filter(m => {
      const matchesQuery = 
        m.name.toLowerCase().includes(query.toLowerCase()) ||
        m.brand.toLowerCase().includes(query.toLowerCase()) ||
        m.model.toLowerCase().includes(query.toLowerCase());
      
      const matchesLocation = locationFilter === '全部' || m.location === locationFilter;

      return matchesQuery && matchesLocation;
    });
  }, [query, locationFilter, machines]);

  const handleMachineUpdate = (updatedMachine: DieCastingMachine) => {
    setMachines(prev => prev.map(m => m.id === updatedMachine.id ? updatedMachine : m));
    setSelectedMachine(updatedMachine); // Update selected machine to reflect changes immediately
    message.success('设备信息已更新');
  };

  return (
    <Layout style={{ background: 'transparent', height: '100%' }}>
      <Content style={{ 
        maxWidth: 1200, 
        width: '100%', 
        margin: '0 auto', 
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 24
      }}>
        
        {/* Header Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <Title level={2} style={{ margin: 0, fontWeight: 800, color: '#4C1D95' }}>压铸机数据库</Title>
            <Text type="secondary">管理和查看所有压铸设备及其性能参数</Text>
          </div>
          <Button type="primary" size="large" icon={<PlusOutlined />} style={{ borderRadius: 12 }}>
            新增设备
          </Button>
        </div>

        {/* Toolbar Section */}
        <div style={{ 
          display: 'flex', 
          gap: 16, 
          flexWrap: 'wrap', 
          alignItems: 'center',
          background: token.colorBgContainer,
          padding: 12,
          borderRadius: 16,
          boxShadow: '0 2px 12px -4px rgba(0,0,0,0.05)'
        }}>
           <Input 
             prefix={<SearchOutlined style={{ color: token.colorTextQuaternary }} />} 
             placeholder="搜索品牌、型号或名称..." 
             bordered={false}
             style={{ flex: 1, minWidth: 200, fontSize: 16 }}
             value={query}
             onChange={e => setQuery(e.target.value)}
           />
           <div style={{ height: 24, width: 1, background: token.colorBorderSecondary }} />
           <Segmented 
              options={locations} 
              value={locationFilter} 
              onChange={setLocationFilter}
              style={{ background: 'transparent' }}
           />
           <div style={{ height: 24, width: 1, background: token.colorBorderSecondary }} />
           <Segmented 
              options={[
                { value: 'grid', icon: <AppstoreOutlined /> },
                { value: 'map', icon: <EnvironmentOutlined />, disabled: true },
              ]}
              style={{ background: 'transparent' }}
           />
        </div>

        {/* Grid Content */}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 24 }}>
          <Row gutter={[24, 24]}>
            {filteredMachines.map(machine => (
              <Col key={machine.id} xs={24} sm={12} md={8} lg={6} xl={6}>
                <MachineCard 
                   machine={machine} 
                   onClick={() => setSelectedMachine(machine)} 
                />
              </Col>
            ))}
          </Row>

          {filteredMachines.length === 0 && (
             <div style={{ textAlign: 'center', padding: 48, color: token.colorTextTertiary }}>
                暂无匹配的设备数据
             </div>
          )}
        </div>

        {/* Detail Drawer */}
        <MachineDetailDrawer 
           machine={selectedMachine} 
           open={!!selectedMachine} 
           onClose={() => setSelectedMachine(null)} 
           onSave={handleMachineUpdate}
        />

      </Content>
    </Layout>
  );
};
