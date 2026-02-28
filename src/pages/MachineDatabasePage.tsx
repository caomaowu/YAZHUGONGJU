import React, { useState, useMemo, useEffect } from 'react';
import { Layout, Input, Segmented, Row, Col, Typography, Button, theme as antTheme, message, Space, Checkbox, Modal, Select } from 'antd';
import { SearchOutlined, AppstoreOutlined, EnvironmentOutlined, PlusOutlined, SettingOutlined, DeleteOutlined, FolderOpenOutlined, CloseOutlined, CheckSquareOutlined } from '@ant-design/icons';
import { MachineCard } from '../components/machine/MachineCard';
import { MachineDetailDrawer } from '../components/machine/MachineDetailDrawer';
import { LocationManagerModal } from '../components/machine/LocationManagerModal';
import { AddMachineModal } from '../components/machine/AddMachineModal';
import { mockMachines } from '../mock/machines';
import type { DieCastingMachine, MachineModelSpecs } from '../types/machine';
import { useAuth } from '../core/auth/useAuth';

const { Content } = Layout;
const { Title, Text } = Typography;

export const MachineDatabasePage: React.FC = () => {
  const { token } = antTheme.useToken();
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState<string>('全部');
  const [selectedMachine, setSelectedMachine] = useState<DieCastingMachine | null>(null);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  // Batch Management State
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [targetLocation, setTargetLocation] = useState<string | null>(null);

  // Permissions
  const canEdit = user?.role === 'admin' || user?.role === 'engineer';
  const canDelete = user?.role === 'admin';
  const canAdd = user?.role === 'admin' || user?.role === 'engineer';
  
  // State to hold machines
  const [machines, setMachines] = useState<DieCastingMachine[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // State for locations and machine models
  const [availableLocations, setAvailableLocations] = useState<string[]>([]);
  const [machineModels, setMachineModels] = useState<MachineModelSpecs[]>([]);

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

  const handleRenameLocation = async (oldName: string, newName: string) => {
    // Update all machines that are in the old location
    const updatedMachines = machines.map(m => {
      if (m.location === oldName) {
        return { ...m, location: newName };
      }
      return m;
    });

    if (JSON.stringify(updatedMachines) !== JSON.stringify(machines)) {
      setMachines(updatedMachines);
      await persistMachines(updatedMachines);
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
          setIsLoaded(true);
        } else {
          setMachines(mockMachines); // Fallback to mock if empty
          setIsLoaded(true);
        }
      })
      .catch(err => {
        console.error('Failed to load machines from API', err);
        // Do not set isLoaded to true on error to prevent accidental overwrite
        message.error('无法加载设备数据，请检查网络连接');
      });
  }, []);

  // Enrich machines with rawSpecs from models if missing
  useEffect(() => {
    if (machines.length > 0 && machineModels.length > 0) {
      setMachines(prev => {
        const next = prev.map(m => {
          if (!m.rawSpecs) {
            const found = machineModels.find(spec => spec.型号 === m.model);
            if (found) {
              return { ...m, rawSpecs: found };
            }
          }
          return m;
        });
        // Only update if changes happened to avoid infinite loop
        const isChanged = next.some((m, i) => m.rawSpecs !== prev[i].rawSpecs);
        return isChanged ? next : prev;
      });
    }
  }, [machineModels, machines.length]);

  // Helper to persist machines
  const persistMachines = async (newMachines: DieCastingMachine[]) => {
    try {
      const response = await fetch('/api/machines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMachines),
      });
      if (!response.ok) throw new Error('Failed to save');
      return true;
    } catch (err) {
      console.error('Failed to save machines to API', err);
      message.error('保存数据失败，请检查后台服务');
      return false;
    }
  };

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

  const handleMachineUpdate = async (updatedMachine: DieCastingMachine) => {
    const newMachines = machines.map(m => m.id === updatedMachine.id ? updatedMachine : m);
    setMachines(newMachines);
    setSelectedMachine(updatedMachine); // Update selected machine to reflect changes immediately
    
    await persistMachines(newMachines);
    message.success('设备信息已更新');
  };

  const handleAddMachine = async (items: { model: string; name: string }[]) => {
    const newMachinesToAdd: DieCastingMachine[] = [];

    items.forEach((item, index) => {
      const originalModel = machineModels.find(m => m["型号"] === item.model);
      
      // Deep clone the model data
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
        id: `${Date.now()}-${index}-${Math.random().toString(36).substr(2, 5)}`,
        name: item.name,
        brand: '力劲 (LK)', // Default from JSON source
        model: item.model,
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
      
      newMachinesToAdd.push(newMachine);
    });
    
    const updatedMachines = [...machines, ...newMachinesToAdd];
    setMachines(updatedMachines);
    
    if (newMachinesToAdd.length === 1) {
      setSelectedMachine(newMachinesToAdd[0]);
    }
    
    await persistMachines(updatedMachines);
    
    setIsAddModalOpen(false); // Close modal
    message.success(`成功添加 ${newMachinesToAdd.length} 台设备`);
  };

  const handleDeleteMachine = async (id: string) => {
    const newMachines = machines.filter(m => m.id !== id);
    setMachines(newMachines);
    setSelectedMachine(null);
    
    await persistMachines(newMachines);
    message.success('设备已删除');
  };

  // Batch Management Handlers
  const handleBatchDelete = () => {
    if (selectedIds.size === 0) {
      message.warning('请先选择设备');
      return;
    }
    Modal.confirm({
      title: '批量删除设备',
      content: `确定要删除选中的 ${selectedIds.size} 台设备吗？此操作无法撤销。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          const newMachines = machines.filter(m => !selectedIds.has(m.id));
          
          // Explicitly call API to ensure persistence
          const success = await persistMachines(newMachines);
          
          if (!success) {
            throw new Error('Failed to delete machines');
          }
          
          setMachines(newMachines);
          setSelectedIds(new Set());
          setIsBatchMode(false);
          message.success('设备已批量删除');
        } catch (error) {
          console.error('Batch delete failed', error);
          // Error message already shown in persistMachines
        }
      },
    });
  };

  const handleBatchMove = () => {
    if (selectedIds.size === 0) {
      message.warning('请先选择设备');
      return;
    }
    setIsMoveModalOpen(true);
  };

  const confirmBatchMove = async () => {
    if (!targetLocation) {
      message.error('请选择目标位置');
      return;
    }
    
    const newMachines = machines.map(m => {
      if (selectedIds.has(m.id)) {
        return { ...m, location: targetLocation };
      }
      return m;
    });
    
    setMachines(newMachines);
    await persistMachines(newMachines);
    
    setSelectedIds(new Set());
    setIsBatchMode(false);
    setIsMoveModalOpen(false);
    setTargetLocation(null);
    message.success('设备位置已批量更新');
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
          <Space>
             {(canEdit || canDelete) && (
                <Button 
                  size="large"
                  icon={isBatchMode ? <CloseOutlined /> : <CheckSquareOutlined />}
                  onClick={() => {
                     setIsBatchMode(!isBatchMode);
                     setSelectedIds(new Set());
                  }}
                  style={{ borderRadius: 12 }}
                >
                  {isBatchMode ? '退出批量' : '批量管理'}
                </Button>
             )}
             {canAdd && (
               <Button 
                 type="primary" 
                 size="large" 
                 icon={<PlusOutlined />} 
                 style={{ borderRadius: 12 }}
                 onClick={() => setIsAddModalOpen(true)}
               >
                 新增设备
               </Button>
             )}
          </Space>
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
             {canEdit && (
               <Button 
                 icon={<SettingOutlined />} 
                 type="text" 
                 onClick={() => setIsLocationModalOpen(true)}
                 title="管理车间/区域"
               />
             )}
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
                   selectable={isBatchMode}
                   selected={selectedIds.has(machine.id)}
                   onSelect={(selected) => {
                      const newSet = new Set(selectedIds);
                      if (selected) {
                        newSet.add(machine.id);
                      } else {
                        newSet.delete(machine.id);
                      }
                      setSelectedIds(newSet);
                   }}
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
           onSave={canEdit ? handleMachineUpdate : undefined}
           onDelete={canDelete ? handleDeleteMachine : undefined}
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

        {/* Batch Actions Bar */}
        {isBatchMode && (
          <div style={{
            position: 'fixed',
            bottom: 32,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(12px)',
            padding: '8px 16px',
            borderRadius: 32,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            zIndex: 1000,
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
               <Typography.Text style={{ color: '#fff', marginRight: 8, fontWeight: 500 }}>已选择 {selectedIds.size} 项</Typography.Text>
               <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.2)' }} />
               
               {canEdit && (
                 <Button type="text" icon={<FolderOpenOutlined />} style={{ color: '#fff' }} onClick={handleBatchMove}>
                   移动至...
                 </Button>
               )}
               
               {canDelete && (
                 <Button type="text" danger icon={<DeleteOutlined />} onClick={handleBatchDelete}>
                   删除
                 </Button>
               )}
               
               <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.2)' }} />
               <Button type="text" icon={<CloseOutlined />} style={{ color: 'rgba(255,255,255,0.6)' }} onClick={() => setIsBatchMode(false)}>
                 退出
               </Button>
             </div>
          </div>
        )}

        {/* Move Modal */}
        <Modal
          title="移动设备至车间"
          open={isMoveModalOpen}
          onCancel={() => {
             setIsMoveModalOpen(false);
             setTargetLocation(null);
          }}
          onOk={confirmBatchMove}
          okText="确认移动"
          cancelText="取消"
          okButtonProps={{ disabled: !targetLocation }}
        >
           <div style={{ padding: '24px 0' }}>
             <p style={{ marginBottom: 12 }}>将选中的 <span style={{ fontWeight: 'bold', color: token.colorPrimary }}>{selectedIds.size}</span> 台设备移动到：</p>
             <Select
               style={{ width: '100%' }}
               placeholder="选择目标车间"
               value={targetLocation}
               onChange={setTargetLocation}
               options={availableLocations.map(loc => ({ label: loc, value: loc }))}
             />
           </div>
        </Modal>

      </Content>
    </Layout>
  );
};
