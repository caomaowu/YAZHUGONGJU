import type * as echarts from 'echarts'
import type { PQ2ComputeResult, PQ2CurveSample } from './types'

function formatNumber(value: number, digits: number) {
  if (!Number.isFinite(value)) return '-'
  return value.toFixed(digits)
}

// 通过线性插值找到精确的交点位置
function findIntersection(
  curve: PQ2CurveSample[]
): { index: number; q2Lps2: number; pMPa: number } | null {
  for (let i = 0; i < curve.length - 1; i++) {
    const curr = curve[i]
    const next = curve[i + 1]
    const diffCurr = curr.pMachineMPa - curr.pDieMPa
    const diffNext = next.pMachineMPa - next.pDieMPa

    // 检查是否跨越交点（符号变化）
    if (diffCurr >= 0 && diffNext <= 0 && Math.abs(diffCurr - diffNext) > 1e-10) {
      // 线性插值找到精确交点
      const t = diffCurr / (diffCurr - diffNext)
      const q2Lps2 = curr.q2Lps2 + t * (next.q2Lps2 - curr.q2Lps2)
      const pMPa = curr.pDieMPa + t * (next.pDieMPa - curr.pDieMPa)
      return { index: i, q2Lps2, pMPa }
    }
  }
  return null
}

// 构建可行区域多边形
function buildFeasiblePolygon(result: PQ2ComputeResult): [number, number][] {
  const feasiblePolygon: [number, number][] = []
  const intersection = findIntersection(result.curve)

  if (intersection) {
    // 从 (0, p0) 开始 -> 沿模具阻力线到交点 -> 沿机台能力线回到 (0, pMax)

    // 1. 添加起点 (0, extraLoss)
    feasiblePolygon.push([0, result.curve[0].pDieMPa])

    // 2. 沿模具阻力线到交点
    for (let i = 0; i <= intersection.index && i < result.curve.length; i++) {
      feasiblePolygon.push([result.curve[i].q2Lps2, result.curve[i].pDieMPa])
    }

    // 3. 添加交点
    feasiblePolygon.push([intersection.q2Lps2, intersection.pMPa])

    // 4. 沿机台能力线回到起点
    for (let i = intersection.index; i >= 0; i--) {
      feasiblePolygon.push([result.curve[i].q2Lps2, result.curve[i].pMachineMPa])
    }
  } else if (result.curve.length > 0) {
    // 无交点情况：检查哪条线始终在下方
    const allMachineLower = result.curve.every((c) => c.pMachineMPa < c.pDieMPa)
    const allDieLower = result.curve.every((c) => c.pDieMPa <= c.pMachineMPa)

    if (allDieLower) {
      // 模具阻力始终较低，整个区域都可行
      for (const point of result.curve) {
        feasiblePolygon.push([point.q2Lps2, point.pDieMPa])
      }
      for (let i = result.curve.length - 1; i >= 0; i--) {
        feasiblePolygon.push([result.curve[i].q2Lps2, result.curve[i].pMachineMPa])
      }
    } else if (allMachineLower) {
      // 机台能力始终不足，无可行区域，返回空数组
      return []
    }
  }

  // 闭合多边形
  if (feasiblePolygon.length > 0) {
    feasiblePolygon.push(feasiblePolygon[0])
  }

  return feasiblePolygon
}

export function buildPQ2ChartOption(result: PQ2ComputeResult, themePrimary: string): echarts.EChartsOption {
  const x = result.curve.map((d) => d.q2Lps2)
  const machine = result.curve.map((d) => [d.q2Lps2, d.pMachineMPa] as [number, number])
  const die = result.curve.map((d) => [d.q2Lps2, d.pDieMPa] as [number, number])

  const operating = result.points.operating
  const intersect = result.points.intersect

  const xMax = Math.max(1, ...x)

  // 构建可行区域多边形
  const feasiblePolygon = buildFeasiblePolygon(result)
  const hasFeasibleArea = feasiblePolygon.length > 0

  // 判断工作点是否可行
  const isOperatingPointFeasible =
    operating.pMachineMPa >= operating.pRequiredMPa &&
    operating.qLps <= result.intermediate.qMaxLps

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
      ...(hasFeasibleArea
        ? [
            {
              name: '__feasible_area',
              type: 'line' as const,
              data: feasiblePolygon,
              symbol: 'none',
              lineStyle: { opacity: 0 },
              areaStyle: {
                color: {
                  type: 'linear' as const,
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
          ]
        : []),
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
        name: isOperatingPointFeasible ? '工作点' : '工作点（不可达）',
        type: 'effectScatter',
        data: [[operating.q2Lps2, operating.pRequiredMPa]],
        symbolSize: isOperatingPointFeasible ? 12 : 16,
        rippleEffect: {
          scale: isOperatingPointFeasible ? 2.4 : 3.5,
          brushType: 'stroke',
          color: isOperatingPointFeasible ? undefined : '#EF4444',
        },
        itemStyle: {
          color: isOperatingPointFeasible ? '#F59E0B' : '#EF4444',
          borderColor: 'rgba(255, 255, 255, 0.95)',
          borderWidth: 2,
          shadowBlur: isOperatingPointFeasible ? 0 : 12,
          shadowColor: isOperatingPointFeasible ? undefined : 'rgba(239, 68, 68, 0.5)',
        },
        z: 7,
        markLine: {
          silent: true,
          label: {
            color: isOperatingPointFeasible ? 'rgba(33, 23, 53, 0.58)' : '#EF4444',
            formatter: isOperatingPointFeasible ? '工作点 Q²' : '工作点（超出能力）',
          },
          lineStyle: {
            color: isOperatingPointFeasible ? 'rgba(245, 158, 11, 0.55)' : 'rgba(239, 68, 68, 0.8)',
            width: isOperatingPointFeasible ? 1.5 : 2,
            type: 'dashed',
          },
          data: [{ xAxis: operating.q2Lps2 }],
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
