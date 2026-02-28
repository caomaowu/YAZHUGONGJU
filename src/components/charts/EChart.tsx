import type { CSSProperties } from 'react'
import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'

export type EChartEventName =
  | 'click'
  | 'dblclick'
  | 'mouseover'
  | 'mouseout'
  | 'mousedown'
  | 'mouseup'
  | 'globalout'
  | 'legendselectchanged'
  | 'datazoom'

export type EChartEvents = Partial<
  Record<EChartEventName, (params: unknown, chart: echarts.ECharts) => void>
>

export type EChartProps = {
  option: echarts.EChartsOption
  className?: string
  style?: CSSProperties
  theme?: string | object
  renderer?: 'canvas' | 'svg'
  loading?: boolean
  events?: EChartEvents
  notMerge?: boolean
  lazyUpdate?: boolean
  onChartReady?: (chart: echarts.ECharts) => void
}

export function EChart({
  option,
  className,
  style,
  theme,
  renderer = 'canvas',
  loading,
  events,
  notMerge,
  lazyUpdate,
  onChartReady,
}: EChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartInstanceRef = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // 初始化图表
    const chart = echarts.init(container, theme, { renderer })
    chartInstanceRef.current = chart

    // 监听容器大小变化
    const resizeObserver = new ResizeObserver(() => {
      chart.resize()
    })
    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
      chart.dispose()
      chartInstanceRef.current = null
    }
  }, [theme, renderer])

  useEffect(() => {
    const chart = chartInstanceRef.current
    if (!chart || !events) return

    const handlers = (Object.entries(events) as [EChartEventName, NonNullable<EChartEvents[EChartEventName]>][])
      .filter(([, handler]) => handler)
      .map(([eventName, handler]) => {
        const wrapped = (...args: unknown[]) => handler(args[0], chart)
        chart.on(eventName, wrapped)
        return { eventName, wrapped }
      })

    return () => {
      handlers.forEach(({ eventName, wrapped }) => chart.off(eventName, wrapped))
    }
  }, [events])

  useEffect(() => {
    const chart = chartInstanceRef.current
    if (!chart) return
    onChartReady?.(chart)
  }, [onChartReady, theme, renderer])

  // 监听配置变化并更新
  useEffect(() => {
    const chart = chartInstanceRef.current
    if (chart) {
      chart.setOption(option, notMerge, lazyUpdate)
    }
  }, [option, notMerge, lazyUpdate])

  // 监听 loading 状态
  useEffect(() => {
    const chart = chartInstanceRef.current
    if (chart) {
      if (loading) {
        chart.showLoading('default', { color: '#8B5CF6', lineWidth: 2 })
      } else {
        chart.hideLoading()
      }
    }
  }, [loading])

  return <div ref={containerRef} className={className} style={{ width: '100%', height: '100%', ...style }} />
}
