import * as UI from '../../shared/ui'
import * as Helpers from '../../shared/helpers'
import * as Context from '../../shared/context'
import * as Api from '../../api'
import type * as Models from '../../types'
import { useState } from 'react'
import type { FormEvent } from 'react'

function OwnersPage() {
  const { data, loading, refresh, notify } = Context.useAppData()
  const [query, setQuery] = useState('')
  const [complexId, setComplexId] = useState('')
  const [editing, setEditing] = useState<Models.Owner | null | undefined>(undefined)
  const [error, setError] = useState<unknown>(null)

  const owners = data.owners.filter((owner) =>
    (!complexId || owner.phId === complexId) &&
    `${owner.firstName} ${owner.lastName} ${owner.documentNumber} ${owner.email ?? ''}`.toLowerCase().includes(query.toLowerCase()),
  )

  async function saveOwner(payload: OwnerPayload) {
    setError(null)
    try {
      if (editing) await Api.api.updateOwner(editing.id, payload)
      else await Api.api.createOwner(payload)
      setEditing(undefined)
      notify(editing ? 'Propietario actualizado.' : 'Propietario creado.')
      await refresh()
    } catch (saveError) {
      setError(saveError)
    }
  }

  async function deleteOwner(owner: Models.Owner) {
    if (!window.confirm(`¿Eliminar a ${owner.firstName} ${owner.lastName}? Esta acción no se puede deshacer.`)) return
    try {
      await Api.api.deleteOwner(owner.id)
      notify('Propietario eliminado.')
      await refresh()
    } catch (deleteError) {
      notify(Helpers.messageOf(deleteError), 'error')
    }
  }

  return (
    <>
      <UI.PageHeading
        title="Propietarios"
        description="Personas propietarias y las unidades vinculadas a cada una."
        action={<button className="button button-primary" type="button" onClick={() => { setError(null); setEditing(null) }}><span aria-hidden="true">＋</span> Nuevo propietario</button>}
      />
      <div className="toolbar">
        <UI.SearchBox value={query} onChange={setQuery} placeholder="Nombre, documento o correo" />
        <UI.ComplexFilter complexes={data.complexes} value={complexId} onChange={setComplexId} />
        <span className="result-count">{owners.length} resultados</span>
      </div>
      <section className="panel table-panel">
        {loading ? <UI.Loading /> : owners.length === 0 ? (
          <UI.EmptyState title={query || complexId ? 'Sin coincidencias' : 'Aún no hay propietarios'} description={query || complexId ? 'Prueba con otros filtros.' : 'Los propietarios registrados en el backend aparecerán aquí.'} />
        ) : (
          <div className="table-scroll">
            <table>
              <thead><tr><th>PERSONA</th><th>DOCUMENTO</th><th>CONJUNTO</th><th>PROPIEDADES</th><th>CONTACTO</th><th><span className="sr-only">Acciones</span></th></tr></thead>
              <tbody>{owners.map((owner) => (
                <tr key={owner.id}>
                  <td><strong>{owner.firstName} {owner.lastName}</strong><small className="table-subtext">{owner.email || 'Sin correo registrado'}</small></td>
                  <td><span className="data-mono">{owner.documentType} · {owner.documentNumber}</span></td>
                  <td>{Helpers.complexName(data.complexes, owner.phId)}</td>
                  <td><div className="property-tags">{owner.properties?.length ? owner.properties.map((property) => <span className="tag" key={property.id}>{property.name}</span>) : <span className="muted">Sin propiedades</span>}</div></td>
                  <td>{owner.phone || '—'}</td>
                  <td><div className="row-actions"><button type="button" className="button button-quiet" onClick={() => { setError(null); setEditing(owner) }}>Editar</button><button type="button" className="button button-quiet danger-text" onClick={() => void deleteOwner(owner)}>Eliminar</button></div></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>
      {editing !== undefined && (
        <OwnerForm
          key={editing?.id ?? 'new'}
          owner={editing}
          complexes={data.complexes}
          properties={data.properties}
          onClose={() => setEditing(undefined)}
          onSave={(payload) => void saveOwner(payload)}
          error={error}
        />
      )}
    </>
  )
}

function OwnerForm({
  owner,
  complexes,
  properties,
  onClose,
  onSave,
  error,
}: {
  owner: Models.Owner | null
  complexes: Models.Complex[]
  properties: Models.Property[]
  onClose: () => void
  onSave: (payload: OwnerPayload) => void
  error: unknown
}) {
  const [phId, setPhId] = useState(owner?.phId ?? complexes[0]?.id ?? '')
  const [documentType, setDocumentType] = useState<Models.OwnerDocumentType>(owner?.documentType ?? 'CC')
  const [documentNumber, setDocumentNumber] = useState(owner?.documentNumber ?? '')
  const [firstName, setFirstName] = useState(owner?.firstName ?? '')
  const [lastName, setLastName] = useState(owner?.lastName ?? '')
  const [phone, setPhone] = useState(owner?.phone ?? '')
  const [email, setEmail] = useState(owner?.email ?? '')
  const [propertyIds, setPropertyIds] = useState(owner?.properties?.map((property) => property.id) ?? [])
  const [validation, setValidation] = useState('')
  const availableProperties = properties.filter((property) => property.phId === phId)

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!phId) return setValidation('Selecciona un conjunto para continuar.')
    setValidation('')
    onSave({
      phId,
      documentType,
      documentNumber: documentNumber.trim(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim() || null,
      email: email.trim() || null,
      propertyIds: propertyIds.filter((id) => availableProperties.some((property) => property.id === id)),
    })
  }

  return (
    <UI.Modal title={owner ? 'Editar propietario' : 'Nuevo propietario'} onClose={onClose} wide>
      <form className="form-grid" onSubmit={submit}>
        <UI.ComplexSelect complexes={complexes} value={phId} onChange={(value) => { setPhId(value); setPropertyIds([]) }} />
        <label className="field"><span>Tipo de documento <span className="required">*</span></span><select required value={documentType} onChange={(event) => setDocumentType(event.target.value as Models.OwnerDocumentType)}><option value="CC">Cédula de ciudadanía</option><option value="NIT">NIT</option><option value="CE">Cédula de extranjería</option><option value="PASSPORT">Pasaporte</option></select></label>
        <label className="field"><span>Número de documento <span className="required">*</span></span><input required maxLength={50} value={documentNumber} onChange={(event) => setDocumentNumber(event.target.value)} /></label>
        <label className="field"><span>Nombres <span className="required">*</span></span><input required maxLength={100} value={firstName} onChange={(event) => setFirstName(event.target.value)} /></label>
        <label className="field"><span>Apellidos <span className="required">*</span></span><input required maxLength={100} value={lastName} onChange={(event) => setLastName(event.target.value)} /></label>
        <label className="field"><span>Teléfono</span><input maxLength={20} value={phone} onChange={(event) => setPhone(event.target.value)} /></label>
        <label className="field"><span>Correo electrónico</span><input type="email" maxLength={255} value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <fieldset className="property-picker">
          <legend>Propiedades relacionadas</legend>
          {availableProperties.length === 0 ? <p className="muted">No hay propiedades disponibles en este conjunto.</p> : (
            <div className="checkbox-grid">{availableProperties.map((property) => (
              <label className="checkbox-option" key={property.id}>
                <input type="checkbox" checked={propertyIds.includes(property.id)} onChange={(event) => setPropertyIds((current) => event.target.checked ? [...current, property.id] : current.filter((id) => id !== property.id))} />
                <span><strong>{property.name}</strong><small>{property.block?.name ?? `Bloque ${property.blockId.slice(0, 8)}`}</small></span>
              </label>
            ))}</div>
          )}
        </fieldset>
        {(validation !== '' || error !== null) && <div className="form-span">{validation !== '' ? <div className="alert alert-error" role="alert">{validation}</div> : <UI.ErrorMessage error={error} />}</div>}
        <div className="form-actions form-span"><button className="button button-outline" type="button" onClick={onClose}>Cancelar</button><button className="button button-primary" type="submit">Guardar propietario</button></div>
      </form>
    </UI.Modal>
  )
}

type OwnerPayload = {
  phId: string
  documentType: Models.OwnerDocumentType
  documentNumber: string
  firstName: string
  lastName: string
  phone: string | null
  email: string | null
  propertyIds: string[]
}

export { OwnersPage }
