import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useParams } from 'react-router'
import { BarraInferior } from '../componentes/BarraInferior'
import { CabinaDeEscucha } from '../componentes/CabinaDeEscucha'
import { CajaCD } from '../componentes/CajaCD'
import { CD } from '../componentes/CD'
import { NotasDeLaRonda } from '../componentes/NotasDeLaRonda'
import { TarjetaRecomendado } from '../componentes/TarjetaRecomendado'
import { type Detalle, duracion, useDetalle } from '../datos/detalle'
import { useNotasDeLaRonda } from '../datos/notas'
import { type RondaActual, useMarco, useRondaActual } from '../datos/ronda'
import { haceCuanto } from '../lib/texto'
import type { CajaEnVuelo } from '../lib/volar'

const SIN_MARCO = { encabezado: false, botonera: false }

/**
 * Figma 03b · Disco — Artaud abierto (15:1869): lo que se ve al tocar una caja del exhibidor (HU-12).
 * La caja abierta con el CD afuera, la tarjetita de quien lo pasó, los datos del disco y la cabina de escucha.
 * Abajo, quiénes de la ronda ya lo calificaron, con la nota tapada hasta que lo califique (RN-01).
 * Trae su encabezado ("← EXHIBIDOR" y el catálogo) y no lleva botonera.
 * Figma 03c (126:1911), HU-18: después de calificar, o si lo pasé yo, las notas de la ronda en mini tickets.
 * Figma 03d (HU-15): si ya lo califiqué, mi nota primero y "Editar puntaje" abajo.
 * Figma 03a (15:1981), E-02: al abrirlo, la caja se abre y el CD sale girando (useSeAbre). Desde un estante,
 * antes vuela hasta acá (lib/volar): la caja se muestra apenas llega, con lo que trae el state, y el resto cuando carga.
 */
export default function DetalleDisco() {
  useMarco(SIN_MARCO)
  const ronda = useRondaActual()
  const { pase = '' } = useParams()
  const { estado, reintentar } = useDetalle(ronda, pase)
  const alExhibidor = `/ronda/${ronda.id}`
  // Desde Perfil (HU-16) se vuelve a Perfil; desde el pasillo entero (T-11), al pasillo; desde el estante, al exhibidor
  const desde = useLocation().state as { volver?: string; de?: string; vuela?: CajaEnVuelo } | null
  const seAbre = useSeAbre()
  // Vino volando desde un estante: la caja ya tiene que estar acá para que el vuelo aterrice
  const vuela = seAbre ? desde?.vuela : undefined
  const volver =
    desde?.volver === 'perfil'
      ? { a: `/ronda/${ronda.id}/perfil`, texto: '← PERFIL' }
      : desde?.volver === 'pasillo' && desde.de
        ? { a: `/ronda/${ronda.id}/pasillo/${desde.de}`, texto: '← PASILLO' }
        : { a: alExhibidor, texto: '← EXHIBIDOR' }

  if (estado.tipo === 'no-esta') return <Navigate to={alExhibidor} replace />

  const d = estado.tipo === 'listo' ? estado.detalle : null
  const caja = d ? { tapa: d.tapa, titulo: d.titulo } : estado.tipo === 'cargando' ? vuela : undefined
  const catalogo = d?.catalogo ?? (estado.tipo === 'cargando' ? vuela?.catalogo : undefined)

  return (
    <>
      <header className="encabezado-ronda encabezado-ronda--propio">
        <Link className="mono-m encabezado-ronda__volver" to={volver.a}>{volver.texto}</Link>
        {catalogo && <p className="mono-m">{catalogo}</p>}
      </header>
      {estado.tipo === 'cargando' && !vuela && <p className="cargando">Cargando…</p>}
      {estado.tipo === 'error' && (
        <div className="detalle__aviso">
          <p role="alert" className="error">No pudimos abrir el disco.</p>
          <button className="boton boton--contorno" type="button" onClick={reintentar}>Probar de nuevo</button>
        </div>
      )}
      {caja && (
        <article
          className={`detalle${seAbre ? ' detalle--se-abre' : ''}${vuela ? ' detalle--vuela' : ''}`}
          aria-labelledby="detalle-titulo"
          aria-busy={!d}
        >
          <div className="detalle__vitrina" aria-hidden="true">
            <CD className="detalle__cd" tapa={caja.tapa} titulo={caja.titulo} />
            <CajaCD tapa={caja.tapa} titulo="" />
          </div>
          {d && <Disco ronda={ronda} detalle={d} />}
        </article>
      )}
      {d && !d.esMio && (
        <BarraInferior>
          {d.mia ? (
            <Link className="boton boton--contorno" to="calificar">Editar puntaje</Link>
          ) : (
            <Link className="boton boton--mostaza" to="calificar">
              Bancalo o bardealo <span className="flecha" aria-hidden="true">→</span>
            </Link>
          )}
        </BarraInferior>
      )}
    </>
  )
}

/** Entradas del historial donde la caja ya se abrió: al volver atrás (o desde Calificar) no se repite */
const yaAbiertas = new Set<string>()

/**
 * E-02: la caja se abre cuando llegás al disco (desde un estante, Perfil, el pasillo o un link).
 * No se repite al volver con "atrás" a la misma entrada ni desde Calificar o el ticket (state yaAbierto).
 */
function useSeAbre() {
  const { key, state } = useLocation()
  const [seAbre] = useState(() => !(state as { yaAbierto?: boolean } | null)?.yaAbierto && !yaAbiertas.has(key))
  useEffect(() => {
    yaAbiertas.add(key)
  }, [key])
  return seAbre
}

/** Lo de abajo de la caja: tarjetita, datos, cabina y lo que dijo la ronda */
function Disco({ ronda, detalle: d }: { ronda: RondaActual; detalle: Detalle }) {
  const temas = duracion(d.cantidadTemas, d.duracionSeg)
  const lePuedoVerLaNota = d.esMio || d.miPuntaje !== null
  // HU-18: después de calificar (o si lo pasé yo), las notas de los demás a la vista
  const { notas, error: sinNotas } = useNotasDeLaRonda(ronda, d)
  // HU-15 (Figma 03d): la mía primero, como "VOS". Se muestran juntas cuando llegan las de los demás.
  const notasConLaMia = notas === null && !sinNotas ? [] : [
    ...(d.mia
      ? [{ de: { ...ronda.yo, nombre: 'Vos' }, nota: { puntaje: d.mia.puntaje, temaFavorito: d.mia.temaFavorito, reaccion: d.mia.reaccion, comentario: d.mia.comentario, editadaEn: null } }]
      : []),
    ...(notas ?? []),
  ]
  return (
    <>
      <div className="detalle__fila">
        <TarjetaRecomendado por={d.de.nombre} nota={d.tarjetita} className="tarjeta-recomendado--detalle" />
        <div className="detalle__info">
          <h1 id="detalle-titulo" className="cartel-m detalle__titulo">{d.titulo}</h1>
          <p className="texto-s">{[d.artista, d.anio].filter(Boolean).join(' · ')}</p>
          {temas && <p className="lcd-chip">{temas}</p>}
          <p className="mono-s detalle__quien">
            {d.esMio ? 'LO PASASTE VOS' : `TE LO PASÓ ${d.de.nombre.toUpperCase()}`}
            <br />
            {haceCuanto(d.creadoEn)}
          </p>
        </div>
      </div>

      <CabinaDeEscucha links={d.links} />

      {!lePuedoVerLaNota && d.calificaron.length > 0 && (
        <section className="detalle__ronda" aria-labelledby="detalle-ronda">
          <h2 id="detalle-ronda" className="mono-s">LO QUE DIJO LA RONDA</h2>
          <ul className="detalle__notas">
            {d.calificaron.map((i) => (
              <li key={i.id} className="detalle__nota">
                <span className="lcd" aria-label={`${i.nombre} ya lo calificó`}>
                  {i.nombre.toUpperCase()} · ▒▒/10
                </span>
                <span className="texto-s detalle__tapada">Calificá para ver su nota.</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {notasConLaMia.length > 0 && (
        <section className="detalle__ronda" aria-labelledby="detalle-ronda">
          <h2 id="detalle-ronda" className="mono-s">LO QUE DIJO LA RONDA</h2>
          <NotasDeLaRonda notas={notasConLaMia} temas={d.temas} />
        </section>
      )}
    </>
  )
}
