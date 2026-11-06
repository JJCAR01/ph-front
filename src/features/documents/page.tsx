import * as UI from '../../shared/ui'
import * as Helpers from '../../shared/helpers'
import * as Context from '../../shared/context'
import * as Api from '../../api'
import type * as Models from '../../types'
import * as Money from '../../money'
import { useState } from 'react'
import type { FormEvent } from 'react'
import type { ReactNode } from 'react'

function DocumentsPage() {
  const { data, loading, refresh, notify } = Context.useAppData()
  const [query, setQuery] = useState('')
  const [complexId, setComplexId] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [editing, setEditing] = useState<Models.FinancialDocument | null | undefined>(undefined)
  const [selected, setSelected] = useState<Models.FinancialDocument | null>(null)
  const [error, setError] = useState<unknown>(null)
  const documents = data.documents.filter((document) =>
    (!complexId || document.phId === complexId) &&
    (!typeFilter || document.documentType === typeFilter) &&
    (!statusFilter || document.status === statusFilter) &&
    `${document.documentNumber} ${document.property?.name ?? ''}`.toLowerCase().includes(query.toLowerCase()),
  )

  async function save(payload: DocumentPayload) {
    setError(null)
    try {
      if (editing) {
        const changes: Partial<DocumentPayload> = {}
        for (const key of Object.keys(payload) as (keyof DocumentPayload)[]) {
          if (JSON.stringify(payload[key]) !== JSON.stringify(editing[key])) changes[key] = payload[key] as never
        }
        await Api.api.updateDocument(editing.id, changes)
        notify('Documento actualizado.')
      } else {
        await Api.api.createDocument(payload)
        notify('Documento creado.')
      }
      setEditing(undefined)
      await refresh()
    } catch (saveError) {
      setError(saveError)
    }
  }

  async function annul(document: Models.FinancialDocument) {
    if (!window.confirm(`¿Anular el documento ${document.documentNumber}?`)) return
    try {
      await Api.api.updateDocument(document.id, { status: 'ANNULLED' })
      notify('Documento anulado.')
      await refresh()
    } catch (error) {
      notify(Helpers.messageOf(error), 'error')
    }
  }

  return (
    <>
      <UI.PageHeading title="Documentos financieros" description="Facturas, notas débito, recibos y notas crédito." action={<button className="button button-primary" type="button" onClick={() => { setError(null); setEditing(null) }}><span aria-hidden="true">＋</span> Nuevo documento</button>} />
      <div className="toolbar"><UI.SearchBox value={query} onChange={setQuery} placeholder="Número o propiedad" /><UI.ComplexFilter complexes={data.complexes} value={complexId} onChange={setComplexId} /><label className="filter-field"><span className="sr-only">Tipo</span><select aria-label="Tipo de documento" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}><option value="">Todos los tipos</option><option value="F">Factura</option><option value="ND">Nota débito</option><option value="RC">Recibo</option><option value="NC">Nota crédito</option></select></label><label className="filter-field"><span className="sr-only">Estado</span><select aria-label="Estado del documento" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="">Todos los estados</option><option value="ACTIVE">Activo</option><option value="ANNULLED">Anulado</option></select></label><span className="result-count">{documents.length} resultados</span></div>
      <section className="panel table-panel">
        {loading ? <UI.Loading /> : documents.length === 0 ? <UI.EmptyState title={query || complexId || typeFilter || statusFilter ? 'Sin coincidencias' : 'Aún no hay documentos'} description={query || complexId || typeFilter || statusFilter ? 'Prueba con otros filtros.' : 'Los documentos financieros se mostrarán aquí cuando estén registrados.'} /> : (
          <div className="table-scroll"><table><thead><tr><th>NÚMERO</th><th>EMISIÓN</th><th>CONJUNTO / PROPIEDAD</th><th>TIPO</th><th>TOTAL</th><th>ESTADO</th><th><span className="sr-only">Acciones</span></th></tr></thead><tbody>{documents.map((document) => <tr key={document.id}>
            <td><button className="table-link data-mono" type="button" onClick={() => setSelected(document)}>{document.documentNumber}</button></td><td>{Money.formatDate(document.issueDate)}</td><td><strong>{Helpers.complexName(data.complexes, document.phId)}</strong><small className="table-subtext">{document.property?.name ?? Helpers.propertyName(data.properties, document.propertyId)}</small></td><td><UI.DocumentTypeBadge type={document.documentType} /></td><td className="money-cell">{Money.formatMoney(document.totalAmount)}</td><td><UI.DocumentStatusBadge status={document.status} /></td><td><div className="row-actions"><button className="button button-quiet" type="button" onClick={() => { setError(null); setEditing(document) }}>Editar</button>{document.status === 'ACTIVE' && <button className="button button-quiet danger-text" type="button" onClick={() => void annul(document)}>Anular</button>}</div></td>
          </tr>)}</tbody></table></div>
        )}
      </section>
      {editing !== undefined && <DocumentForm key={editing?.id ?? 'new'} document={editing} data={data} onClose={() => setEditing(undefined)} onSave={(payload) => void save(payload)} error={error} />}
      {selected && <DocumentDetail document={selected} applications={data.applications} onClose={() => setSelected(null)} />}
    </>
  )
}

function DocumentForm({ document, data, onClose, onSave, error }: { document: Models.FinancialDocument | null; data: Models.AppData; onClose: () => void; onSave: (payload: DocumentPayload) => void; error: unknown }) {
  const [phId, setPhId] = useState(document?.phId ?? data.complexes[0]?.id ?? '')
  const [propertyId, setPropertyId] = useState(document?.propertyId ?? '')
  const [documentType, setDocumentType] = useState<Models.DocumentType>(document?.documentType ?? 'F')
  const [documentNumber, setDocumentNumber] = useState(document?.documentNumber ?? '')
  const [issueDate, setIssueDate] = useState(document?.issueDate?.slice(0, 10) ?? Helpers.localDateString())
  const [creditAmount, setCreditAmount] = useState(document && !Helpers.isItemized(document.documentType) ? String(document.totalAmount) : '')
  const [items, setItems] = useState(() => document?.items?.map((item) => ({ conceptId: item.conceptId, description: item.description, amount: String(item.amount) })) ?? [{ conceptId: '', description: '', amount: '' }])
  const [validation, setValidation] = useState('')
  const properties = data.properties.filter((property) => property.phId === phId)
  const concepts = data.concepts.filter((concept) => !concept.phId || concept.phId === phId)
  const itemized = Helpers.isItemized(documentType)

  function setType(type: Models.DocumentType) {
    setDocumentType(type)
    if (!Helpers.isItemized(type)) setItems([])
    else if (items.length === 0) setItems([{ conceptId: '', description: '', amount: '' }])
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!phId) return setValidation('Selecciona un conjunto.')
    if (!properties.some((property) => property.id === propertyId)) return setValidation('Selecciona una propiedad del conjunto.')
    let totalCents = 0
    let normalizedItems: DocumentPayload['items'] | undefined
    if (itemized) {
      if (items.length === 0) return setValidation('Agrega al menos un renglón al documento.')
      normalizedItems = []
      for (const item of items) {
        const cents = Money.toCents(item.amount)
        if (!item.conceptId || !item.description.trim() || cents === null || cents < 1) return setValidation('Cada renglón requiere concepto, descripción e importe válido de hasta dos decimales.')
        totalCents += cents
        normalizedItems.push({ conceptId: item.conceptId, description: item.description.trim(), amount: Money.centsToAmount(cents) })
      }
    } else {
      const cents = Money.toCents(creditAmount)
      if (cents === null || cents < 1) return setValidation('Ingresa un total válido de hasta dos decimales.')
      totalCents = cents
    }
    if (!Number.isSafeInteger(totalCents)) return setValidation('El total excede el importe permitido.')
    setValidation('')
    onSave({
      phId,
      propertyId,
      documentType,
      documentNumber: documentNumber.trim(),
      issueDate,
      totalAmount: Money.centsToAmount(totalCents),
      ...(normalizedItems
        ? { items: normalizedItems }
        : document?.items.length
          ? { items: [] }
          : {}),
    })
  }

  return (
    <UI.Modal title={document ? `Editar ${document.documentNumber}` : 'Nuevo documento financiero'} onClose={onClose} wide>
      <form className="form-grid" onSubmit={submit}>
        <UI.ComplexSelect complexes={data.complexes} value={phId} onChange={(value) => { setPhId(value); setPropertyId('') }} />
        <label className="field"><span>Propiedad <span className="required">*</span></span><select required value={propertyId} onChange={(event) => setPropertyId(event.target.value)}><option value="">Selecciona una propiedad</option>{properties.map((property) => <option key={property.id} value={property.id}>{property.name}</option>)}</select></label>
        <label className="field"><span>Tipo <span className="required">*</span></span><select value={documentType} onChange={(event) => setType(event.target.value as Models.DocumentType)}><option value="F">F · Factura</option><option value="ND">ND · Nota débito</option><option value="RC">RC · Recibo</option><option value="NC">NC · Nota crédito</option></select></label>
        <label className="field"><span>Número <span className="required">*</span></span><input required maxLength={100} value={documentNumber} onChange={(event) => setDocumentNumber(event.target.value)} /></label>
        <label className="field"><span>Fecha de emisión <span className="required">*</span></span><input type="date" required value={issueDate} onChange={(event) => setIssueDate(event.target.value)} /></label>
        {!itemized && <label className="field"><span>Total (COP) <span className="required">*</span></span><input inputMode="decimal" placeholder="0.00" value={creditAmount} onChange={(event) => setCreditAmount(event.target.value)} /><small>Usa hasta dos decimales. Este importe podrá aplicarse a una deuda.</small></label>}
        {itemized && (
          <fieldset className="line-items form-span"><legend>Renglones del documento</legend>
            {items.map((item, index) => <div className="line-item-row" key={`line-${index}`}>
              <label className="field"><span>Concepto <span className="required">*</span></span><select value={item.conceptId} onChange={(event) => setItems((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, conceptId: event.target.value } : line))}><option value="">Selecciona un concepto</option>{concepts.map((concept) => <option key={concept.id} value={concept.id}>{concept.name}</option>)}</select></label>
              <label className="field"><span>Descripción <span className="required">*</span></span><input maxLength={255} value={item.description} onChange={(event) => setItems((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, description: event.target.value } : line))} /></label>
              <label className="field"><span>Importe (COP) <span className="required">*</span></span><input inputMode="decimal" placeholder="0.00" value={item.amount} onChange={(event) => setItems((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, amount: event.target.value } : line))} /></label>
              <button className="icon-button remove-line" type="button" aria-label={`Quitar renglón ${index + 1}`} onClick={() => setItems((current) => current.filter((_, lineIndex) => lineIndex !== index))}>×</button>
            </div>)}
            <button className="button button-outline button-small" type="button" onClick={() => setItems((current) => [...current, { conceptId: '', description: '', amount: '' }])}>＋ Agregar renglón</button>
            <div className="items-total"><span>Total calculado</span><strong>{Money.formatMoney(Money.centsToAmount(items.reduce((sum, item) => sum + (Money.toCents(item.amount) ?? 0), 0)))}</strong></div>
          </fieldset>
        )}
        {validation && <div className="form-span"><div className="alert alert-error" role="alert">{validation}</div></div>}
        {error !== null && <div className="form-span"><UI.ErrorMessage error={error} /></div>}
        <div className="form-actions form-span"><button className="button button-outline" type="button" onClick={onClose}>Cancelar</button><button className="button button-primary" type="submit">{document ? 'Guardar cambios' : 'Crear documento'}</button></div>
      </form>
    </UI.Modal>
  )
}

function DocumentDetail({ document, applications, onClose }: { document: Models.FinancialDocument; applications: Models.DocumentApplication[]; onClose: () => void }) {
  const related = applications.filter((application) => application.debtDocumentId === document.id || application.creditDocumentId === document.id)
  return (
    <UI.Modal title={`Documento ${document.documentNumber}`} onClose={onClose} wide>
      <div className="detail-grid">
        <DetailItem label="Tipo"><UI.DocumentTypeBadge type={document.documentType} /></DetailItem>
        <DetailItem label="Estado"><UI.DocumentStatusBadge status={document.status} /></DetailItem>
        <DetailItem label="Fecha de emisión">{Money.formatDate(document.issueDate)}</DetailItem>
        <DetailItem label="Total"><strong>{Money.formatMoney(document.totalAmount)}</strong></DetailItem>
        <DetailItem label="Conjunto">{document.phId}</DetailItem>
        <DetailItem label="Propiedad">{document.property?.name ?? document.propertyId}</DetailItem>
      </div>
      {document.items.length > 0 && <section className="detail-section"><h3>Renglones</h3><div className="table-scroll"><table><thead><tr><th>CONCEPTO</th><th>DESCRIPCIÓN</th><th>IMPORTE</th></tr></thead><tbody>{document.items.map((item, index) => <tr key={item.id ?? `${item.conceptId}-${index}`}><td>{item.concept?.name ?? item.conceptId}</td><td>{item.description}</td><td>{Money.formatMoney(item.amount)}</td></tr>)}</tbody></table></div></section>}
      <section className="detail-section"><h3>Aplicaciones relacionadas</h3>{related.length === 0 ? <p className="muted">Este documento aún no tiene aplicaciones.</p> : related.map((application) => <p className="application-detail" key={application.id}>{application.debtDocumentId === document.id ? 'Deuda' : 'Crédito'} · {Money.formatMoney(application.appliedAmount)} · Aplicación {application.id.slice(0, 8)}</p>)}</section>
    </UI.Modal>
  )
}

type DocumentPayload = {
  phId: string
  propertyId: string
  documentType: Models.DocumentType
  documentNumber: string
  issueDate: string
  totalAmount: number
  status?: 'ACTIVE' | 'ANNULLED'
  items?: { conceptId: string; description: string; amount: number }[]
}

function DetailItem({ label, children }: { label: string; children: ReactNode }) {
  return <div className="detail-item"><span>{label}</span><div>{children}</div></div>
}

export { DocumentsPage }
