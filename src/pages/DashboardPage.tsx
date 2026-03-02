import { useMemo } from 'react'
import { Button, Card, Progress, Segmented, Space, Statistic, Tag, Typography, theme } from 'antd'
import { LineChartOutlined, ThunderboltOutlined } from '@ant-design/icons'
import * as echarts from 'echarts'
import { EChart } from '../components/charts/EChart'
import { useHashPath } from '../core/router/hash'
import { useSharedValue } from '../core/state/hooks'

export function DashboardPage() {
  const { token } = theme.useToken()
  const { navigate } = useHashPath()
  const [machineName] = useSharedValue<string>('global', 'machineName', '未设置')

  const chartOption = useMemo<echarts.EChartsOption>(() => {
    const x = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
    const y = [12, 16, 14, 18, 22, 20, 24]

    return {
      animationDuration: 700,
      grid: { left: 18, right: 18, top: 14, bottom: 16, containLabel: true },
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: x,
        axisLine: { lineStyle: { color: 'rgba(33, 23, 53, 0.18)' } },
        axisTick: { show: false },
        axisLabel: { color: 'rgba(33, 23, 53, 0.62)' },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: 'rgba(33, 23, 53, 0.52)' },
        splitLine: { lineStyle: { color: 'rgba(139, 92, 246, 0.12)' } },
      },
      series: [
        {
          name: '工况评分',
          type: 'line',
          smooth: true,
          showSymbol: false,
          data: y,
          lineStyle: { width: 3, color: token.colorPrimary },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(139, 92, 246, 0.42)' },
              { offset: 1, color: 'rgba(139, 92, 246, 0.06)' },
            ]),
          },
        },
      ],
    }
  }, [token.colorPrimary])

  return (
    <>
      <div className="centerHeader">
        <div className="centerTitle">
          <Typography.Text type="secondary">工作台</Typography.Text>
          <h1>压铸工具箱 · Lavender Workbench</h1>
          <p>路由与工具注册中心已接入：点击左侧导航即可切换工具。</p>
        </div>

        <Space wrap size={10}>
          <Segmented
            options={[
              { label: '概览', value: 'overview' },
              { label: '趋势', value: 'trend' },
              { label: '记录', value: 'history' },
            ]}
            size="small"
          />
          <Button type="primary" icon={<ThunderboltOutlined />} onClick={() => navigate('/pq2')}>
            快速开始
          </Button>
        </Space>
      </div>

      <div className="centerBody">
        <div className="cardGrid">
          <Card
            className="softCard span8"
            title="本周趋势（ECharts 封装示例）"
            extra={<Tag color="purple">Reusable</Tag>}
          >
            <div className="chartWrap">
              <EChart option={chartOption} style={{ width: '100%', height: '100%' }} />
            </div>
          </Card>

          <Card className="softCard span4" title="快捷入口">
            <Space direction="vertical" size={10} style={{ width: '100%' }}>
              <Button block type="primary" icon={<LineChartOutlined />} onClick={() => navigate('/pq2')}>
                新建 PQ² 计算
              </Button>
              <div className="pill">
                <Typography.Text type="secondary">今日专注</Typography.Text>
                <Progress percent={68} strokeColor={token.colorPrimary} trailColor="rgba(0,0,0,0.04)" />
              </div>
            </Space>
          </Card>

          <Card className="softCard span4" title="运行状态">
            <div className="metricRow">
              <div className="pill">
                <Statistic title="计算次数" value={26} />
              </div>
            </div>
            <div style={{ height: 10 }} />
            <div className="pill">
              <Typography.Text type="secondary">质量评分</Typography.Text>
              <Progress
                percent={92}
                strokeColor={{
                  '0%': '#8B5CF6',
                  '100%': '#EC4899',
                }}
                trailColor="rgba(0,0,0,0.04)"
              />
            </div>
          </Card>

          <Card className="softCard span8" title="共享状态（示例）">
            <Typography.Paragraph style={{ marginBottom: 6 }} type="secondary">
              当前机台名称（global.machineName）
            </Typography.Paragraph>
            <div className="pill">
              <Typography.Text strong>{machineName ?? '未设置'}</Typography.Text>
            </div>
            <div style={{ height: 10 }} />
            <Typography.Paragraph style={{ marginBottom: 0 }} type="secondary">
              可在「设置」中修改，其他工具页面会自动刷新。
            </Typography.Paragraph>
          </Card>
        </div>
      </div>
    </>
  )
}
