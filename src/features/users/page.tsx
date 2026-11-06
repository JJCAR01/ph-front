import * as UI from '../../shared/ui'
import * as Helpers from '../../shared/helpers'
import * as Context from '../../shared/context'
import * as Api from '../../api'
import type * as Models from '../../types'
import * as Money from '../../money'
import { useState } from 'react'
import type { FormEvent } from 'react'

function UsersPage() {
  const { data, loading, refresh, notify } = Context.useAppData()
  const [query, setQuery] = useState('')
  const [complexId, setComplexId] = useState('')
  const [editing, setEditing] = useState<Models.User | null | undefined>(undefined)
  const [error, setError] = useState<unknown>(null)
  const users = data.users.filter((user) => (!complexId || user.phId === complexId) && user.email.toLowerCase().includes(query.toLowerCase()))

  async function saveUser(payload: UserPayload) {
    setError(null)
    try {
      if (editing) {
        await Api.api.updateUser(editing.id, payload)
        notify('Usuario actualizado.')
      } else {
        const created = await Api.api.createUser({
          phId: payload.phId,
          email: payload.email,
          password: payload.password ?? '',
          isActived: true,
        })
        try {
          for (const roleId of payload.roleIds ?? []) await Api.api.assignRole(created.id, roleId)
        } catch (roleError) {
          setEditing(undefined)
          await refresh()
          notify(`La cuenta se creó, pero no se completó la asignación de roles: ${Helpers.messageOf(roleError)}`, 'error')
          return
        }
        notify('Usuario creado.')
      }
      setEditing(undefined)
      await refresh()
    } catch (saveError) {
      setError(saveError)
    }
  }

  async function toggleActive(user: Models.User) {
    const action = user.isActived ? 'desactivar' : 'activar'
    if (!window.confirm(`¿${action[0].toUpperCase()}${action.slice(1)} la cuenta de ${user.email}?`)) return
    try {
      await Api.api.updateUser(user.id, { isActived: !user.isActived })
      notify(`Cuenta ${user.isActived ? 'desactivada' : 'activada'}.`)
      await refresh()
    } catch (error) {
      notify(Helpers.messageOf(error), 'error')
    }
  }

  async function assign(user: Models.User, roleId: string, remove = false) {
    if (!roleId) return
    const role = data.roles.find((item) => item.id === roleId)
    if (!role) return
    if (remove && !window.confirm(`¿Quitar el rol ${role.name} de ${user.email}?`)) return
    try {
      if (remove) await Api.api.removeRole(user.id, roleId)
      else await Api.api.assignRole(user.id, roleId)
      notify(remove ? 'Rol quitado.' : 'Rol asignado.')
      await refresh()
    } catch (error) {
      notify(Helpers.messageOf(error), 'error')
    }
  }

  return (
    <>
      <UI.PageHeading title="Usuarios" description="Cuentas del sistema, acceso y roles asignados." action={<button className="button button-primary" type="button" onClick={() => { setError(null); setEditing(null) }}><span aria-hidden="true">＋</span> Nuevo usuario</button>} />
      <div className="callout callout-info"><span aria-hidden="true">i</span><p><strong>Inquilinos:</strong> crea su cuenta como cualquier usuario y asígnale el rol <code>TENANT</code>. La API no ofrece asociación de usuario a propiedad; asignar el rol no vincula una unidad ni crea esa persistencia.</p></div>
      <div className="toolbar"><UI.SearchBox value={query} onChange={setQuery} placeholder="Buscar por correo" /><UI.ComplexFilter complexes={data.complexes} value={complexId} onChange={setComplexId} /><span className="result-count">{users.length} resultados</span></div>
      <section className="panel table-panel">
        {loading ? <UI.Loading /> : users.length === 0 ? <UI.EmptyState title={query || complexId ? 'Sin coincidencias' : 'Aún no hay usuarios'} description={query || complexId ? 'Prueba con otros filtros.' : 'Las cuentas creadas en el backend aparecerán aquí.'} /> : (
          <div className="table-scroll"><table>
            <thead><tr><th>CUENTA</th><th>CONJUNTO</th><th>ROLES</th><th>ÚLTIMO ACCESO</th><th>ESTADO</th><th><span className="sr-only">Acciones</span></th></tr></thead>
            <tbody>{users.map((user) => {
              const eligibleRoles = data.roles.filter((role) => !role.phId || role.phId === user.phId)
              const assignedRoleIds = user.userRoles.map((item) => item.role.id)
              return <tr key={user.id}>
                <td><div className="identity-cell"><span className="avatar">{user.email.slice(0, 1).toUpperCase()}</span><strong>{user.email}</strong></div></td>
                <td>{Helpers.complexName(data.complexes, user.phId)}</td>
                <td><div className="role-cell">{user.userRoles.map(({ role }) => <button className="role-chip" type="button" title={`Quitar rol ${role.name}`} key={role.id} onClick={() => void assign(user, role.id, true)}>{role.name}<span aria-hidden="true"> ×</span></button>)}</div><div className="assign-role"><select aria-label={`Rol para asignar a ${user.email}`} defaultValue=""><option value="">Asignar rol…</option>{eligibleRoles.filter((role) => !assignedRoleIds.includes(role.id)).map((role) => <option value={role.id} key={role.id}>{role.name}</option>)}</select><button className="button button-quiet" type="button" onClick={(event) => { const select = event.currentTarget.previousElementSibling; if (select instanceof HTMLSelectElement) { void assign(user, select.value); select.value = '' } }}>＋</button></div></td>
                <td>{Money.formatDate(user.lastLogin)}</td>
                <td><UI.StatusBadge active={user.isActived} /></td>
                <td><div className="row-actions"><button className="button button-quiet" type="button" onClick={() => { setError(null); setEditing(user) }}>Editar</button><button className={`button button-quiet${user.isActived ? ' danger-text' : ''}`} type="button" onClick={() => void toggleActive(user)}>{user.isActived ? 'Desactivar' : 'Activar'}</button></div></td>
              </tr>
            })}</tbody>
          </table></div>
        )}
      </section>
      {editing !== undefined && <UserForm key={editing?.id ?? 'new'} user={editing} complexes={data.complexes} roles={data.roles} onClose={() => setEditing(undefined)} onSave={(payload) => void saveUser(payload)} error={error} />}
    </>
  )
}

function UserForm({ user, complexes, roles, onClose, onSave, error }: { user: Models.User | null; complexes: Models.Complex[]; roles: Models.Role[]; onClose: () => void; onSave: (payload: UserPayload) => void; error: unknown }) {
  const [phId, setPhId] = useState(user?.phId ?? complexes[0]?.id ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [password, setPassword] = useState('')
  const [isActived, setIsActived] = useState(user?.isActived ?? true)
  const [roleIds, setRoleIds] = useState<string[]>([])
  const [validation, setValidation] = useState('')
  const availableRoles = roles.filter((role) => !role.phId || role.phId === phId)

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!phId) return setValidation('Selecciona un conjunto para continuar.')
    if (!user && password.length < 8) return setValidation('La contraseña debe tener al menos 8 caracteres.')
    if (user && password && password.length < 8) return setValidation('La nueva contraseña debe tener al menos 8 caracteres.')
    setValidation('')
    onSave({
      phId,
      email: email.trim(),
      ...(password ? { password } : {}),
      ...(user ? { isActived } : {}),
      ...(!user ? { roleIds } : {}),
    })
    setPassword('')
  }

  return (
    <UI.Modal title={user ? 'Editar usuario' : 'Nuevo usuario'} onClose={onClose} wide>
      <form className="form-grid" onSubmit={submit}>
        <UI.ComplexSelect complexes={complexes} value={phId} onChange={setPhId} />
        <label className="field form-span"><span>Correo electrónico <span className="required">*</span></span><input type="email" required maxLength={255} value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <label className="field form-span"><span>{user ? 'Nueva contraseña (opcional)' : 'Contraseña'}{!user && <span className="required"> *</span>}</span><input type="password" autoComplete="new-password" minLength={8} maxLength={128} required={!user} value={password} onChange={(event) => setPassword(event.target.value)} /><small>La contraseña se envía solo al guardar y no se conserva en los datos del usuario.</small></label>
        {user ? (
          <label className="checkbox-option form-span"><input type="checkbox" checked={isActived} onChange={(event) => setIsActived(event.target.checked)} /><span><strong>Cuenta activa</strong><small>Desmarca para desactivar el acceso del usuario.</small></span></label>
        ) : (
          <fieldset className="property-picker form-span"><legend>Roles iniciales</legend>{availableRoles.length === 0 ? <p className="muted">No hay roles disponibles para este conjunto. Puedes crear uno en la sección Roles.</p> : <div className="checkbox-grid">{availableRoles.map((role) => <label className="checkbox-option" key={role.id}><input type="checkbox" checked={roleIds.includes(role.id)} onChange={(event) => setRoleIds((current) => event.target.checked ? [...current, role.id] : current.filter((id) => id !== role.id))} /><span><strong>{role.name}</strong><small>{role.phId ? Helpers.complexName(complexes, role.phId) : 'Rol global'}</small></span></label>)}</div>}</fieldset>
        )}
        {!user && <div className="dashboard-note form-span"><span aria-hidden="true">i</span><p>Asignar el rol <strong>TENANT</strong> no asocia este usuario con una propiedad: esa relación requiere soporte adicional en el backend.</p></div>}
        {(validation !== '' || error !== null) && <div className="form-span">{validation !== '' ? <div className="alert alert-error" role="alert">{validation}</div> : <UI.ErrorMessage error={error} />}</div>}
        <div className="form-actions form-span"><button className="button button-outline" type="button" onClick={onClose}>Cancelar</button><button className="button button-primary" type="submit">{user ? 'Guardar cambios' : 'Crear usuario'}</button></div>
      </form>
    </UI.Modal>
  )
}

type UserPayload = { phId: string; email: string; password?: string; isActived?: boolean; roleIds?: string[] }

export { UsersPage }
