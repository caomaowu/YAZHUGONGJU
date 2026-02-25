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
      (machine.specs.injectionRate || 0) * 1000, // Scale for visibility
      machine.specs.tieBarSpacing[0],
      machine.tonnage * 10, // Scale for visibility
    ];

    // Mock max values for normalization visualization
    // In a real app these should be based on the max values of the dataset or standard
    const indicator = [
       { name: '锁模力', max: 15000 },
       { name: '最大模厚', max: 1500 },
       { name: '顶出行程', max: 500 },
       { name: '射出速度', max: 10000 },
       { name: '哥林柱距', max: 1500 },
       { name: '吨位', max: 20000 },
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
