import * as UI from '../../shared/ui'
import * as Helpers from '../../shared/helpers'
import * as Context from '../../shared/context'
import * as Api from '../../api'
import type * as Models from '../../types'
import { useState } from 'react'

function RolesPage() {
  const { data, loading, refresh, notify } = Context.useAppData()
  const [editing, setEditing] = useState<Models.Role | null | undefined>(undefined)
  const [query, setQuery] = useState('')
  const [complexId, setComplexId] = useState('')
  const [error, setError] = useState<unknown>(null)
  const roles = data.roles.filter((role) => (!complexId || role.phId === complexId || role.phId === null) && `${role.name} ${role.description}`.toLowerCase().includes(query.toLowerCase()))

  async function save(payload: { phId: string | null; name: string; description: string }) {
    setError(null)
    try {
      if (editing) await Api.api.updateRole(editing.id, payload)
      else await Api.api.createRole(payload)
      notify(editing ? 'Rol actualizado.' : 'Rol creado.')
      setEditing(undefined)
      await refresh()
    } catch (error) {
      setError(error)
    }
  }

  async function remove(role: Models.Role) {
    if (!window.confirm(`¿Eliminar el rol ${role.name}?`)) return
    try {
      await Api.api.deleteRole(role.id)
      notify('Rol eliminado.')
      await refresh()
    } catch (error) {
      notify(Helpers.messageOf(error), 'error')
    }
  }

  return (
    <>
      <UI.PageHeading title="Roles y permisos" description="Administra roles globales y roles disponibles en cada conjunto." action={<button className="button button-primary" type="button" onClick={() => { setError(null); setEditing(null) }}><span aria-hidden="true">＋</span> Nuevo rol</button>} />
      <div className="toolbar"><UI.SearchBox value={query} onChange={setQuery} placeholder="Buscar rol o descripción" /><UI.ComplexFilter complexes={data.complexes} value={complexId} onChange={setComplexId} /><span className="result-count">{roles.length} resultados</span></div>
      <section className="panel table-panel">
        {loading ? <UI.Loading /> : roles.length === 0 ? <UI.EmptyState title={query || complexId ? 'Sin coincidencias' : 'Aún no hay roles'} description={query || complexId ? 'Prueba con otros filtros.' : 'Crea el primer rol o espera los roles registrados en el backend.'} /> : (
          <div className="table-scroll"><table><thead><tr><th>ROL</th><th>ALCANCE</th><th>DESCRIPCIÓN</th><th>USUARIOS</th><th><span className="sr-only">Acciones</span></th></tr></thead><tbody>{roles.map((role) => {
            const assignedUsers = data.users.filter((user) => user.userRoles.some((item) => item.role.id === role.id)).length
            return <tr key={role.id}><td><span className="role-name">{role.name}</span></td><td><span className={`scope-pill${role.phId ? '' : ' scope-global'}`}>{role.phId ? Helpers.complexName(data.complexes, role.phId) : 'Global'}</span></td><td>{role.description}</td><td>{assignedUsers}</td><td><div className="row-actions"><button className="button button-quiet" type="button" onClick={() => { setError(null); setEditing(role) }}>Editar</button><button className="button button-quiet danger-text" type="button" onClick={() => void remove(role)}>Eliminar</button></div></td></tr>
          })}</tbody></table></div>
        )}
      </section>
      {editing !== undefined && <RoleForm key={editing?.id ?? 'new'} role={editing} complexes={data.complexes} onClose={() => setEditing(undefined)} onSave={(payload) => void save(payload)} error={error} />}
    </>
  )
}

function RoleForm({ role, complexes, onClose, onSave, error }: { role: Models.Role | null; complexes: Models.Complex[]; onClose: () => void; onSave: (payload: { phId: string | null; name: string; description: string }) => void; error: unknown }) {
  const [phId, setPhId] = useState(role?.phId ?? '')
  const [name, setName] = useState(role?.name ?? '')
  const [description, setDescription] = useState(role?.description ?? '')
  return (
    <UI.Modal title={role ? 'Editar rol' : 'Nuevo rol'} onClose={onClose}>
      <form className="form-grid form-grid-single" onSubmit={(event) => { event.preventDefault(); onSave({ phId: phId || null, name: name.trim(), description: description.trim() }) }}>
        <UI.ComplexSelect complexes={complexes} value={phId} onChange={setPhId} required={false} />
        <label className="field"><span>Nombre <span className="required">*</span></span><input required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} /></label>
        <label className="field"><span>Descripción <span className="required">*</span></span><textarea required maxLength={255} rows={3} value={description} onChange={(event) => setDescription(event.target.value)} /></label>
        {error !== null && <UI.ErrorMessage error={error} />}
        <div className="form-actions"><button className="button button-outline" type="button" onClick={onClose}>Cancelar</button><button className="button button-primary" type="submit">Guardar rol</button></div>
      </form>
    </UI.Modal>
  )
}

export { RolesPage }
