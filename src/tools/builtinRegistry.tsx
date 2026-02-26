import { AppstoreOutlined, ExperimentOutlined, LineChartOutlined, SettingOutlined, DatabaseOutlined, TeamOutlined, RobotOutlined } from '@ant-design/icons'
import { ToolRegistry } from '../core/tools/ToolRegistry'
import type { ToolDefinition } from '../core/tools/types'
import { DashboardPage } from '../pages/DashboardPage'
import { PQ2Page } from '../pages/PQ2Page'
import { SettingsPage } from '../pages/SettingsPage'
import { TemplatesPage } from '../pages/TemplatesPage'
import { MachineDatabasePage } from '../pages/MachineDatabasePage'
import { UserManagementPage } from '../pages/UserManagementPage'
import { AIAssistantPage } from '../pages/AIAssistantPage'

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
      allowedRoles: ['admin', 'engineer', 'viewer'],
    },
    {
      id: 'machines',
      title: '设备数据库',
      navLabel: '设备数据库',
      route: '/machines',
      icon: <DatabaseOutlined />,
      order: 15,
      element: <MachineDatabasePage />,
      allowedRoles: ['admin', 'engineer', 'viewer'],
    },
    {
      id: 'pq2',
      title: 'PQ² 图',
      navLabel: 'PQ² 图',
      route: '/pq2',
      icon: <LineChartOutlined />,
      order: 20,
      element: <PQ2Page />,
      allowedRoles: ['admin', 'engineer', 'operator', 'viewer'],
    },
    {
      id: 'templates',
      title: '模板管理',
      navLabel: '模板管理',
      route: '/templates',
      icon: <ExperimentOutlined />,
      order: 30,
      element: <TemplatesPage />,
      allowedRoles: ['admin', 'engineer', 'viewer'],
    },
    {
      id: 'settings',
      title: '设置',
      navLabel: '设置',
      route: '/settings',
      icon: <SettingOutlined />,
      order: 40,
      element: <SettingsPage />,
      allowedRoles: ['admin', 'engineer', 'viewer'],
    },
    {
      id: 'users',
      title: '用户管理',
      navLabel: '用户管理',
      route: '/users',
      icon: <TeamOutlined />,
      order: 100,
      element: <UserManagementPage />,
      allowedRoles: ['admin'],
    },
    {
      id: 'ai',
      title: 'AI 助手',
      navLabel: 'AI 助手',
      route: '/ai',
      icon: <RobotOutlined />,
      order: 90,
      element: <AIAssistantPage />,
      allowedRoles: ['admin', 'engineer', 'viewer'],
    },
  ]
}

export const builtinToolRegistry = (() => {
  const registry = new ToolRegistry()
  for (const tool of createBuiltinTools()) registry.register(tool)
  return registry
})()

