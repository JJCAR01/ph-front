import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { ApiError, api } from '../api'
import type { AuthUser } from '../types'
import { AuthContext } from './auth-context'
import { messageOf } from './helpers'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refreshSession = useCallback(async () => {
    setLoading(true)
    try {
      setUser(await api.currentUser())
      setError('')
    } catch (sessionError) {
      setUser(null)
      setError(sessionError instanceof ApiError && sessionError.status === 401 ? '' : messageOf(sessionError))
    } finally {
      setLoading(false)
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    setError('')
    try {
      setUser(await api.login(email, password))
    } catch (loginError) {
      setUser(null)
      setError(
        loginError instanceof ApiError && loginError.status === 401
          ? 'Correo o contraseña incorrectos, o la cuenta está inactiva.'
          : messageOf(loginError),
      )
      throw loginError
    }
  }, [])

  const logout = useCallback(async () => {
    await api.logout()
    setUser(null)
    setError('')
  }, [])

  useEffect(() => {
    const onUnauthorized = () => {
      setUser(null)
      setLoading(false)
    }
    window.addEventListener('ph:unauthorized', onUnauthorized)
    const timer = window.setTimeout(() => { void refreshSession() }, 0)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('ph:unauthorized', onUnauthorized)
    }
  }, [refreshSession])

  const value = useMemo(
    () => ({ user, loading, error, login, logout, refreshSession }),
    [user, loading, error, login, logout, refreshSession],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
