import { Link, useNavigate } from 'react-router'
import type { DiscoEnEstante as Disco } from '../datos/exhibidor'
import { dosCifras } from '../lib/texto'
import { abrirVolando, type CajaEnVuelo } from '../lib/volar'
import { CajaCD } from './CajaCD'
import { Sticker } from './Sticker'

/**
 * Un disco parado en un estante (Figma 02 y 02f): la caja, título y artista abajo como etiqueta de batea,
 * y el sticker PENDIENTE o el talón con mi puntaje (02c). Tocarlo abre el disco (HU-12).
 * `volver` viaja al detalle para que sepa a dónde volver.
 * E-02: al tocarla, la caja vuela hasta arriba del detalle y ahí se abre (lib/volar).
 */
export function DiscoEnEstante({ disco, rondaId, volver }: { disco: Disco; rondaId: string; volver?: Record<string, string> }) {
  const datos = [disco.titulo, disco.artista, disco.anio].filter(Boolean).join(', ')
  const estado = disco.puntaje === null ? 'Pendiente' : `Calificado con ${disco.puntaje}`
  const navigate = useNavigate()
  const destino = `/ronda/${rondaId}/disco/${disco.paseId}`
  const vuela: CajaEnVuelo = { tapa: disco.tapa, titulo: disco.titulo, catalogo: disco.catalogo }
  return (
    <li className="disco-estante">
      <Link
        className="disco-estante__abrir"
        to={destino}
        state={volver}
        aria-label={`${datos}. ${estado}.`}
        onClick={(e) => abrirVolando(e, () => navigate(destino, { state: { ...volver, vuela } }))}
      >
        <CajaCD tapa={disco.tapa} titulo="" />
        {/* Las tapas reales muchas veces no traen texto: título y artista abajo, como etiqueta de batea */}
        <span className="disco-estante__titulo" aria-hidden="true">{disco.titulo}</span>
        <span className="mono-s disco-estante__artista" aria-hidden="true">{disco.artista.toUpperCase()}</span>
      </Link>
      {disco.puntaje === null ? (
        <Sticker texto={'PEN-\nDIENTE'} className="disco-estante__sticker" />
      ) : (
        <span className="disco-estante__talon" data-pase={disco.paseId} aria-hidden="true">{dosCifras(disco.puntaje)}/10</span>
      )}
    </li>
  )
}
