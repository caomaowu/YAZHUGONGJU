export type PQ2MaterialId = 'A380' | 'ADC12' | 'AZ91D' | 'ALSi9Cu3'

export type PQ2Material = {
  id: PQ2MaterialId
  name: string
  densityKgM3: number
}

export type PQ2Params = {
  materialId: PQ2MaterialId
  densityKgM3: number
  inputBasis: 'mass' | 'volume'
  castingMassKg: number
  castingVolumeCm3: number
  fillTimeS: number
  gateWidthMm: number
  gateThicknessMm: number
  useCustomGateArea: boolean
  gateAreaMm2: number
  dischargeCoeff: number
  extraLossMPa: number
  machineMaxPressureMPa: number
  plungerDiameterMm: number
  plungerMaxSpeedMps: number
}

export type PQ2Normalized = {
  densityKgM3: number
  castingVolumeM3: number
  fillTimeS: number
  gateAreaM2: number
  dischargeCoeff: number
  extraLossPa: number
  machineMaxPressurePa: number
  plungerAreaM2: number
  plungerMaxSpeedMps: number
}

export type PQ2Intermediate = {
  gateAreaMm2: number
  gateAreaM2: number
  castingVolumeCm3: number
  castingVolumeM3: number
  castingMassKg: number
  qRequiredM3s: number
  qRequiredLps: number
  qMaxM3s: number
  qMaxLps: number
  xRequiredLps2: number
  xMaxLps2: number
  dieSlopeMPaPerM6s2: number
  dieSlopeMPaPerLps2: number
}

export type PQ2KeyPoints = {
  operating: { qLps: number; q2Lps2: number; pRequiredMPa: number; pMachineMPa: number; marginMPa: number }
  intersect?: { qLps: number; q2Lps2: number; pMPa: number }
  feasible?: { q2MinLps2: number; q2MaxLps2: number }
}

export type PQ2CurveSample = {
  qLps: number
  q2Lps2: number
  pMachineMPa: number
  pDieMPa: number
}

export type PQ2ComputeResult = {
  params: PQ2Params
  normalized: PQ2Normalized
  intermediate: PQ2Intermediate
  points: PQ2KeyPoints
  curve: PQ2CurveSample[]
  warnings: string[]
  errors: string[]
}

