import type { ToolDefinition, ToolId } from './types'

export class ToolRegistry {
  private readonly toolsById = new Map<ToolId, ToolDefinition>()
  private readonly toolsByRoute = new Map<string, ToolDefinition>()

  register(tool: ToolDefinition) {
    if (this.toolsById.has(tool.id)) {
      throw new Error(`Tool id already registered: ${tool.id}`)
    }
    if (this.toolsByRoute.has(tool.route)) {
      throw new Error(`Tool route already registered: ${tool.route}`)
    }

    this.toolsById.set(tool.id, tool)
    this.toolsByRoute.set(tool.route, tool)
  }

  list() {
    return Array.from(this.toolsById.values()).sort((a, b) => {
      const ao = a.order ?? 0
      const bo = b.order ?? 0
      if (ao !== bo) return ao - bo
      return a.navLabel.localeCompare(b.navLabel, 'zh-Hans-CN')
    })
  }

  getById(id: ToolId) {
    return this.toolsById.get(id)
  }

  getByRoute(route: string) {
    return this.toolsByRoute.get(route)
  }
}

