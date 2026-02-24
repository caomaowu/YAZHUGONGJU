import type * as echarts from 'echarts'
import type { PQ2ComputeResult } from './types'

function formatNumber(value: number, digits: number) {
  if (!Number.isFinite(value)) return '-'
  return value.toFixed(digits)
}

function toRgba(color: string, alpha: number) {
  if (color.startsWith('#')) {
    const hex = color.slice(1)
    const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex
    const r = parseInt(full.slice(0, 2), 16)
    const g = parseInt(full.slice(2, 4), 16)
    const b = parseInt(full.slice(4, 6), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }

  const m = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i)
  if (m) return `rgba(${m[1]}, ${m[2]}, ${m[3]}, ${alpha})`
  return color
}

function gradient(primary: string) {
  return {
    type: 'linear',
    x: 0,
    y: 0,
    x2: 0,
    y2: 1,
    colorStops: [
      { offset: 0, color: 'rgba(236, 72, 153, 0.26)' },
      { offset: 0.5, color: toRgba(primary, 0.14) },
      { offset: 1, color: 'rgba(139, 92, 246, 0.02)' },
    ],
  }
}

export function buildPQ2ChartOption(result: PQ2ComputeResult, themePrimary: string): echarts.EChartsOption {
  const primaryRgba = toRgba(themePrimary, 0.38)

  const x = result.curve.map((d) => d.q2Lps2)
  const machine = result.curve.map((d) => [d.q2Lps2, d.pMachineMPa] as [number, number])
  const die = result.curve.map((d) => [d.q2Lps2, d.pDieMPa] as [number, number])

  const areaBase = result.curve.map((d) => [d.q2Lps2, Math.min(d.pDieMPa, d.pMachineMPa)] as [number, number])
  const areaDelta = result.curve.map((d) => [
    d.q2Lps2,
    Math.max(0, d.pMachineMPa - Math.min(d.pDieMPa, d.pMachineMPa)),
  ] as [number, number])

  const operating = result.points.operating
  const intersect = result.points.intersect

  const xMax = Math.max(1, ...x)

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
      {
        name: '__feasible_base',
        type: 'line',
        data: areaBase,
        stack: 'feasible',
        symbol: 'none',
        lineStyle: { opacity: 0 },
        areaStyle: { opacity: 0 },
        tooltip: { show: false },
        silent: true,
      },
      {
        name: '__feasible_area',
        type: 'line',
        data: areaDelta,
        stack: 'feasible',
        symbol: 'none',
        lineStyle: { opacity: 0 },
        areaStyle: { color: gradient(primaryRgba) as unknown as echarts.Color, opacity: 1 },
        tooltip: { show: false },
        silent: true,
      },
      {
        name: '机台能力',
        type: 'line',
        data: machine,
        smooth: 0.08,
        showSymbol: false,
        lineStyle: { width: 3, color: themePrimary },
      },
      {
        name: '模具阻力',
        type: 'line',
        data: die,
        smooth: 0.04,
        showSymbol: false,
        lineStyle: { width: 3, color: 'rgba(236, 72, 153, 0.9)' },
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
