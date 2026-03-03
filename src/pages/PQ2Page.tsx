import { useMemo, useRef, useState } from 'react'
import type * as echarts from 'echarts'
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Divider,
  Form,
  InputNumber,
  Select,
  Space,
  Switch,
  Tag,
  Typography,
  theme,
  Tabs,
  Col,
  Row,
} from 'antd'
import { DownloadOutlined, FileImageOutlined, ReloadOutlined } from '@ant-design/icons'
import { useSharedValue } from '../core/state/hooks'
import { EChart } from '../components/charts/EChart'
import { buildPQ2ChartOption } from '../tools/pq2/chart'
import { computePQ2 } from '../tools/pq2/compute'
import { downloadDataUrl, downloadJson, formatTimestampForFile } from '../tools/pq2/download'
import { getMaterialById, PQ2_MATERIALS } from '../tools/pq2/materials'
import type { PQ2Params } from '../tools/pq2/types'

const DEFAULT_PARAMS: PQ2Params = {
  materialId: 'ADC12',
  densityKgM3: 2650,
  inputBasis: 'mass',
  castingMassKg: 1.2,
  castingVolumeCm3: 450,
  fillTimeS: 0.06,
  gateWidthMm: 40,
  gateThicknessMm: 2,
  useCustomGateArea: false,
  gateAreaMm2: 80,
  dischargeCoeff: 0.62,
  extraLossMPa: 0,
  machineMaxPressureMPa: 80,
  plungerDiameterMm: 60,
  plungerMaxSpeedMps: 5,
  // 工艺窗口默认值
  useCustomProcessWindow: false,
  vGateMaxMps: 60,
  vGateMinMps: 30,
  maxFillTimeS: 0, // 0表示不使用
  // 液压参数默认值
  useHydraulicMode: false,
  hydraulicPressureMPa: 16, // MPa (约160 kg/cm²)
  hydraulicCylinderDiameterMm: 210, // mm (约21 cm)
}

function mergeDefinedParams(input?: Partial<PQ2Params>): Partial<PQ2Params> {
  if (!input) return {}
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined)
  ) as Partial<PQ2Params>
}

function normalizeParams(input?: Partial<PQ2Params>): PQ2Params {
  const merged: PQ2Params = {
    ...DEFAULT_PARAMS,
    ...mergeDefinedParams(input),
  }
  const material = getMaterialById(merged.materialId)
  return {
    ...merged,
    materialId: material.id,
    densityKgM3: merged.densityKgM3 > 0 ? merged.densityKgM3 : material.densityKgM3,
  }
}

export function PQ2Page() {
  const { token } = theme.useToken()
  const [savedParams, setSavedParams] = useSharedValue<PQ2Params>('pq2', 'params', DEFAULT_PARAMS)
  const [activeTab, setActiveTab] = useState('machine')

  const [form] = Form.useForm<PQ2Params>()
  const chartRef = useRef<echarts.ECharts | null>(null)

  const initialParams = useMemo(() => normalizeParams(savedParams), [savedParams])

  const params = Form.useWatch([], form) as PQ2Params | undefined

  const computeResult = useMemo(() => {
    const current = normalizeParams(params ?? initialParams)
    return computePQ2(current)
  }, [initialParams, params])

  const chartOption = useMemo(() => {
    return buildPQ2ChartOption(computeResult, token.colorPrimary)
  }, [computeResult, token.colorPrimary])

  const canExport = computeResult.errors.length === 0

  const onExportPng = () => {
    const chart = chartRef.current
    if (!chart) return
    const stamp = formatTimestampForFile(new Date())
    const url = chart.getDataURL({
      type: 'png',
      pixelRatio: 2,
      backgroundColor: '#ffffff',
      excludeComponents: ['dataZoom'],
    })
    downloadDataUrl(url, `PQ2_${stamp}.png`)
  }

  const onExportJson = () => {
    const stamp = formatTimestampForFile(new Date())
    const current = normalizeParams(params ?? initialParams)
    const payload = {
      tool: 'PQ2',
      exportedAt: new Date().toISOString(),
      params: current,
      result: {
        intermediate: computeResult.intermediate,
        points: computeResult.points,
        warnings: computeResult.warnings,
      },
    }
    downloadJson(payload, `PQ2_${stamp}.json`)
  }

  const renderMachineTab = () => (
    <Row gutter={24}>
      <Col span={12}>
        <div style={{ marginBottom: 16 }}>
          <Space align="center" style={{ width: '100%', justifyContent: 'space-between', marginBottom: 8 }}>
            <Typography.Text strong>液压参数模式</Typography.Text>
            <Form.Item name="useHydraulicMode" valuePropName="checked" noStyle>
              <Switch size="small" />
            </Form.Item>
          </Space>
          
          <Form.Item noStyle shouldUpdate={(p, n) => p.useHydraulicMode !== n.useHydraulicMode}>
            {({ getFieldValue }) => {
              const useHydraulic = getFieldValue('useHydraulicMode') as boolean
              return useHydraulic ? (
                <>
                  <Form.Item
                    label="储能器压力 (Phyd)"
                    name="hydraulicPressureMPa"
                    rules={[{ required: true, type: 'number', min: 1 }]}
                  >
                    <InputNumber style={{ width: '100%' }} min={0} step={1} addonAfter="MPa" />
                  </Form.Item>
                  <Form.Item
                    label="压射缸直径 (dhyd)"
                    name="hydraulicCylinderDiameterMm"
                    rules={[{ required: true, type: 'number', min: 1 }]}
                  >
                    <InputNumber style={{ width: '100%' }} min={0} step={1} addonAfter="mm" />
                  </Form.Item>
                </>
              ) : (
                <Form.Item
                  label="最大金属静压力 (Pm)"
                  name="machineMaxPressureMPa"
                  rules={[{ required: true, type: 'number', min: 1 }]}
                >
                  <InputNumber style={{ width: '100%' }} min={0} step={1} addonAfter="MPa" />
                </Form.Item>
              )
            }}
          </Form.Item>
        </div>
      </Col>
      <Col span={12}>
        <Form.Item
          label="冲头直径 (dpt)"
          name="plungerDiameterMm"
          rules={[{ required: true, type: 'number', min: 1 }]}
        >
          <InputNumber style={{ width: '100%' }} min={0} step={1} addonAfter="mm" />
        </Form.Item>
        <Form.Item
          label="最大空压射速度 (Vds)"
          name="plungerMaxSpeedMps"
          rules={[{ required: true, type: 'number', min: 0.1 }]}
        >
          <InputNumber style={{ width: '100%' }} min={0} step={0.1} addonAfter="m/s" />
        </Form.Item>
        
        <Form.Item noStyle shouldUpdate>
          {({ getFieldValue }) => {
            const useHydraulic = getFieldValue('useHydraulicMode') as boolean
            if (!useHydraulic) return null
            
            const phyd = getFieldValue('hydraulicPressureMPa') as number
            const dhyd = getFieldValue('hydraulicCylinderDiameterMm') as number
            const dpt = getFieldValue('plungerDiameterMm') as number
            let calculatedPressure = 0
            if (dpt > 0) {
              const ratio = Math.pow(dhyd / dpt, 2)
              calculatedPressure = phyd * ratio
            }
            return (
              <div style={{ padding: '8px 12px', background: 'rgba(139, 92, 246, 0.08)', borderRadius: 8, marginTop: 8 }}>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  计算所得最大金属静压力: {' '}
                  <Typography.Text strong style={{ color: token.colorPrimary }}>
                    {calculatedPressure.toFixed(2)} MPa
                  </Typography.Text>
                </Typography.Text>
              </div>
            )
          }}
        </Form.Item>
      </Col>
    </Row>
  )

  const renderDieTab = () => (
    <Row gutter={24}>
      <Col span={12}>
        <div style={{ marginBottom: 16 }}>
          <Space align="center" style={{ width: '100%', justifyContent: 'space-between', marginBottom: 8 }}>
            <Typography.Text strong>自定义浇口面积</Typography.Text>
            <Form.Item name="useCustomGateArea" valuePropName="checked" noStyle>
              <Switch size="small" />
            </Form.Item>
          </Space>
          
          <Form.Item noStyle shouldUpdate={(p, n) => p.useCustomGateArea !== n.useCustomGateArea}>
            {({ getFieldValue }) => {
              const custom = getFieldValue('useCustomGateArea')
              return (
                <>
                  <Form.Item label="浇口宽" name="gateWidthMm" rules={[{ required: true, type: 'number', min: 0.1 }]}>
                    <InputNumber style={{ width: '100%' }} min={0} step={1} disabled={custom} addonAfter="mm" />
                  </Form.Item>
                  <Form.Item
                    label="浇口厚"
                    name="gateThicknessMm"
                    rules={[{ required: true, type: 'number', min: 0.1 }]}
                  >
                    <InputNumber style={{ width: '100%' }} min={0} step={0.1} disabled={custom} addonAfter="mm" />
                  </Form.Item>
                  {custom && (
                    <Form.Item
                      label="浇口面积 (Ag)"
                      name="gateAreaMm2"
                      rules={[{ required: true, type: 'number', min: 1 }]}
                    >
                      <InputNumber style={{ width: '100%' }} min={0} step={1} addonAfter="mm²" />
                    </Form.Item>
                  )}
                </>
              )
            }}
          </Form.Item>
        </div>
      </Col>
      <Col span={12}>
        <Form.Item
          label="流量系数 (Cd)"
          name="dischargeCoeff"
          rules={[{ required: true, type: 'number', min: 0.01, max: 1 }]}
          tooltip="优秀: 0.7-0.8, 良好: 0.6-0.7, 一般: 0.5-0.6"
        >
          <InputNumber style={{ width: '100%' }} min={0.01} max={1} step={0.01} />
        </Form.Item>
        <Form.Item label="其他压降" name="extraLossMPa" rules={[{ required: true, type: 'number', min: 0 }]}>
          <InputNumber style={{ width: '100%' }} min={0} step={1} addonAfter="MPa" />
        </Form.Item>
      </Col>
    </Row>
  )

  const renderProcessTab = () => (
    <Row gutter={24}>
      <Col span={12}>
        <div style={{ marginBottom: 16 }}>
          <Space align="center" style={{ width: '100%', justifyContent: 'space-between', marginBottom: 8 }}>
            <Typography.Text strong>自定义工艺窗口</Typography.Text>
            <Form.Item name="useCustomProcessWindow" valuePropName="checked" noStyle>
              <Switch size="small" />
            </Form.Item>
          </Space>

          <Form.Item noStyle shouldUpdate={(p, n) => p.useCustomProcessWindow !== n.useCustomProcessWindow}>
            {({ getFieldValue }) => {
              const useCustom = Boolean(getFieldValue('useCustomProcessWindow'))
              if (!useCustom) {
                return (
                  <Alert
                    type="info"
                    showIcon
                    message={`已使用推荐工艺窗口：Vmax ${DEFAULT_PARAMS.vGateMaxMps} m/s，Vmin ${DEFAULT_PARAMS.vGateMinMps} m/s`}
                    description="开启开关后可自定义工艺窗口边界。"
                  />
                )
              }

              return (
                <>
                  <Form.Item
                    label="最大浇口速度 (Vmax)"
                    name="vGateMaxMps"
                    rules={[{ required: true, type: 'number', min: 10 }]}
                  >
                    <InputNumber style={{ width: '100%' }} min={10} max={200} step={5} addonAfter="m/s" />
                  </Form.Item>
                  <Form.Item
                    label="最小浇口速度 (Vmin)"
                    name="vGateMinMps"
                    rules={[{ required: true, type: 'number', min: 5 }]}
                  >
                    <InputNumber style={{ width: '100%' }} min={5} max={100} step={5} addonAfter="m/s" />
                  </Form.Item>
                </>
              )
            }}
          </Form.Item>
        </div>
      </Col>
      <Col span={12}>
        <Form.Item
          label="充型时间 (t)"
          name="fillTimeS"
          rules={[{ required: true, type: 'number', min: 0.001 }]}
        >
          <InputNumber style={{ width: '100%' }} min={0} step={0.01} addonAfter="s" />
        </Form.Item>
        <Form.Item noStyle shouldUpdate={(p, n) => p.useCustomProcessWindow !== n.useCustomProcessWindow}>
          {({ getFieldValue }) => {
            const useCustom = Boolean(getFieldValue('useCustomProcessWindow'))
            if (!useCustom) {
              return (
                <Alert
                  type="info"
                  showIcon
                  message="Qmin 左边界默认关闭"
                  description="开启开关后可通过 t_max 启用 Qmin 左边界。"
                />
              )
            }
            return (
              <Form.Item
                label="最大充型时间限制 (t_max)"
                name="maxFillTimeS"
                tooltip="用于确定工艺窗口的最小流量边界 Qmin。若设为0则不显示左边界。"
              >
                <InputNumber style={{ width: '100%' }} min={0} step={0.01} placeholder="可选" addonAfter="s" />
              </Form.Item>
            )
          }}
        </Form.Item>
      </Col>
    </Row>
  )

  const renderMaterialTab = () => (
    <Row gutter={24}>
      <Col span={12}>
        <Form.Item label="材料" name="materialId" rules={[{ required: true }]}>
          <Select
            options={PQ2_MATERIALS.map((m) => ({ value: m.id, label: `${m.name} (${m.densityKgM3} kg/m³)` }))}
            showSearch
            optionFilterProp="label"
            onChange={(val) => {
              const mat = getMaterialById(val)
              if (mat) {
                form.setFieldValue('densityKgM3', mat.densityKgM3)
              }
            }}
          />
        </Form.Item>

        <Form.Item
          label="密度 (ρ)"
          name="densityKgM3"
          rules={[{ required: true, type: 'number', min: 1 }]}
        >
          <InputNumber style={{ width: '100%' }} min={1} step={10} addonAfter="kg/m³" />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item label="输入基准" name="inputBasis" rules={[{ required: true }]}>
          <Select
            options={[
              { value: 'mass', label: '质量 (kg)' },
              { value: 'volume', label: '体积 (cm³)' },
            ]}
            onChange={(val) => {
              const values = form.getFieldsValue()
              const density = values.densityKgM3 || 1
              if (val === 'mass') {
                // Volume -> Mass
                const vol = values.castingVolumeCm3 || 0
                const mass = (vol * density) / 1e6
                form.setFieldValue('castingMassKg', Number(mass.toFixed(4)))
              } else {
                // Mass -> Volume
                const mass = values.castingMassKg || 0
                const vol = (mass * 1e6) / density
                form.setFieldValue('castingVolumeCm3', Number(vol.toFixed(1)))
              }
            }}
          />
        </Form.Item>

        <Form.Item
          noStyle
          shouldUpdate={(p, n) => p.inputBasis !== n.inputBasis}
        >
          {({ getFieldValue }) => {
            const basis = getFieldValue('inputBasis') as PQ2Params['inputBasis']
            return basis === 'mass' ? (
              <Form.Item
                label="总充型质量"
                name="castingMassKg"
                rules={[{ required: true, type: 'number', min: 0.001 }]}
              >
                <InputNumber style={{ width: '100%' }} min={0} step={0.1} addonAfter="kg" />
              </Form.Item>
            ) : (
              <Form.Item
                label="总充型体积"
                name="castingVolumeCm3"
                rules={[{ required: true, type: 'number', min: 1 }]}
              >
                <InputNumber style={{ width: '100%' }} min={0} step={10} addonAfter="cm³" />
              </Form.Item>
            )
          }}
        </Form.Item>

        <Form.Item
          noStyle
          shouldUpdate={(p, n) =>
            p.castingMassKg !== n.castingMassKg ||
            p.castingVolumeCm3 !== n.castingVolumeCm3 ||
            p.inputBasis !== n.inputBasis ||
            p.densityKgM3 !== n.densityKgM3
          }
        >
          {({ getFieldValue }) => {
            const basis = getFieldValue('inputBasis') as PQ2Params['inputBasis']
            const density = Number(getFieldValue('densityKgM3') ?? 1)
            const massInput = Number(getFieldValue('castingMassKg') ?? 0)
            const volInput = Number(getFieldValue('castingVolumeCm3') ?? 0)
            
            let displayVal = ''
            if (basis === 'mass') {
              const calcVol = (massInput * 1e6) / density
              displayVal = `${calcVol.toFixed(0)} cm³`
            } else {
              const calcMass = (volInput * density) / 1e6
              displayVal = `${calcMass.toFixed(3)} kg`
            }

            return (
              <div style={{ padding: '8px 12px', background: 'rgba(139, 92, 246, 0.08)', borderRadius: 8, marginTop: 8 }}>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {basis === 'mass' ? '联动总充型体积: ' : '联动总充型质量: '}
                  <Typography.Text strong style={{ color: token.colorPrimary }}>
                    {displayVal}
                  </Typography.Text>
                </Typography.Text>
              </div>
            )
          }}
        </Form.Item>
      </Col>
    </Row>
  )

  return (
    <>
      <div className="centerHeader">
        <div className="centerTitle">
          <Typography.Text type="secondary">工具</Typography.Text>
          <h1>PQ² 图</h1>
          <p>参数联动计算 + P-Q² 曲线与区域 + 导出（PNG/JSON）。体积/质量按“总充型”口径录入。</p>
        </div>
        <Space size={10}>
          <Button
            icon={<FileImageOutlined />}
            type="primary"
            disabled={!canExport}
            onClick={onExportPng}
          >
            导出 PNG
          </Button>
          <Button icon={<DownloadOutlined />} disabled={!canExport} onClick={onExportJson}>
            导出参数 JSON
          </Button>
        </Space>
      </div>

      <div className="centerBody">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card className="softCard" title="输入参数" extra={
            <Space>
               <Button
                  size="small"
                  icon={<ReloadOutlined />}
                  onClick={() => {
                    const material = getMaterialById(form.getFieldValue('materialId'))
                    const reset = { ...DEFAULT_PARAMS, densityKgM3: material.densityKgM3, materialId: material.id }
                    form.setFieldsValue(reset)
                    setSavedParams(reset)
                  }}
                >
                  重置
                </Button>
            </Space>
          }>
             <Form<PQ2Params>
              form={form}
              layout="vertical"
              initialValues={initialParams}
              onValuesChange={(_, next) => {
                setSavedParams(normalizeParams(next))
              }}
            >
              <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                type="card"
                items={[
                  { key: 'machine', label: '机床', children: renderMachineTab() },
                  { key: 'die', label: '模具', children: renderDieTab() },
                  { key: 'process', label: '工艺', children: renderProcessTab() },
                  { key: 'material', label: '材料', children: renderMaterialTab() },
                ]}
              />
            </Form>
          </Card>

          <Card
            className="softCard"
            title="PQ² 图（P - Q²）"
            extra={
              <Space size={8}>
                <Tag color="purple">ECharts</Tag>
                <Tag color={canExport ? 'green' : 'volcano'}>{canExport ? '可导出' : '待修正'}</Tag>
              </Space>
            }
          >
            <div className="chartWrap chartWrapTall">
              <EChart
                option={chartOption}
                style={{ width: '100%', height: '100%' }}
                onChartReady={(chart) => (chartRef.current = chart)}
              />
            </div>
            <div style={{ height: 10 }} />
            <Space direction="vertical" size={10} style={{ width: '100%' }}>
              {computeResult.errors.length > 0 ? (
                <Alert
                  type="error"
                  showIcon
                  message="参数校验未通过"
                  description={computeResult.errors.join('；')}
                />
              ) : null}
              {computeResult.warnings.length > 0 ? (
                <Alert
                  type="warning"
                  showIcon
                  message="提示"
                  description={computeResult.warnings.slice(0, 3).join('；')}
                />
              ) : null}
            </Space>

            <Divider style={{ margin: '16px 0' }} />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
              <div className="pill" style={{ padding: '16px' }}>
                <Space align="center" style={{ marginBottom: 12 }}>
                  <div style={{ width: 4, height: 16, background: token.colorPrimary, borderRadius: 2 }} />
                  <Typography.Text strong style={{ fontSize: '15px' }}>
                    计算结果
                  </Typography.Text>
                  <Tag color="purple" style={{ fontSize: '11px', padding: '0 6px', lineHeight: '18px' }}>Result</Tag>
                </Space>
                <Descriptions size="small" column={1} styles={{ label: { color: token.colorTextSecondary } }}>
                  <Descriptions.Item label="需求流量 Q">
                    {computeResult.intermediate.qRequiredLps?.toFixed(2) ?? '-'} L/s
                  </Descriptions.Item>
                  <Descriptions.Item label="需求 Q²">
                    {computeResult.intermediate.xRequiredLps2?.toFixed(2) ?? '-'} (L/s)²
                  </Descriptions.Item>
                  <Descriptions.Item label="机台最大流量">
                    {computeResult.intermediate.qMaxLps?.toFixed(2) ?? '-'} L/s
                  </Descriptions.Item>
                  <Descriptions.Item label="浇口速度 Vg">
                    <Typography.Text
                      type={
                        (computeResult.intermediate.vGateMps ?? 0) >= 30 && (computeResult.intermediate.vGateMps ?? 0) <= 60
                          ? 'success'
                          : 'warning'
                      }
                      strong
                    >
                      {computeResult.intermediate.vGateMps?.toFixed(1) ?? '-'} m/s
                    </Typography.Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="需求压力 P_die">
                    {computeResult.points.operating.pRequiredMPa?.toFixed(2) ?? '-'} MPa
                  </Descriptions.Item>
                  <Descriptions.Item label="机台可用 P_machine">
                    {computeResult.points.operating.pMachineMPa?.toFixed(2) ?? '-'} MPa
                  </Descriptions.Item>
                  <Descriptions.Item label="裕量">
                    <Typography.Text type={(computeResult.points.operating.marginMPa ?? 0) >= 0 ? 'success' : 'danger'} strong>
                      {computeResult.points.operating.marginMPa?.toFixed(2) ?? '-'} MPa
                    </Typography.Text>
                  </Descriptions.Item>
                </Descriptions>
                {computeResult.points.intersect ? (
                  <>
                    <Divider style={{ margin: '12px 0' }} />
                    <Descriptions size="small" column={1} styles={{ label: { color: token.colorTextSecondary } }}>
                      <Descriptions.Item label="交点 Q">
                        {computeResult.points.intersect.qLps.toFixed(2)} L/s
                      </Descriptions.Item>
                      <Descriptions.Item label="交点压力">
                        {computeResult.points.intersect.pMPa.toFixed(2)} MPa
                      </Descriptions.Item>
                    </Descriptions>
                  </>
                ) : null}
                {computeResult.points.processWindow ? (
                  <>
                    <Divider style={{ margin: '12px 0' }} />
                    <Descriptions size="small" column={1} styles={{ label: { color: token.colorTextSecondary } }}>
                      <Descriptions.Item label="工艺窗口 Pmax">
                        {computeResult.points.processWindow.pMaxMPa.toFixed(2)} MPa
                      </Descriptions.Item>
                      <Descriptions.Item label="工艺窗口 Pmin">
                        {computeResult.points.processWindow.pMinMPa.toFixed(2)} MPa
                      </Descriptions.Item>
                      <Descriptions.Item label="工艺窗口 Qmin">
                        {typeof computeResult.points.processWindow.qMinLps === 'number'
                          ? `${computeResult.points.processWindow.qMinLps.toFixed(2)} L/s`
                          : '未启用'}
                      </Descriptions.Item>
                    </Descriptions>
                  </>
                ) : null}
              </div>

              <div className="pill" style={{ padding: '16px' }}>
                <Space align="center" style={{ marginBottom: 12 }}>
                  <div style={{ width: 4, height: 16, background: token.colorPrimary, borderRadius: 2 }} />
                  <Typography.Text strong style={{ fontSize: '15px' }}>
                    中间值（可追溯输出）
                  </Typography.Text>
                  <Tag color="purple" style={{ fontSize: '11px', padding: '0 6px', lineHeight: '18px' }}>Debug</Tag>
                </Space>
                <Descriptions size="small" column={2} styles={{ label: { color: token.colorTextSecondary } }}>
                  <Descriptions.Item label="浇口面积">
                    {computeResult.intermediate.gateAreaMm2?.toFixed(2) ?? '-'} mm²
                  </Descriptions.Item>
                  <Descriptions.Item label="总充型体积">
                    {computeResult.intermediate.castingVolumeCm3?.toFixed(0) ?? '-'} cm³
                  </Descriptions.Item>
                  <Descriptions.Item label="总充型质量">
                    {computeResult.intermediate.castingMassKg?.toFixed(3) ?? '-'} kg
                  </Descriptions.Item>
                  <Descriptions.Item label="die 斜率">
                    {computeResult.intermediate.dieSlopeMPaPerLps2?.toExponential(3) ?? '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Qmax²">
                    {computeResult.intermediate.xMaxLps2?.toFixed(0) ?? '-'} (L/s)²
                  </Descriptions.Item>
                  <Descriptions.Item label="Qreq²">
                    {computeResult.intermediate.xRequiredLps2?.toFixed(0) ?? '-'} (L/s)²
                  </Descriptions.Item>
                </Descriptions>
                <Divider style={{ margin: '12px 0' }} />
                <Typography.Paragraph style={{ marginBottom: 0 }} type="secondary">
                  中间值用于校验与追溯：单位统一为 SI 参与计算，图中横轴使用 (L/s)² 做展示。总充型体积/质量建议包含铸件、浇道、溢流等。
                </Typography.Paragraph>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </>
  )
}
