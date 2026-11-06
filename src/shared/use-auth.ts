import { useContext } from 'react'
import { AuthContext } from './auth-context'

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('AuthContext is not available')
  return context
}
