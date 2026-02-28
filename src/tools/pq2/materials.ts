import type { PQ2Material } from './types'

export const PQ2_MATERIALS: PQ2Material[] = [
  { id: 'ADC12', name: 'ADC12', densityKgM3: 2650 },
  { id: 'ALSi9Cu3', name: 'AlSi9Cu3', densityKgM3: 2680 },
  { id: 'AZ91D', name: 'AZ91D（镁合金）', densityKgM3: 1800 },
]

export function getMaterialById(id: PQ2Material['id']) {
  return PQ2_MATERIALS.find((m) => m.id === id) ?? PQ2_MATERIALS[0]
}

