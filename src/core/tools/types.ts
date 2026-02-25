import type { ReactNode } from 'react'
import type { Role } from '../auth/types'

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
  allowedRoles?: Role[]
}

