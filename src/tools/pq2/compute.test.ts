import { describe, expect, it } from 'vitest'
import { applyParamLinkage, computePQ2 } from './compute'
import type { PQ2Params } from './types'

const base: PQ2Params = {
  materialId: 'ADC12',
  densityKgM3: 2650,
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
  // 工艺窗口默认值
  useCustomProcessWindow: false,
  vGateMaxMps: 60,
  vGateMinMps: 30,
  // 液压参数默认值
  useHydraulicMode: false,
  hydraulicPressureMPa: 16,
  hydraulicCylinderDiameterMm: 210,
}

describe('pq2 compute', () => {
  it('applies linkage for gate area when not custom', () => {
    const next = applyParamLinkage({ ...base, gateWidthMm: 50, gateThicknessMm: 2.5, useCustomGateArea: false })
    expect(next.gateAreaMm2).toBeCloseTo(125, 6)
  })

  it('links mass to volume based on density', () => {
    const next = applyParamLinkage({ ...base, inputBasis: 'mass', castingMassKg: 2 })
    expect(next.castingVolumeCm3).toBeCloseTo(2 / (2650 / 1e6), 6)
  })

  it('produces a consistent operating point', () => {
    const result = computePQ2({ ...base, useCustomGateArea: false, gateWidthMm: 40, gateThicknessMm: 2 })
    expect(result.errors).toEqual([])
    expect(result.points.operating.qLps).toBeGreaterThan(0)
    expect(result.points.operating.pRequiredMPa).toBeGreaterThanOrEqual(0)
    expect(result.intermediate.xMaxLps2).toBeGreaterThan(result.intermediate.xRequiredLps2 * 0.5)
  })

  it('calculates gate velocity correctly', () => {
    const result = computePQ2({ ...base, useCustomGateArea: false, gateWidthMm: 40, gateThicknessMm: 2 })
    expect(result.errors).toEqual([])
    expect(result.intermediate.vGateMps).toBeGreaterThan(0)
    // Vg = Q / (Cd * Ag), Ag = 80 mm² = 8e-5 m²
    expect(result.intermediate.vGateMps).toBeCloseTo(
      result.intermediate.qRequiredM3s / (0.62 * 8e-5),
      1
    )
  })

  it('calculates process window boundaries', () => {
    const result = computePQ2({ ...base, useCustomProcessWindow: true, vGateMaxMps: 60, vGateMinMps: 30, maxFillTimeS: 0.08 })
    expect(result.errors).toEqual([])
    expect(result.points.processWindow).toBeDefined()
    expect(result.points.processWindow!.pMaxMPa).toBeGreaterThan(result.points.processWindow!.pMinMPa)
    expect(result.points.processWindow!.qMinLps).toBeDefined()
    expect(result.points.processWindow!.qMinLps!).toBeGreaterThan(0)
  })

  it('uses recommended process window when custom mode is disabled', () => {
    const result = computePQ2({
      ...base,
      useCustomProcessWindow: false,
      vGateMaxMps: 120,
      vGateMinMps: 10,
      maxFillTimeS: 0.08,
    })
    expect(result.errors).toEqual([])
    expect(result.params.vGateMaxMps).toBe(60)
    expect(result.params.vGateMinMps).toBe(30)
    expect(result.params.maxFillTimeS).toBe(0)
    expect(result.points.processWindow?.qMinLps).toBeUndefined()
  })

  it('does not render qmin boundary when maxFillTimeS is 0', () => {
    const result = computePQ2({
      ...base,
      useCustomProcessWindow: true,
      maxFillTimeS: 0,
    })
    expect(result.errors).toEqual([])
    expect(result.points.processWindow?.qMinLps).toBeUndefined()
  })

  it('validates process window ordering in custom mode', () => {
    const result = computePQ2({
      ...base,
      useCustomProcessWindow: true,
      vGateMaxMps: 25,
      vGateMinMps: 30,
    })
    expect(result.errors).toContain('工艺窗口要求 Vmax 必须大于 Vmin')
  })

  it('uses sanitized params as the source of truth for curve calculation', () => {
    const result = computePQ2({
      ...base,
      machineMaxPressureMPa: 600,
    })
    expect(result.params.machineMaxPressureMPa).toBe(400)
    expect(result.curve[0].pMachineMPa).toBeCloseTo(400, 6)
  })

  it('calculates machine pressure from hydraulic parameters', () => {
    const result = applyParamLinkage({
      ...base,
      useHydraulicMode: true,
      hydraulicPressureMPa: 16,
      hydraulicCylinderDiameterMm: 210,
      plungerDiameterMm: 130,
    })
    // Pm = Phyd * (dhyd/dpt)^2
    // 16 MPa = 160 kg/cm², dhyd = 21 cm, dpt = 13 cm
    // Pm = 16 * (21/13)^2 ≈ 41.75 MPa
    expect(result.machineMaxPressureMPa).toBeGreaterThan(0)
    expect(result.machineMaxPressureMPa).toBeCloseTo(41.75, 1)
  })
})

