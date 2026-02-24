import type { PQ2Material } from './types'

export const PQ2_MATERIALS: PQ2Material[] = [
  { id: 'A380', name: 'A380（Al-Si-Cu）', densityKgM3: 2680 },
  { id: 'ADC12', name: 'ADC12（Al-Si-Cu）', densityKgM3: 2700 },
  { id: 'ALSi9Cu3', name: 'AlSi9Cu3', densityKgM3: 2680 },
  { id: 'AZ91D', name: 'AZ91D（镁合金）', densityKgM3: 1810 },
]

export function getMaterialById(id: PQ2Material['id']) {
  return PQ2_MATERIALS.find((m) => m.id === id) ?? PQ2_MATERIALS[0]
}

