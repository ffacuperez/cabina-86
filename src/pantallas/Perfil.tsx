import { useEffect, useRef } from 'react'
import { Link } from 'react-router'
import { CajaCD } from '../componentes/CajaCD'
import { Sticker } from '../componentes/Sticker'
import { conComa, enumerar, type Pasado, useLoQuePasaste } from '../datos/loQuePasaste'
import { useRondaActual } from '../datos/ronda'
import { dosCifras } from '../lib/texto'

/**
 * Figma 07 · Perfil — lo que pasaste a esta ronda (17:2366), HU-16.
 * Tu nombre, tres números de esta ronda y la lista de lo que le pasaste, del más reciente al más viejo.
 * Tocar un disco abre su detalle, con lo que dijo la ronda (HU-18).
 * Arriba de la lista, el estante: un lomo por disco y la caja del último, torcida, con el sticker NUEVO.
 */
export default function Perfil() {
  const ronda = useRondaActual()
  const { estado, reintentar } = useLoQuePasaste(ronda)

  return (
    <div className="perfil">
      <h1 className="cartel-xl perfil__nombre">{ronda.yo.nombre}</h1>

      {estado.tipo === 'cargando' && <p className="cargando">Cargando…</p>}
      {estado.tipo === 'error' && (
        <div className="detalle__aviso">
          <p role="alert" className="error">No pudimos traer lo que pasaste.</p>
          <button className="boton boton--contorno" type="button" onClick={reintentar}>Probar de nuevo</button>
        </div>
      )}

      {estado.tipo === 'listo' && (
        <>
          <dl className="perfil__numeros">
            <div className="perfil__numero">
              <dt className="lcd-s">PASASTE</dt>
              <dd className="lcd-l">{dosCifras(estado.perfil.pasados.length)}</dd>
            </div>
            <div className="perfil__numero">
              <dt className="lcd-s">ESCUCHASTE</dt>
              <dd className="lcd-l">{dosCifras(estado.perfil.escuchaste)}</dd>
            </div>
            <div className="perfil__numero">
              <dt className="lcd-s">TE PONEN</dt>
              <dd className="lcd-l">{estado.perfil.tePonen === null ? '--' : conComa(estado.perfil.tePonen)}</dd>
            </div>
          </dl>

          <section className="perfil__pasados" aria-labelledby="perfil-pasados">
            <h2 id="perfil-pasados" className="cartel-m">Lo que pasaste acá</h2>
            <p className="texto-s">Solo lo que le pasaste a {ronda.nombre}. Cada ronda tiene su estante.</p>

            {estado.perfil.pasados.length === 0 ? (
              <div className="perfil__vacio">
                <p className="texto-m">Todavía no pasaste nada acá.</p>
                <Link className="boton boton--contorno" to={`/ronda/${ronda.id}/pasar`}>
                  Pasar un disco <span className="flecha" aria-hidden="true">→</span>
                </Link>
              </div>
            ) : (
              <>
              <Estante pasados={estado.perfil.pasados} rondaId={ronda.id} />
              <ul className="filas-pasados">
                {estado.perfil.pasados.map((p) => (
                  <FilaPasado key={p.paseId} pasado={p} rondaId={ronda.id} />
                ))}
              </ul>
              </>
            )}
          </section>
        </>
      )}
    </div>
  )
}

function FilaPasado({ pasado: p, rondaId }: { pasado: Pasado; rondaId: string }) {
  const d = new Date(p.creadoEn)
  const fecha = `${dosCifras(d.getDate())}/${dosCifras(d.getMonth() + 1)}`
  const total = p.escucharon + p.faltan.length
  const nombres = p.faltan.map((i) => i.nombre.toUpperCase())
  const estado =
    p.faltan.length > 0
      ? `${p.faltan.length === 1 ? 'FALTA' : 'FALTAN'} ${enumerar(nombres)}`
      : p.escucharon > 0
        ? 'LO ESCUCHARON TODOS'
        : 'NADIE LO DEBE TODAVÍA'

  return (
    <li>
      <Link className="fila-pasado" to={`/ronda/${rondaId}/disco/${p.paseId}`} state={{ volver: 'perfil' }}>
        <span className="fila-pasado__catalogo">{p.catalogo}</span>
        <span className="fila-pasado__datos">
          <span className="fila-pasado__titulo">{p.titulo}</span>
          <span className="mono-s fila-pasado__estado">
            PASADO EL {fecha} · {estado}
          </span>
        </span>
        {p.faltan.length > 0 ? (
          <span className="fila-pasado__marcador fila-pasado__marcador--falta" aria-label={`${p.escucharon} de ${total} lo escucharon`}>
            {p.escucharon}/{total}
          </span>
        ) : (
          p.promedio !== null && (
            <span className="fila-pasado__marcador" aria-label={`Promedio ${conComa(p.promedio)}`}>
              {conComa(p.promedio)}
            </span>
          )
        )}
      </Link>
    </li>
  )
}

/** Colores de los lomos del Figma (07), en orden: fondo y tinta, y ancho sobre 342 */
const LOMOS = [
  { fondo: 'var(--negro-2)', tinta: 'var(--mostaza)', ancho: 28 },
  { fondo: 'var(--acrilico-claro)', tinta: 'var(--negro)', ancho: 24 },
  { fondo: 'var(--naranja)', tinta: 'var(--negro)', ancho: 26 },
  { fondo: 'var(--magenta)', tinta: 'var(--acrilico-claro)', ancho: 30 },
  { fondo: 'var(--acrilico-oscuro)', tinta: 'var(--negro)', ancho: 28 },
]

/**
 * Figma 07, "Estante": un lomo por disco (del más viejo al más nuevo; si no entran, se desliza y arranca
 * en el más nuevo) y la caja del último pasado, torcida, con el sticker NUEVO. Tocar uno abre su disco.
 * Repite lo que ya dice la lista de abajo, así que para lectores de pantalla va oculto.
 */
function Estante({ pasados, rondaId }: { pasados: Pasado[]; rondaId: string }) {
  const lomos = useRef<HTMLDivElement>(null)
  const viejosPrimero = [...pasados].reverse()
  const ultimo = pasados[0]
  useEffect(() => {
    const l = lomos.current
    if (l) l.scrollLeft = l.scrollWidth
  }, [pasados])

  return (
    <div className="estante-perfil" aria-hidden="true">
      <div className="estante-perfil__lomos" ref={lomos}>
        {viejosPrimero.map((p) => {
          const n = Number(p.catalogo.split('-').pop()) || 1
          const c = LOMOS[(n - 1) % LOMOS.length]
          return (
            <Link
              key={p.paseId}
              className="lomo"
              to={`/ronda/${rondaId}/disco/${p.paseId}`}
              state={{ volver: 'perfil' }}
              tabIndex={-1}
              style={{ '--lomo-fondo': c.fondo, '--lomo-tinta': c.tinta, '--lomo-ancho': c.ancho } as React.CSSProperties}
            >
              <span className="lomo__titulo">{p.titulo.toUpperCase()}</span>
              <span className="lomo__catalogo">{p.catalogo}</span>
            </Link>
          )
        })}
      </div>
      <Link className="estante-perfil__ultimo" to={`/ronda/${rondaId}/disco/${ultimo.paseId}`} state={{ volver: 'perfil' }} tabIndex={-1}>
        <CajaCD tapa={ultimo.tapa} titulo={ultimo.titulo} />
      </Link>
      <Sticker texto={'NUE-\nVO'} className="estante-perfil__nuevo" />
      <span className="estante-perfil__repisa" />
    </div>
  )
}
