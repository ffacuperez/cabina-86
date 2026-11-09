import auriculares from '../assets/auriculares.svg'

/**
 * C86/Cabina de escucha (Figma 14:1592): LCD con la pista de arranque y los auriculares colgados.
 * Siempre "DEL TEMA 01 AL FINAL": no hay forma de elegir un tema para empezar (HU-12).
 * Elegir Spotify o YouTube y "Ponete los auriculares" llegan con HU-13.
 */
export function CabinaDeEscucha() {
  return (
    <section className="cabina" aria-label="Cabina de escucha">
      <p className="cartel-s cabina__titulo">Cabina de escucha Nº&nbsp;2</p>
      <p className="lcd cabina__pista">DEL TEMA 01 AL FINAL</p>
      <div className="cabina__puesto">
        <img className="cabina__auriculares" src={auriculares} alt="" width={110} height={110} draggable={false} />
        <p className="texto-s cabina__texto">Escuchalo entero. Volvé y bancalo o bardealo.</p>
      </div>
    </section>
  )
}
