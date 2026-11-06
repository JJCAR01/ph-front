import { createContext, useContext } from 'react'
import type { AppData } from '../types'

export const emptyData: AppData = {
  complexes: [], blocks: [], properties: [], users: [], roles: [], owners: [], concepts: [], documents: [], applications: [],
}

export const AppContext = createContext<{ data: AppData; loading: boolean; loadError: string; refresh: () => Promise<void>; notify: (message: string, kind?: 'success' | 'error') => void } | null>(null)

export function useAppData() {
  const context = useContext(AppContext)
  if (!context) throw new Error('AppContext is not available')
  return context
}
