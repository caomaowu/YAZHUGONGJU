import type * as echarts from 'echarts'
import type { PQ2ComputeResult } from './types'

function formatNumber(value: number, digits: number) {
  if (!Number.isFinite(value)) return '-'
  return value.toFixed(digits)
}

export function buildPQ2ChartOption(result: PQ2ComputeResult, themePrimary: string): echarts.EChartsOption {
  const x = result.curve.map((d) => d.q2Lps2)
  const machine = result.curve.map((d) => [d.q2Lps2, d.pMachineMPa] as [number, number])
  const die = result.curve.map((d) => [d.q2Lps2, d.pDieMPa] as [number, number])

  const operating = result.points.operating
  const intersect = result.points.intersect

  const xMax = Math.max(1, ...x)

  // 构建可行区域的多边形数据
  // 可行区域是机台能力线下方且模具阻力线上方的区域
  // 即：从 (0,0) 开始，沿模具阻力线到交点，然后沿机台能力线回到 (0, pMax)
  const feasiblePolygon: [number, number][] = []

  // 找到交点索引（机台能力 > 模具阻力的区域）
  let intersectIndex = result.curve.length
  for (let i = 0; i < result.curve.length; i++) {
    if (result.curve[i].pMachineMPa <= result.curve[i].pDieMPa) {
      intersectIndex = i
      break
    }
  }

  // 构建多边形：从 (0,0) -> 沿模具阻力线 -> 交点 -> 沿机台能力线回到 (0, pMax) -> 闭合
  // 下边界：模具阻力线（从 0 到交点）
  for (let i = 0; i <= intersectIndex && i < result.curve.length; i++) {
    feasiblePolygon.push([result.curve[i].q2Lps2, result.curve[i].pDieMPa])
  }

  // 上边界：机台能力线（从交点回到 0）
  for (let i = Math.min(intersectIndex, result.curve.length - 1); i >= 0; i--) {
    feasiblePolygon.push([result.curve[i].q2Lps2, result.curve[i].pMachineMPa])
  }

  // 闭合多边形
  if (feasiblePolygon.length > 0) {
    feasiblePolygon.push(feasiblePolygon[0])
  }

  const tooltipFormatter = (params: unknown) => {
    const rows = Array.isArray(params) ? (params as Array<{ seriesName: string; data: unknown }>) : []
    const first = rows[0]
    const xy = Array.isArray(first?.data) ? (first.data as [number, number]) : undefined
    const xValue = typeof xy?.[0] === 'number' ? xy[0] : undefined
    const q = xValue != null && xValue >= 0 ? Math.sqrt(xValue) : NaN
    const header = `Q²: ${formatNumber(xValue ?? NaN, 2)} (L/s)²<br/>Q: ${formatNumber(q, 2)} L/s`

    const lines = rows
      .filter((r) => r.seriesName && !r.seriesName.startsWith('__'))
      .map((r) => {
        const data = Array.isArray(r.data) ? (r.data as [number, number]) : undefined
        const y = data?.[1]
        return `${r.seriesName}: <b>${formatNumber(typeof y === 'number' ? y : NaN, 2)} MPa</b>`
      })

    return [header, ...lines].join('<br/>')
  }

  return {
    animationDuration: 650,
    grid: { left: 18, right: 18, top: 40, bottom: 52, containLabel: true },
    legend: {
      top: 6,
      textStyle: { color: 'rgba(33, 23, 53, 0.7)' },
      itemWidth: 10,
      itemHeight: 10,
      data: ['机台能力', '模具阻力', '工作点'],
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'line', lineStyle: { color: 'rgba(139, 92, 246, 0.25)' } },
      backgroundColor: 'rgba(255, 255, 255, 0.92)',
      borderColor: 'rgba(139, 92, 246, 0.2)',
      borderWidth: 1,
      textStyle: { color: 'rgba(33, 23, 53, 0.88)' },
      extraCssText: 'border-radius: 12px; box-shadow: 0 18px 34px rgba(93, 60, 172, 0.18);',
      formatter: tooltipFormatter as unknown as echarts.TooltipComponentOption['formatter'],
    },
    dataZoom: [
      { type: 'inside', xAxisIndex: 0, filterMode: 'none' },
      {
        type: 'slider',
        xAxisIndex: 0,
        height: 20,
        bottom: 12,
        borderColor: 'rgba(139, 92, 246, 0.18)',
        backgroundColor: 'rgba(255, 255, 255, 0.55)',
        fillerColor: 'rgba(139, 92, 246, 0.16)',
        handleStyle: { color: 'rgba(139, 92, 246, 0.42)', borderColor: 'rgba(139, 92, 246, 0.32)' },
        textStyle: { color: 'rgba(33, 23, 53, 0.55)' },
        labelFormatter: (value: unknown) => (typeof value === 'number' ? value.toFixed(0) : ''),
      },
    ],
    xAxis: {
      type: 'value',
      name: 'Q²（(L/s)²）',
      nameLocation: 'end',
      nameGap: 12,
      min: 0,
      max: xMax,
      axisLine: { lineStyle: { color: 'rgba(33, 23, 53, 0.18)' } },
      axisTick: { show: false },
      axisLabel: { color: 'rgba(33, 23, 53, 0.62)' },
      splitLine: { lineStyle: { color: 'rgba(139, 92, 246, 0.1)' } },
    },
    yAxis: {
      type: 'value',
      name: 'P（MPa）',
      nameLocation: 'end',
      nameGap: 12,
      min: 0,
      axisLabel: { color: 'rgba(33, 23, 53, 0.58)' },
      splitLine: { lineStyle: { color: 'rgba(139, 92, 246, 0.1)' } },
    },
    series: [
      // 可行区域使用 line 类型的 areaStyle 填充，数据为闭合多边形
      {
        name: '__feasible_area',
        type: 'line',
        data: feasiblePolygon,
        symbol: 'none',
        lineStyle: { opacity: 0 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(139, 92, 246, 0.25)' },
              { offset: 1, color: 'rgba(139, 92, 246, 0.05)' },
            ],
          },
          opacity: 1,
        },
        tooltip: { show: false },
        silent: true,
        z: 1,
      },
      {
        name: '机台能力',
        type: 'line',
        data: machine,
        smooth: 0.08,
        showSymbol: false,
        lineStyle: { width: 3, color: themePrimary },
        z: 3,
      },
      {
        name: '模具阻力',
        type: 'line',
        data: die,
        smooth: 0.04,
        showSymbol: false,
        lineStyle: { width: 3, color: 'rgba(236, 72, 153, 0.9)' },
        z: 3,
      },
      {
        name: '工作点',
        type: 'effectScatter',
        data: [[operating.q2Lps2, operating.pRequiredMPa]],
        symbolSize: 12,
        rippleEffect: { scale: 2.4, brushType: 'stroke' },
        itemStyle: { color: '#F59E0B', borderColor: 'rgba(255, 255, 255, 0.95)', borderWidth: 2 },
        z: 7,
        markLine: {
          silent: true,
          label: { color: 'rgba(33, 23, 53, 0.58)' },
          lineStyle: { color: 'rgba(245, 158, 11, 0.55)', width: 1.5, type: 'dashed' },
          data: [{ xAxis: operating.q2Lps2, name: '工作点 Q²' }],
        },
        markPoint: intersect
          ? {
              symbolSize: 10,
              itemStyle: { color: 'rgba(34, 197, 94, 0.9)' },
              label: { color: 'rgba(33, 23, 53, 0.7)', formatter: '交点' },
              data: [{ name: '交点', coord: [intersect.q2Lps2, intersect.pMPa] }],
            }
          : undefined,
      },
    ],
  }
}
