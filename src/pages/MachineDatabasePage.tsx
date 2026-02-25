import React, { useState, useMemo, useEffect } from 'react';
import { Layout, Input, Segmented, Row, Col, Typography, Button, theme as antTheme, message } from 'antd';
import { SearchOutlined, AppstoreOutlined, EnvironmentOutlined, PlusOutlined, SettingOutlined } from '@ant-design/icons';
import { MachineCard } from '../components/machine/MachineCard';
import { MachineDetailDrawer } from '../components/machine/MachineDetailDrawer';
import { LocationManagerModal } from '../components/machine/LocationManagerModal';
import { AddMachineModal } from '../components/machine/AddMachineModal';
import { mockMachines } from '../mock/machines';
import type { DieCastingMachine } from '../types/machine';

const { Content } = Layout;
const { Title, Text } = Typography;

export const MachineDatabasePage: React.FC = () => {
  const { token } = antTheme.useToken();
  const [query, setQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState<string>('全部');
  const [selectedMachine, setSelectedMachine] = useState<DieCastingMachine | null>(null);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  // State to hold machines
  const [machines, setMachines] = useState<DieCastingMachine[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // State for locations and machine models
  const [availableLocations, setAvailableLocations] = useState<string[]>([]);
  const [machineModels, setMachineModels] = useState<any[]>([]);

  // Load locations and models
  useEffect(() => {
    // Locations
    fetch('/api/locations')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setAvailableLocations(data);
        }
      })
      .catch(err => console.error('Failed to load locations', err));

    // Models
    fetch('/api/machine-models')
      .then(res => res.json())
      .then(data => {
        if (data && data["压铸机型号"]) {
          setMachineModels(data["压铸机型号"]);
        }
      })
      .catch(err => console.error("Failed to load machine models", err));
  }, []);

  // Save locations
  const handleUpdateLocations = (newLocations: string[]) => {
    setAvailableLocations(newLocations);
    fetch('/api/locations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newLocations),
    }).catch(err => {
      console.error('Failed to save locations', err);
      message.error('保存车间列表失败');
    });
  };

  const handleRenameLocation = (oldName: string, newName: string) => {
    // Update all machines that are in the old location
    const updatedMachines = machines.map(m => {
      if (m.location === oldName) {
        return { ...m, location: newName };
      }
      return m;
    });

    if (JSON.stringify(updatedMachines) !== JSON.stringify(machines)) {
      setMachines(updatedMachines);
      message.info(`已将 ${oldName} 的设备迁移至 ${newName}`);
    }
  };

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
      })
      .finally(() => {
        setIsLoaded(true);
      });
  }, []);

  // Persist machines to API whenever they change
  useEffect(() => {
    if (!isLoaded) return; // Don't save before initial load is complete

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
  }, [machines, isLoaded]);

  // Extract unique locations for filter
  const locationOptions = useMemo(() => {
    return ['全部', ...availableLocations];
  }, [availableLocations]);

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

  const handleAddMachine = (modelName: string) => {
    const originalModel = machineModels.find(m => m["型号"] === modelName);
    
    // Deep clone the model data to ensure the new machine instance is independent
    // and modifications to it won't affect the global model template or other machines.
    const selectedModel = originalModel ? JSON.parse(JSON.stringify(originalModel)) : undefined;
    
    // Parse specs from model
    let tieBarH = 0;
    let tieBarV = 0;
    if (selectedModel && selectedModel["容模尺寸_mm"]) {
      const dims = selectedModel["容模尺寸_mm"].split(/×|x/);
      if (dims.length === 2) {
        tieBarH = parseFloat(dims[0]);
        tieBarV = parseFloat(dims[1]);
      }
    }

    const newMachine: DieCastingMachine = {
      id: Date.now().toString(),
      name: `${modelName} - 新设备`, // Auto name suggestion
      brand: '力劲 (LK)', // Default from JSON source
      model: modelName,
      tonnage: selectedModel ? (selectedModel["锁模力_KN"] ? Math.round(selectedModel["锁模力_KN"] / 10) : 0) : 0,
      location: availableLocations[0] || '未分配',
      status: 'offline',
      specs: {
        clampingForce: selectedModel ? selectedModel["锁模力_KN"] : 0,
        tieBarSpacing: [tieBarH, tieBarV],
        dieHeightMin: selectedModel?.["模具厚度_mm"]?.["最小"] || 0,
        dieHeightMax: selectedModel?.["模具厚度_mm"]?.["最大"] || 0,
        ejectionStroke: selectedModel?.["顶出行程_mm"] || 0,
        injectionRate: undefined
      },
      rawSpecs: selectedModel
    };
    
    setMachines(prev => [...prev, newMachine]);
    setSelectedMachine(newMachine);
    setIsAddModalOpen(false); // Close modal
    message.success('设备创建成功');
  };

  const handleDeleteMachine = (id: string) => {
    setMachines(prev => prev.filter(m => m.id !== id));
    setSelectedMachine(null);
    message.success('设备已删除');
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
          <Button 
            type="primary" 
            size="large" 
            icon={<PlusOutlined />} 
            style={{ borderRadius: 12 }}
            onClick={() => setIsAddModalOpen(true)}
          >
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
           
           <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
             <Segmented 
                options={locationOptions} 
                value={locationFilter} 
                onChange={setLocationFilter}
                style={{ background: 'transparent' }}
             />
             <Button 
               icon={<SettingOutlined />} 
               type="text" 
               onClick={() => setIsLocationModalOpen(true)}
               title="管理车间/区域"
             />
           </div>

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
           onDelete={handleDeleteMachine}
           locations={availableLocations}
           machineModels={machineModels}
        />

        {/* Location Manager Modal */}
        <LocationManagerModal 
          open={isLocationModalOpen}
          onClose={() => setIsLocationModalOpen(false)}
          locations={availableLocations}
          onUpdateLocations={handleUpdateLocations}
          onRenameLocation={handleRenameLocation}
        />

        {/* Add Machine Modal */}
        <AddMachineModal 
          open={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onCreate={handleAddMachine}
          machineModels={machineModels}
        />

      </Content>
    </Layout>
  );
};
