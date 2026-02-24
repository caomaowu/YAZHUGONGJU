import { useContext, useMemo, useSyncExternalStore } from 'react'
import { SharedStateContext } from './context'
import type { SharedStateNamespace, SharedStateSnapshot } from './sharedStore'

export function useSharedStateStore() {
  const store = useContext(SharedStateContext)
  if (!store) throw new Error('SharedStateProvider is missing')
  return store
}

export function useNamespaceSnapshot(namespace: SharedStateNamespace): SharedStateSnapshot {
  const store = useSharedStateStore()
  return useSyncExternalStore(
    (listener) => store.subscribe(namespace, listener),
    () => store.snapshot(namespace),
    () => store.snapshot(namespace),
  )
}

export function useSharedValue<T>(
  namespace: SharedStateNamespace,
  key: string,
  initialValue?: T,
): [T | undefined, (next: T) => void] {
  const store = useSharedStateStore()
  const snap = useNamespaceSnapshot(namespace)

  const hasKey = store.has(namespace, key)
  const value = hasKey ? (snap[key] as T | undefined) : initialValue

  const setValue = useMemo(() => {
    return (next: T) => store.set(namespace, key, next)
  }, [key, namespace, store])

  return [value, setValue]
}

