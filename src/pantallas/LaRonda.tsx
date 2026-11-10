import { useCallback, useState } from 'react'
import { Link } from 'react-router'
import { HojaInvitar } from '../componentes/HojaInvitar'
import { conComa } from '../datos/loQuePasaste'
import { useRondaActual } from '../datos/ronda'
import { type Ficha, useTablero } from '../datos/tablero'
import { dosCifras } from '../lib/texto'

/**
 * Figma 06 · La Ronda — pared de exhibidores (17:2077), HU-17.
 * Cuántos discos van y cuántos son, INVITAR (solo quien creó la ronda, #52) y una ficha por integrante:
 * PASÓ, ESCUCHÓ, PROM y DEBE (en naranja si debe algo). Solo esta ronda (RN-05).
 * Tocar una ficha abre ese pasillo entero (T-11); la tuya, Perfil.
 * Ranking, compatibilidad y el más polémico (abajo en el Figma) quedan para después del MVP.
 */
export default function LaRonda() {
  const ronda = useRondaActual()
  const { estado, reintentar } = useTablero(ronda)
  const [invitando, setInvitando] = useState(false)
  const cerrarHoja = useCallback(() => setInvitando(false), [])
  const amigos = 1 + ronda.otros.length

  return (
    <div className="la-ronda">
      <h1 className="cartel-xl la-ronda__titulo">La<br />ronda</h1>
      <div className="la-ronda__total">
        <p className="lcd">
          {estado.tipo === 'listo' ? estado.tablero.discos : '--'} {estado.tipo === 'listo' && estado.tablero.discos === 1 ? 'DISCO' : 'DISCOS'}
          {' · '}
          {amigos} {amigos === 1 ? 'AMIGO' : 'AMIGOS'}
        </p>
        {estado.tipo === 'listo' && estado.tablero.codigo !== null && (
          <button className="chip-accion" type="button" aria-label={`Invitar a ${ronda.nombre}`} onClick={() => setInvitando(true)}>
            INVITAR
          </button>
        )}
      </div>

      <section className="la-ronda__pared" aria-labelledby="la-ronda-pared" aria-busy={estado.tipo === 'cargando'}>
        <h2 id="la-ronda-pared" className="mono-s">PARED DE EXHIBIDORES</h2>
        {estado.tipo === 'cargando' && <p className="cargando">Cargando…</p>}
        {estado.tipo === 'error' && (
          <div className="detalle__aviso">
            <p role="alert" className="error">No pudimos traer el tablero.</p>
            <button className="boton boton--contorno" type="button" onClick={reintentar}>Probar de nuevo</button>
          </div>
        )}
        {estado.tipo === 'listo' && (
          <ul className="fichas">
            {estado.tablero.fichas.map((f) => <FichaIntegrante key={f.integrante.id} ficha={f} rondaId={ronda.id} />)}
          </ul>
        )}
      </section>

      {invitando && estado.tipo === 'listo' && estado.tablero.codigo !== null && (
        <HojaInvitar
          ronda={{ nombre: ronda.nombre, codigo: estado.tablero.codigo, sumados: ronda.otros.map((o) => o.nombre) }}
          onCerrar={cerrarHoja}
        />
      )}
    </div>
  )
}

/** Tocar una ficha abre ese pasillo entero (T-11, Figma 02f); la mía, lo que pasé (Perfil) */
function FichaIntegrante({ ficha: f, rondaId }: { ficha: Ficha; rondaId: string }) {
  const id = `ficha-${f.integrante.id}`
  const destino = f.esMia ? `/ronda/${rondaId}/perfil` : `/ronda/${rondaId}/pasillo/${f.integrante.id}`
  return (
    <li className="ficha" aria-labelledby={id}>
      <h3 id={id} className="ficha__rotulo">
        <Link className="rotulo ficha__abrir" to={destino} state={f.esMia ? undefined : { volver: 'ronda' }}>
          Pasillo de {f.integrante.nombre}
        </Link>
        <span className="lcd-s ficha__sigla" aria-hidden="true">{f.integrante.sigla}</span>
      </h3>
      <dl className="numeros-lcd">
        <div className="numero-lcd">
          <dt className="lcd-s">PASÓ</dt>
          <dd className="lcd-l">{dosCifras(f.paso)}</dd>
        </div>
        <div className="numero-lcd">
          <dt className="lcd-s">ESCUCHÓ</dt>
          <dd className="lcd-l">{dosCifras(f.escucho)}</dd>
        </div>
        <div className="numero-lcd">
          <dt className="lcd-s">PROM</dt>
          <dd className="lcd-l">{f.promedio === null ? '--' : conComa(f.promedio)}</dd>
        </div>
        <div className={`numero-lcd${f.debe > 0 ? ' numero-lcd--debe' : ''}`}>
          <dt className="lcd-s">DEBE</dt>
          <dd className="lcd-l">{dosCifras(f.debe)}</dd>
        </div>
      </dl>
      <p className="texto-s ficha__frase">{f.frase}</p>
    </li>
  )
}
