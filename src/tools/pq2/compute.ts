import type { PQ2ComputeResult, PQ2Normalized, PQ2Params, PQ2CurveSample } from './types'

function clampNumber(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function mm2ToM2(mm2: number) {
  return mm2 * 1e-6
}

function cm3ToM3(cm3: number) {
  return cm3 * 1e-6
}

function m3ToCm3(m3: number) {
  return m3 * 1e6
}

function paToMPa(pa: number) {
  return pa / 1e6
}

function mpaToPa(mpa: number) {
  return mpa * 1e6
}

function m3sToLps(m3s: number) {
  return m3s * 1000
}

export function applyParamLinkage(raw: PQ2Params): PQ2Params {
  const next: PQ2Params = { ...raw }

  const geometryArea = Math.max(0, raw.gateWidthMm) * Math.max(0, raw.gateThicknessMm)
  if (!raw.useCustomGateArea) next.gateAreaMm2 = geometryArea

  const densityKgM3 = Number.isFinite(raw.densityKgM3) ? raw.densityKgM3 : 0
  const densityKgCm3 = densityKgM3 / 1e6

  if (raw.inputBasis === 'mass') {
    const volumeCm3 = densityKgCm3 > 0 ? raw.castingMassKg / densityKgCm3 : 0
    next.castingVolumeCm3 = Number.isFinite(volumeCm3) ? volumeCm3 : 0
  } else {
    const massKg = raw.castingVolumeCm3 * densityKgCm3
    next.castingMassKg = Number.isFinite(massKg) ? massKg : 0
  }

  return next
}

export function normalizePQ2Params(params: PQ2Params): PQ2Normalized {
  const castingVolumeM3 = cm3ToM3(params.castingVolumeCm3)
  const gateAreaM2 = mm2ToM2(params.gateAreaMm2)

  const plungerDiameterM = params.plungerDiameterMm / 1000
  const plungerAreaM2 = (Math.PI * plungerDiameterM * plungerDiameterM) / 4

  return {
    densityKgM3: params.densityKgM3,
    castingVolumeM3,
    fillTimeS: params.fillTimeS,
    gateAreaM2,
    dischargeCoeff: params.dischargeCoeff,
    extraLossPa: mpaToPa(params.extraLossMPa),
    machineMaxPressurePa: mpaToPa(params.machineMaxPressureMPa),
    plungerAreaM2,
    plungerMaxSpeedMps: params.plungerMaxSpeedMps,
  }
}

export function computePQ2(rawParams: PQ2Params): PQ2ComputeResult {
  const params = applyParamLinkage(rawParams)
  const normalized = normalizePQ2Params(params)
  const warnings: string[] = []
  const errors: string[] = []

  if (!(params.densityKgM3 > 0)) errors.push('密度必须大于 0')
  if (!(params.fillTimeS > 0)) errors.push('充型时间必须大于 0')
  if (!(params.gateAreaMm2 > 0)) errors.push('浇口面积必须大于 0')
  if (!(params.dischargeCoeff > 0 && params.dischargeCoeff <= 1)) errors.push('流量系数需在 (0, 1] 内')
  if (!(params.machineMaxPressureMPa > 0)) errors.push('机台最大压力必须大于 0')
  if (!(params.plungerDiameterMm > 0)) errors.push('冲头直径必须大于 0')
  if (!(params.plungerMaxSpeedMps > 0)) errors.push('冲头最大速度必须大于 0')

  const castingVolumeM3 = normalized.castingVolumeM3
  if (!(castingVolumeM3 > 0)) errors.push('充型体积必须大于 0')

  const qRequiredM3s = normalized.fillTimeS > 0 ? castingVolumeM3 / normalized.fillTimeS : 0
  const qMaxM3s = normalized.plungerAreaM2 * normalized.plungerMaxSpeedMps

  if (qMaxM3s > 0 && qRequiredM3s > qMaxM3s) warnings.push('需求流量超过机台最大流量，工作点可能不可达')

  const cd = normalized.dischargeCoeff
  const gateAreaM2 = normalized.gateAreaM2

  const dieSlopePaPerM6s2 =
    gateAreaM2 > 0 && cd > 0 ? normalized.densityKgM3 / (2 * cd * cd * gateAreaM2 * gateAreaM2) : 0

  const p0Pa = normalized.extraLossPa
  const pMaxPa = normalized.machineMaxPressurePa
  const qMax2 = qMaxM3s * qMaxM3s
  const mPaPerM6s2 = qMax2 > 0 ? pMaxPa / qMax2 : 0

  // 计算理论交点位置，用于指导采样
  const intersectQ2 =
    dieSlopePaPerM6s2 + mPaPerM6s2 > 0 ? (pMaxPa - p0Pa) / (dieSlopePaPerM6s2 + mPaPerM6s2) : NaN
  const intersectQM3s = Math.sqrt(Math.max(0, intersectQ2))

  // 扩大采样范围，确保包含交点和足够的余量
  const qUpper = Math.max(
    qMaxM3s > 0 ? qMaxM3s * 1.15 : 0, // 扩大到 115%
    intersectQM3s > 0 ? intersectQM3s * 1.1 : 0, // 确保交点可见
    qRequiredM3s * 1.1 // 确保工作点可见
  )

  // 生成采样点，在交点附近使用更密集的采样
  const curve: PQ2CurveSample[] = []
  const sampleCount = 220
  const intersectRatio = qUpper > 0 ? intersectQM3s / qUpper : 0.5

  for (let i = 0; i <= sampleCount; i += 1) {
    // 使用非线性采样，在交点附近更密集
    let t = i / sampleCount
    if (Number.isFinite(intersectRatio) && intersectRatio > 0.1 && intersectRatio < 0.9) {
      // 在交点附近增加采样密度
      const focus = intersectRatio
      const normalizedT = (t - focus) * 2 // 映射到 [-1, 1] 范围
      if (Math.abs(normalizedT) < 0.5) {
        // 在交点附近使用更密集的采样
        t = focus + (t - focus) * 0.5
      }
    }
    t = Math.max(0, Math.min(1, t))

    const q = qUpper * t
    const q2 = q * q
    const pMachinePa = pMaxPa - mPaPerM6s2 * q2
    const pDiePa = p0Pa + dieSlopePaPerM6s2 * q2
    curve.push({
      qLps: m3sToLps(q),
      q2Lps2: Math.pow(m3sToLps(q), 2),
      pMachineMPa: paToMPa(Math.max(0, pMachinePa)),
      pDieMPa: paToMPa(Math.max(0, pDiePa)),
    })
  }

  const qRequiredLps = m3sToLps(qRequiredM3s)
  const qMaxLps = m3sToLps(qMaxM3s)
  const xRequiredLps2 = qRequiredLps * qRequiredLps
  const xMaxLps2 = qMaxLps * qMaxLps

  const pRequiredPa = p0Pa + dieSlopePaPerM6s2 * qRequiredM3s * qRequiredM3s
  const pMachineAtRequiredPa = pMaxPa - mPaPerM6s2 * qRequiredM3s * qRequiredM3s

  const pRequiredMPa = paToMPa(pRequiredPa)
  const pMachineAtRequiredMPa = paToMPa(Math.max(0, pMachineAtRequiredPa))
  const marginMPa = pMachineAtRequiredMPa - pRequiredMPa

  // 使用之前计算的交点位置
  const intersect =
    Number.isFinite(intersectQ2) && intersectQ2 > 0
      ? (() => {
          const q = Math.sqrt(intersectQ2)
          const pPa = p0Pa + dieSlopePaPerM6s2 * intersectQ2
          return { qLps: m3sToLps(q), q2Lps2: Math.pow(m3sToLps(q), 2), pMPa: paToMPa(pPa) }
        })()
      : undefined

  const feasible =
    qMaxM3s > 0 && intersectQ2 > 0
      ? {
          q2MinLps2: 0,
          q2MaxLps2: Math.pow(m3sToLps(Math.min(qMaxM3s, Math.sqrt(intersectQ2))), 2),
        }
      : undefined

  const inputMassKg =
    params.inputBasis === 'mass' ? params.castingMassKg : params.castingVolumeCm3 * (params.densityKgM3 / 1e6)

  const intermediate = {
    gateAreaMm2: params.gateAreaMm2,
    gateAreaM2,
    castingVolumeCm3: params.castingVolumeCm3,
    castingVolumeM3,
    castingMassKg: inputMassKg,
    qRequiredM3s,
    qRequiredLps,
    qMaxM3s,
    qMaxLps,
    xRequiredLps2,
    xMaxLps2,
    dieSlopeMPaPerM6s2: paToMPa(dieSlopePaPerM6s2),
    dieSlopeMPaPerLps2: paToMPa(dieSlopePaPerM6s2) / 1e6,
  }

  const points = {
    operating: {
      qLps: qRequiredLps,
      q2Lps2: xRequiredLps2,
      pRequiredMPa,
      pMachineMPa: pMachineAtRequiredMPa,
      marginMPa,
    },
    intersect,
    feasible,
  }

  if (params.useCustomGateArea) warnings.push('浇口面积使用自定义值，注意与几何尺寸一致性')
  if (params.fillTimeS < 0.02) warnings.push('充型时间偏小，可能导致需求流量/压力显著升高')
  if (params.fillTimeS > 0.2) warnings.push('充型时间偏大，可能导致工作点落入低速区域')

  const gateVelocityMps = gateAreaM2 > 0 ? qRequiredM3s / gateAreaM2 : 0
  if (gateVelocityMps > 0 && gateVelocityMps > 120) warnings.push('浇口流速偏高，请确认浇口面积与充型时间')
  if (gateVelocityMps > 0 && gateVelocityMps < 20) warnings.push('浇口流速偏低，请确认充型时间窗口')

  const normalizedVolumeFromMass =
    params.densityKgM3 > 0 ? m3ToCm3(inputMassKg / params.densityKgM3) : params.castingVolumeCm3
  if (params.inputBasis === 'mass' && params.castingVolumeCm3 > 0) {
    const drift = Math.abs(params.castingVolumeCm3 - normalizedVolumeFromMass) / Math.max(1, params.castingVolumeCm3)
    if (drift > 0.05) warnings.push('质量/体积联动存在较大差异，请检查密度或输入值')
  }

  const sanitized: PQ2Params = {
    ...params,
    densityKgM3: clampNumber(params.densityKgM3, 1, 40000),
    castingMassKg: clampNumber(params.castingMassKg, 0, 5000),
    castingVolumeCm3: clampNumber(params.castingVolumeCm3, 0, 5e7),
    fillTimeS: clampNumber(params.fillTimeS, 0, 60),
    gateWidthMm: clampNumber(params.gateWidthMm, 0, 5000),
    gateThicknessMm: clampNumber(params.gateThicknessMm, 0, 500),
    gateAreaMm2: clampNumber(params.gateAreaMm2, 0, 5e6),
    dischargeCoeff: clampNumber(params.dischargeCoeff, 0.01, 1),
    extraLossMPa: clampNumber(params.extraLossMPa, 0, 400),
    machineMaxPressureMPa: clampNumber(params.machineMaxPressureMPa, 0, 400),
    plungerDiameterMm: clampNumber(params.plungerDiameterMm, 1, 500),
    plungerMaxSpeedMps: clampNumber(params.plungerMaxSpeedMps, 0, 20),
  }

  return {
    params: sanitized,
    normalized,
    intermediate,
    points,
    curve,
    warnings,
    errors,
  }
}
