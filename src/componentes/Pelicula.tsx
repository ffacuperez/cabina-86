import { useLocation } from 'react-router'

/**
 * E-01 · La foto de rollo de todo el Figma: el grano de película sobre toda la pantalla
 * (el efecto Noise de cada frame) y la luz de rollo arriba a la derecha (C86/Luz de rollo, 14:1673).
 * Cada pantalla es una foto del rollo: al cambiar de pantalla la luz se vela un instante, como al
 * avanzar la película. Con "reducir movimiento" no hay destello.
 * En el iPhone instalado la app llega hasta arriba (detrás de la hora): la viñeta deja leer la hora en blanco.
 */
export function Pelicula() {
  const { pathname } = useLocation()
  return (
    <>
      <div className="luz-rollo" aria-hidden="true">
        <span key={pathname} className="luz-rollo__destello" />
      </div>
      <div className="vineta" aria-hidden="true" />
      <div className="grano" aria-hidden="true" />
    </>
  )
}
