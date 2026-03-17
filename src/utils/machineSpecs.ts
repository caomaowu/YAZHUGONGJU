import type { MachineModelSpecs } from '../types/machine'

function toFiniteNumber(value: unknown): number | undefined {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value.trim())
        : Number.NaN

  return Number.isFinite(parsed) ? parsed : undefined
}

export function computeBarrelInnerLength(
  rawSpecs?: Partial<MachineModelSpecs>,
): number | undefined {
  if (!rawSpecs) return undefined

  const shotStroke = toFiniteNumber(rawSpecs.压射配置?.[0]?.射料行程_mm)
  const plungerStroke = toFiniteNumber(rawSpecs.冲头行程_mm)

  if (shotStroke === undefined || plungerStroke === undefined) return undefined

  return shotStroke - plungerStroke
}

export function normalizeMachineRawSpecs(
  rawSpecs?: Partial<MachineModelSpecs>,
): MachineModelSpecs | undefined {
  if (!rawSpecs) return undefined

  const barrelInnerLength = computeBarrelInnerLength(rawSpecs)

  return {
    ...rawSpecs,
    ...(barrelInnerLength !== undefined
      ? { 料管内部长度_mm: barrelInnerLength }
      : {}),
  } as MachineModelSpecs
}
