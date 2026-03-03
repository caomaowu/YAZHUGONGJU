import React, { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Collapse,
  Col,
  Descriptions,
  Divider,
  Drawer,
  Empty,
  Grid as AntGrid,
  Input,
  Progress,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Switch,
  Tag,
  Typography,
  theme,
} from 'antd'
import {
  BgColorsOutlined,
  DownloadOutlined,
  FireOutlined,
  GoldOutlined,
  RadarChartOutlined,
  ReloadOutlined,
  SearchOutlined,
  ToolOutlined,
} from '@ant-design/icons'
import type { EChartsOption } from 'echarts'
import { Grid as WindowGrid } from 'react-window'
import { EChart } from '../components/charts/EChart'

type MaterialRecord = {
  category: string
  category_cn: string
  name: string
  name_en: string
  name_jp: string
  name_eu: string
  tensile_strength: number
  yield_strength: number
  elongation: string | number
  hardness: string | number
  density: number
  melting_range: string
  thermal_conductivity: number
  features: string
  applications: string
  standard: string
  composition?: Record<string, string>
}

const CATEGORY_VISUAL: Record<string, { color: string; gradient: string }> = {
  aluminum: { color: '#3B82F6', gradient: 'linear-gradient(135deg, #60A5FA 0%, #2563EB 100%)' },
  zinc: { color: '#10B981', gradient: 'linear-gradient(135deg, #34D399 0%, #059669 100%)' },
  magnesium: { color: '#F59E0B', gradient: 'linear-gradient(135deg, #FBBF24 0%, #D97706 100%)' },
  copper: { color: '#F97316', gradient: 'linear-gradient(135deg, #FB923C 0%, #EA580C 100%)' },
  steel: { color: '#64748B', gradient: 'linear-gradient(135deg, #94A3B8 0%, #475569 100%)' },
}

function toNumericValue(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

function toComparableNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const direct = Number(value)
    if (Number.isFinite(direct)) return direct
    const matched = value.match(/-?\d+(\.\d+)?/)
    if (matched) {
      const parsed = Number(matched[0])
      if (Number.isFinite(parsed)) return parsed
    }
  }
  return 0
}

function readCategoryLabel(materials: MaterialRecord[], category: string) {
  return materials.find((item) => item.category === category)?.category_cn || category
}

type MaterialGridItemData = {
  items: MaterialRecord[]
  columnCount: number
  compareMode: boolean
  compareKeys: Set<string>
  compareCount: number
  token: ReturnType<typeof theme.useToken>['token']
  onOpenDetail: (item: MaterialRecord) => void
  onToggleCompare: (item: MaterialRecord) => void
}

const GRID_GUTTER = 16

function getMaterialKey(item: MaterialRecord) {
  return `${item.category}-${item.name}`
}

function MaterialGridCell({
  ariaAttributes,
  columnIndex,
  rowIndex,
  style,
  items,
  columnCount,
  compareMode,
  compareKeys,
  compareCount,
  token,
  onOpenDetail,
  onToggleCompare,
}: {
  ariaAttributes: { 'aria-colindex': number; role: 'gridcell' }
  columnIndex: number
  rowIndex: number
  style: React.CSSProperties
} & MaterialGridItemData) {
  const itemIndex = rowIndex * columnCount + columnIndex
  const item = items[itemIndex]
  if (!item) return null

  const visual = CATEGORY_VISUAL[item.category] || {
    color: token.colorPrimary,
    gradient: 'linear-gradient(135deg, #A78BFA 0%, #8B5CF6 100%)',
  }
  const key = getMaterialKey(item)
  const selected = compareKeys.has(key)

  return (
    <div {...ariaAttributes} style={style}>
      <div style={{ padding: GRID_GUTTER / 2, height: '100%' }}>
        <Card
          hoverable
          onClick={() => onOpenDetail(item)}
          style={{
            borderRadius: 16,
            height: '100%',
            borderColor: `${visual.color}44`,
            boxShadow: `0 12px 30px ${visual.color}1f`,
            transition: 'all 0.25s ease',
          }}
          styles={{ body: { padding: 16 } }}
        >
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
              <div>
                <Tag
                  style={{
                    marginBottom: 8,
                    color: '#fff',
                    border: 'none',
                    borderRadius: 999,
                    paddingInline: 10,
                    background: visual.gradient,
                  }}
                >
                  {item.category_cn}
                </Tag>
                <Typography.Title level={4} style={{ margin: 0, lineHeight: 1.2 }}>
                  {item.name}
                </Typography.Title>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {[item.name_en, item.name_jp, item.name_eu].filter((text) => text && text !== '-').join(' / ') || '—'}
                </Typography.Text>
              </div>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  display: 'grid',
                  placeItems: 'center',
                  color: '#fff',
                  background: visual.gradient,
                }}
              >
                <BgColorsOutlined />
              </div>
            </div>

            <Row gutter={[8, 8]}>
              <Col span={12}>
                <Card size="small" styles={{ body: { padding: 10 } }}>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    抗拉强度
                  </Typography.Text>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{item.tensile_strength} MPa</div>
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small" styles={{ body: { padding: 10 } }}>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    密度
                  </Typography.Text>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{item.density} g/cm³</div>
                </Card>
              </Col>
            </Row>

            <Typography.Paragraph
              type="secondary"
              ellipsis={{ rows: 2, tooltip: item.features }}
              style={{ marginBottom: 0, minHeight: 44 }}
            >
              {item.features}
            </Typography.Paragraph>
            {compareMode ? (
              <Button
                block
                size="small"
                type={selected ? 'primary' : 'default'}
                onClick={(event) => {
                  event.stopPropagation()
                  onToggleCompare(item)
                }}
                disabled={!selected && compareCount >= 3}
              >
                {selected ? '已加入对比' : '加入对比'}
              </Button>
            ) : null}
          </Space>
        </Card>
      </div>
    </div>
  )
}

export const MaterialsDatabasePage: React.FC = () => {
  const screens = AntGrid.useBreakpoint()
  const { token } = theme.useToken()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [materials, setMaterials] = useState<MaterialRecord[]>([])
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [activeMaterial, setActiveMaterial] = useState<MaterialRecord | null>(null)
  const [compareMode, setCompareMode] = useState(false)
  const [compareKeys, setCompareKeys] = useState<string[]>([])
  const [compareOpen, setCompareOpen] = useState(false)
  const [compareExpandedPanels, setCompareExpandedPanels] = useState<string[]>([
    'charts',
    'materials',
    'delta',
    'insight',
  ])
  const deferredQuery = useDeferredValue(query)

  const fetchMaterials = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/materials-data.json')
      if (!response.ok) {
        throw new Error('材料数据加载失败')
      }
      const data = await response.json()
      setMaterials(Array.isArray(data) ? data : [])
    } catch (loadError) {
      console.error(loadError)
      setError(loadError instanceof Error ? loadError.message : '材料数据加载失败')
      setMaterials([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchMaterials()
  }, [fetchMaterials])

  const categoryOptions = useMemo(() => {
    const map = new Map<string, number>()
    for (const item of materials) {
      map.set(item.category, (map.get(item.category) || 0) + 1)
    }
    const options = Array.from(map.entries()).map(([value, count]) => ({
      value,
      label: `${readCategoryLabel(materials, value)} · ${count}`,
      plainLabel: readCategoryLabel(materials, value),
      count,
    }))
    options.sort((a, b) => b.count - a.count)
    return [{ value: 'all', label: `全部材料 · ${materials.length}`, plainLabel: '全部材料', count: materials.length }, ...options]
  }, [materials])

  const filteredMaterials = useMemo(() => {
    const keyword = deferredQuery.trim().toLowerCase()
    return materials.filter((item) => {
      if (category !== 'all' && item.category !== category) return false
      if (!keyword) return true
      const values = [
        item.name,
        item.name_en,
        item.name_jp,
        item.name_eu,
        item.category_cn,
        item.features,
        item.applications,
        item.standard,
        ...Object.entries(item.composition || {}).flat(),
      ]
      return values.join(' ').toLowerCase().includes(keyword)
    })
  }, [materials, category, deferredQuery])

  const analytics = useMemo(() => {
    const tensileValues = filteredMaterials.map((item) => toNumericValue(item.tensile_strength)).filter((item): item is number => item !== null)
    const densityValues = filteredMaterials.map((item) => toNumericValue(item.density)).filter((item): item is number => item !== null)
    const thermalValues = filteredMaterials.map((item) => toNumericValue(item.thermal_conductivity)).filter((item): item is number => item !== null)
    const avg = (values: number[]) => {
      if (!values.length) return 0
      return values.reduce((sum, value) => sum + value, 0) / values.length
    }
    return {
      total: filteredMaterials.length,
      avgTensile: avg(tensileValues),
      avgDensity: avg(densityValues),
      avgThermal: avg(thermalValues),
    }
  }, [filteredMaterials])

  const materialKeyMap = useMemo(
    () =>
      new Map<string, MaterialRecord>(
        materials.map((item) => [`${item.category}-${item.name}`, item]),
      ),
    [materials],
  )

  const comparedMaterials = useMemo(
    () =>
      compareKeys
        .map((key) => materialKeyMap.get(key))
        .filter((item): item is MaterialRecord => Boolean(item)),
    [compareKeys, materialKeyMap],
  )
  const compareKeySet = useMemo(() => new Set(compareKeys), [compareKeys])
  const virtualColumnCount = useMemo(() => {
    if (screens.xxl) return 4
    if (screens.lg) return 3
    if (screens.sm) return 2
    return 1
  }, [screens.lg, screens.sm, screens.xxl])
  const virtualRowCount = useMemo(
    () => Math.ceil(filteredMaterials.length / virtualColumnCount),
    [filteredMaterials.length, virtualColumnCount],
  )
  const materialCardRowHeight = compareMode ? 330 : 286

  const kpiCards = useMemo(
    () => [
      { key: 'total', title: '筛选结果', value: analytics.total, suffix: '条', precision: 0, color: '#8B5CF6' },
      { key: 'ts', title: '平均抗拉强度', value: analytics.avgTensile, suffix: 'MPa', precision: 1, color: '#3B82F6' },
      { key: 'de', title: '平均密度', value: analytics.avgDensity, suffix: 'g/cm³', precision: 3, color: '#10B981' },
      { key: 'tc', title: '平均热导率', value: analytics.avgThermal, suffix: 'W/m·K', precision: 1, color: '#F59E0B' },
    ],
    [analytics],
  )

  const toggleCompareMaterial = useCallback((item: MaterialRecord) => {
    const key = `${item.category}-${item.name}`
    setCompareKeys((prev) => {
      if (prev.includes(key)) return prev.filter((value) => value !== key)
      if (prev.length >= 3) return prev
      return [...prev, key]
    })
  }, [])

  const materialGridData = useMemo(
    () => ({
      items: filteredMaterials,
      columnCount: virtualColumnCount,
      compareMode,
      compareKeys: compareKeySet,
      compareCount: compareKeys.length,
      token,
      onOpenDetail: setActiveMaterial,
      onToggleCompare: toggleCompareMaterial,
    }),
    [
      filteredMaterials,
      virtualColumnCount,
      compareMode,
      compareKeySet,
      compareKeys.length,
      token,
      toggleCompareMaterial,
    ],
  )

  const compareMetricConfigs = useMemo(
    () => [
      {
        key: 'tensile_strength',
        label: '抗拉强度',
        unit: 'MPa',
        readValue: (item: MaterialRecord) => toComparableNumber(item.tensile_strength),
        betterDirection: 'higher' as const,
      },
      {
        key: 'yield_strength',
        label: '屈服强度',
        unit: 'MPa',
        readValue: (item: MaterialRecord) => toComparableNumber(item.yield_strength),
        betterDirection: 'higher' as const,
      },
      {
        key: 'elongation',
        label: '延伸率',
        unit: '%',
        readValue: (item: MaterialRecord) => toComparableNumber(item.elongation),
        betterDirection: 'higher' as const,
      },
      {
        key: 'hardness',
        label: '硬度',
        unit: 'HB/HRC',
        readValue: (item: MaterialRecord) => toComparableNumber(item.hardness),
        betterDirection: 'higher' as const,
      },
      {
        key: 'density',
        label: '密度',
        unit: 'g/cm³',
        readValue: (item: MaterialRecord) => toComparableNumber(item.density),
        betterDirection: 'lower' as const,
      },
      {
        key: 'thermal_conductivity',
        label: '热导率',
        unit: 'W/m·K',
        readValue: (item: MaterialRecord) => toComparableNumber(item.thermal_conductivity),
        betterDirection: 'higher' as const,
      },
    ],
    [],
  )

  const radarOption = useMemo<EChartsOption>(() => {
    if (!comparedMaterials.length) return {}
    const indicators = compareMetricConfigs.map((metric) => {
      const maxValue = Math.max(...comparedMaterials.map((item) => metric.readValue(item)))
      return {
        name: metric.label,
        max: Math.max(1, Math.ceil(maxValue * 1.25)),
      }
    })

    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'item' },
      legend: {
        top: 4,
        textStyle: { color: token.colorTextSecondary },
      },
      radar: {
        radius: '62%',
        indicator: indicators,
        splitArea: {
          areaStyle: {
            color: ['rgba(139,92,246,0.06)', 'rgba(139,92,246,0.03)'],
          },
        },
        axisName: { color: token.colorTextSecondary },
      },
      series: [
        {
          type: 'radar',
          symbolSize: 6,
          data: comparedMaterials.map((item) => ({
            name: item.name,
            value: compareMetricConfigs.map((metric) => metric.readValue(item)),
            areaStyle: { opacity: 0.12 },
          })),
        },
      ],
    }
  }, [comparedMaterials, compareMetricConfigs, token.colorTextSecondary])

  const groupedBarOption = useMemo<EChartsOption>(() => {
    if (!comparedMaterials.length) return {}
    return {
      tooltip: { trigger: 'axis' },
      legend: { top: 0, textStyle: { color: token.colorTextSecondary } },
      grid: { left: 44, right: 18, top: 36, bottom: 28 },
      xAxis: {
        type: 'category',
        data: comparedMaterials.map((item) => item.name),
        axisLabel: { color: token.colorTextSecondary },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: token.colorTextSecondary },
        splitLine: { lineStyle: { color: token.colorBorderSecondary } },
      },
      series: [
        {
          name: '抗拉强度',
          type: 'bar',
          barMaxWidth: 18,
          data: comparedMaterials.map((item) => toComparableNumber(item.tensile_strength)),
          itemStyle: { color: '#8B5CF6', borderRadius: [6, 6, 0, 0] },
        },
        {
          name: '屈服强度',
          type: 'bar',
          barMaxWidth: 18,
          data: comparedMaterials.map((item) => toComparableNumber(item.yield_strength)),
          itemStyle: { color: '#3B82F6', borderRadius: [6, 6, 0, 0] },
        },
        {
          name: '热导率',
          type: 'bar',
          barMaxWidth: 18,
          data: comparedMaterials.map((item) => toComparableNumber(item.thermal_conductivity)),
          itemStyle: { color: '#10B981', borderRadius: [6, 6, 0, 0] },
        },
      ],
    }
  }, [comparedMaterials, token.colorBorderSecondary, token.colorTextSecondary])

  const scatterOption = useMemo<EChartsOption>(() => {
    if (!comparedMaterials.length) return {}
    return {
      tooltip: {
        trigger: 'item',
        formatter: (params: unknown) => {
          const data = params as { data?: [number, number, number, string] }
          if (!data.data) return ''
          return `${data.data[3]}<br/>密度: ${data.data[0]} g/cm³<br/>热导率: ${data.data[1]} W/m·K<br/>抗拉强度: ${data.data[2]} MPa`
        },
      },
      grid: { left: 54, right: 24, top: 20, bottom: 30 },
      xAxis: {
        type: 'value',
        name: '密度',
        nameTextStyle: { color: token.colorTextSecondary },
        axisLabel: { color: token.colorTextSecondary },
        splitLine: { lineStyle: { color: token.colorBorderSecondary } },
      },
      yAxis: {
        type: 'value',
        name: '热导率',
        nameTextStyle: { color: token.colorTextSecondary },
        axisLabel: { color: token.colorTextSecondary },
        splitLine: { lineStyle: { color: token.colorBorderSecondary } },
      },
      series: [
        {
          type: 'scatter',
          data: comparedMaterials.map((item) => [
            toComparableNumber(item.density),
            toComparableNumber(item.thermal_conductivity),
            toComparableNumber(item.tensile_strength),
            item.name,
          ]),
          symbolSize: (value: unknown) => {
            const list = value as number[]
            return Math.max(12, Math.min(44, (list[2] || 0) / 10))
          },
          itemStyle: {
            color: '#A855F7',
            shadowBlur: 14,
            shadowColor: 'rgba(168,85,247,0.45)',
          },
          label: {
            show: true,
            formatter: (params: unknown) => {
              const data = params as { data?: [number, number, number, string] }
              return data.data?.[3] || ''
            },
            color: token.colorTextSecondary,
            position: 'top',
            fontSize: 11,
          },
        },
      ],
    }
  }, [comparedMaterials, token.colorBorderSecondary, token.colorTextSecondary])

  const quickInsights = useMemo(() => {
    if (!comparedMaterials.length) {
      return {
        highestTensile: '',
        lowestDensity: '',
        highestThermal: '',
      }
    }
    const byTensile = [...comparedMaterials].sort((a, b) => Number(b.tensile_strength) - Number(a.tensile_strength))
    const byDensity = [...comparedMaterials].sort((a, b) => Number(a.density) - Number(b.density))
    const byThermal = [...comparedMaterials].sort((a, b) => Number(b.thermal_conductivity) - Number(a.thermal_conductivity))
    return {
      highestTensile: byTensile[0]?.name || '',
      lowestDensity: byDensity[0]?.name || '',
      highestThermal: byThermal[0]?.name || '',
    }
  }, [comparedMaterials])

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card
        style={{
          borderRadius: 18,
          borderColor: token.colorPrimaryBorder,
          background:
            'linear-gradient(135deg, rgba(139,92,246,0.1) 0%, rgba(236,72,153,0.08) 52%, rgba(34,197,94,0.08) 100%)',
        }}
      >
        <Row gutter={[20, 20]} align="middle">
          <Col xs={24} lg={12}>
            <Typography.Title level={2} style={{ marginTop: 0, marginBottom: 6 }}>
              材料数据库
            </Typography.Title>
            <Typography.Text type="secondary" style={{ fontSize: 14 }}>
              覆盖压铸铝、锌、镁、铜与模具钢，支持多语言牌号检索与关键性能对比。
            </Typography.Text>
          </Col>
          <Col xs={24} lg={12}>
            <Space wrap style={{ justifyContent: 'flex-end', width: '100%' }}>
              <Button icon={<ReloadOutlined />} onClick={() => void fetchMaterials()}>
                刷新数据
              </Button>
              <Button type="primary" icon={<DownloadOutlined />} href="/压铸行业材料综合数据库.xlsx">
                下载Excel
              </Button>
            </Space>
          </Col>
          {kpiCards.map((item, index) => {
            return (
              <Col key={item.key} xs={12} md={6}>
                <Card
                  style={{
                    borderRadius: 14,
                    border: 'none',
                    overflow: 'hidden',
                    boxShadow: `0 10px 26px ${item.color}33`,
                    background: `linear-gradient(${120 + index * 18}deg, ${item.color}22 0%, ${token.colorBgContainer} 50%, ${item.color}15 100%)`,
                    transition: 'all 0.25s ease',
                  }}
                  styles={{ body: { padding: 14 } }}
                >
                  <Statistic
                    title={item.title}
                    value={item.value}
                    precision={item.precision}
                    suffix={item.suffix}
                    valueStyle={{ color: item.color, fontWeight: 800 }}
                  />
                </Card>
              </Col>
            )
          })}
        </Row>
      </Card>

      <Card style={{ borderRadius: 16 }}>
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} md={16} lg={18}>
            <Input
              prefix={<SearchOutlined />}
              placeholder="搜索牌号 / 特性 / 应用 / 标准"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              allowClear
              size="large"
              style={{ borderRadius: 12 }}
            />
          </Col>
          <Col xs={24} md={8} lg={6}>
            <Select
              size="large"
              style={{ width: '100%' }}
              value={category}
              onChange={setCategory}
              options={categoryOptions.map((item) => ({ value: item.value, label: item.label }))}
            />
          </Col>
          <Col xs={24}>
            <Card
              style={{
                borderRadius: 12,
                borderColor: compareMode ? token.colorPrimaryBorder : token.colorBorderSecondary,
                background: compareMode ? token.colorPrimaryBg : token.colorBgContainer,
              }}
              styles={{ body: { padding: '10px 12px' } }}
            >
              <Row align="middle" justify="space-between" gutter={[10, 10]}>
                <Col>
                  <Space>
                    <Switch checked={compareMode} onChange={setCompareMode} />
                    <Typography.Text strong>对比模式</Typography.Text>
                    <Typography.Text type="secondary">最多选择 3 个材料</Typography.Text>
                  </Space>
                </Col>
                <Col>
                  <Space>
                    <Tag color={compareKeys.length > 0 ? 'purple' : 'default'}>{compareKeys.length}/3</Tag>
                    <Button
                      icon={<RadarChartOutlined />}
                      type="primary"
                      disabled={!compareKeys.length}
                      onClick={() => setCompareOpen(true)}
                    >
                      查看对比
                    </Button>
                  </Space>
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>
      </Card>

      <Space wrap size={10}>
        {categoryOptions.map((item) => {
          const isActive = item.value === category
          const visual = CATEGORY_VISUAL[item.value] || { color: token.colorPrimary, gradient: 'linear-gradient(135deg, #A78BFA 0%, #8B5CF6 100%)' }
          return (
            <Tag
              key={item.value}
              onClick={() => setCategory(item.value)}
              style={{
                userSelect: 'none',
                cursor: 'pointer',
                borderRadius: 999,
                padding: '6px 12px',
                fontSize: 13,
                borderColor: isActive ? 'transparent' : token.colorBorderSecondary,
                color: isActive ? '#fff' : visual.color,
                background: isActive ? visual.gradient : token.colorBgContainer,
                boxShadow: isActive ? `0 8px 18px ${visual.color}44` : 'none',
              }}
            >
              {item.plainLabel}（{item.count}）
            </Tag>
          )
        })}
      </Space>

      {error ? <Alert type="error" showIcon message={error} /> : null}

      {loading ? (
        <Card style={{ borderRadius: 16, textAlign: 'center', padding: '48px 0' }}>
          <Spin size="large" />
        </Card>
      ) : null}

      {!loading && !filteredMaterials.length ? (
        <Card style={{ borderRadius: 16 }}>
          <Empty description="未找到匹配材料，请更换筛选条件" />
        </Card>
      ) : null}

      {!loading && filteredMaterials.length ? (
        <Card style={{ borderRadius: 16, overflow: 'hidden' }} styles={{ body: { padding: 0 } }}>
          <div style={{ height: 660, width: '100%' }}>
            <WindowGrid
              cellComponent={MaterialGridCell}
              cellProps={materialGridData}
              columnCount={virtualColumnCount}
              columnWidth={`${100 / virtualColumnCount}%`}
              rowCount={virtualRowCount}
              rowHeight={materialCardRowHeight}
              overscanCount={2}
              style={{ height: 660, width: '100%' }}
            />
          </div>
        </Card>
      ) : null}

      <Drawer
        title={activeMaterial ? `${activeMaterial.name} · 材料详情` : '材料详情'}
        open={Boolean(activeMaterial)}
        onClose={() => setActiveMaterial(null)}
        width={760}
      >
        {activeMaterial ? (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Card style={{ borderRadius: 14 }}>
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                <Tag color="purple" style={{ width: 'fit-content' }}>
                  {activeMaterial.category_cn}
                </Tag>
                <Typography.Title level={3} style={{ margin: 0 }}>
                  {activeMaterial.name}
                </Typography.Title>
                <Typography.Text type="secondary">
                  {[activeMaterial.name_en, activeMaterial.name_jp, activeMaterial.name_eu]
                    .filter((text) => text && text !== '-')
                    .join(' / ') || '暂无对应外文牌号'}
                </Typography.Text>
                <Descriptions
                  size="small"
                  column={2}
                  items={[
                    { key: 'standard', label: '执行标准', children: activeMaterial.standard || '-' },
                    { key: 'range', label: '熔点范围', children: `${activeMaterial.melting_range || '-'} °C` },
                  ]}
                />
              </Space>
            </Card>

            <Card style={{ borderRadius: 14 }} title="力学性能">
              <Row gutter={[12, 12]}>
                <Col xs={12} md={6}>
                  <Statistic title="抗拉强度" value={activeMaterial.tensile_strength} suffix="MPa" />
                </Col>
                <Col xs={12} md={6}>
                  <Statistic title="屈服强度" value={activeMaterial.yield_strength} suffix="MPa" />
                </Col>
                <Col xs={12} md={6}>
                  <Statistic title="延伸率" value={activeMaterial.elongation} suffix="%" />
                </Col>
                <Col xs={12} md={6}>
                  <Statistic title="硬度" value={activeMaterial.hardness} suffix="HB/HRC" />
                </Col>
              </Row>
              <Divider />
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                <Typography.Text type="secondary">屈服 / 抗拉 比例</Typography.Text>
                <Progress
                  percent={Math.min(
                    100,
                    Math.round((Number(activeMaterial.yield_strength) / Number(activeMaterial.tensile_strength || 1)) * 100),
                  )}
                  strokeColor={CATEGORY_VISUAL[activeMaterial.category]?.color || token.colorPrimary}
                />
              </Space>
            </Card>

            <Card style={{ borderRadius: 14 }} title="物理性能">
              <Row gutter={[12, 12]}>
                <Col xs={24} md={8}>
                  <Card size="small" styles={{ body: { padding: 12 } }}>
                    <Space>
                      <GoldOutlined style={{ color: '#f59e0b' }} />
                      <Typography.Text>密度</Typography.Text>
                    </Space>
                    <Typography.Title level={4} style={{ margin: '6px 0 0 0' }}>
                      {activeMaterial.density} g/cm³
                    </Typography.Title>
                  </Card>
                </Col>
                <Col xs={24} md={8}>
                  <Card size="small" styles={{ body: { padding: 12 } }}>
                    <Space>
                      <FireOutlined style={{ color: '#ef4444' }} />
                      <Typography.Text>熔点范围</Typography.Text>
                    </Space>
                    <Typography.Title level={4} style={{ margin: '6px 0 0 0' }}>
                      {activeMaterial.melting_range} °C
                    </Typography.Title>
                  </Card>
                </Col>
                <Col xs={24} md={8}>
                  <Card size="small" styles={{ body: { padding: 12 } }}>
                    <Space>
                      <ToolOutlined style={{ color: '#8b5cf6' }} />
                      <Typography.Text>热导率</Typography.Text>
                    </Space>
                    <Typography.Title level={4} style={{ margin: '6px 0 0 0' }}>
                      {activeMaterial.thermal_conductivity} W/m·K
                    </Typography.Title>
                  </Card>
                </Col>
              </Row>
            </Card>

            <Card style={{ borderRadius: 14 }} title="材料特点与应用">
              <Space direction="vertical" size={14} style={{ width: '100%' }}>
                <div>
                  <Typography.Text strong>材料特点</Typography.Text>
                  <Typography.Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
                    {activeMaterial.features}
                  </Typography.Paragraph>
                </div>
                <div>
                  <Typography.Text strong>典型应用</Typography.Text>
                  <Typography.Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
                    {activeMaterial.applications}
                  </Typography.Paragraph>
                </div>
              </Space>
            </Card>

            {activeMaterial.composition && Object.keys(activeMaterial.composition).length ? (
              <Card style={{ borderRadius: 14 }} title="化学成分 (%)">
                <Space wrap size={[10, 10]}>
                  {Object.entries(activeMaterial.composition).map(([element, value]) => (
                    <Tag
                      key={element}
                      style={{
                        borderRadius: 999,
                        padding: '6px 10px',
                        borderColor: token.colorPrimaryBorder,
                        background: token.colorPrimaryBg,
                      }}
                    >
                      <Typography.Text strong>{element}</Typography.Text>：{value}
                    </Tag>
                  ))}
                </Space>
              </Card>
            ) : null}
          </Space>
        ) : null}
      </Drawer>

      <Drawer
        title="材料对比"
        open={compareOpen}
        onClose={() => setCompareOpen(false)}
        width={1100}
      >
        {!comparedMaterials.length ? (
          <Empty description="还未选择对比材料" />
        ) : (
          <Collapse
            activeKey={compareExpandedPanels}
            onChange={(keys) => {
              const next = Array.isArray(keys) ? keys.map((key) => String(key)) : [String(keys)]
              setCompareExpandedPanels(next)
            }}
            items={[
              {
                key: 'charts',
                label: '图表对比',
                children: compareExpandedPanels.includes('charts') ? (
                  <Row gutter={[12, 12]}>
                    <Col xs={24} lg={12}>
                      <Card style={{ borderRadius: 14 }} title="参数雷达图">
                        <div style={{ height: 320 }}>
                          <EChart option={radarOption} lazyUpdate />
                        </div>
                      </Card>
                    </Col>
                    <Col xs={24} lg={12}>
                      <Card style={{ borderRadius: 14 }} title="密度-热导率散点图（气泡大小=抗拉强度）">
                        <div style={{ height: 320 }}>
                          <EChart option={scatterOption} lazyUpdate />
                        </div>
                      </Card>
                    </Col>
                    <Col span={24}>
                      <Card style={{ borderRadius: 14 }} title="核心性能柱状对比">
                        <div style={{ height: 300 }}>
                          <EChart option={groupedBarOption} lazyUpdate />
                        </div>
                      </Card>
                    </Col>
                  </Row>
                ) : null,
              },
              {
                key: 'materials',
                label: '材料明细',
                children: compareExpandedPanels.includes('materials') ? (
                  <Row gutter={[12, 12]}>
                    {comparedMaterials.map((item) => {
                      const visual = CATEGORY_VISUAL[item.category] || {
                        color: token.colorPrimary,
                        gradient: 'linear-gradient(135deg, #A78BFA 0%, #8B5CF6 100%)',
                      }
                      return (
                        <Col key={`${item.category}-${item.name}`} xs={24} md={8}>
                          <Card
                            style={{
                              borderRadius: 14,
                              borderColor: `${visual.color}40`,
                              boxShadow: `0 8px 28px ${visual.color}33`,
                            }}
                            styles={{ body: { padding: 14 } }}
                            extra={
                              <Button
                                size="small"
                                onClick={() => {
                                  setCompareKeys((prev) =>
                                    prev.filter((value) => value !== `${item.category}-${item.name}`),
                                  )
                                }}
                              >
                                移除
                              </Button>
                            }
                          >
                            <Space direction="vertical" size={10} style={{ width: '100%' }}>
                              <Tag color="purple">{item.category_cn}</Tag>
                              <Typography.Title level={4} style={{ margin: 0 }}>
                                {item.name}
                              </Typography.Title>
                              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                                {[item.name_en, item.name_jp, item.name_eu]
                                  .filter((text) => text && text !== '-')
                                  .join(' / ') || '暂无对应外文牌号'}
                              </Typography.Text>
                              <Descriptions
                                size="small"
                                column={1}
                                items={[
                                  { key: 't', label: '抗拉强度', children: `${item.tensile_strength} MPa` },
                                  { key: 'y', label: '屈服强度', children: `${item.yield_strength} MPa` },
                                  { key: 'e', label: '延伸率', children: `${item.elongation}%` },
                                  { key: 'h', label: '硬度', children: `${item.hardness} HB/HRC` },
                                  { key: 'd', label: '密度', children: `${item.density} g/cm³` },
                                  { key: 'm', label: '熔点范围', children: `${item.melting_range} °C` },
                                  { key: 'th', label: '热导率', children: `${item.thermal_conductivity} W/m·K` },
                                  { key: 's', label: '标准', children: item.standard || '-' },
                                ]}
                              />
                            </Space>
                          </Card>
                        </Col>
                      )
                    })}
                  </Row>
                ) : null,
              },
              {
                key: 'delta',
                label: '差值高亮',
                children: compareExpandedPanels.includes('delta') ? (
                  <Card style={{ borderRadius: 14 }} title="差值高亮（基准=第1个已选材料）">
                    <Space direction="vertical" size={10} style={{ width: '100%' }}>
                      <Typography.Text type="secondary">
                        基准材料：<Typography.Text strong>{comparedMaterials[0]?.name}</Typography.Text>
                      </Typography.Text>
                      {comparedMaterials.slice(1).map((item) => (
                        <Card key={`${item.category}-${item.name}-delta`} size="small" styles={{ body: { padding: 12 } }}>
                          <Space direction="vertical" size={10} style={{ width: '100%' }}>
                            <Typography.Text strong>{item.name}</Typography.Text>
                            <Row gutter={[8, 8]}>
                              {compareMetricConfigs.map((metric) => {
                                const base = metric.readValue(comparedMaterials[0])
                                const current = metric.readValue(item)
                                const delta = Number((current - base).toFixed(3))
                                const good =
                                  metric.betterDirection === 'higher'
                                    ? delta >= 0
                                    : delta <= 0
                                const bgColor = good ? 'rgba(34,197,94,0.14)' : 'rgba(239,68,68,0.14)'
                                const borderColor = good ? 'rgba(34,197,94,0.36)' : 'rgba(239,68,68,0.36)'
                                const textColor = good ? '#166534' : '#991B1B'
                                return (
                                  <Col key={`${item.name}-${metric.key}`} xs={12} md={8} lg={6}>
                                    <div
                                      style={{
                                        borderRadius: 10,
                                        border: `1px solid ${borderColor}`,
                                        background: bgColor,
                                        padding: '8px 10px',
                                      }}
                                    >
                                      <Typography.Text style={{ color: token.colorTextSecondary, fontSize: 12 }}>
                                        {metric.label}
                                      </Typography.Text>
                                      <div style={{ color: textColor, fontWeight: 800, marginTop: 3 }}>
                                        {delta > 0 ? '+' : ''}
                                        {delta} {metric.unit}
                                      </div>
                                    </div>
                                  </Col>
                                )
                              })}
                            </Row>
                          </Space>
                        </Card>
                      ))}
                    </Space>
                  </Card>
                ) : null,
              },
              {
                key: 'insight',
                label: '快速判读',
                children: compareExpandedPanels.includes('insight') ? (
                  <Card style={{ borderRadius: 14 }} title="快速判读">
                    <Space direction="vertical" size={8} style={{ width: '100%' }}>
                      <Typography.Text>
                        抗拉强度最高：
                        <Typography.Text strong> {quickInsights.highestTensile}</Typography.Text>
                      </Typography.Text>
                      <Typography.Text>
                        密度最低：
                        <Typography.Text strong> {quickInsights.lowestDensity}</Typography.Text>
                      </Typography.Text>
                      <Typography.Text>
                        热导率最高：
                        <Typography.Text strong> {quickInsights.highestThermal}</Typography.Text>
                      </Typography.Text>
                    </Space>
                  </Card>
                ) : null,
              },
            ]}
          />
        )}
      </Drawer>
    </Space>
  )
}
