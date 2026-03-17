import type { ToolDefinition } from '../core/tools/types'

export function isToolVisibleInNav(tool: ToolDefinition) {
  return !tool.hiddenInNav
}
