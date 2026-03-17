import { describe, expect, it } from 'vitest'
import type { MachineModelSpecs } from '../types/machine'
import { computeBarrelInnerLength, normalizeMachineRawSpecs } from './machineSpecs'

const baseRawSpecs: MachineModelSpecs = {
  型号: 'DCC500',
  锁模力_KN: 5000,
  锁模行程_mm: 580,
  模具厚度_mm: { 最小: 350, 最大: 850 },
  模板尺寸_mm: '1162x1162',
  容模尺寸_mm: '760x760',
  压射配置: [
    {
      冲头直径_mm: 70,
      压射力_KN: 240,
      射料行程_mm: 580,
      容量_铝_Kg: 8,
      铸造压力_MPa: 100,
      铸造面积_cm2: 1250,
    },
  ],
  最大铸造面积_40MPa_cm2: 1250,
  压射位置_mm: -175,
  冲头行程_mm: 250,
  料管内部长度_mm: 0,
  压室法兰直径_mm: 165,
  法兰高度_mm: 15,
  顶出力_KN: 240,
  顶出行程_mm: 120,
  系统工作压力_MPa: 16,
  电机功率_KVA: 30,
}

describe('machineSpecs', () => {
  it('computes barrel inner length from shot stroke and plunger stroke', () => {
    expect(computeBarrelInnerLength(baseRawSpecs)).toBe(330)
  })

  it('normalizes stale zero values to the computed result', () => {
    expect(normalizeMachineRawSpecs(baseRawSpecs)?.料管内部长度_mm).toBe(330)
  })

  it('returns undefined when required fields are missing', () => {
    expect(
      computeBarrelInnerLength({
        ...baseRawSpecs,
        压射配置: [],
      }),
    ).toBeUndefined()

    expect(
      computeBarrelInnerLength({
        ...baseRawSpecs,
        冲头行程_mm: undefined as unknown as number,
      }),
    ).toBeUndefined()
  })
})
