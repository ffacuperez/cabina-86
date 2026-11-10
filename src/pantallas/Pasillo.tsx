import { Link, useLocation, useParams } from 'react-router'
import { DiscoEnEstante } from '../componentes/DiscoEnEstante'
import { Lomo } from '../componentes/Lomo'
import { type Pasillo as PasilloDatos, useExhibidor } from '../datos/exhibidor'
import { type RondaActual, useMarco, useRondaActual } from '../datos/ronda'
import { dosCifras } from '../lib/texto'

const CON_BOTONERA = { encabezado: false, botonera: true }
/** Lomos por repisa: el más ancho mide 30 px, así que 8 entran hasta en 320 px */
const LOMOS_POR_REPISA = 8

/**
 * Figma 02f · Pasillo de Maxi — entero (T-11): todo lo que me pasó alguien en esta ronda.
 * Arriba, de frente y de a dos por estante, lo que sigue en mi exhibidor (pendientes y los últimos 6 calificados).
 * Abajo, bajo el rótulo ARCHIVO, los calificados más viejos guardados de lomo. Tocar una caja o un lomo abre el disco.
 * Se llega desde la tarjeta del archivo al fondo del pasillo (02e) o desde la ficha de La Ronda (HU-17).
 */
export default function Pasillo() {
  useMarco(CON_BOTONERA)
  const ronda = useRondaActual()
  const { de = '' } = useParams()
  const { estado, reintentar } = useExhibidor(ronda)
  const desdeLaRonda = (useLocation().state as { volver?: string } | null)?.volver === 'ronda'
  const volver = desdeLaRonda ? { a: `/ronda/${ronda.id}/ronda`, texto: '← RONDA' } : { a: `/ronda/${ronda.id}`, texto: '← EXHIBIDOR' }
  const integrante = ronda.otros.find((o) => o.id === de)
  const pasillo = estado.tipo === 'listo' ? estado.exhibidor.pasillos.find((p) => p.de.id === de) : undefined

  return (
    <div className="pasillo-entero">
      <header className="encabezado-ronda encabezado-ronda--propio">
        <Link className="mono-m encabezado-ronda__volver" to={volver.a}>{volver.texto}</Link>
        <p className="mono-s encabezado-ronda__nombre">{ronda.nombre.toUpperCase()}</p>
      </header>
      <h1 className="cartel-xl pasillo-entero__titulo">Pasillo<br />de {integrante?.nombre ?? '…'}</h1>

      {estado.tipo === 'cargando' && <p className="cargando">Cargando…</p>}
      {estado.tipo === 'error' && (
        <div className="detalle__aviso">
          <p role="alert" className="error">No pudimos traer el pasillo.</p>
          <button className="boton boton--contorno" type="button" onClick={reintentar}>Probar de nuevo</button>
        </div>
      )}
      {estado.tipo === 'listo' &&
        (pasillo ? (
          <Contenido pasillo={pasillo} ronda={ronda} />
        ) : (
          <p className="texto-m pasillo-entero__vacio">
            {integrante ? `${integrante.nombre} todavía no te pasó nada.` : 'Ese pasillo no está en esta ronda.'}
          </p>
        ))}
    </div>
  )
}

function Contenido({ pasillo: p, ronda }: { pasillo: PasilloDatos; ronda: RondaActual }) {
  const total = p.discos.length + p.archivados.length
  const debo = p.discos.filter((d) => d.puntaje === null).length
  const volver = { volver: 'pasillo', de: p.de.id }
  const estantes = deA(p.discos, 2)
  const repisas = deA(p.archivados, LOMOS_POR_REPISA)

  return (
    <>
      <p className="lcd pasillo-entero__total">
        {total} {total === 1 ? 'DISCO' : 'DISCOS'} · {debo > 0 ? `LE DEBÉS ${dosCifras(debo)}` : 'AL DÍA'}
      </p>

      <section className="pasillo-entero__estantes" aria-label={`En tu exhibidor, lo de ${p.de.nombre}`}>
        {estantes.map((fila, i) => (
          <ul key={i} className="estante-entero">
            {fila.map((d) => <DiscoEnEstante key={d.paseId} disco={d} rondaId={ronda.id} volver={volver} />)}
          </ul>
        ))}
      </section>

      {p.archivados.length > 0 && (
        <section className="pasillo-entero__archivo" aria-labelledby="pasillo-archivo">
          <div className="pasillo-entero__rotulo">
            <h2 id="pasillo-archivo" className="rotulo">
              Archivo <span className="lcd-s">{dosCifras(p.archivados.length)}</span>
            </h2>
            <p className="mono-s suave">YA NO ESTÁN EN TU EXHIBIDOR</p>
          </div>
          {repisas.map((lomos, i) => (
            <div key={i} className="repisa-lomos">
              {lomos.map((d) => (
                <Lomo
                  key={d.paseId}
                  paseId={d.paseId}
                  catalogo={d.catalogo}
                  titulo={d.titulo}
                  rondaId={ronda.id}
                  volver={volver}
                  etiqueta={`${d.catalogo}, ${[d.titulo, d.artista].filter(Boolean).join(', ')}. Calificado con ${d.puntaje}.`}
                />
              ))}
            </div>
          ))}
        </section>
      )}

      <p className="mono-s pasillo-entero__pista">
        {p.archivados.length > 0 ? 'TOCÁ UNA CAJA O UN LOMO PARA ABRIRLO' : 'TOCÁ UNA CAJA PARA ABRIRLA'}
      </p>
    </>
  )
}

/** [a, b, c, d, e] de a 2 → [[a, b], [c, d], [e]] */
function deA<T>(xs: T[], n: number) {
  const grupos: T[][] = []
  for (let i = 0; i < xs.length; i += n) grupos.push(xs.slice(i, i + n))
  return grupos
}
