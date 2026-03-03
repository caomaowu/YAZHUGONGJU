import { Spin, theme } from 'antd'
import { useEffect, useRef, useState } from 'react'

type PdfPreviewProps = {
  fileUrl: string
  targetPage?: number
}

export function PdfPreview({ fileUrl, targetPage }: PdfPreviewProps) {
  const { token } = theme.useToken()
  const [loading, setLoading] = useState(true)
  const [internalUrl, setInternalUrl] = useState('')
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // 处理页码逻辑，添加 view=FitH 参数实现宽度自适应
  const page = Math.max(1, Number(targetPage) || 1)

  // 监听 fileUrl 变化，重置 loading 状态
  useEffect(() => {
    const timer = requestAnimationFrame(() => {
      setLoading(true)
      setInternalUrl(fileUrl)
    })
    return () => cancelAnimationFrame(timer)
  }, [fileUrl])

  // 监听 targetPage 变化，强制跳转（解决浏览器不响应 hash 变化的问题）
  useEffect(() => {
    if (!iframeRef.current || !internalUrl) return
    const newSrc = `${internalUrl}#page=${page}&view=FitH`
    
    // 如果 src 只是 hash 变了，React 有时不会刷新 iframe
    // 我们手动替换 location，确保跳转生效
    try {
      iframeRef.current.contentWindow?.location.replace(newSrc)
    } catch {
      // 跨域时无法访问 contentWindow，降级为直接修改 src
      // 但对于同源 blob URL，上述方法通常有效
      iframeRef.current.src = newSrc
    }
  }, [page, internalUrl])

  // 当 iframe 加载完成时隐藏 loading
  const handleLoad = () => {
    setLoading(false)
  }

  // 构建带 hash 的完整 URL
  // 使用 key={src} 强制 React 重新挂载 iframe，确保 100% 触发浏览器跳转
  // 配合下方的 loading 遮罩，可以完美隐藏“先跳第一页”的视觉缺陷
  const src = `${internalUrl}#page=${page}&view=FitH`

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: token.colorBgLayout, // 跟随主题色
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        borderRadius: token.borderRadiusLG, // 圆角
        overflow: 'hidden', // 裁剪圆角
        boxShadow: token.boxShadowSecondary, // 阴影
        border: `1px solid ${token.colorBorderSecondary}`, // 边框
      }}
    >
      {/* 优雅的加载遮罩 */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: token.colorBgContainer, // 确保遮挡 iframe
          zIndex: 10,
          opacity: loading ? 1 : 0,
          pointerEvents: loading ? 'auto' : 'none',
          transition: 'opacity 0.3s ease-in-out', // 淡入淡出动画
        }}
      >
        <Spin size="large" tip="正在定位页面..." />
      </div>

      <iframe
        ref={iframeRef}
        key={src} // 恢复 key，确保跳转生效
        title="pdf-preview"
        src={src}
        onLoad={handleLoad}
        style={{
          width: '100%',
          height: '100%',
          border: 0,
          opacity: loading ? 0 : 1, // 加载前隐藏，避免显示“第一页”
          transition: 'opacity 0.3s ease-in-out',
        }}
      />
    </div>
  )
}
