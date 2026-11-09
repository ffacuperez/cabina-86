import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router'
import bordeDentado from '../assets/ticket/borde-dentado.svg'
import codigoDeBarras from '../assets/ticket/codigo-de-barras.svg'
import luz from '../assets/ticket/luz.svg'
import { textoDeReaccion, useDeuda } from '../datos/calificar'
import { type Detalle, useDetalle } from '../datos/detalle'
import { type RondaActual, useMarco, useRondaActual } from '../datos/ronda'
import { dosCifras, fechaDeCamara } from '../lib/texto'

const SIN_MARCO = { encabezado: false, botonera: false }
const CORTE = '- - - - - - - - - - - - - - - - - - -'

/**
 * Figma 04b · Imprimiendo (16:2033) y 04c · Ticket impreso (16:1952), HU-14.
 * Recién calificado, el ticket sale de la impresora (04b → 04c); si se vuelve a abrir, ya está afuera.
 * Pendientes: lo que dijo la ronda (HU-18) y "Editar puntaje" (HU-15).
 */
export default function Ticket() {
  useMarco(SIN_MARCO)
  const ronda = useRondaActual()
  const { pase = '' } = useParams()
  const { state, pathname } = useLocation()
  const navigate = useNavigate()
  // Sale de la impresora solo recién calificado; se borra del historial para que al recargar ya esté afuera
  const [imprimir] = useState(() => (state as { imprimir?: boolean } | null)?.imprimir === true)
  useEffect(() => {
    if (imprimir) navigate(pathname, { replace: true, state: null })
  }, [imprimir, navigate, pathname])
  const { estado, reintentar } = useDetalle(ronda, pase)
  const alDetalle = `/ronda/${ronda.id}/disco/${pase}`
  const alExhibidor = `/ronda/${ronda.id}`

  if (estado.tipo === 'no-esta') return <Navigate to={alExhibidor} replace />
  if (estado.tipo === 'listo' && !estado.detalle.mia) {
    return <Navigate to={estado.detalle.esMio ? alDetalle : `${alDetalle}/calificar`} replace />
  }

  return (
    <>
      {estado.tipo === 'listo' ? (
        <p className="mono-s ticket-pantalla__estado">{estado.detalle.catalogo} · CALIFICADO</p>
      ) : (
        <header className="encabezado-ronda encabezado-ronda--propio">
          <Link className="mono-m encabezado-ronda__volver" to={alDetalle}>← VOLVER</Link>
        </header>
      )}
      {estado.tipo === 'cargando' && <p className="cargando">Cargando…</p>}
      {estado.tipo === 'error' && (
        <div className="detalle__aviso">
          <p role="alert" className="error">No pudimos traer el ticket.</p>
          <button className="boton boton--contorno" type="button" onClick={reintentar}>Probar de nuevo</button>
        </div>
      )}
      {estado.tipo === 'listo' && (
        <ImpresoraYTicket ronda={ronda} detalle={estado.detalle} imprimir={imprimir} />
      )}

      <div className="ticket-pantalla__acciones">
        <Link className="boton boton--ancho" to={alExhibidor}>
          Volver al exhibidor <span className="flecha" aria-hidden="true">→</span>
        </Link>
      </div>
    </>
  )
}

function ImpresoraYTicket({ ronda, detalle: d, imprimir }: { ronda: RondaActual; detalle: Detalle; imprimir: boolean }) {
  const deuda = useDeuda(ronda.id, ronda.yo.id)
  const mia = d.mia!
  const numeroTema = mia.temaFavorito ? d.temas.findIndex((t) => t.titulo === mia.temaFavorito) + 1 : 0
  const reaccion = textoDeReaccion(mia.reaccion)

  return (
    <div className="ticket-pantalla">
      <div className="impresora" aria-hidden="true">
        <img className="impresora__luz" src={luz} alt="" width={20} height={20} />
        <span className="mono-s impresora__texto">IMPRIMIENDO</span>
        <span className="impresora__ranura" />
      </div>

      <div className="ticket-salida">
        <div className={`ticket${imprimir ? ' ticket--imprimiendo' : ''}`}>
          <article className="ticket__papel" aria-label="Tu ticket">
            <p className="cartel-m">Cabina 86</p>
            <p className="mono-s">
              DISQUERÍA DE LA RONDA
              <br />
              {ronda.nombre.toUpperCase()}
            </p>
            <p className="mono-s ticket__corte" aria-hidden="true">{CORTE}</p>
            <p className="mono-s ticket__fila">
              <span>{d.catalogo}</span>
              <b>{d.titulo.toUpperCase()}</b>
            </p>
            <p className="mono-s ticket__fila">
              <span>{d.artista.toUpperCase()}</span>
              {d.anio && <b>{d.anio}</b>}
            </p>
            <p className="mono-s ticket__corte" aria-hidden="true">{CORTE}</p>
            <p className="ticket__fila ticket__puntaje">
              <span className="mono-s">TU PUNTAJE</span>
              <b className="lcd-l">{dosCifras(mia.puntaje)}/10</b>
            </p>
            {mia.temaFavorito && (
              <p className="mono-s ticket__fila">
                <span>TEMA FAV</span>
                <b>{numeroTema > 0 ? `${dosCifras(numeroTema)} ` : ''}{mia.temaFavorito.toUpperCase()}</b>
              </p>
            )}
            {reaccion && (
              <p className="mono-s ticket__fila">
                <span>REACCIÓN</span>
                <b>{reaccion.toUpperCase()}</b>
              </p>
            )}
            {mia.comentario && <p className="mono-s">"{mia.comentario}"</p>}
            <p className="mono-s ticket__corte" aria-hidden="true">{CORTE}</p>
            {deuda !== null && (
              <p className="mono-s ticket__fila">
                <span>LE DEBÉS</span>
                <b>{dosCifras(deuda)} {deuda === 1 ? 'DISCO' : 'DISCOS'}</b>
              </p>
            )}
            <img className="ticket__barras" src={codigoDeBarras} alt="" width={234} height={34} />
            <p className="ticket__fecha">{fechaDeCamara(mia.creadaEn)}</p>
          </article>
          <img className="ticket__dentado" src={bordeDentado} alt="" width={266} height={8} />
        </div>
      </div>
    </div>
  )
}
