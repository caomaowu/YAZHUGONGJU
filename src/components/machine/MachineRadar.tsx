import React, { useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import { EChart } from '../charts/EChart';
import { useTheme } from '../../core/state/themeState';
import type { DieCastingMachine } from '../../types/machine';

interface MachineRadarProps {
  machine: DieCastingMachine;
  height?: number;
}

export const MachineRadar: React.FC<MachineRadarProps> = ({ machine, height = 300 }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const option = useMemo(() => {
    // Normalize data for radar chart
    const data = [
      machine.specs.clampingForce,
      machine.specs.dieHeightMax,
      machine.specs.ejectionStroke,
      machine.specs.injectionRate || 0, // Use actual value
      machine.specs.tieBarSpacing[0],
      machine.tonnage, // Actual tonnage
    ];

    // Mock max values for normalization visualization
    // We adjust max values based on the machine scale to prevent the radar from being too small or out of bounds
    const clampingForceMax = Math.max(15000, machine.specs.clampingForce * 1.2);
    const dieHeightMax = Math.max(1500, machine.specs.dieHeightMax * 1.2);
    const ejectionStrokeMax = Math.max(500, machine.specs.ejectionStroke * 1.2);
    const tieBarSpacingMax = Math.max(1500, machine.specs.tieBarSpacing[0] * 1.2);
    const tonnageMax = Math.max(1500, machine.tonnage * 1.2);

    const indicator = [
       { name: '锁模力', max: clampingForceMax },
       { name: '最大模厚', max: dieHeightMax },
       { name: '顶出行程', max: ejectionStrokeMax },
       { name: '射出速度', max: 10 }, // 10 m/s as a reasonable max for most machines
       { name: '哥林柱距', max: tieBarSpacingMax },
       { name: '吨位', max: tonnageMax },
    ];

    const option: EChartsOption = {
      backgroundColor: 'transparent',
      radar: {
        indicator: indicator,
        shape: 'circle' as const,
        splitNumber: 4,
        axisName: {
          color: isDark ? 'rgba(255, 255, 255, 0.65)' : 'rgba(33, 23, 53, 0.65)',
          fontSize: 12,
        },
        splitLine: {
          lineStyle: {
            color: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(139, 92, 246, 0.15)',
          },
        },
        splitArea: {
          areaStyle: {
            color: isDark 
              ? ['rgba(139, 92, 246, 0.05)', 'transparent'] 
              : ['rgba(139, 92, 246, 0.05)', 'transparent'],
          },
        },
        axisLine: {
          lineStyle: {
            color: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(139, 92, 246, 0.15)',
          },
        },
      },
      series: [
        {
          type: 'radar',
          data: [
            {
              value: data,
              name: machine.name,
              symbol: 'none',
              lineStyle: {
                width: 2,
                color: '#8B5CF6',
              },
              areaStyle: {
                color: {
                  type: 'linear',
                  x: 0,
                  y: 0,
                  x2: 0,
                  y2: 1,
                  colorStops: [
                    { offset: 0, color: 'rgba(139, 92, 246, 0.6)' },
                    { offset: 1, color: 'rgba(139, 92, 246, 0.1)' },
                  ],
                },
              },
            },
          ],
        },
      ],
    };

    return option;
  }, [machine, isDark]);

  return (
    <div style={{ height, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <EChart option={option} style={{ width: '100%', height: '100%' }} />
    </div>
  );
};
