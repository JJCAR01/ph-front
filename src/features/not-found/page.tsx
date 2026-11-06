import { NavLink } from 'react-router-dom'


function NotFound() {
  return <div className="not-found"><span>404</span><h1>Página no encontrada</h1><p>La ruta solicitada no existe.</p><NavLink className="button button-primary" to="/">Volver al resumen</NavLink></div>
}

export { NotFound }
