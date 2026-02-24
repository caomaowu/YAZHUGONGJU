export type RecentHandleKind = 'file' | 'directory'

export type RecentHandleEntry = {
  id: string
  kind: RecentHandleKind
  name: string
  lastOpenedAt: number
  handle: FileSystemHandle
}

const DB_NAME = 'diecasting-toolkit'
const DB_VERSION = 1
const STORE_NAME = 'recentHandles'

function randomId() {
  const anyCrypto = globalThis.crypto as Crypto | undefined
  if (anyCrypto?.randomUUID) return anyCrypto.randomUUID()
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onerror = () => reject(request.error ?? new Error('无法打开 IndexedDB'))
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('lastOpenedAt', 'lastOpenedAt', { unique: false })
      }
    }
  })
}

function txDone(tx: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB 事务失败'))
    tx.onabort = () => reject(tx.error ?? new Error('IndexedDB 事务中止'))
  })
}

export function supportsRecentHandles() {
  return typeof indexedDB !== 'undefined'
}

export async function addRecentHandle(input: {
  kind: RecentHandleKind
  name: string
  handle: FileSystemHandle
}) {
  if (!supportsRecentHandles()) return

  const entry: RecentHandleEntry = {
    id: randomId(),
    kind: input.kind,
    name: input.name,
    lastOpenedAt: Date.now(),
    handle: input.handle,
  }

  const db = await openDb()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  tx.objectStore(STORE_NAME).put(entry)
  await txDone(tx)
  db.close()
}

export async function listRecentHandles(limit = 12): Promise<RecentHandleEntry[]> {
  if (!supportsRecentHandles()) return []
  const db = await openDb()

  const tx = db.transaction(STORE_NAME, 'readonly')
  const store = tx.objectStore(STORE_NAME)
  const index = store.index('lastOpenedAt')

  const rows: RecentHandleEntry[] = []
  await new Promise<void>((resolve, reject) => {
    const request = index.openCursor(null, 'prev')
    request.onerror = () => reject(request.error ?? new Error('无法读取最近使用列表'))
    request.onsuccess = () => {
      const cursor = request.result
      if (!cursor || rows.length >= limit) {
        resolve()
        return
      }
      rows.push(cursor.value as RecentHandleEntry)
      cursor.continue()
    }
  })

  await txDone(tx)
  db.close()
  return rows
}

export async function removeRecentHandle(id: string) {
  if (!supportsRecentHandles()) return
  const db = await openDb()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  tx.objectStore(STORE_NAME).delete(id)
  await txDone(tx)
  db.close()
}

export async function clearRecentHandles() {
  if (!supportsRecentHandles()) return
  const db = await openDb()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  tx.objectStore(STORE_NAME).clear()
  await txDone(tx)
  db.close()
}
