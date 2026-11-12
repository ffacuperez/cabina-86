import { useId } from 'react'
import type { OtraRonda } from '../datos/otrasRondas'
import { diaYMes } from '../lib/texto'
import { Hoja } from './Hoja'

/**
 * Figma 05d · Hoja "¿A qué otra ronda?" (HU-10): con 3 rondas o más, "También a otra ronda" la abre.
 * Una ronda por vez, con tarjetita nueva. Las rondas donde ese disco ya se pasó van bloqueadas (RN-11).
 */
export function HojaOtraRonda({ titulo, rondas, onElegir, onCerrar }: {
  titulo: string
  rondas: OtraRonda[]
  onElegir: (r: OtraRonda) => void
  onCerrar: () => void
}) {
  const idTitulo = useId()

  return (
    <Hoja etiquetadaPor={idTitulo} onCerrar={onCerrar}>
      <h2 className="cartel-m hoja__titulo" id={idTitulo} tabIndex={-1}>¿A qué otra ronda?</h2>
      <p className="texto-s">{titulo} va con una tarjetita nueva. Después podés seguir con otra.</p>
      <ul className="otras-rondas">
        {rondas.map((r) => (
          <li key={r.id}>
            {r.yaPasado ? (
              <button className="otra-ronda otra-ronda--bloqueada" type="button" disabled>
                <span className="otra-ronda__datos">
                  <span className="otra-ronda__nombre">{r.nombre}</span>
                  <span className="mono-s">
                    {r.yaPasado.por_mi ? 'YA LO PASASTE VOS' : `YA LO PASÓ ${r.yaPasado.por.toUpperCase()}`} EL {diaYMes(r.yaPasado.el)}
                  </span>
                </span>
                <span className="otra-ronda__flecha" aria-hidden="true">—</span>
              </button>
            ) : (
              <button className="otra-ronda" type="button" onClick={() => onElegir(r)}>
                <span className="otra-ronda__datos">
                  <span className="otra-ronda__nombre">{r.nombre}</span>
                  <span className="mono-s">{r.integrantes.map((n) => n.toUpperCase()).join(' · ')}</span>
                </span>
                <span className="otra-ronda__flecha" aria-hidden="true">→</span>
              </button>
            )}
          </li>
        ))}
      </ul>
    </Hoja>
  )
}
