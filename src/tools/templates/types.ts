import type { PQ2Params } from '../pq2/types'

export const TEMPLATE_SCHEMA_ID = 'diecasting-toolkit.template' as const

export type TemplateKind = 'pq2'

export type TemplateMeta = {
  name: string
  description?: string
  createdAt: string
  updatedAt: string
}

export type PQ2TemplatePayload = {
  params: PQ2Params
}

export type TemplateDocumentV1 = {
  schema: typeof TEMPLATE_SCHEMA_ID
  version: 1
  kind: 'pq2'
  meta: TemplateMeta
  payload: PQ2TemplatePayload
}

export type TemplateDocument = TemplateDocumentV1

export function createPQ2TemplateDoc(input: {
  name: string
  description?: string
  params: PQ2Params
  now?: Date
}): TemplateDocumentV1 {
  const d = input.now ?? new Date()
  const iso = d.toISOString()
  return {
    schema: TEMPLATE_SCHEMA_ID,
    version: 1,
    kind: 'pq2',
    meta: {
      name: input.name,
      description: input.description,
      createdAt: iso,
      updatedAt: iso,
    },
    payload: {
      params: input.params,
    },
  }
}
