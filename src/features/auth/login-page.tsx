import { useState, type FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { ApiError } from '../../api'
import { useAuth } from '../../shared/use-auth'

interface LoginLocationState {
  from?: { pathname?: string }
}

export function LoginPage() {
  const { user, loading, error, login, refreshSession } = useAuth()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const redirectTo = (location.state as LoginLocationState | null)?.from?.pathname ?? '/'

  if (loading) {
    return <main className="auth-loading" role="status"><span className="spinner" />Verificando sesión segura…</main>
  }
  if (user) return <Navigate to={redirectTo} replace />

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setFormError('')
    try {
      await login(email.trim(), password)
      setPassword('')
    } catch (loginError) {
      setPassword('')
      setFormError(
        loginError instanceof ApiError && loginError.status === 401
          ? 'Correo o contraseña incorrectos, o la cuenta está inactiva.'
          : loginError instanceof Error
            ? loginError.message
            : 'No se pudo iniciar sesión. Inténtalo nuevamente.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-decoration auth-decoration-one" aria-hidden="true" />
      <div className="auth-decoration auth-decoration-two" aria-hidden="true" />
      <section className="auth-card" aria-labelledby="login-title">
        <div className="auth-brand">
          <span className="brand-mark">PH</span>
          <span className="brand-copy"><strong>PH Control</strong><small>Administración residencial</small></span>
        </div>
        <div className="auth-heading">
          <span className="eyebrow">ACCESO SEGURO</span>
          <h1 id="login-title">Qué bueno verte.</h1>
          <p>Ingresa tus credenciales para continuar.</p>
        </div>
        {(formError || error) && (
          <div className="alert alert-error auth-error" role="alert">
            <span>{formError || error}</span>
            {error && !formError && <button className="button button-outline button-small" type="button" onClick={() => void refreshSession()}>Reintentar</button>}
          </div>
        )}
        <form className="auth-form" onSubmit={(event) => void submit(event)}>
          <label className="field">
            <span>Correo electrónico</span>
            <input
              type="email"
              name="email"
              autoComplete="username"
              required
              maxLength={255}
              autoFocus
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="nombre@correo.com"
            />
          </label>
          <label className="field">
            <span>Contraseña</span>
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              required
              maxLength={128}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Tu contraseña"
            />
          </label>
          <button className="button button-primary auth-submit" type="submit" disabled={submitting}>
            {submitting ? <><span className="spinner spinner-light" /> Verificando…</> : 'Iniciar sesión'}
          </button>
        </form>
        <p className="auth-security"><span aria-hidden="true">▣</span> Sesión cifrada y protegida</p>
      </section>
      <footer className="auth-footer">PH Control <span>·</span> Gestión residencial</footer>
    </main>
  )
}
