import * as UI from '../../shared/ui'
import * as Helpers from '../../shared/helpers'
import * as Context from '../../shared/context'
import * as Api from '../../api'
import type * as Models from '../../types'
import { useState } from 'react'

function ConceptsPage() {
  const { data, loading, refresh, notify } = Context.useAppData()
  const [editing, setEditing] = useState<Models.FinancialConcept | null | undefined>(undefined)
  const [query, setQuery] = useState('')
  const [complexId, setComplexId] = useState('')
  const [error, setError] = useState<unknown>(null)
  const concepts = data.concepts.filter((concept) => (!complexId || concept.phId === complexId || concept.phId === null) && `${concept.name} ${concept.description ?? ''}`.toLowerCase().includes(query.toLowerCase()))

  async function save(payload: { phId: string | null; name: string; description: string | null }) {
    setError(null)
    try {
      if (editing) await Api.api.updateConcept(editing.id, payload)
      else await Api.api.createConcept(payload)
      notify(editing ? 'Concepto actualizado.' : 'Concepto creado.')
      setEditing(undefined)
      await refresh()
    } catch (error) {
      setError(error)
    }
  }

  async function remove(concept: Models.FinancialConcept) {
    if (!window.confirm(`¿Eliminar el concepto ${concept.name}?`)) return
    try {
      await Api.api.deleteConcept(concept.id)
      notify('Concepto eliminado.')
      await refresh()
    } catch (error) {
      notify(Helpers.messageOf(error), 'error')
    }
  }

  return (
    <>
      <UI.PageHeading title="Conceptos financieros" description="Conceptos contables compartidos o específicos de un conjunto." action={<button className="button button-primary" type="button" onClick={() => { setError(null); setEditing(null) }}><span aria-hidden="true">＋</span> Nuevo concepto</button>} />
      <div className="toolbar"><UI.SearchBox value={query} onChange={setQuery} placeholder="Buscar concepto" /><UI.ComplexFilter complexes={data.complexes} value={complexId} onChange={setComplexId} /><span className="result-count">{concepts.length} resultados</span></div>
      <section className="panel table-panel">
        {loading ? <UI.Loading /> : concepts.length === 0 ? <UI.EmptyState title={query || complexId ? 'Sin coincidencias' : 'Aún no hay conceptos'} description={query || complexId ? 'Prueba con otros filtros.' : 'Crea conceptos como Administración o Multa.'} /> : (
          <div className="table-scroll"><table><thead><tr><th>CONCEPTO</th><th>ALCANCE</th><th>DESCRIPCIÓN</th><th>DOCUMENTOS</th><th><span className="sr-only">Acciones</span></th></tr></thead><tbody>{concepts.map((concept) => {
            const itemCount = data.documents.reduce((count, document) => count + document.items.filter((item) => item.conceptId === concept.id).length, 0)
            return <tr key={concept.id}><td><strong>{concept.name}</strong></td><td><span className={`scope-pill${concept.phId ? '' : ' scope-global'}`}>{concept.phId ? Helpers.complexName(data.complexes, concept.phId) : 'Global'}</span></td><td>{concept.description || '—'}</td><td>{itemCount}</td><td><div className="row-actions"><button className="button button-quiet" type="button" onClick={() => { setError(null); setEditing(concept) }}>Editar</button><button className="button button-quiet danger-text" type="button" onClick={() => void remove(concept)}>Eliminar</button></div></td></tr>
          })}</tbody></table></div>
        )}
      </section>
      {editing !== undefined && <ConceptForm key={editing?.id ?? 'new'} concept={editing} complexes={data.complexes} onClose={() => setEditing(undefined)} onSave={(payload) => void save(payload)} error={error} />}
    </>
  )
}

function ConceptForm({ concept, complexes, onClose, onSave, error }: { concept: Models.FinancialConcept | null; complexes: Models.Complex[]; onClose: () => void; onSave: (payload: { phId: string | null; name: string; description: string | null }) => void; error: unknown }) {
  const [phId, setPhId] = useState(concept?.phId ?? '')
  const [name, setName] = useState(concept?.name ?? '')
  const [description, setDescription] = useState(concept?.description ?? '')
  return (
    <UI.Modal title={concept ? 'Editar concepto' : 'Nuevo concepto'} onClose={onClose}>
      <form className="form-grid form-grid-single" onSubmit={(event) => { event.preventDefault(); onSave({ phId: phId || null, name: name.trim(), description: description.trim() || null }) }}>
        <UI.ComplexSelect complexes={complexes} value={phId} onChange={setPhId} required={false} />
        <label className="field"><span>Nombre <span className="required">*</span></span><input required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} /></label>
        <label className="field"><span>Descripción</span><textarea maxLength={255} rows={3} value={description} onChange={(event) => setDescription(event.target.value)} /></label>
        {error !== null && <UI.ErrorMessage error={error} />}
        <div className="form-actions"><button className="button button-outline" type="button" onClick={onClose}>Cancelar</button><button className="button button-primary" type="submit">Guardar concepto</button></div>
      </form>
    </UI.Modal>
  )
}

export { ConceptsPage }
