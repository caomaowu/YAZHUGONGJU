import React from 'react';
import { Card, Tag, Typography, theme as antTheme } from 'antd';
import { RocketOutlined, ColumnHeightOutlined } from '@ant-design/icons';
import type { DieCastingMachine } from '../../types/machine';
import machineSmallImg from '../../assets/images/machine-small.png';
import machineLargeImg from '../../assets/images/machine-large.png';

const { Text, Title } = Typography;

interface MachineCardProps {
  machine: DieCastingMachine;
  onClick: (machine: DieCastingMachine) => void;
}

export const MachineCard: React.FC<MachineCardProps> = ({ machine, onClick }) => {
  const { token } = antTheme.useToken();
  
  // Status config
  const statusConfig = {
    running: { color: '#22C55E', text: '运行中', glow: 'rgba(34, 197, 94, 0.4)' },
    idle: { color: '#F59E0B', text: '待机', glow: 'rgba(245, 158, 11, 0.4)' },
    maintenance: { color: '#EF4444', text: '维护中', glow: 'rgba(239, 68, 68, 0.4)' },
    offline: { color: '#9CA3AF', text: '离线', glow: 'rgba(156, 163, 175, 0.4)' },
  };

  const status = statusConfig[machine.status];
  
  // Select image based on tonnage (Always use illustration for card)
  const machineImage = machine.tonnage >= 1000 ? machineLargeImg : machineSmallImg;

  return (
    <Card
      hoverable
      onClick={() => onClick(machine)}
      style={{
        borderRadius: 20,
        overflow: 'hidden',
        border: 'none',
        background: token.colorBgContainer,
        boxShadow: `0 4px 20px -2px rgba(139, 92, 246, 0.08)`,
        transition: 'all 0.3s ease',
        position: 'relative',
      }}
      bodyStyle={{ padding: 0 }} // Remove default padding to allow image to span full width
      className="machine-card"
    >
      {/* Breathing Status Light - Moved to top right over image */}
      <div
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'rgba(255, 255, 255, 0.9)',
          padding: '4px 10px',
          borderRadius: 12,
          backdropFilter: 'blur(4px)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
        }}
      >
        <span style={{ fontSize: 12, color: token.colorTextSecondary, fontWeight: 500 }}>{status.text}</span>
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: status.color,
            boxShadow: `0 0 10px 2px ${status.glow}`,
            animation: machine.status === 'running' ? 'pulse 2s infinite' : 'none',
          }}
        />
      </div>

      {/* Image Section */}
      <div style={{ 
        width: '100%', 
        height: 180, 
        background: 'linear-gradient(180deg, #F9FAFB 0%, #F3F4F6 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <img 
          src={machineImage} 
          alt={machine.name} 
          style={{ 
            width: '100%', 
            height: '100%', 
            objectFit: 'cover',
            transition: 'transform 0.5s ease'
          }}
          className="machine-image"
        />
        {/* Tonnage Badge Overlay */}
        <div style={{
          position: 'absolute',
          bottom: 12,
          left: 12,
          background: 'rgba(255, 255, 255, 0.95)',
          padding: '4px 12px',
          borderRadius: 8,
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          display: 'flex',
          alignItems: 'baseline',
          backdropFilter: 'blur(4px)'
        }}>
           <span style={{ fontSize: 20, fontWeight: 800, color: token.colorPrimary, lineHeight: 1 }}>
             {machine.tonnage}
           </span>
           <span style={{ fontSize: 12, fontWeight: 600, color: token.colorPrimary, marginLeft: 2 }}>T</span>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Header: Brand & Model */}
        <div>
           <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
             <Tag color="purple" style={{ borderRadius: 6, border: 'none', background: 'rgba(139, 92, 246, 0.1)', color: '#8B5CF6', margin: 0 }}>
                {machine.brand}
             </Tag>
             <Text type="secondary" style={{ fontSize: 12 }}>{machine.location}</Text>
           </div>
           <Title level={4} style={{ margin: '8px 0 0', fontWeight: 700, fontSize: 18 }}>
             {machine.name}
           </Title>
           <Text type="secondary" style={{ fontSize: 12 }}>{machine.model}</Text>
        </div>

        {/* Mini Specs */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: 12,
          marginTop: 8,
          paddingTop: 12,
          borderTop: `1px solid ${token.colorBorderSecondary}`
        }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ 
                width: 28, height: 28, 
                borderRadius: 6, 
                background: 'rgba(139, 92, 246, 0.05)', 
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <ColumnHeightOutlined style={{ color: token.colorPrimary, fontSize: 14 }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                 <span style={{ fontSize: 10, color: token.colorTextTertiary }}>模厚范围</span>
                 <span style={{ fontSize: 12, fontWeight: 500 }}>{machine.specs.dieHeightMin}-{machine.specs.dieHeightMax}</span>
              </div>
           </div>
           <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ 
                width: 28, height: 28, 
                borderRadius: 6, 
                background: 'rgba(139, 92, 246, 0.05)', 
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <RocketOutlined style={{ color: token.colorPrimary, fontSize: 14 }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                 <span style={{ fontSize: 10, color: token.colorTextTertiary }}>射出速度</span>
                 <span style={{ fontSize: 12, fontWeight: 500 }}>{machine.specs.injectionRate ?? '-'} m/s</span>
              </div>
           </div>
        </div>
      </div>
      
      <style>{`
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 ${status.glow}; }
          70% { box-shadow: 0 0 0 6px rgba(0, 0, 0, 0); }
          100% { box-shadow: 0 0 0 0 rgba(0, 0, 0, 0); }
        }
        .machine-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 30px -8px rgba(139, 92, 246, 0.15) !important;
        }
        .machine-card:hover .machine-image {
          transform: scale(1.05);
        }
      `}</style>
    </Card>
  );
};
