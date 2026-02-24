import { describe, expect, it } from 'vitest'
import { bumpUpdatedAt, parseTemplateJson, stringifyTemplateDoc } from './codec'
import { createPQ2TemplateDoc, TEMPLATE_SCHEMA_ID, type TemplateDocument } from './types'
import type { PQ2Params } from '../pq2/types'

const baseParams: PQ2Params = {
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

describe('template codec', () => {
  it('parses TemplateDocumentV1 without warnings', () => {
    const now = new Date('2026-01-02T03:04:05.000Z')
    const doc = createPQ2TemplateDoc({ name: 'My Template', params: baseParams, now })
    const parsed = parseTemplateJson(stringifyTemplateDoc(doc))
    expect(parsed.warnings).toEqual([])
    expect(parsed.doc).toEqual(doc)
  })

  it('parses PQ2 export payload', () => {
    const exportedAt = '2026-01-01T00:00:00.000Z'
    const payload = {
      tool: 'PQ2',
      exportedAt,
      params: baseParams,
    }
    const parsed = parseTemplateJson(JSON.stringify(payload), { defaultName: 'From Export' })
    expect(parsed.warnings).toEqual([])
    expect(parsed.doc.schema).toBe(TEMPLATE_SCHEMA_ID)
    expect(parsed.doc.version).toBe(1)
    expect(parsed.doc.kind).toBe('pq2')
    expect(parsed.doc.meta.name).toBe('From Export')
    expect(parsed.doc.meta.createdAt).toBe(exportedAt)
    expect(parsed.doc.meta.updatedAt).toBe(exportedAt)
    expect(parsed.doc.payload.params).toEqual(baseParams)
  })

  it('fills exportedAt when missing in PQ2 export payload', () => {
    const now = new Date('2026-02-02T10:20:30.000Z')
    const payload = {
      tool: 'PQ2',
      params: baseParams,
    }
    const parsed = parseTemplateJson(JSON.stringify(payload), { now, defaultName: 'Fallback Name' })
    expect(parsed.warnings).toEqual(['缺少 exportedAt，已使用当前时间填充'])
    expect(parsed.doc.meta.name).toBe('Fallback Name')
    expect(parsed.doc.meta.createdAt).toBe(now.toISOString())
    expect(parsed.doc.meta.updatedAt).toBe(now.toISOString())
  })

  it('wraps bare PQ2 params into a template doc', () => {
    const now = new Date('2026-03-03T11:22:33.000Z')
    const parsed = parseTemplateJson(JSON.stringify(baseParams), { now, defaultName: 'Wrapped' })
    expect(parsed.warnings).toEqual(['检测到裸 PQ² 参数对象，已自动封装为模板文档'])
    expect(parsed.doc.meta.name).toBe('Wrapped')
    expect(parsed.doc.meta.createdAt).toBe(now.toISOString())
    expect(parsed.doc.payload.params).toEqual(baseParams)
  })

  it('throws on invalid JSON', () => {
    expect(() => parseTemplateJson('{not json')).toThrowError('不是有效的 JSON 文件')
  })

  it('throws on unknown structure', () => {
    expect(() => parseTemplateJson(JSON.stringify({ hello: 'world' }))).toThrowError(
      '无法识别的模板结构：请使用模板文档或 PQ² 导出 JSON',
    )
  })

  it('stringify+parse roundtrip preserves doc', () => {
    const doc = createPQ2TemplateDoc({ name: 'Roundtrip', params: baseParams, now: new Date('2026-01-01T00:00:00.000Z') })
    const text = stringifyTemplateDoc(doc)
    const reparsed = JSON.parse(text) as TemplateDocument
    expect(reparsed).toEqual(doc)
    expect(text).toContain('\n  "schema":')
  })

  it('bumpUpdatedAt only changes updatedAt', () => {
    const doc = createPQ2TemplateDoc({ name: 'Bump', params: baseParams, now: new Date('2026-01-01T00:00:00.000Z') })
    const nextTime = new Date('2026-01-02T00:00:00.000Z')
    const bumped = bumpUpdatedAt(doc, nextTime)
    expect(bumped.meta.createdAt).toBe(doc.meta.createdAt)
    expect(bumped.meta.updatedAt).toBe(nextTime.toISOString())
    expect(bumped.payload).toEqual(doc.payload)
  })
})

