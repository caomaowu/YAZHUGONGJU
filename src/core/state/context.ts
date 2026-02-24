import { createContext } from 'react'
import type { SharedStateStore } from './sharedStore'

export const SharedStateContext = createContext<SharedStateStore | null>(null)

