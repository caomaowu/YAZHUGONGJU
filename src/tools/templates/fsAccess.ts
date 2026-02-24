import { stringifyTemplateDoc } from './codec'
import type { TemplateDocument } from './types'

type FilePickerType = {
  description?: string
  accept: Record<string, string[]>
}

type OpenFilePickerOptionsLite = {
  multiple?: boolean
  types?: FilePickerType[]
}

type SaveFilePickerOptionsLite = {
  suggestedName?: string
  types?: FilePickerType[]
}

type DirectoryPickerOptionsLite = {
  mode?: 'read' | 'readwrite'
}

type WindowFsAccess = {
  showOpenFilePicker?: (options?: OpenFilePickerOptionsLite) => Promise<FileSystemFileHandle[]>
  showSaveFilePicker?: (options?: SaveFilePickerOptionsLite) => Promise<FileSystemFileHandle>
  showDirectoryPicker?: (options?: DirectoryPickerOptionsLite) => Promise<FileSystemDirectoryHandle>
}

type PermissibleHandle = FileSystemHandle & {
  queryPermission?: (options: { mode: 'read' | 'readwrite' }) => Promise<PermissionState>
  requestPermission?: (options: { mode: 'read' | 'readwrite' }) => Promise<PermissionState>
}

function getFsWindow(): WindowFsAccess {
  return window as unknown as WindowFsAccess
}

export type OpenTemplateResult = {
  docText: string
  fileName: string
  fileHandle?: FileSystemFileHandle
}

export type SaveTemplateResult = {
  fileName: string
  fileHandle?: FileSystemFileHandle
}

export type WorkspaceFileEntry = {
  name: string
  kind: 'file'
  fileHandle: FileSystemFileHandle
}

export type WorkspaceListingResult =
  | { mode: 'fs'; directoryHandle: FileSystemDirectoryHandle; directoryName: string; files: WorkspaceFileEntry[] }
  | { mode: 'fallback'; directoryName: string; files: Array<{ name: string; kind: 'file'; file: File }> }

export function supportsFileSystemAccessApi() {
  if (typeof window === 'undefined') return false
  const w = getFsWindow()
  return (
    typeof w.showOpenFilePicker === 'function' &&
    typeof w.showSaveFilePicker === 'function' &&
    typeof w.showDirectoryPicker === 'function'
  )
}

export async function getHandlePermission(
  handle: FileSystemHandle,
  mode: 'read' | 'readwrite',
): Promise<PermissionState> {
  const h = handle as PermissibleHandle
  if (typeof h.queryPermission !== 'function') return 'granted'
  return await h.queryPermission({ mode })
}

export async function ensureHandlePermission(handle: FileSystemHandle, mode: 'read' | 'readwrite') {
  const h = handle as PermissibleHandle
  if (typeof h.requestPermission !== 'function') return true
  const current = await getHandlePermission(handle, mode)
  if (current === 'granted') return true
  const next = await h.requestPermission({ mode })
  return next === 'granted'
}

function pickSingleJsonFileFallback(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json,.json'
    input.onchange = () => {
      resolve(input.files?.[0] ?? null)
    }
    input.click()
  })
}

function pickDirectoryFallback(): Promise<File[]> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    ;(input as HTMLInputElement & { webkitdirectory: boolean }).webkitdirectory = true
    input.multiple = true
    input.onchange = () => resolve(Array.from(input.files ?? []))
    input.click()
  })
}

export async function openTemplateFromPicker(): Promise<OpenTemplateResult | null> {
  if (supportsFileSystemAccessApi()) {
    const w = getFsWindow()
    const picker = w.showOpenFilePicker
    if (!picker) throw new Error('当前环境不支持文件选择器')
    const [handle] =
      (await picker({
        multiple: false,
        types: [
          {
            description: '模板/JSON',
            accept: { 'application/json': ['.json'] },
          },
        ],
      })) ?? []
    if (!handle) return null

    const ok = await ensureHandlePermission(handle, 'read')
    if (!ok) throw new Error('未授予文件读取权限')

    const file = await handle.getFile()
    const text = await file.text()
    return { docText: text, fileName: file.name, fileHandle: handle }
  }

  const file = await pickSingleJsonFileFallback()
  if (!file) return null
  const text = await file.text()
  return { docText: text, fileName: file.name }
}

export async function saveTemplateToFile(input: {
  doc: TemplateDocument
  fileHandle?: FileSystemFileHandle
  suggestedName?: string
}): Promise<SaveTemplateResult> {
  const json = stringifyTemplateDoc(input.doc)
  const suggestedName = input.suggestedName ?? `${input.doc.meta.name}.json`

  if (supportsFileSystemAccessApi()) {
    const handle = input.fileHandle
    if (handle) {
      const ok = await ensureHandlePermission(handle, 'readwrite')
      if (!ok) throw new Error('未授予文件写入权限')
      const writable = await handle.createWritable()
      await writable.write(json)
      await writable.close()
      return { fileName: suggestedName, fileHandle: handle }
    }

    const w = getFsWindow()
    const saver = w.showSaveFilePicker
    if (!saver) throw new Error('当前环境不支持保存选择器')
    const created = await saver({
      suggestedName,
      types: [
        {
          description: '模板/JSON',
          accept: { 'application/json': ['.json'] },
        },
      ],
    })

    const ok = await ensureHandlePermission(created, 'readwrite')
    if (!ok) throw new Error('未授予文件写入权限')
    const writable = await created.createWritable()
    await writable.write(json)
    await writable.close()
    return { fileName: created.name, fileHandle: created }
  }

  const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = suggestedName
  a.click()
  URL.revokeObjectURL(url)
  return { fileName: suggestedName }
}

export async function pickWorkspaceDirectory(): Promise<WorkspaceListingResult | null> {
  if (supportsFileSystemAccessApi()) {
    const w = getFsWindow()
    const picker = w.showDirectoryPicker
    if (!picker) throw new Error('当前环境不支持目录选择器')
    const dir = await picker({ mode: 'readwrite' })
    if (!dir) return null
    const ok = await ensureHandlePermission(dir, 'readwrite')
    if (!ok) throw new Error('未授予目录访问权限')

    const files = await listWorkspaceFiles(dir)
    return { mode: 'fs', directoryHandle: dir, directoryName: dir.name, files }
  }

  const files = await pickDirectoryFallback()
  if (files.length === 0) return null
  const jsonFiles = files
    .filter((f) => f.name.toLowerCase().endsWith('.json'))
    .map((f) => ({ name: f.name, kind: 'file' as const, file: f }))
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
  return { mode: 'fallback', directoryName: '导入目录', files: jsonFiles }
}

export async function listWorkspaceFiles(directoryHandle: FileSystemDirectoryHandle): Promise<WorkspaceFileEntry[]> {
  const ok = await ensureHandlePermission(directoryHandle, 'read')
  if (!ok) throw new Error('未授予目录读取权限')

  const files: WorkspaceFileEntry[] = []
  for await (const [, entry] of directoryHandle.entries()) {
    if (entry.kind !== 'file') continue
    const fileHandle = entry as FileSystemFileHandle
    if (!fileHandle.name.toLowerCase().endsWith('.json')) continue
    files.push({ name: fileHandle.name, kind: 'file', fileHandle })
  }
  files.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
  return files
}

export async function readWorkspaceFile(entry: WorkspaceFileEntry) {
  const ok = await ensureHandlePermission(entry.fileHandle, 'read')
  if (!ok) throw new Error('未授予文件读取权限')
  const file = await entry.fileHandle.getFile()
  const text = await file.text()
  return { fileName: file.name, text }
}

export async function writeWorkspaceFile(input: {
  directoryHandle: FileSystemDirectoryHandle
  fileName: string
  doc: TemplateDocument
}) {
  const ok = await ensureHandlePermission(input.directoryHandle, 'readwrite')
  if (!ok) throw new Error('未授予目录写入权限')
  const handle = await input.directoryHandle.getFileHandle(input.fileName, { create: true })
  const fileOk = await ensureHandlePermission(handle, 'readwrite')
  if (!fileOk) throw new Error('未授予文件写入权限')
  const writable = await handle.createWritable()
  await writable.write(stringifyTemplateDoc(input.doc))
  await writable.close()
  return handle
}

export async function deleteWorkspaceEntry(input: {
  directoryHandle: FileSystemDirectoryHandle
  fileName: string
}) {
  const ok = await ensureHandlePermission(input.directoryHandle, 'readwrite')
  if (!ok) throw new Error('未授予目录写入权限')
  await input.directoryHandle.removeEntry(input.fileName)
}
