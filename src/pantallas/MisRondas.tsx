import { useCallback, useState } from 'react'
import { Link } from 'react-router'
import { HojaInvitar } from '../componentes/HojaInvitar'
import type { RondaMia, RondaQueInvito } from '../datos/rondas'

const dosCifras = (n: number) => String(n).padStart(2, '0')

/**
 * Figma 09 · Mis rondas (inicio, fuera de toda ronda): a donde vuelve quien ya entró antes
 * y está en al menos una ronda (HU-01). Sin botonera (RN-08).
 * INVITAR abre la hoja con el link de esa ronda (Figma 09c, HU-04). Solo en las rondas que creaste (#52).
 * Tocar una ronda para entrar a su exhibidor es HU-05.
 */
export default function MisRondas({ rondas, deudaTotal }: { rondas: RondaMia[]; deudaTotal: number }) {
  const [invitando, setInvitando] = useState<RondaQueInvito | null>(null)
  const cerrarHoja = useCallback(() => setInvitando(null), [])
  // La tarjeta marino con filete mostaza: la última ronda en la que entraste
  const destacada = rondas.reduce((ultima, r) => (r.ultimaEntrada > ultima.ultimaEntrada ? r : ultima), rondas[0])

  return (
    <main className="pantalla mis-rondas">
      <h1 className="cartel-xl mis-rondas__titulo">Mis<br />rondas</h1>
      <p className="lcd mis-rondas__total">LE DEBÉS {dosCifras(deudaTotal)} EN TOTAL</p>

      <ul className="mis-rondas__lista">
        {rondas.map((r, i) => (
          <li key={r.id} className={`tarjeta-ronda${r.id === destacada.id ? ' tarjeta-ronda--destacada' : ''}`}>
            <p className="tarjeta-ronda__encabezado">
              <span className="tarjeta-ronda__luz" aria-hidden="true" />
              RONDA {i + 1}
            </p>
            <h2 className="cartel-m tarjeta-ronda__nombre">{r.nombre}</h2>
            <p className="mono-s tarjeta-ronda__integrantes">{r.integrantes.join(' · ').toUpperCase()}</p>
            <p className="tarjeta-ronda__deuda">LE DEBÉS {dosCifras(r.deuda)}</p>
            {r.codigo !== null && (
              <button
                className="chip-accion tarjeta-ronda__invitar"
                type="button"
                aria-label={`Invitar a ${r.nombre}`}
                onClick={() => setInvitando({ ...r, codigo: r.codigo! })}
              >
                INVITAR
              </button>
            )}
          </li>
        ))}
      </ul>

      <Link className="boton boton--contorno boton--ancho mis-rondas__armar" to="/armar">Armar otra ronda</Link>
      <p className="mono-s suave mis-rondas__link">¿TE PASARON UN LINK? ABRILO Y TE SUMA SOLO.</p>
      <p className="texto-s mis-rondas__ayuda">
        Tocá una ronda para entrar. Adentro, el exhibidor, Pasar, La Ronda y tu perfil son siempre de esa ronda.
      </p>

      {invitando && <HojaInvitar ronda={invitando} onCerrar={cerrarHoja} />}
    </main>
  )
}
