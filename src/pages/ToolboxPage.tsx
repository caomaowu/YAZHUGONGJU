import { ArrowRightOutlined } from '@ant-design/icons'
import { Button, Card, Col, Row, Tag, Typography } from 'antd'
import { useHashPath } from '../core/router/hash'
import type { ToolDefinition } from '../core/tools/types'

interface ToolboxPageProps {
  getTools: () => ToolDefinition[]
}

export function ToolboxPage({ getTools }: ToolboxPageProps) {
  const { navigate } = useHashPath()
  const tools = getTools()

  return (
    <>
      <div className="centerHeader">
        <div className="centerTitle">
          <Typography.Text type="secondary">工具箱</Typography.Text>
          <h1>压铸工具仓库</h1>
        </div>
      </div>

      <div className="centerBody">
        <Row gutter={[14, 14]}>
          {tools.map((tool, index) => (
            <Col xs={24} lg={12} key={tool.id}>
              <Card className={`softCard toolboxToolCard ${index % 2 === 0 ? 'toolboxCardPq2' : 'toolboxCardSim'}`}>
                <div className="toolboxToolTop">
                  <div className="toolboxToolIcon">{tool.icon}</div>
                  <Tag bordered={false} color="purple">
                    {tool.toolCategory === 'toolbox' ? '工具箱' : '工具'}
                  </Tag>
                </div>

                <Typography.Title level={4} style={{ marginBottom: 8 }}>
                  {tool.title}
                </Typography.Title>
                <Typography.Paragraph className="toolboxToolDescription">
                  {tool.description || `${tool.title} 已加入工具箱。`}
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
