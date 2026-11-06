import { useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import type { ReactNode } from 'react'
import { documentTypeName, errorDetails, messageOf } from './helpers'
import type { Complex, DocumentType } from '../types'

export function PageHeading({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">PH CONTROL <span>·</span> GESTIÓN</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  )
}

export function Loading() {
  return <div className="loading-state" role="status"><span className="spinner" />Cargando información del servidor…</div>
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="empty-state">
      <span className="empty-icon" aria-hidden="true">○</span>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  )
}

export function Modal({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className="modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <section className={`modal${wide ? ' modal-wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <header className="modal-header">
          <h2 id="modal-title">{title}</h2>
          <button type="button" className="icon-button" aria-label="Cerrar" onClick={onClose}>×</button>
        </header>
        <div className="modal-content">{children}</div>
      </section>
    </div>
  )
}

export function ErrorMessage({ error }: { error: unknown }) {
  const details = errorDetails(error)
  return (
    <div className="alert alert-error form-error" role="alert">
      <strong>{messageOf(error)}</strong>
      {details.length > 0 && <ul>{details.map((detail) => <li key={detail}>{detail}</li>)}</ul>}
    </div>
  )
}

export function ComplexSelect({
  complexes,
  value,
  onChange,
  label = 'Conjunto',
  required = true,
}: {
  complexes: Complex[]
  value: string
  onChange: (value: string) => void
  label?: string
  required?: boolean
}) {
  return (
    <label className="field">
      <span>{label}{required && <span className="required"> *</span>}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} required={required}>
        {!required && <option value="">Global</option>}
        <option value="" disabled>Selecciona un conjunto</option>
        {complexes.map((complex) => <option value={complex.id} key={complex.id}>{complex.name}</option>)}
      </select>
    </label>
  )
}

export function ComplexFilter({ complexes, value, onChange }: { complexes: Complex[]; value: string; onChange: (value: string) => void }) {
  return (
    <label className="filter-field">
      <span className="sr-only">Filtrar por conjunto</span>
      <select aria-label="Filtrar por conjunto" value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Todos los conjuntos</option>
        {complexes.map((complex) => <option key={complex.id} value={complex.id}>{complex.name}</option>)}
      </select>
    </label>
  )
}

export function SearchBox({ value, onChange, placeholder = 'Buscar…' }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <label className="search-box">
      <span aria-hidden="true">⌕</span>
      <span className="sr-only">Buscar</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </label>
  )
}

export function StatCard({ label, value, detail, icon }: { label: string; value: number; detail: string; icon: string }) {
  return (
    <article className="stat-card">
      <span className="stat-icon" aria-hidden="true">{icon}</span>
      <span className="stat-label">{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  )
}

export function QuickLink({ to, icon, title, description }: { to: string; icon: string; title: string; description: string }) {
  return (
    <NavLink to={to} className="quick-link">
      <span className="quick-link-icon" aria-hidden="true">{icon}</span>
      <span><strong>{title}</strong><small>{description}</small></span>
      <span className="quick-arrow" aria-hidden="true">→</span>
    </NavLink>
  )
}

export function StatusBadge({ active }: { active: boolean }) {
  return <span className={`status-badge ${active ? 'status-active' : 'status-inactive'}`}><i />{active ? 'Activo' : 'Inactivo'}</span>
}

export function DocumentStatusBadge({ status }: { status: string }) {
  const active = status === 'ACTIVE'
  return <span className={`status-badge ${active ? 'status-active' : 'status-inactive'}`}><i />{active ? 'Activo' : 'Anulado'}</span>
}

export function DocumentTypeBadge({ type }: { type: DocumentType }) {
  return <span className={`document-type document-type-${type.toLowerCase()}`}><strong>{type}</strong>{documentTypeName(type)}</span>
}
