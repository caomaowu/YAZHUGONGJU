import { useEffect, useMemo, useState } from 'react'
import { Alert, Button, Card, Segmented, Space, Spin, Statistic, Table, Tag, Typography, theme } from 'antd'
import { BarChartOutlined, LineChartOutlined, ThunderboltOutlined, UserOutlined } from '@ant-design/icons'
import * as echarts from 'echarts'
import { EChart } from '../components/charts/EChart'
import { useHashPath } from '../core/router/hash'
import { useSharedValue } from '../core/state/hooks'
import { useAuth } from '../core/auth/useAuth'

type AnalyticsOverview = {
  days: number
  range: { start: string; end: string }
  totals: { pv: number; uv: number; perUser: number }
  today: { day: string; pv: number; uv: number }
  trend: Array<{ day: string; pv: number; uv: number }>
  topTools: Array<{ toolId: string; count: number; ratio: number }>
}

const TOOL_LABEL_MAP: Record<string, string> = {
  dashboard: '工作台',
  machines: '设备数据库',
  'knowledge-base': '知识库',
  pq2: 'PQ² 图',
  'filling-simulation': '压射模拟',
  'ai-knowledge': 'AI助手',
  users: '用户管理',
}

export function DashboardPage() {
  const { token } = theme.useToken()
  const { navigate } = useHashPath()
  const { token: authToken } = useAuth()
  const [machineName] = useSharedValue<string>('global', 'machineName', '未设置')
  const [days, setDays] = useState<7 | 30>(7)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null)

  useEffect(() => {
    if (!authToken) return
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const res = await fetch(`/api/analytics/overview?days=${days}`, {
          headers: { Authorization: `Bearer ${authToken}` },
        })
        if (!res.ok) throw new Error('获取统计数据失败')
        const data = (await res.json()) as AnalyticsOverview
        setOverview(data)
      } catch (e) {
        setError(e instanceof Error ? e.message : '获取统计数据失败')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [authToken, days])

  const chartOption = useMemo<echarts.EChartsOption>(() => {
    const x = (overview?.trend || []).map((it) => it.day.slice(5))
    const pv = (overview?.trend || []).map((it) => it.pv)
    const uv = (overview?.trend || []).map((it) => it.uv)

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
          name: '访问次数(PV)',
          type: 'line',
          smooth: true,
          showSymbol: false,
          data: pv,
          lineStyle: { width: 3, color: token.colorPrimary },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(139, 92, 246, 0.42)' },
              { offset: 1, color: 'rgba(139, 92, 246, 0.06)' },
            ]),
          },
        },
        {
          name: '访问人数(UV)',
          type: 'line',
          smooth: true,
          showSymbol: false,
          data: uv,
          lineStyle: { width: 2, color: '#22c55e' },
        },
      ],
    }
  }, [overview?.trend, token.colorPrimary])

  const topToolsData = useMemo(
    () =>
      (overview?.topTools || []).map((it, index) => ({
        key: it.toolId,
        rank: index + 1,
        toolName: TOOL_LABEL_MAP[it.toolId] || it.toolId,
        count: it.count,
        ratio: `${it.ratio}%`,
      })),
    [overview?.topTools]
  )

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
              { label: '近7天', value: 7 },
              { label: '近30天', value: 30 },
            ]}
            value={days}
            onChange={(v) => setDays(v as 7 | 30)}
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
            title={`访问趋势（${overview?.range.start || '-'} ~ ${overview?.range.end || '-'}）`}
            extra={<Tag color="purple">Analytics</Tag>}
          >
            <div className="chartWrap">
              {loading ? <Spin /> : <EChart option={chartOption} style={{ width: '100%', height: '100%' }} />}
            </div>
            {error ? <Alert type="error" showIcon message={error} style={{ marginTop: 12 }} /> : null}
          </Card>

          <Card className="softCard span4" title="今日访问">
            <Space direction="vertical" size={10} style={{ width: '100%' }}>
              <div className="pill" style={{ width: '100%' }}>
                <Statistic title="访问次数（PV）" value={overview?.today.pv || 0} prefix={<BarChartOutlined />} />
              </div>
              <div className="pill" style={{ width: '100%' }}>
                <Statistic title="访问人数（UV）" value={overview?.today.uv || 0} prefix={<UserOutlined />} />
              </div>
            </Space>
          </Card>

          <Card className="softCard span4" title="总体统计">
            <div className="metricRow">
              <div className="pill" style={{ width: '100%' }}>
                <Statistic title="总访问次数（PV）" value={overview?.totals.pv || 0} />
              </div>
            </div>
            <div style={{ height: 10 }} />
            <div className="pill" style={{ width: '100%' }}>
              <Statistic title="总访问人数（UV）" value={overview?.totals.uv || 0} />
            </div>
            <div style={{ height: 10 }} />
            <div className="pill" style={{ width: '100%' }}>
              <Statistic title="人均访问次数" value={overview?.totals.perUser || 0} precision={2} />
            </div>
          </Card>

          <Card className="softCard span8" title="热门访问功能 Top">
            <Table
              size="small"
              pagination={false}
              dataSource={topToolsData}
              columns={[
                { title: '排名', dataIndex: 'rank', width: 72 },
                { title: '功能', dataIndex: 'toolName' },
                { title: '次数', dataIndex: 'count', width: 96 },
                { title: '占比', dataIndex: 'ratio', width: 96 },
              ]}
            />
          </Card>

          <Card className="softCard span8" title="共享状态">
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

          <Card className="softCard span4" title="快捷入口">
            <Space direction="vertical" size={10} style={{ width: '100%' }}>
              <Button block type="primary" icon={<LineChartOutlined />} onClick={() => navigate('/pq2')}>
                新建 PQ² 计算
              </Button>
              <Button block icon={<ThunderboltOutlined />} onClick={() => navigate('/ai-knowledge')}>
                打开 AI 助手
              </Button>
            </Space>
          </Card>
        </div>
      </div>
    </>
  )
}
