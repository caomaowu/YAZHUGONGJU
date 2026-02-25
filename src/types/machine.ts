export type MachineStatus = 'running' | 'idle' | 'maintenance' | 'offline';

export interface MachineSpecs {
  clampingForce: number;      // 锁模力 (kN)
  tieBarSpacing: [number, number]; // 哥林柱间距 (H x V) (mm)
  dieHeightMin: number;       // 最小模厚 (mm)
  dieHeightMax: number;       // 最大模厚 (mm)
  ejectionStroke: number;     // 顶出行程 (mm)
  injectionRate?: number;     // 射出速率 (m/s)
  shotWeightMax?: number;     // 最大射出量 (kg)
}

export interface DieCastingMachine {
  id: string;
  name: string;        // 设备名称，如 "1# 压铸机"
  brand: string;       // 品牌
  model: string;       // 型号
  tonnage: number;     // 吨位 (T)
  location: string;    // 所属车间
  status: MachineStatus;
  specs: MachineSpecs;
  avatar?: string;     // 机器图标/照片 URL
  purchaseDate?: string; // 采购日期
}
