import * as UI from '../../shared/ui'
import * as Helpers from '../../shared/helpers'
import * as Context from '../../shared/context'
import * as Api from '../../api'
import type * as Models from '../../types'
import * as Money from '../../money'
import { useState } from 'react'
import type { FormEvent } from 'react'

function ApplicationsPage() {
  const { data, loading, refresh, notify } = Context.useAppData()
  const [query, setQuery] = useState('')
  const [complexId, setComplexId] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const applications = data.applications.filter((application) => {
    const debt = data.documents.find((document) => document.id === application.debtDocumentId)
    const credit = data.documents.find((document) => document.id === application.creditDocumentId)
    return (!complexId || application.phId === complexId) && `${debt?.documentNumber ?? ''} ${credit?.documentNumber ?? ''}`.toLowerCase().includes(query.toLowerCase())
  })

  async function create(payload: { phId: string; debtDocumentId: string; creditDocumentId: string; appliedAmount: number }) {
    setError(null)
    try {
      await Api.api.createApplication(payload)
      setCreating(false)
      notify('Aplicación confirmada por el backend.')
      await refresh()
    } catch (error) {
      setError(error)
    }
  }

  return (
    <>
      <UI.PageHeading title="Aplicaciones" description="Cruces confirmados entre documentos de deuda y crédito." action={<button className="button button-primary" type="button" onClick={() => { setError(null); setCreating(true) }}><span aria-hidden="true">＋</span> Aplicar crédito</button>} />
      <div className="callout callout-info"><span aria-hidden="true">i</span><p>Las disponibilidades se estiman con las aplicaciones registradas. El backend valida de forma transaccional y su respuesta es la confirmación definitiva.</p></div>
      <div className="toolbar"><UI.SearchBox value={query} onChange={setQuery} placeholder="Buscar número de deuda o crédito" /><UI.ComplexFilter complexes={data.complexes} value={complexId} onChange={setComplexId} /><span className="result-count">{applications.length} resultados</span></div>
      <section className="panel table-panel">
        {loading ? <UI.Loading /> : applications.length === 0 ? <UI.EmptyState title={query || complexId ? 'Sin coincidencias' : 'Aún no hay aplicaciones'} description={query || complexId ? 'Prueba con otros filtros.' : 'Las aplicaciones confirmadas por la API aparecerán aquí.'} /> : (
          <div className="table-scroll"><table><thead><tr><th>DEUDA</th><th>CRÉDITO</th><th>PROPIEDAD</th><th>CONJUNTO</th><th>IMPORTE APLICADO</th></tr></thead><tbody>{applications.map((application) => {
            const debt = data.documents.find((document) => document.id === application.debtDocumentId)
            const credit = data.documents.find((document) => document.id === application.creditDocumentId)
            return <tr key={application.id}><td><strong>{debt?.documentNumber ?? application.debtDocumentId}</strong><small className="table-subtext">{debt ? Helpers.documentTypeName(debt.documentType) : 'Documento de deuda'}</small></td><td><strong>{credit?.documentNumber ?? application.creditDocumentId}</strong><small className="table-subtext">{credit ? Helpers.documentTypeName(credit.documentType) : 'Documento de crédito'}</small></td><td>{debt?.property?.name ?? Helpers.propertyName(data.properties, debt?.propertyId ?? '')}</td><td>{Helpers.complexName(data.complexes, application.phId)}</td><td className="money-cell">{Money.formatMoney(application.appliedAmount)}</td></tr>
          })}</tbody></table></div>
        )}
      </section>
      {creating && <ApplicationForm data={data} onClose={() => setCreating(false)} onSave={(payload) => void create(payload)} error={error} />}
    </>
  )
}

function ApplicationForm({ data, onClose, onSave, error }: { data: Models.AppData; onClose: () => void; onSave: (payload: { phId: string; debtDocumentId: string; creditDocumentId: string; appliedAmount: number }) => void; error: unknown }) {
  const [phId, setPhId] = useState(data.complexes[0]?.id ?? '')
  const [debtDocumentId, setDebtDocumentId] = useState('')
  const [creditDocumentId, setCreditDocumentId] = useState('')
  const [amount, setAmount] = useState('')
  const [validation, setValidation] = useState('')
  const active = data.documents.filter((document) => document.phId === phId && document.status === 'ACTIVE')
  const debts = active.filter((document) => document.documentType === 'F' || document.documentType === 'ND')
  const credits = active.filter((document) => document.documentType === 'RC' || document.documentType === 'NC')
  const debt = debts.find((document) => document.id === debtDocumentId)
  const credit = credits.find((document) => document.id === creditDocumentId)
  const debtAvailable = debt ? Helpers.availableCents(debt, 'debt', data.applications) : 0
  const creditAvailable = credit ? Helpers.availableCents(credit, 'credit', data.applications) : 0
  const maxAvailable = Math.min(debtAvailable, creditAvailable)
  const samePropertyCredits = credits.filter((document) => !debt || document.propertyId === debt.propertyId)

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const cents = Money.toCents(amount)
    if (!phId || !debt || !credit) return setValidation('Selecciona una deuda y un crédito activos del mismo conjunto.')
    if (debt.propertyId !== credit.propertyId) return setValidation('La deuda y el crédito deben pertenecer a la misma propiedad.')
    if (cents === null || cents < 1) return setValidation('Ingresa un importe positivo de hasta dos decimales.')
    if (cents > maxAvailable) return setValidation('El importe supera la deuda o el crédito disponible calculado.')
    setValidation('')
    onSave({ phId, debtDocumentId, creditDocumentId, appliedAmount: Money.centsToAmount(cents) })
  }

  return (
    <UI.Modal title="Aplicar crédito a una deuda" onClose={onClose} wide>
      <form className="form-grid" onSubmit={submit}>
        <div className="form-span"><UI.ComplexSelect complexes={data.complexes} value={phId} onChange={(value) => { setPhId(value); setDebtDocumentId(''); setCreditDocumentId('') }} /></div>
        <label className="field"><span>Documento de deuda <span className="required">*</span></span><select value={debtDocumentId} onChange={(event) => { setDebtDocumentId(event.target.value); setCreditDocumentId(''); setAmount('') }}><option value="">Selecciona F o ND</option>{debts.map((document) => <option value={document.id} key={document.id}>{document.documentNumber} · {Helpers.documentTypeName(document.documentType)} · Disponible {Money.formatMoney(Money.centsToAmount(Helpers.availableCents(document, 'debt', data.applications)))}</option>)}</select></label>
        <label className="field"><span>Documento de crédito <span className="required">*</span></span><select value={creditDocumentId} onChange={(event) => { setCreditDocumentId(event.target.value); setAmount('') }}><option value="">Selecciona RC o NC</option>{samePropertyCredits.map((document) => <option value={document.id} key={document.id}>{document.documentNumber} · {Helpers.documentTypeName(document.documentType)} · Disponible {Money.formatMoney(Money.centsToAmount(Helpers.availableCents(document, 'credit', data.applications)))}</option>)}</select></label>
        {debt && credit && <div className="availability-grid form-span"><Availability label="Deuda pendiente" cents={debtAvailable} /><Availability label="Crédito disponible" cents={creditAvailable} /></div>}
        <label className="field"><span>Importe a aplicar (COP) <span className="required">*</span></span><input inputMode="decimal" placeholder="0.00" value={amount} onChange={(event) => setAmount(event.target.value)} /><small>Máximo disponible: {Money.formatMoney(Money.centsToAmount(maxAvailable))}</small></label>
        {validation && <div className="form-span"><div className="alert alert-error" role="alert">{validation}</div></div>}
        {error !== null && <div className="form-span"><UI.ErrorMessage error={error} /></div>}
        <div className="form-actions form-span"><button className="button button-outline" type="button" onClick={onClose}>Cancelar</button><button className="button button-primary" type="submit">Confirmar aplicación</button></div>
      </form>
    </UI.Modal>
  )
}

function Availability({ label, cents }: { label: string; cents: number }) {
  return <div className="availability-card"><span>{label}</span><strong>{Money.formatMoney(Money.centsToAmount(cents))}</strong></div>
}

export { ApplicationsPage }
