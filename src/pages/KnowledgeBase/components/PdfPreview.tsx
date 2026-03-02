type PdfPreviewProps = {
  fileUrl: string
  targetPage?: number
}

export function PdfPreview({ fileUrl, targetPage }: PdfPreviewProps) {
  const page = Math.max(1, Number(targetPage) || 1)
  const src = `${fileUrl}#page=${page}`

  return (
    <div style={{ width: '100%', height: '100%', background: '#fff' }}>
      <iframe
        key={src}
        title="pdf-preview"
        src={src}
        style={{ width: '100%', height: '100%', border: 0 }}
      />
    </div>
  )
}
