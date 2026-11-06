import { createContext } from 'react'
import type { AuthUser } from '../types'

export interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  error: string
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshSession: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
