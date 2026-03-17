import { describe, expect, it } from 'vitest'
import type { ToolDefinition } from '../core/tools/types'
import { isToolVisibleInNav } from './navigation'

function createTool(partial?: Partial<ToolDefinition>): ToolDefinition {
  return {
    id: 'demo',
    title: 'Demo',
    navLabel: 'Demo',
    route: '/demo',
    icon: null,
    element: null,
    ...partial,
  }
}

describe('isToolVisibleInNav', () => {
  it('shows tools by default', () => {
    expect(isToolVisibleInNav(createTool())).toBe(true)
  })

  it('hides tools marked as hiddenInNav', () => {
    expect(isToolVisibleInNav(createTool({ hiddenInNav: true }))).toBe(false)
  })
})
