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
  const containerRef = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    chartRef.current?.dispose()
    chartRef.current = echarts.init(container, theme, { renderer })
    onChartReady?.(chartRef.current)

    return () => {
      chartRef.current?.dispose()
      chartRef.current = null
    }
  }, [onChartReady, renderer, theme])

  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return

    chart.setOption(option, { notMerge, lazyUpdate })
  }, [lazyUpdate, notMerge, option])

  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return

    if (loading) chart.showLoading('default', { color: '#8B5CF6', lineWidth: 2 })
    else chart.hideLoading()
  }, [loading])

  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return

    const ro = new ResizeObserver(() => {
      chart.resize()
    })

    if (containerRef.current) ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return

    const entries = Object.entries(events ?? {})
    for (const [eventName, handler] of entries) {
      if (!handler) continue
      chart.on(eventName as EChartEventName, (...args: unknown[]) => handler(args[0], chart))
    }

    return () => {
      for (const [eventName, handler] of entries) {
        if (!handler) continue
        chart.off(eventName as EChartEventName)
      }
    }
  }, [events])

  return <div ref={containerRef} className={className} style={style} />
}
