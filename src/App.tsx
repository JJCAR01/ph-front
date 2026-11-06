import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate, NavLink, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { AppContext, emptyData } from './shared/context'
import { AuthProvider } from './shared/auth-provider'
import { useAuth } from './shared/use-auth'
import { messageOf } from './shared/helpers'
import { api } from './api'
import { Loading } from './shared/ui'
import { LoginPage } from './features/auth/login-page'
import type { AppData } from './types'
import './App.css'

const Dashboard = lazy(() => import('./features/dashboard/page').then((module) => ({ default: module.Dashboard })))
const ComplexesPage = lazy(() => import('./features/complexes/page').then((module) => ({ default: module.ComplexesPage })))
const PropertiesPage = lazy(() => import('./features/properties/page').then((module) => ({ default: module.PropertiesPage })))
const OwnersPage = lazy(() => import('./features/owners/page').then((module) => ({ default: module.OwnersPage })))
const UsersPage = lazy(() => import('./features/users/page').then((module) => ({ default: module.UsersPage })))
const RolesPage = lazy(() => import('./features/roles/page').then((module) => ({ default: module.RolesPage })))
const ConceptsPage = lazy(() => import('./features/concepts/page').then((module) => ({ default: module.ConceptsPage })))
const DocumentsPage = lazy(() => import('./features/documents/page').then((module) => ({ default: module.DocumentsPage })))
const ApplicationsPage = lazy(() => import('./features/applications/page').then((module) => ({ default: module.ApplicationsPage })))
const NotFound = lazy(() => import('./features/not-found/page').then((module) => ({ default: module.NotFound })))

function Layout() {
  const { user, logout } = useAuth()
  const [data, setData] = useState<AppData>(emptyData)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [notice, setNotice] = useState<{ message: string; kind: 'success' | 'error' } | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      setData(await api.loadData())
    } catch (error) {
      setLoadError(messageOf(error))
    } finally {
      setLoading(false)
    }
  }, [])

  const notify = useCallback((message: string, kind: 'success' | 'error' = 'success') => {
    setNotice({ message, kind })
    window.setTimeout(() => setNotice(null), 5000)
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => { void refresh() }, 0)
    return () => window.clearTimeout(timer)
  }, [refresh])

  const context = useMemo(
    () => ({ data, loading, loadError, refresh, notify }),
    [data, loading, loadError, refresh, notify],
  )

  return (
    <AppContext.Provider value={context}>
      <div className="app-shell">
        <aside className="sidebar">
          <NavLink className="brand" to="/" aria-label="PH Control, inicio">
            <span className="brand-mark">PH</span>
            <span className="brand-copy">
              <strong>PH Control</strong>
              <small>Administración residencial</small>
            </span>
          </NavLink>
          <div className="side-label">GESTIÓN</div>
          <nav className="primary-nav" aria-label="Navegación principal">
            <NavigationLink to="/" icon="⌂" label="Resumen" end />
            <NavigationLink to="/complexes" icon="▦" label="Conjuntos" />
            <NavigationLink to="/properties" icon="▧" label="Propiedades" />
            <NavigationLink to="/documents" icon="▤" label="Documentos" />
            <NavigationLink to="/applications" icon="↔" label="Aplicaciones" />
            <NavigationLink to="/owners" icon="♙" label="Propietarios" />
            <NavigationLink to="/users" icon="♧" label="Usuarios" />
            <NavigationLink to="/roles" icon="⌘" label="Roles" />
            <NavigationLink to="/concepts" icon="◈" label="Conceptos" />
          </nav>
          <div className="sidebar-bottom">
            <span className={`connection-dot${loadError ? ' connection-offline' : loading ? ' connection-pending' : ''}`} aria-hidden="true" />
            <span>{loadError ? 'Sin conexión' : loading ? 'Conectando…' : 'API conectada'}</span>
            <span className="sidebar-endpoint">NestJS</span>
          </div>
        </aside>

        <main className="main-area">
          <header className="topbar">
            <div className="topbar-crumb">Administración <span>/</span> PH Control</div>
            <div className="topbar-actions">
              <span className="session-user">{user?.email}</span>
              <button className="icon-button refresh-button" type="button" onClick={() => void refresh()} aria-label="Actualizar datos">
                <span aria-hidden="true">↻</span>
              </button>
              <button className="button button-outline button-small" type="button" onClick={() => {
                void logout().catch((error: unknown) => notify(messageOf(error), 'error'))
              }}>Cerrar sesión</button>
            </div>
          </header>
          <div className="content-area">
            {loadError ? (
              <div className="alert alert-error global-alert" role="alert">
                <span>{loadError}</span>
                <button className="button button-outline button-small" type="button" onClick={() => void refresh()}>
                  Reintentar
                </button>
              </div>
            ) : <Suspense fallback={<Loading />}><Outlet /></Suspense>}
            {notice && (
              <div className={`toast toast-${notice.kind}`} role={notice.kind === 'error' ? 'alert' : 'status'}>
                <span>{notice.message}</span>
                <button type="button" aria-label="Cerrar mensaje" onClick={() => setNotice(null)}>×</button>
              </div>
            )}
          </div>
          <footer className="page-footer">PH Control <span>·</span> Gestión residencial con datos de tu API</footer>
        </main>
      </div>
    </AppContext.Provider>
  )
}

function RequireAuth() {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <Loading />
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />
  return <Outlet />
}

function NavigationLink({ to, icon, label, end = false }: { to: string; icon: string; label: string; end?: boolean }) {
  return (
    <NavLink className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} to={to} end={end}>
      <span className="nav-icon" aria-hidden="true">{icon}</span>
      <span>{label}</span>
    </NavLink>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="login" element={<LoginPage />} />
        <Route element={<RequireAuth />}>
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="complexes" element={<ComplexesPage />} />
            <Route path="properties" element={<PropertiesPage />} />
            <Route path="documents" element={<DocumentsPage />} />
            <Route path="applications" element={<ApplicationsPage />} />
            <Route path="owners" element={<OwnersPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="roles" element={<RolesPage />} />
            <Route path="concepts" element={<ConceptsPage />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Route>
      </Routes>
    </AuthProvider>
  )
}
