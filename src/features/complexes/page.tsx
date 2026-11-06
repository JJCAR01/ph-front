import * as UI from '../../shared/ui'
import * as Helpers from '../../shared/helpers'
import * as Context from '../../shared/context'
import * as Api from '../../api'
import type * as Models from '../../types'
import { useState } from 'react'

function ComplexesPage() {
  const { data, loading, refresh, notify } = Context.useAppData()
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Models.Complex | null | undefined>(undefined)
  const [error, setError] = useState<unknown>(null)
  const complexes = data.complexes.filter((complex) => `${complex.name} ${complex.nit} ${complex.city ?? ''}`.toLowerCase().includes(query.toLowerCase()))

  async function save(payload: ComplexPayload) {
    setError(null)
    try {
      if (editing) {
        await Api.api.updateComplex(editing.id, payload)
        notify('Conjunto actualizado.')
      } else {
        await Api.api.createComplex(payload)
        notify('Conjunto creado.')
      }
      setEditing(undefined)
      await refresh()
    } catch (error) {
      setError(error)
    }
  }

  async function remove(complex: Models.Complex) {
    if (!window.confirm(`¿Eliminar el conjunto ${complex.name}? La API puede rechazarlo si tiene registros relacionados.`)) return
    try {
      await Api.api.deleteComplex(complex.id)
      notify('Conjunto eliminado.')
      await refresh()
    } catch (error) {
      notify(Helpers.messageOf(error), 'error')
    }
  }

  return (
    <>
      <UI.PageHeading title="Conjuntos residenciales" description="Datos generales y estado de los conjuntos administrados." action={<button className="button button-primary" type="button" onClick={() => { setError(null); setEditing(null) }}><span aria-hidden="true">＋</span> Nuevo conjunto</button>} />
      <div className="toolbar"><UI.SearchBox value={query} onChange={setQuery} placeholder="Nombre, NIT o ciudad" /><span className="result-count">{complexes.length} resultados</span></div>
      <section className="panel table-panel">
        {loading ? <UI.Loading /> : complexes.length === 0 ? <UI.EmptyState title={query ? 'Sin coincidencias' : 'Aún no hay conjuntos'} description={query ? 'Prueba con otros términos.' : 'Crea el primer conjunto residencial para empezar a administrar propiedades y documentos.'} /> : (
          <div className="table-scroll"><table><thead><tr><th>CONJUNTO</th><th>NIT</th><th>CIUDAD</th><th>CONTACTO</th><th>PROPIEDADES</th><th>ESTADO</th><th><span className="sr-only">Acciones</span></th></tr></thead><tbody>{complexes.map((complex) => {
            const propertyCount = data.properties.filter((property) => property.phId === complex.id).length
            return <tr key={complex.id}><td><strong>{complex.name}</strong><small className="table-subtext">{complex.address || 'Sin dirección registrada'}</small></td><td className="data-mono">{complex.nit}</td><td>{complex.city || '—'}</td><td>{complex.email || complex.phone || '—'}</td><td>{propertyCount}</td><td><UI.StatusBadge active={complex.isActive} /></td><td><div className="row-actions"><button className="button button-quiet" type="button" onClick={() => { setError(null); setEditing(complex) }}>Editar</button><button className="button button-quiet danger-text" type="button" onClick={() => void remove(complex)}>Eliminar</button></div></td></tr>
          })}</tbody></table></div>
        )}
      </section>
      {editing !== undefined && <ComplexForm key={editing?.id ?? 'new'} complex={editing} onClose={() => setEditing(undefined)} onSave={(payload) => void save(payload)} error={error} />}
    </>
  )
}

function ComplexForm({ complex, onClose, onSave, error }: { complex: Models.Complex | null; onClose: () => void; onSave: (payload: ComplexPayload) => void; error: unknown }) {
  const [name, setName] = useState(complex?.name ?? '')
  const [nit, setNit] = useState(complex?.nit ?? '')
  const [address, setAddress] = useState(complex?.address ?? '')
  const [city, setCity] = useState(complex?.city ?? '')
  const [whatsapp, setWhatsapp] = useState(complex?.whatsapp ?? '')
  const [phone, setPhone] = useState(complex?.phone ?? '')
  const [email, setEmail] = useState(complex?.email ?? '')
  const [isActive, setIsActive] = useState(complex?.isActive ?? true)
  return (
    <UI.Modal title={complex ? 'Editar conjunto' : 'Nuevo conjunto'} onClose={onClose} wide>
      <form className="form-grid" onSubmit={(event) => {
        event.preventDefault()
        onSave({ name: name.trim(), nit: nit.trim(), address: address.trim(), city: city.trim(), whatsapp: whatsapp.trim(), phone: phone.trim(), email: email.trim(), isActive })
      }}>
        <label className="field"><span>Nombre <span className="required">*</span></span><input required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} /></label>
        <label className="field"><span>NIT <span className="required">*</span></span><input required maxLength={20} value={nit} onChange={(event) => setNit(event.target.value)} /></label>
        <label className="field"><span>Dirección </span><input required maxLength={200} value={address} onChange={(event) => setAddress(event.target.value)} /></label>
        <label className="field"><span>Ciudad <span className="required">*</span></span><input required maxLength={100} value={city} onChange={(event) => setCity(event.target.value)} /></label>
        <label className="field"><span>WhatsApp </span><input required maxLength={20} value={whatsapp} onChange={(event) => setWhatsapp(event.target.value)} /></label>
        <label className="field"><span>Teléfono </span><input required maxLength={20} value={phone} onChange={(event) => setPhone(event.target.value)} /></label>
        <label className="field form-span"><span>Correo de contacto <span className="required">*</span></span><input required type="email" maxLength={100} value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <label className="checkbox-option form-span"><input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} /><span><strong>Conjunto activo</strong></span></label>
        {error !== null && <div className="form-span"><UI.ErrorMessage error={error} /></div>}
        <div className="form-actions form-span"><button className="button button-outline" type="button" onClick={onClose}>Cancelar</button><button className="button button-primary" type="submit">Guardar conjunto</button></div>
      </form>
    </UI.Modal>
  )
}

type ComplexPayload = Omit<Models.Complex, 'id'>

export { ComplexesPage }
