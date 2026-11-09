import { NavLink } from 'react-router'

/**
 * Figma C86/Teclas: la botonera de adentro de una ronda (RN-08: afuera, en Mis rondas, no hay).
 * Las teclas de secciones que todavía no existen se ven apagadas y no se tocan
 * (variante "faltan=…"). Cada HU prende la suya: Pasar (HU-07/08, ya está), Ronda (HU-17), Perfil (HU-16).
 */
const TECLAS = [
  { etiqueta: 'EXHIBIDOR', ruta: '', disponible: true },
  { etiqueta: 'PASAR', ruta: 'pasar', disponible: true },
  { etiqueta: 'RONDA', ruta: 'ronda', disponible: false },
  { etiqueta: 'PERFIL', ruta: 'perfil', disponible: false },
]

export function Botonera({ rondaId }: { rondaId: string }) {
  return (
    <nav className="botonera" aria-label="Secciones de la ronda">
      {TECLAS.map(({ etiqueta, ruta, disponible }) =>
        disponible ? (
          <NavLink
            key={etiqueta}
            to={`/ronda/${rondaId}${ruta ? `/${ruta}` : ''}`}
            end
            className={({ isActive }) => `tecla${isActive ? ' tecla--activa' : ''}`}
          >
            <span className="tecla__led" aria-hidden="true" />
            {etiqueta}
          </NavLink>
        ) : (
          <span key={etiqueta} className="tecla tecla--falta" aria-disabled="true">
            <span className="tecla__led" aria-hidden="true" />
            {etiqueta}
          </span>
        ),
      )}
    </nav>
  )
}
