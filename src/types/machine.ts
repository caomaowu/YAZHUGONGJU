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
  rawSpecs?: MachineModelSpecs; // 完整的原始规格数据（来自 JSON 模板）
}

export interface InjectionConfig {
  冲头直径_mm: number | string;
  压射力_KN: number | string;
  射料行程_mm: number | string;
  容量_铝_Kg: number | string;
  铸造压力_MPa: number | string;
  铸造面积_cm2: number | string;
}

export interface MachineModelSpecs {
  型号: string;
  锁模力_KN: number;
  锁模行程_mm: number;
  模具厚度_mm: { 最小: number; 最大: number };
  模板尺寸_mm: string;
  容模尺寸_mm: string;
  压射配置: InjectionConfig[];
  最大铸造面积_40MPa_cm2: number;
  压射位置_mm: number | string;
  冲头行程_mm: number;
  料管内部长度_mm?: number;
  压室法兰直径_mm: number | string;
  法兰高度_mm: number | string;
  顶出力_KN: number;
  顶出行程_mm: number;
  系统工作压力_MPa?: number;
  电机功率_KVA?: number;
  油箱容量_L?: number;
  机身外型尺寸_mm?: string;
  哥林柱内距_mm?: string;
  [key: string]: unknown;
}
