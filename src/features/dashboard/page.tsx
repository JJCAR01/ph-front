import * as UI from '../../shared/ui'
import { NavLink } from 'react-router-dom'
import * as Context from '../../shared/context'
import * as Money from '../../money'

function Dashboard() {
  const { data, loading } = Context.useAppData()
  const activeDocs = data.documents.filter((document) => document.status === 'ACTIVE')
  const outstandingCents = activeDocs
    .filter((document) => document.documentType === 'F' || document.documentType === 'ND')
    .reduce((sum, document) => {
      const applied = data.applications
        .filter((application) => application.debtDocumentId === document.id)
        .reduce((amount, application) => amount + (Money.toCents(String(application.appliedAmount)) ?? 0), 0)
      return sum + Math.max(0, (Money.toCents(String(document.totalAmount)) ?? 0) - applied)
    }, 0)

  return (
    <>
      <UI.PageHeading title="Resumen" description="Una vista general de la operación de tus conjuntos." />
      {loading ? <UI.Loading /> : (
        <>
          <section className="welcome-card">
            <div>
              <span className="welcome-label">PANEL DE ADMINISTRACIÓN</span>
              <h2>Todo en orden, a primera vista.</h2>
              <p>Consulta documentos, propietarios y cuentas desde un mismo lugar.</p>
            </div>
            <div className="welcome-art" aria-hidden="true"><span>PH</span><i /><b /></div>
          </section>
          <div className="stats-grid">
            <UI.StatCard label="Conjuntos" value={data.complexes.length} detail="Registrados en el sistema" icon="⌂" />
            <UI.StatCard label="Propiedades" value={data.properties.length} detail="Unidades residenciales" icon="▧" />
            <UI.StatCard label="Propietarios" value={data.owners.length} detail="Personas registradas" icon="♙" />
            <UI.StatCard label="Documentos activos" value={activeDocs.length} detail="Documentos financieros" icon="▤" />
          </div>
          <div className="dashboard-grid">
            <section className="panel balance-panel">
              <div className="panel-heading">
                <div><span className="eyebrow">CARTERA</span><h2>Saldo pendiente estimado</h2></div>
                <span className="panel-icon">↗</span>
              </div>
              <strong className="balance-amount">{Money.formatMoney(Money.centsToAmount(outstandingCents))}</strong>
              <p>Calculado con documentos activos y aplicaciones confirmadas por la API.</p>
              <NavLink className="text-link" to="/applications">Ver aplicaciones <span aria-hidden="true">→</span></NavLink>
            </section>
            <section className="panel quick-links">
              <div className="panel-heading">
                <div><span className="eyebrow">ACCESOS DIRECTOS</span><h2>¿Qué necesitas hacer?</h2></div>
              </div>
              <UI.QuickLink to="/documents" icon="▤" title="Revisar documentos" description="Facturas, notas y recibos" />
              <UI.QuickLink to="/owners" icon="♙" title="Ver propietarios" description="Personas y propiedades vinculadas" />
              <UI.QuickLink to="/users" icon="♧" title="Administrar usuarios" description="Cuentas y permisos de acceso" />
            </section>
          </div>
          <div className="dashboard-note">
            <span aria-hidden="true">i</span>
            <p>Los inquilinos se administran como usuarios con rol <strong>TENANT</strong>. El backend aún no permite asociar usuarios a propiedades.</p>
          </div>
        </>
      )}
    </>
  )
}

export { Dashboard }
