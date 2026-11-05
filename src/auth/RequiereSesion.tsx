import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from './AuthProvider'

/** Deja pasar solo con sesión iniciada; si no, manda a /entrar. */
export function RequiereSesion() {
  const { session } = useAuth()
  const location = useLocation()

  if (session === undefined) return <p className="cargando">Cargando…</p>
  if (!session) return <Navigate to="/entrar" replace state={{ desde: location.pathname }} />
  return <Outlet />
}
