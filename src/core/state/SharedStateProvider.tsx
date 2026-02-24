import { useMemo, type PropsWithChildren } from 'react'
import { SharedStateContext } from './context'
import { SharedStateStore } from './sharedStore'

export function SharedStateProvider({ children }: PropsWithChildren) {
  const store = useMemo(() => new SharedStateStore(), [])
  return <SharedStateContext.Provider value={store}>{children}</SharedStateContext.Provider>
}
