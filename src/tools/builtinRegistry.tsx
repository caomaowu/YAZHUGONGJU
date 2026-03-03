import { AppstoreOutlined, LineChartOutlined, DatabaseOutlined, TeamOutlined, RobotOutlined, FundOutlined, ThunderboltOutlined, BookOutlined } from '@ant-design/icons'
import { ToolRegistry } from '../core/tools/ToolRegistry'
import type { ToolDefinition } from '../core/tools/types'
import { DashboardPage } from '../pages/DashboardPage'
import { PQ2Page } from '../pages/PQ2Page'
import { FillingSimulationPage } from '../pages/FillingSimulationPage'
import { MachineDatabasePage } from '../pages/MachineDatabasePage'
import { MaterialsDatabasePage } from '../pages/MaterialsDatabasePage'
import { UserManagementPage } from '../pages/UserManagementPage'
import { AIKnowledgeBasePage } from '../pages/AIKnowledgeBase/AIKnowledgeBasePage'
import { KnowledgeBasePage } from '../pages/KnowledgeBase/KnowledgeBasePage'

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
      id: 'materials',
      title: '材料数据库',
      navLabel: '材料数据库',
      route: '/materials',
      icon: <DatabaseOutlined />,
      order: 16,
      element: <MaterialsDatabasePage />,
      allowedRoles: ['admin', 'engineer', 'viewer'],
    },
    {
      id: 'knowledge-base',
      title: '知识库',
      navLabel: '知识库',
      route: '/knowledge-base',
      icon: <BookOutlined />,
      order: 17,
      element: <KnowledgeBasePage />,
      allowedRoles: ['admin', 'engineer', 'viewer'],
    },
    {
      id: 'project-big-data',
      title: '项目大数据',
      navLabel: '项目大数据',
      route: '/big-data',
      icon: <FundOutlined />,
      order: 18,
      element: <div style={{ padding: 24, fontSize: 18, fontWeight: 'bold' }}>暂未开放</div>,
      allowedRoles: ['admin', 'engineer', 'viewer'],
      disabled: true,
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
      id: 'filling-simulation',
      title: '压射模拟',
      navLabel: '压射模拟',
      route: '/filling-simulation',
      icon: <ThunderboltOutlined />,
      order: 25,
      element: <FillingSimulationPage />,
      allowedRoles: ['admin', 'engineer', 'operator', 'viewer'],
    },
    {
      id: 'ai-knowledge',
      title: 'AI助手',
      navLabel: 'AI助手',
      route: '/ai-knowledge',
      icon: <RobotOutlined />,
      order: 200,
      element: <AIKnowledgeBasePage />,
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
  ]
}

export const builtinToolRegistry = (() => {
  const registry = new ToolRegistry()
  for (const tool of createBuiltinTools()) registry.register(tool)
  return registry
})()

