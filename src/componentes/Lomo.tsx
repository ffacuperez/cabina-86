import type { CSSProperties } from 'react'
import { Link } from 'react-router'
import { colorDeLomo } from '../lib/lomos'

/**
 * Un disco guardado de lomo (Figma 07 y 02f): título arriba y catálogo abajo, color por número de catálogo.
 * Tocarlo abre el disco. Las medidas salen de --e (1px, o escalado con el estante).
 * `decorativo`: repite algo que ya está en la pantalla (el estante de Perfil), así que no entra en el tab.
 */
export function Lomo({ paseId, catalogo, titulo, rondaId, volver, etiqueta, decorativo = false }: {
  paseId: string
  catalogo: string
  titulo: string
  rondaId: string
  volver?: Record<string, string>
  /** Para lectores de pantalla, si no es decorativo */
  etiqueta?: string
  decorativo?: boolean
}) {
  const c = colorDeLomo(catalogo)
  return (
    <Link
      className="lomo"
      to={`/ronda/${rondaId}/disco/${paseId}`}
      state={volver}
      tabIndex={decorativo ? -1 : undefined}
      aria-label={decorativo ? undefined : etiqueta}
      style={{ '--lomo-fondo': c.fondo, '--lomo-tinta': c.tinta, '--lomo-ancho': c.ancho } as CSSProperties}
    >
      <span className="lomo__titulo" aria-hidden={decorativo ? undefined : true}>{titulo.toUpperCase()}</span>
      <span className="lomo__catalogo" aria-hidden={decorativo ? undefined : true}>{catalogo}</span>
    </Link>
  )
}
