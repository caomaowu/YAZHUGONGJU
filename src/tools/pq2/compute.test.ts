import { describe, expect, it } from 'vitest'
import { applyParamLinkage, computePQ2 } from './compute'
import type { PQ2Params } from './types'

const base: PQ2Params = {
  materialId: 'A380',
  densityKgM3: 2680,
  inputBasis: 'mass',
  castingMassKg: 1.2,
  castingVolumeCm3: 450,
  fillTimeS: 0.06,
  gateWidthMm: 40,
  gateThicknessMm: 2,
  useCustomGateArea: false,
  gateAreaMm2: 1,
  dischargeCoeff: 0.62,
  extraLossMPa: 0,
  machineMaxPressureMPa: 80,
  plungerDiameterMm: 60,
  plungerMaxSpeedMps: 5,
}

describe('pq2 compute', () => {
  it('applies linkage for gate area when not custom', () => {
    const next = applyParamLinkage({ ...base, gateWidthMm: 50, gateThicknessMm: 2.5, useCustomGateArea: false })
    expect(next.gateAreaMm2).toBeCloseTo(125, 6)
  })

  it('links mass to volume based on density', () => {
    const next = applyParamLinkage({ ...base, inputBasis: 'mass', castingMassKg: 2 })
    expect(next.castingVolumeCm3).toBeCloseTo(2 / (2680 / 1e6), 6)
  })

  it('produces a consistent operating point', () => {
    const result = computePQ2({ ...base, useCustomGateArea: false, gateWidthMm: 40, gateThicknessMm: 2 })
    expect(result.errors).toEqual([])
    expect(result.points.operating.qLps).toBeGreaterThan(0)
    expect(result.points.operating.pRequiredMPa).toBeGreaterThanOrEqual(0)
    expect(result.intermediate.xMaxLps2).toBeGreaterThan(result.intermediate.xRequiredLps2 * 0.5)
  })
})

