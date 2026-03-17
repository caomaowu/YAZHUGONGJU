import { AppstoreOutlined, ArrowRightOutlined, LineChartOutlined, ThunderboltOutlined } from '@ant-design/icons'
import { Button, Card, Col, Row, Space, Tag, Typography } from 'antd'
import { useHashPath } from '../core/router/hash'

const TOOLBOX_TOOLS = [
  {
    key: 'pq2',
    title: 'PQ² 图',
    description: '用于浇口速度、充填时间与设备能力匹配分析，快速判断工艺窗口是否可行。',
    route: '/pq2',
    icon: <LineChartOutlined />,
    accentClassName: 'toolboxCardPq2',
    tag: '工艺分析',
  },
  {
    key: 'filling-simulation',
    title: '压射模拟',
    description: '面向压室充填与压射阶段的参数推演，帮助对比不同速度与切换点设置。',
    route: '/filling-simulation',
    icon: <ThunderboltOutlined />,
    accentClassName: 'toolboxCardSim',
    tag: '模拟推演',
  },
]

export function ToolboxPage() {
  const { navigate } = useHashPath()

  return (
    <>
      <div className="centerHeader">
        <div className="centerTitle">
          <Typography.Text type="secondary">工具箱</Typography.Text>
          <h1>压铸工具仓库</h1>
          <p>把常用工艺分析与模拟工具收纳在一起，从这里进入 `PQ² 图` 和 `压射模拟`。</p>
        </div>

        <Space wrap size={10}>
          <Tag color="purple">Tool Hub</Tag>
          <Button type="primary" icon={<AppstoreOutlined />} onClick={() => navigate('/dashboard')}>
            返回工作台
          </Button>
        </Space>
      </div>

      <div className="centerBody">
        <Card className="softCard toolboxHeroCard">
          <div className="toolboxHero">
            <div className="toolboxHeroBadge">
              <AppstoreOutlined />
            </div>
            <div className="toolboxHeroText">
              <Typography.Title level={3}>把常用工具集中在一个入口里</Typography.Title>
              <Typography.Paragraph>
                这里作为压铸工具的仓库页，优先承载工艺计算、参数分析与模拟工具。后续新增工具时，可继续扩展到同一页面。
              </Typography.Paragraph>
            </div>
          </div>
        </Card>

        <Row gutter={[14, 14]}>
          {TOOLBOX_TOOLS.map((tool) => (
            <Col xs={24} lg={12} key={tool.key}>
              <Card className={`softCard toolboxToolCard ${tool.accentClassName}`}>
                <div className="toolboxToolTop">
                  <div className="toolboxToolIcon">{tool.icon}</div>
                  <Tag bordered={false} color="purple">
                    {tool.tag}
                  </Tag>
                </div>

                <Typography.Title level={4} style={{ marginBottom: 8 }}>
                  {tool.title}
                </Typography.Title>
                <Typography.Paragraph className="toolboxToolDescription">
                  {tool.description}
                </Typography.Paragraph>

                <Button type="primary" icon={<ArrowRightOutlined />} onClick={() => navigate(tool.route)}>
                  打开工具
                </Button>
              </Card>
            </Col>
          ))}
        </Row>
      </div>
    </>
  )
}
