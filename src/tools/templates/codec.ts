import type { PQ2Params } from '../pq2/types'
import { createPQ2TemplateDoc, TEMPLATE_SCHEMA_ID, type TemplateDocument } from './types'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isString(value: unknown): value is string {
  return typeof value === 'string'
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean'
}

function isPQ2Params(value: unknown): value is PQ2Params {
  if (!isRecord(value)) return false

  return (
    isString(value.materialId) &&
    isNumber(value.densityKgM3) &&
    (value.inputBasis === 'mass' || value.inputBasis === 'volume') &&
    isNumber(value.castingMassKg) &&
    isNumber(value.castingVolumeCm3) &&
    isNumber(value.fillTimeS) &&
    isNumber(value.gateWidthMm) &&
    isNumber(value.gateThicknessMm) &&
    isBoolean(value.useCustomGateArea) &&
    isNumber(value.gateAreaMm2) &&
    isNumber(value.dischargeCoeff) &&
    isNumber(value.extraLossMPa) &&
    isNumber(value.machineMaxPressureMPa) &&
    isNumber(value.plungerDiameterMm) &&
    isNumber(value.plungerMaxSpeedMps)
  )
}

function isTemplateDocumentV1(value: unknown): value is TemplateDocument {
  if (!isRecord(value)) return false
  if (value.schema !== TEMPLATE_SCHEMA_ID) return false
  if (value.version !== 1) return false
  if (value.kind !== 'pq2') return false
  if (!isRecord(value.meta)) return false
  if (!isRecord(value.payload)) return false
  return isString(value.meta.name) && isString(value.meta.createdAt) && isString(value.meta.updatedAt) && isPQ2Params(value.payload.params)
}

export function parseTemplateJson(jsonText: string, options?: { now?: Date; defaultName?: string }) {
  const now = options?.now ?? new Date()
  const warnings: string[] = []
  const defaultName = options?.defaultName ?? 'PQ² 模板'

  let raw: unknown
  try {
    raw = JSON.parse(jsonText) as unknown
  } catch {
    throw new Error('不是有效的 JSON 文件')
  }

  if (isTemplateDocumentV1(raw)) return { doc: raw, warnings }

  if (isRecord(raw)) {
    const tool = raw.tool
    const params = raw.params
    const exportedAt = raw.exportedAt

    if (tool === 'PQ2' && isPQ2Params(params)) {
      if (!isString(exportedAt)) warnings.push('缺少 exportedAt，已使用当前时间填充')
      const doc = createPQ2TemplateDoc({
        name: defaultName,
        params,
        now: isString(exportedAt) ? new Date(exportedAt) : now,
      })
      return { doc, warnings }
    }
  }

  if (isPQ2Params(raw)) {
    warnings.push('检测到裸 PQ² 参数对象，已自动封装为模板文档')
    const doc = createPQ2TemplateDoc({ name: defaultName, params: raw, now })
    return { doc, warnings }
  }

  throw new Error('无法识别的模板结构：请使用模板文档或 PQ² 导出 JSON')
}

export function stringifyTemplateDoc(doc: TemplateDocument) {
  return JSON.stringify(doc, null, 2)
}

export function bumpUpdatedAt(doc: TemplateDocument, now?: Date): TemplateDocument {
  const next = now ?? new Date()
  return {
    ...doc,
    meta: {
      ...doc.meta,
      updatedAt: next.toISOString(),
    },
  }
}
