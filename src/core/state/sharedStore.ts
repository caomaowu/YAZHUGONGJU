export type SharedStateNamespace = string
export type SharedStateKey = string

export type SharedStateSnapshot = Readonly<Record<string, unknown>>

export type SharedStateNamespaceListener = () => void
export type SharedStateNamespaceSnapshotListener = (snapshot: SharedStateSnapshot) => void

export type SharedStatePersistenceAdapter = {
  load(namespace: SharedStateNamespace): Promise<Record<string, unknown> | null>
  save(namespace: SharedStateNamespace, snapshot: Record<string, unknown>): Promise<void>
}

function createEmptyNamespace() {
  return new Map<SharedStateKey, unknown>()
}

function snapshotFromMap(map: Map<SharedStateKey, unknown>) {
  const obj: Record<string, unknown> = {}
  for (const [k, v] of map.entries()) obj[k] = v
  return obj
}

export class SharedStateStore {
  private readonly namespaces = new Map<SharedStateNamespace, Map<SharedStateKey, unknown>>()
  private readonly listeners = new Map<SharedStateNamespace, Set<SharedStateNamespaceListener>>()
  private readonly snapshotCache = new Map<SharedStateNamespace, SharedStateSnapshot>()
  private readonly dirtySnapshots = new Set<SharedStateNamespace>()
  private persistenceAdapter: SharedStatePersistenceAdapter | null = null

  setPersistenceAdapter(adapter: SharedStatePersistenceAdapter | null) {
    this.persistenceAdapter = adapter
  }

  async hydrate(namespace: SharedStateNamespace) {
    const adapter = this.persistenceAdapter
    if (!adapter) return

    const loaded = await adapter.load(namespace)
    if (!loaded) return

    const ns = this.getNamespaceMap(namespace)
    for (const [k, v] of Object.entries(loaded)) ns.set(k, v)
    this.dirtySnapshots.add(namespace)
    this.emit(namespace)
  }

  get<T>(namespace: SharedStateNamespace, key: SharedStateKey): T | undefined {
    return this.getNamespaceMap(namespace).get(key) as T | undefined
  }

  has(namespace: SharedStateNamespace, key: SharedStateKey) {
    return this.getNamespaceMap(namespace).has(key)
  }

  set(namespace: SharedStateNamespace, key: SharedStateKey, value: unknown) {
    const ns = this.getNamespaceMap(namespace)
    ns.set(key, value)
    this.dirtySnapshots.add(namespace)
    this.emit(namespace)
    void this.persist(namespace)
  }

  patch(namespace: SharedStateNamespace, partial: Record<string, unknown>) {
    const ns = this.getNamespaceMap(namespace)
    for (const [k, v] of Object.entries(partial)) ns.set(k, v)
    this.dirtySnapshots.add(namespace)
    this.emit(namespace)
    void this.persist(namespace)
  }

  snapshot(namespace: SharedStateNamespace): SharedStateSnapshot {
    const cached = this.snapshotCache.get(namespace)
    if (cached && !this.dirtySnapshots.has(namespace)) return cached
    const ns = this.getNamespaceMap(namespace)
    const next = snapshotFromMap(ns)
    this.snapshotCache.set(namespace, next)
    this.dirtySnapshots.delete(namespace)
    return next
  }

  subscribe(namespace: SharedStateNamespace, listener: SharedStateNamespaceListener) {
    const set = this.getListenerSet(namespace)
    set.add(listener)
    return () => {
      set.delete(listener)
    }
  }

  subscribeSnapshot(namespace: SharedStateNamespace, listener: SharedStateNamespaceSnapshotListener) {
    const wrapped = () => listener(this.snapshot(namespace))
    const unsubscribe = this.subscribe(namespace, wrapped)
    wrapped()
    return unsubscribe
  }

  private getNamespaceMap(namespace: SharedStateNamespace) {
    const existing = this.namespaces.get(namespace)
    if (existing) return existing
    const created = createEmptyNamespace()
    this.namespaces.set(namespace, created)
    return created
  }

  private getListenerSet(namespace: SharedStateNamespace) {
    const existing = this.listeners.get(namespace)
    if (existing) return existing
    const created = new Set<SharedStateNamespaceListener>()
    this.listeners.set(namespace, created)
    return created
  }

  private emit(namespace: SharedStateNamespace) {
    const set = this.listeners.get(namespace)
    if (!set || set.size === 0) return
    for (const listener of set.values()) listener()
  }

  private async persist(namespace: SharedStateNamespace) {
    const adapter = this.persistenceAdapter
    if (!adapter) return
    const snap = this.snapshot(namespace)
    await adapter.save(namespace, { ...snap })
  }
}
