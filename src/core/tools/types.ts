import type { ReactNode } from 'react'

export type ToolId = string

export type ToolDefinition = {
  id: ToolId
  title: string
  navLabel: string
  route: string
  icon: ReactNode
  description?: string
  order?: number
  element: ReactNode
}

