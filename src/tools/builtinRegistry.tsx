import { AppstoreOutlined, ExperimentOutlined, LineChartOutlined, SettingOutlined, DatabaseOutlined } from '@ant-design/icons'
import { ToolRegistry } from '../core/tools/ToolRegistry'
import type { ToolDefinition } from '../core/tools/types'
import { DashboardPage } from '../pages/DashboardPage'
import { PQ2Page } from '../pages/PQ2Page'
import { SettingsPage } from '../pages/SettingsPage'
import { TemplatesPage } from '../pages/TemplatesPage'
import { MachineDatabasePage } from '../pages/MachineDatabasePage'

function createBuiltinTools(): ToolDefinition[] {
  return [
    {
      id: 'dashboard',
      title: '工作台',
      navLabel: '工作台',
      route: '/dashboard',
      icon: <AppstoreOutlined />,
      order: 10,
      element: <DashboardPage />,
    },
    {
      id: 'machines',
      title: '设备数据库',
      navLabel: '设备数据库',
      route: '/machines',
      icon: <DatabaseOutlined />,
      order: 15,
      element: <MachineDatabasePage />,
    },
    {
      id: 'pq2',
      title: 'PQ² 图',
      navLabel: 'PQ² 图',
      route: '/pq2',
      icon: <LineChartOutlined />,
      order: 20,
      element: <PQ2Page />,
    },
    {
      id: 'templates',
      title: '模板管理',
      navLabel: '模板管理',
      route: '/templates',
      icon: <ExperimentOutlined />,
      order: 30,
      element: <TemplatesPage />,
    },
    {
      id: 'settings',
      title: '设置',
      navLabel: '设置',
      route: '/settings',
      icon: <SettingOutlined />,
      order: 40,
      element: <SettingsPage />,
    },
  ]
}

export const builtinToolRegistry = (() => {
  const registry = new ToolRegistry()
  for (const tool of createBuiltinTools()) registry.register(tool)
  return registry
})()

