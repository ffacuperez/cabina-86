import { Link, Navigate, useParams } from 'react-router'
import { CabinaDeEscucha } from '../componentes/CabinaDeEscucha'
import { CajaCD } from '../componentes/CajaCD'
import { CD } from '../componentes/CD'
import { TarjetaRecomendado } from '../componentes/TarjetaRecomendado'
import { type Detalle, duracion, useDetalle } from '../datos/detalle'
import { useMarco, useRondaActual } from '../datos/ronda'
import { haceCuanto } from '../lib/texto'

const SIN_MARCO = { encabezado: false, botonera: false }

/**
 * Figma 03b · Disco — Artaud abierto (15:1869): lo que se ve al tocar una caja del exhibidor (HU-12).
 * La caja abierta con el CD afuera, la tarjetita de quien lo pasó, los datos del disco y la cabina de escucha.
 * Abajo, quiénes de la ronda ya lo calificaron, con la nota tapada hasta que lo califique (RN-01).
 * Trae su encabezado ("← EXHIBIDOR" y el catálogo) y no lleva botonera.
 * Pendientes: la caja que se abre y el CD que gira (E-02), luz de rollo (E-01),
 * "Bancalo o bardealo" (HU-14) y las notas a la vista después de calificar (HU-18).
 */
export default function DetalleDisco() {
  useMarco(SIN_MARCO)
  const ronda = useRondaActual()
  const { pase = '' } = useParams()
  const { estado, reintentar } = useDetalle(ronda, pase)
  const alExhibidor = `/ronda/${ronda.id}`

  if (estado.tipo === 'no-esta') return <Navigate to={alExhibidor} replace />

  return (
    <>
      <header className="encabezado-ronda encabezado-ronda--propio">
        <Link className="mono-m encabezado-ronda__volver" to={alExhibidor}>← EXHIBIDOR</Link>
        {estado.tipo === 'listo' && <p className="mono-m">{estado.detalle.catalogo}</p>}
      </header>
      {estado.tipo === 'cargando' && <p className="cargando">Cargando…</p>}
      {estado.tipo === 'error' && (
        <div className="detalle__aviso">
          <p role="alert" className="error">No pudimos abrir el disco.</p>
          <button className="boton boton--contorno" type="button" onClick={reintentar}>Probar de nuevo</button>
        </div>
      )}
      {estado.tipo === 'listo' && <Disco detalle={estado.detalle} />}
    </>
  )
}

function Disco({ detalle: d }: { detalle: Detalle }) {
  const temas = duracion(d.cantidadTemas, d.duracionSeg)
  const lePuedoVerLaNota = d.esMio || d.miPuntaje !== null
  return (
    <article className="detalle" aria-labelledby="detalle-titulo">
      <div className="detalle__vitrina" aria-hidden="true">
        <CD className="detalle__cd" tapa={d.tapa} titulo={d.titulo} />
        <CajaCD tapa={d.tapa} titulo="" />
      </div>

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
    </article>
  )
}
