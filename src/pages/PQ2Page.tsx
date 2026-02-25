import { useMemo, useRef } from 'react'
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
  materialId: 'A380',
  densityKgM3: 2680,
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
}

export function PQ2Page() {
  const { token } = theme.useToken()
  const [machineName] = useSharedValue<string>('global', 'machineName', '未设置')
  const [materialName] = useSharedValue<string>('global', 'materialName', 'A380')
  const [savedParams, setSavedParams] = useSharedValue<PQ2Params>('pq2', 'params', DEFAULT_PARAMS)

  const [form] = Form.useForm<PQ2Params>()
  const chartRef = useRef<echarts.ECharts | null>(null)

  const initialParams = useMemo(() => {
    const base = savedParams ?? DEFAULT_PARAMS
    const material = getMaterialById(base.materialId)
    return {
      ...base,
      densityKgM3: base.densityKgM3 > 0 ? base.densityKgM3 : material.densityKgM3,
    }
  }, [savedParams])

  const params = Form.useWatch([], form) as PQ2Params | undefined

  const computeResult = useMemo(() => {
    const current = params ?? initialParams
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
    const current = params ?? initialParams
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

  return (
    <>
      <div className="centerHeader">
        <div className="centerTitle">
          <Typography.Text type="secondary">工具</Typography.Text>
          <h1>PQ² 图</h1>
          <p>参数联动计算 + P-Q² 曲线与区域 + 导出（PNG/JSON）。</p>
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
        <div className="cardGrid">
          <Card
            className="softCard span10"
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

            <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '16px' }}>
              <div className="pill" style={{ padding: '16px' }}>
                <Space align="center" style={{ marginBottom: 12 }}>
                  <div style={{ width: 4, height: 16, background: token.colorPrimary, borderRadius: 2 }} />
                  <Typography.Text strong style={{ fontSize: '15px' }}>
                    计算结果
                  </Typography.Text>
                  <Tag color="purple" style={{ fontSize: '11px', padding: '0 6px', lineHeight: '18px' }}>Result</Tag>
                </Space>
                <Descriptions size="small" column={1} labelStyle={{ color: 'rgba(33, 23, 53, 0.56)' }}>
                  <Descriptions.Item label="需求流量 Q">
                    {computeResult.intermediate.qRequiredLps.toFixed(2)} L/s
                  </Descriptions.Item>
                  <Descriptions.Item label="需求 Q²">
                    {computeResult.intermediate.xRequiredLps2.toFixed(2)} (L/s)²
                  </Descriptions.Item>
                  <Descriptions.Item label="机台最大流量">
                    {computeResult.intermediate.qMaxLps.toFixed(2)} L/s
                  </Descriptions.Item>
                  <Descriptions.Item label="需求压力 P_die">
                    {computeResult.points.operating.pRequiredMPa.toFixed(2)} MPa
                  </Descriptions.Item>
                  <Descriptions.Item label="机台可用 P_machine">
                    {computeResult.points.operating.pMachineMPa.toFixed(2)} MPa
                  </Descriptions.Item>
                  <Descriptions.Item label="裕量">
                    <Typography.Text type={computeResult.points.operating.marginMPa >= 0 ? 'success' : 'danger'} strong>
                      {computeResult.points.operating.marginMPa.toFixed(2)} MPa
                    </Typography.Text>
                  </Descriptions.Item>
                </Descriptions>
                {computeResult.points.intersect ? (
                  <>
                    <Divider style={{ margin: '12px 0' }} />
                    <Descriptions size="small" column={1} labelStyle={{ color: 'rgba(33, 23, 53, 0.56)' }}>
                      <Descriptions.Item label="交点 Q">
                        {computeResult.points.intersect.qLps.toFixed(2)} L/s
                      </Descriptions.Item>
                      <Descriptions.Item label="交点压力">
                        {computeResult.points.intersect.pMPa.toFixed(2)} MPa
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
                <Descriptions size="small" column={3} labelStyle={{ color: 'rgba(33, 23, 53, 0.56)' }}>
                  <Descriptions.Item label="浇口面积">
                    {computeResult.intermediate.gateAreaMm2.toFixed(2)} mm²
                  </Descriptions.Item>
                  <Descriptions.Item label="体积">
                    {computeResult.intermediate.castingVolumeCm3.toFixed(0)} cm³
                  </Descriptions.Item>
                  <Descriptions.Item label="质量">
                    {computeResult.intermediate.castingMassKg.toFixed(3)} kg
                  </Descriptions.Item>
                  <Descriptions.Item label="die 斜率">
                    {computeResult.intermediate.dieSlopeMPaPerLps2.toExponential(3)} MPa / (L/s)²
                  </Descriptions.Item>
                  <Descriptions.Item label="Qmax²">
                    {computeResult.intermediate.xMaxLps2.toFixed(0)} (L/s)²
                  </Descriptions.Item>
                  <Descriptions.Item label="Qreq²">
                    {computeResult.intermediate.xRequiredLps2.toFixed(0)} (L/s)²
                  </Descriptions.Item>
                </Descriptions>
                <Divider style={{ margin: '12px 0' }} />
                <Typography.Paragraph style={{ marginBottom: 0 }} type="secondary">
                  中间值用于校验与追溯：单位统一为 SI 参与计算，图中横轴使用 (L/s)² 做展示。
                </Typography.Paragraph>
              </div>
            </div>
          </Card>

          <Card
            className="softCard span2"
            title="输入参数"
            extra={<Tag color="purple">Form</Tag>}
          >
            <Form<PQ2Params>
              form={form}
              layout="vertical"
              initialValues={initialParams}
              onValuesChange={(_, next) => {
                // 参数联动已在 computePQ2 中处理，这里只需保存参数
                setSavedParams(next)
              }}
            >
              <Space direction="vertical" size={10} style={{ width: '100%' }}>
                <div className="pill">
                  <Typography.Text type="secondary">共享状态</Typography.Text>
                  <div style={{ height: 8 }} />
                  <Descriptions size="small" column={1} labelStyle={{ color: 'rgba(33, 23, 53, 0.56)' }}>
                    <Descriptions.Item label="机台">{machineName ?? '未设置'}</Descriptions.Item>
                    <Descriptions.Item label="材料">{materialName ?? 'A380'}</Descriptions.Item>
                  </Descriptions>
                </div>

                <div className="pill">
                  <Form.Item label="材料" name="materialId" rules={[{ required: true }]}>
                    <Select
                      options={PQ2_MATERIALS.map((m) => ({ value: m.id, label: m.name }))}
                      showSearch
                      optionFilterProp="label"
                    />
                  </Form.Item>

                  <Form.Item
                    label="密度（kg/m³）"
                    name="densityKgM3"
                    rules={[{ required: true, type: 'number', min: 1 }]}
                  >
                    <InputNumber style={{ width: '100%' }} min={1} step={10} />
                  </Form.Item>
                </div>

                <div className="pill">
                  <Form.Item label="输入基准" name="inputBasis" rules={[{ required: true }]}>
                    <Select
                      options={[
                        { value: 'mass', label: '质量（kg）' },
                        { value: 'volume', label: '体积（cm³）' },
                      ]}
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
                          label="铸件质量（kg）"
                          name="castingMassKg"
                          rules={[{ required: true, type: 'number', min: 0.001 }]}
                        >
                          <InputNumber style={{ width: '100%' }} min={0} step={0.1} />
                        </Form.Item>
                      ) : (
                        <Form.Item
                          label="铸件体积（cm³）"
                          name="castingVolumeCm3"
                          rules={[{ required: true, type: 'number', min: 1 }]}
                        >
                          <InputNumber style={{ width: '100%' }} min={0} step={10} />
                        </Form.Item>
                      )
                    }}
                  </Form.Item>

                  <Form.Item
                    noStyle
                    shouldUpdate={(p, n) =>
                      p.castingMassKg !== n.castingMassKg ||
                      p.castingVolumeCm3 !== n.castingVolumeCm3 ||
                      p.inputBasis !== n.inputBasis
                    }
                  >
                    {({ getFieldValue }) => {
                      const basis = getFieldValue('inputBasis') as PQ2Params['inputBasis']
                      const mass = Number(getFieldValue('castingMassKg') ?? 0)
                      const vol = Number(getFieldValue('castingVolumeCm3') ?? 0)
                      return (
                        <Descriptions
                          size="small"
                          column={1}
                          labelStyle={{ color: 'rgba(33, 23, 53, 0.56)' }}
                        >
                          <Descriptions.Item label={basis === 'mass' ? '联动体积' : '联动质量'}>
                            {basis === 'mass' ? `${vol.toFixed(0)} cm³` : `${mass.toFixed(3)} kg`}
                          </Descriptions.Item>
                        </Descriptions>
                      )
                    }}
                  </Form.Item>

                  <Divider style={{ margin: '10px 0' }} />

                  <Form.Item
                    label="充型时间（s）"
                    name="fillTimeS"
                    rules={[{ required: true, type: 'number', min: 0.001 }]}
                  >
                    <InputNumber style={{ width: '100%' }} min={0} step={0.01} />
                  </Form.Item>
                </div>

                <div className="pill">
                  <Space align="center" style={{ width: '100%', justifyContent: 'space-between' }}>
                    <Typography.Text type="secondary">浇口面积使用自定义</Typography.Text>
                    <Form.Item name="useCustomGateArea" valuePropName="checked" noStyle>
                      <Switch />
                    </Form.Item>
                  </Space>
                  <div style={{ height: 10 }} />

                  <Form.Item label="浇口宽（mm）" name="gateWidthMm" rules={[{ required: true, type: 'number', min: 0.1 }]}>
                    <InputNumber style={{ width: '100%' }} min={0} step={1} />
                  </Form.Item>
                  <Form.Item
                    label="浇口厚（mm）"
                    name="gateThicknessMm"
                    rules={[{ required: true, type: 'number', min: 0.1 }]}
                  >
                    <InputNumber style={{ width: '100%' }} min={0} step={0.1} />
                  </Form.Item>

                  <Form.Item noStyle shouldUpdate={(p, n) => p.useCustomGateArea !== n.useCustomGateArea}>
                    {({ getFieldValue }) => (
                      <Form.Item
                        label="浇口面积（mm²）"
                        name="gateAreaMm2"
                        rules={[{ required: true, type: 'number', min: 1 }]}
                      >
                        <InputNumber
                          style={{ width: '100%' }}
                          min={0}
                          step={1}
                          disabled={!getFieldValue('useCustomGateArea')}
                        />
                      </Form.Item>
                    )}
                  </Form.Item>

                  <Divider style={{ margin: '10px 0' }} />

                  <Form.Item
                    label="流量系数 Cd"
                    name="dischargeCoeff"
                    rules={[{ required: true, type: 'number', min: 0.01, max: 1 }]}
                  >
                    <InputNumber style={{ width: '100%' }} min={0.01} max={1} step={0.01} />
                  </Form.Item>

                  <Form.Item label="其他压降（MPa）" name="extraLossMPa" rules={[{ required: true, type: 'number', min: 0 }]}>
                    <InputNumber style={{ width: '100%' }} min={0} step={1} />
                  </Form.Item>
                </div>

                <div className="pill">
                  <Typography.Text type="secondary">机台能力</Typography.Text>
                  <div style={{ height: 10 }} />

                  <Form.Item
                    label="最大压力（MPa）"
                    name="machineMaxPressureMPa"
                    rules={[{ required: true, type: 'number', min: 1 }]}
                  >
                    <InputNumber style={{ width: '100%' }} min={0} step={1} />
                  </Form.Item>
                  <Form.Item
                    label="冲头直径（mm）"
                    name="plungerDiameterMm"
                    rules={[{ required: true, type: 'number', min: 1 }]}
                  >
                    <InputNumber style={{ width: '100%' }} min={0} step={1} />
                  </Form.Item>
                  <Form.Item
                    label="冲头最大速度（m/s）"
                    name="plungerMaxSpeedMps"
                    rules={[{ required: true, type: 'number', min: 0.1 }]}
                  >
                    <InputNumber style={{ width: '100%' }} min={0} step={0.1} />
                  </Form.Item>
                </div>

                <Button
                  icon={<ReloadOutlined />}
                  block
                  onClick={() => {
                    const material = getMaterialById(form.getFieldValue('materialId'))
                    const reset = { ...DEFAULT_PARAMS, densityKgM3: material.densityKgM3, materialId: material.id }
                    form.setFieldsValue(reset)
                    setSavedParams(reset)
                  }}
                >
                  恢复推荐默认值
                </Button>
              </Space>
            </Form>
          </Card>
        </div>
      </div>
    </>
  )
}
