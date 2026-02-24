import { useMemo, useSyncExternalStore } from 'react'

const DEFAULT_PATH = '/dashboard'

function normalizePath(path: string) {
  if (!path) return DEFAULT_PATH
  if (path.startsWith('#')) return normalizePath(path.slice(1))
  if (!path.startsWith('/')) return `/${path}`
  return path
}

export function getHashPath() {
  const hash = window.location.hash
  if (!hash || hash === '#') return DEFAULT_PATH
  const raw = hash.startsWith('#') ? hash.slice(1) : hash
  const pathPart = raw.split('?')[0] ?? ''
  return normalizePath(pathPart)
}

export function navigateHash(path: string, options?: { replace?: boolean }) {
  const normalized = normalizePath(path)
  const nextHash = `#${normalized}`
  if (options?.replace) window.location.replace(nextHash)
  else window.location.hash = nextHash
}

export function useHashPath() {
  const path = useSyncExternalStore(
    (listener) => {
      window.addEventListener('hashchange', listener)
      return () => window.removeEventListener('hashchange', listener)
    },
    () => getHashPath(),
    () => DEFAULT_PATH,
  )

  const navigate = useMemo(() => {
    return (nextPath: string, options?: { replace?: boolean }) =>
      navigateHash(nextPath, options)
  }, [])

  return { path, navigate }
}

