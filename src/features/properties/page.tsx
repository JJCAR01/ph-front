import * as UI from '../../shared/ui'
import * as Helpers from '../../shared/helpers'
import * as Context from '../../shared/context'
import * as Api from '../../api'
import type * as Models from '../../types'
import { useState } from 'react'
import type { FormEvent } from 'react'

function PropertiesPage() {
  const { data, loading, refresh, notify } = Context.useAppData()
  const [query, setQuery] = useState('')
  const [complexId, setComplexId] = useState('')
  const [editingProperty, setEditingProperty] = useState<Models.Property | null | undefined>(undefined)
  const [editingBlock, setEditingBlock] = useState<Models.Block | null | undefined>(undefined)
  const [error, setError] = useState<unknown>(null)
  const properties = data.properties.filter((property) =>
    (!complexId || property.phId === complexId) &&
    `${property.name} ${property.block?.name ?? ''}`.toLowerCase().includes(query.toLowerCase()),
  )
  const blocks = data.blocks.filter((block) => (!complexId || block.phId === complexId) && `${block.name}`.toLowerCase().includes(query.toLowerCase()))

  async function saveProperty(payload: PropertyPayload) {
    setError(null)
    try {
      if (editingProperty) {
        await Api.api.updateProperty(editingProperty.id, payload)
        notify('Propiedad actualizada.')
      } else {
        await Api.api.createProperty(payload)
        notify('Propiedad creada.')
      }
      setEditingProperty(undefined)
      await refresh()
    } catch (error) {
      setError(error)
    }
  }

  async function saveBlock(payload: Omit<Models.Block, 'id'>) {
    setError(null)
    try {
      if (editingBlock) {
        await Api.api.updateBlock(editingBlock.id, payload)
        notify('Bloque actualizado.')
      } else {
        await Api.api.createBlock(payload)
        notify('Bloque creado.')
      }
      setEditingBlock(undefined)
      await refresh()
    } catch (error) {
      setError(error)
    }
  }

  async function removeProperty(property: Models.Property) {
    if (!window.confirm(`¿Eliminar la propiedad ${property.name}?`)) return
    try {
      await Api.api.deleteProperty(property.id)
      notify('Propiedad eliminada.')
      await refresh()
    } catch (error) {
      notify(Helpers.messageOf(error), 'error')
    }
  }

  async function removeBlock(block: Models.Block) {
    const linked = data.properties.some((property) => property.blockId === block.id)
    if (linked) return notify('No puedes eliminar un bloque que contiene propiedades. Reasigna o elimina sus propiedades primero.', 'error')
    if (!window.confirm(`¿Eliminar el bloque ${block.name}?`)) return
    try {
      await Api.api.deleteBlock(block.id)
      notify('Bloque eliminado.')
      await refresh()
    } catch (error) {
      notify(Helpers.messageOf(error), 'error')
    }
  }

  return (
    <>
      <UI.PageHeading title="Propiedades y bloques" description="Unidades residenciales organizadas por conjunto y bloque." action={<div className="heading-actions"><button className="button button-outline" type="button" onClick={() => { setError(null); setEditingBlock(null) }}><span aria-hidden="true">＋</span> Nuevo bloque</button><button className="button button-primary" type="button" onClick={() => { setError(null); setEditingProperty(null) }}><span aria-hidden="true">＋</span> Nueva propiedad</button></div>} />
      <div className="toolbar"><UI.SearchBox value={query} onChange={setQuery} placeholder="Buscar propiedad o bloque" /><UI.ComplexFilter complexes={data.complexes} value={complexId} onChange={setComplexId} /><span className="result-count">{properties.length} propiedades · {blocks.length} bloques</span></div>
      <section className="panel table-panel">
        <div className="section-title"><div><span className="eyebrow">INVENTARIO</span><h2>Propiedades</h2></div></div>
        {loading ? <UI.Loading /> : properties.length === 0 ? <UI.EmptyState title={query || complexId ? 'Sin coincidencias' : 'Aún no hay propiedades'} description={query || complexId ? 'Prueba con otros filtros.' : 'Crea un bloque y luego registra las propiedades que contiene.'} /> : (
          <div className="table-scroll"><table><thead><tr><th>PROPIEDAD</th><th>CONJUNTO</th><th>BLOQUE</th><th>ÁREA</th><th>COEFICIENTE</th><th>PROPIETARIOS</th><th><span className="sr-only">Acciones</span></th></tr></thead><tbody>{properties.map((property) => <tr key={property.id}><td><strong>{property.name}</strong></td><td>{Helpers.complexName(data.complexes, property.phId)}</td><td>{property.block?.name ?? Helpers.blockName(data.blocks, property.blockId)}</td><td>{property.areaM2} m²</td><td>{property.coefficient}</td><td>{property.owners?.length ?? data.owners.filter((owner) => owner.properties.some((item) => item.id === property.id)).length}</td><td><div className="row-actions"><button className="button button-quiet" type="button" onClick={() => { setError(null); setEditingProperty(property) }}>Editar</button><button className="button button-quiet danger-text" type="button" onClick={() => void removeProperty(property)}>Eliminar</button></div></td></tr>)}</tbody></table></div>
        )}
      </section>
      <section className="panel table-panel sub-table-panel">
        <div className="section-title"><div><span className="eyebrow">ORGANIZACIÓN</span><h2>Bloques</h2></div></div>
        {loading ? <UI.Loading /> : blocks.length === 0 ? <UI.EmptyState title={query || complexId ? 'Sin bloques coincidentes' : 'Aún no hay bloques'} description="Los bloques ayudan a organizar las propiedades del conjunto." /> : (
          <div className="table-scroll"><table><thead><tr><th>BLOQUE</th><th>CONJUNTO</th><th>PISOS</th><th>ASCENSOR</th><th>PROPIEDADES</th><th><span className="sr-only">Acciones</span></th></tr></thead><tbody>{blocks.map((block) => <tr key={block.id}><td><strong>{block.name}</strong></td><td>{Helpers.complexName(data.complexes, block.phId)}</td><td>{block.totalFloor ?? '—'}</td><td>{block.hasElevator ? 'Sí' : 'No'}</td><td>{data.properties.filter((property) => property.blockId === block.id).length}</td><td><div className="row-actions"><button className="button button-quiet" type="button" onClick={() => { setError(null); setEditingBlock(block) }}>Editar</button><button className="button button-quiet danger-text" type="button" onClick={() => void removeBlock(block)}>Eliminar</button></div></td></tr>)}</tbody></table></div>
        )}
      </section>
      {editingProperty !== undefined && <PropertyForm key={editingProperty?.id ?? 'new'} property={editingProperty} data={data} onClose={() => setEditingProperty(undefined)} onSave={(payload) => void saveProperty(payload)} error={error} />}
      {editingBlock !== undefined && <BlockForm key={editingBlock?.id ?? 'new'} block={editingBlock} complexes={data.complexes} onClose={() => setEditingBlock(undefined)} onSave={(payload) => void saveBlock(payload)} error={error} />}
    </>
  )
}

function PropertyForm({ property, data, onClose, onSave, error }: { property: Models.Property | null; data: Models.AppData; onClose: () => void; onSave: (payload: PropertyPayload) => void; error: unknown }) {
  const [phId, setPhId] = useState(property?.phId ?? data.complexes[0]?.id ?? '')
  const [blockId, setBlockId] = useState(property?.blockId ?? '')
  const [name, setName] = useState(property?.name ?? '')
  const [areaM2, setAreaM2] = useState(String(property?.areaM2 ?? ''))
  const [coefficient, setCoefficient] = useState(String(property?.coefficient ?? ''))
  const [validation, setValidation] = useState('')
  const availableBlocks = data.blocks.filter((block) => block.phId === phId)

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!availableBlocks.some((block) => block.id === blockId)) return setValidation('Selecciona un bloque del conjunto.')
    const area = Number(areaM2)
    const share = Number(coefficient)
    if (!Number.isFinite(area) || area < 0 || !Number.isFinite(share) || share < 0) return setValidation('El área y el coeficiente deben ser números válidos iguales o mayores que cero.')
    setValidation('')
    onSave({ phId, blockId, name: name.trim(), areaM2: area, coefficient: share })
  }

  return <UI.Modal title={property ? 'Editar propiedad' : 'Nueva propiedad'} onClose={onClose}>
    <form className="form-grid form-grid-single" onSubmit={submit}>
      <UI.ComplexSelect complexes={data.complexes} value={phId} onChange={(value) => { setPhId(value); setBlockId('') }} />
      <label className="field"><span>Bloque <span className="required">*</span></span><select required value={blockId} onChange={(event) => setBlockId(event.target.value)}><option value="">Selecciona un bloque</option>{availableBlocks.map((block) => <option value={block.id} key={block.id}>{block.name}</option>)}</select>{availableBlocks.length === 0 && <small>Primero registra un bloque en este conjunto.</small>}</label>
      <label className="field"><span>Nombre o identificación <span className="required">*</span></span><input required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} /></label>
      <label className="field"><span>Área (m²) <span className="required">*</span></span><input required type="number" min="0" step="any" value={areaM2} onChange={(event) => setAreaM2(event.target.value)} /></label>
      <label className="field"><span>Coeficiente <span className="required">*</span></span><input required type="number" min="0" step="any" value={coefficient} onChange={(event) => setCoefficient(event.target.value)} /></label>
      {validation && <div className="alert alert-error" role="alert">{validation}</div>}
      {error !== null && <UI.ErrorMessage error={error} />}
      <div className="form-actions"><button className="button button-outline" type="button" onClick={onClose}>Cancelar</button><button className="button button-primary" type="submit">Guardar propiedad</button></div>
    </form>
  </UI.Modal>
}

function BlockForm({ block, complexes, onClose, onSave, error }: { block: Models.Block | null; complexes: Models.Complex[]; onClose: () => void; onSave: (payload: Omit<Models.Block, 'id'>) => void; error: unknown }) {
  const [phId, setPhId] = useState(block?.phId ?? complexes[0]?.id ?? '')
  const [name, setName] = useState(block?.name ?? '')
  const [totalFloor, setTotalFloor] = useState(block?.totalFloor ? String(block.totalFloor) : '')
  const [hasElevator, setHasElevator] = useState(block?.hasElevator ?? false)
  const [validation, setValidation] = useState('')

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (totalFloor && (!Number.isInteger(Number(totalFloor)) || Number(totalFloor) < 1)) return setValidation('El número de pisos debe ser un entero positivo.')
    setValidation('')
    onSave({ phId, name: name.trim(), totalFloor: totalFloor ? Number(totalFloor) : null, hasElevator })
  }

  return <UI.Modal title={block ? 'Editar bloque' : 'Nuevo bloque'} onClose={onClose}>
    <form className="form-grid form-grid-single" onSubmit={submit}>
      <UI.ComplexSelect complexes={complexes} value={phId} onChange={setPhId} />
      <label className="field"><span>Nombre <span className="required">*</span></span><input required value={name} onChange={(event) => setName(event.target.value)} /></label>
      <label className="field"><span>Número de pisos</span><input type="number" min="1" step="1" value={totalFloor} onChange={(event) => setTotalFloor(event.target.value)} /></label>
      <label className="checkbox-option"><input type="checkbox" checked={hasElevator} onChange={(event) => setHasElevator(event.target.checked)} /><span><strong>Cuenta con ascensor</strong></span></label>
      {validation && <div className="alert alert-error" role="alert">{validation}</div>}
      {error !== null && <UI.ErrorMessage error={error} />}
      <div className="form-actions"><button className="button button-outline" type="button" onClick={onClose}>Cancelar</button><button className="button button-primary" type="submit">Guardar bloque</button></div>
    </form>
  </UI.Modal>
}

type PropertyPayload = Omit<Models.Property, 'id' | 'block' | 'owners'>

export { PropertiesPage }
