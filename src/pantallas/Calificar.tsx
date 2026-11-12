import { useId, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router'
import { BarraInferior } from '../componentes/BarraInferior'
import { CajaCD } from '../componentes/CajaCD'
import { DisplayPuntaje } from '../componentes/DisplayPuntaje'
import { type CodigoReaccion, calificar, cambio, editarCalificacion, LARGO_COMENTARIO, moverPuntaje, REACCIONES } from '../datos/calificar'
import { type Detalle, useDetalle } from '../datos/detalle'
import { type RondaActual, useMarco, useRondaActual } from '../datos/ronda'
import { dosCifras } from '../lib/texto'

/** Al volver al disco, la caja ya está abierta (E-02) */
const YA_ABIERTO = { yaAbierto: true }

const SIN_MARCO = { encabezado: false, botonera: false }
/** Ya lo califiqué (clave primaria pase + usuario): el ticket ya existe */
const YA_CALIFICADO = '23505'

/**
 * Figma 04 · Calificar — Artaud (16:1830), HU-14: puntaje con − y + (obligatorio),
 * tema favorito, reacción y una línea para la ronda (opcionales). "Imprimir el ticket" guarda y
 * pasa al ticket (04b/04c). Si ya lo califiqué (HU-15, Figma 04e), se abre con lo mío cargado,
 * el botón dice "Reimprimir el ticket" y guardar edita (RN-02: los demás ven "editado").
 */
export default function Calificar() {
  useMarco(SIN_MARCO)
  const ronda = useRondaActual()
  const { pase = '' } = useParams()
  const { estado, reintentar } = useDetalle(ronda, pase)
  const alDetalle = `/ronda/${ronda.id}/disco/${pase}`

  if (estado.tipo === 'no-esta') return <Navigate to={`/ronda/${ronda.id}`} replace />
  if (estado.tipo === 'listo' && estado.detalle.esMio) return <Navigate to={alDetalle} replace />

  if (estado.tipo !== 'listo') {
    return (
      <>
        <header className="encabezado-ronda encabezado-ronda--propio">
          <Link className="mono-m encabezado-ronda__volver" to={alDetalle} state={YA_ABIERTO}>← VOLVER</Link>
        </header>
        {estado.tipo === 'cargando' && <p className="cargando">Cargando…</p>}
        {estado.tipo === 'error' && (
          <div className="detalle__aviso">
            <p role="alert" className="error">No pudimos abrir el disco.</p>
            <button className="boton boton--contorno" type="button" onClick={reintentar}>Probar de nuevo</button>
          </div>
        )}
      </>
    )
  }
  return <Formulario ronda={ronda} detalle={estado.detalle} alDetalle={alDetalle} />
}

function Formulario({ ronda, detalle: d, alDetalle }: { ronda: RondaActual; detalle: Detalle; alDetalle: string }) {
  const navigate = useNavigate()
  // HU-15 (Figma 04e): si ya lo califiqué, se abre con lo mío cargado y se reimprime
  const mia = d.mia
  const [puntaje, setPuntaje] = useState<number | null>(mia?.puntaje ?? null)
  const [tema, setTema] = useState<string | null>(mia?.temaFavorito ?? null)
  const [reaccion, setReaccion] = useState<CodigoReaccion | null>((mia?.reaccion as CodigoReaccion | null) ?? null)
  const [comentario, setComentario] = useState(mia?.comentario ?? '')
  const [imprimiendo, setImprimiendo] = useState(false)
  const [error, setError] = useState('')
  const ids = { temas: useId(), reaccion: useId(), comentario: useId() }

  async function imprimir() {
    if (puntaje === null || imprimiendo) return
    setError('')
    setImprimiendo(true)
    const datos = { puntaje, temaFavorito: tema, reaccion, comentario }
    try {
      if (!mia) await calificar(d.paseId, datos)
      else if (cambio(mia, datos)) await editarCalificacion(d.paseId, ronda.yo.id, datos)
    } catch (e) {
      if ((e as { code?: string }).code !== YA_CALIFICADO) {
        setImprimiendo(false)
        return setError('No pudimos guardar tu puntaje. Probá de nuevo.')
      }
    }
    navigate(`${alDetalle}/ticket`, { replace: true, state: { imprimir: true } })
  }

  return (
    <>
      <div className="calificar__cabeza">
        <header className="encabezado-ronda encabezado-ronda--propio">
          <Link className="mono-m encabezado-ronda__volver calificar__volver" to={alDetalle} state={YA_ABIERTO}>← {d.titulo.toUpperCase()}</Link>
        </header>
        <h1 className="cartel-l calificar__titulo">
          Bancalo o
          <br />
          bardealo
        </h1>
        <div className="calificar__caja" aria-hidden="true">
          <CajaCD tapa={d.tapa} titulo="" />
        </div>
      </div>

      <div className="calificar__columna">
        <DisplayPuntaje
          valor={puntaje}
          onBajar={() => setPuntaje((p) => moverPuntaje(p, -1))}
          onSubir={() => setPuntaje((p) => moverPuntaje(p, 1))}
        />

        {d.temas.length > 0 && (
          <section className="calificar__seccion" aria-labelledby={ids.temas}>
            <h2 id={ids.temas} className="mono-s rotulo-campo">TEMA FAVORITO</h2>
            <ol className="temas">
              {d.temas.map((t, i) => {
                const elegido = tema === t.titulo
                return (
                  <li key={`${i}-${t.titulo}`}>
                    <button
                      type="button"
                      className="tema"
                      aria-pressed={elegido}
                      onClick={() => setTema(elegido ? null : t.titulo)}
                    >
                      <span className="tema__numero" aria-hidden="true">{dosCifras(i + 1)}</span>
                      <span className="tema__titulo">{t.titulo}</span>
                      {elegido && <span className="tema__fav" aria-hidden="true">FAV</span>}
                    </button>
                  </li>
                )
              })}
            </ol>
          </section>
        )}

        <section className="calificar__seccion" aria-labelledby={ids.reaccion}>
          <h2 id={ids.reaccion} className="mono-s rotulo-campo">¿QUÉ TE PASÓ?</h2>
          <div className="calificar__reacciones">
            {REACCIONES.map((r) => (
              <button
                key={r.codigo}
                type="button"
                className="chip"
                aria-pressed={reaccion === r.codigo}
                onClick={() => setReaccion(reaccion === r.codigo ? null : r.codigo)}
              >
                {r.texto}
              </button>
            ))}
          </div>
        </section>

        <div className="calificar__campo">
          <label htmlFor={ids.comentario} className="mono-s rotulo-campo">UNA LÍNEA PARA LA RONDA</label>
          <textarea
            id={ids.comentario}
            className="campo-texto calificar__comentario"
            rows={2}
            maxLength={LARGO_COMENTARIO}
            value={comentario}
            onChange={(e) => setComentario(e.target.value.replace(/\n/g, ' '))}
          />
        </div>

        {error && <p role="alert" className="error">{error}</p>}
      </div>

      <BarraInferior>
        <button
          className="boton boton--ancho"
          type="button"
          disabled={puntaje === null || imprimiendo}
          aria-busy={imprimiendo}
          onClick={imprimir}
        >
          {mia ? 'Reimprimir el ticket' : 'Imprimir el ticket'} <span className="flecha" aria-hidden="true">→</span>
        </button>
      </BarraInferior>
    </>
  )
}
