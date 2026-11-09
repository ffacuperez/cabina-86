import { useId } from 'react'
import auriculares from '../assets/auriculares.svg'
import { type Plataforma, usePlataforma } from '../datos/plataforma'

const PLATAFORMAS: { id: Plataforma; nombre: string }[] = [
  { id: 'spotify', nombre: 'Spotify' },
  { id: 'youtube', nombre: 'YouTube' },
]

/**
 * C86/Cabina de escucha (Figma 14:1592): LCD con la pista de arranque y los auriculares colgados.
 * Siempre "DEL TEMA 01 AL FINAL": no hay forma de elegir un tema para empezar (HU-12).
 * Se elige Spotify o YouTube (la app se acuerda de la última) y "Ponete los auriculares" abre
 * la búsqueda del álbum en esa plataforma (HU-13, RN-10).
 */
export function CabinaDeEscucha({ links }: { links: Record<Plataforma, string> }) {
  const [plataforma, elegir] = usePlataforma()
  const rotulo = useId()
  return (
    <section className="cabina" aria-label="Cabina de escucha">
      <p className="cartel-s cabina__titulo">Cabina de escucha Nº&nbsp;2</p>
      <p className="lcd cabina__pista">DEL TEMA 01 AL FINAL</p>
      <div className="cabina__puesto">
        <img className="cabina__auriculares" src={auriculares} alt="" width={110} height={110} draggable={false} />
        <div className="cabina__controles">
          <p className="mono-s cabina__rotulo" id={rotulo}>SE ABRE EN</p>
          <div className="cabina__plataformas" role="group" aria-labelledby={rotulo}>
            {PLATAFORMAS.map((p) => (
              <button
                key={p.id}
                type="button"
                className="chip cabina__chip"
                aria-pressed={plataforma === p.id}
                onClick={() => elegir(p.id)}
              >
                {p.nombre}
              </button>
            ))}
          </div>
          <p className="texto-s cabina__texto">Escuchalo entero. Volvé y bancalo o bardealo.</p>
        </div>
      </div>
      <a className="boton boton--ancho cabina__abrir" href={links[plataforma]} target="_blank" rel="noopener noreferrer">
        Ponete los auriculares <span className="flecha" aria-hidden="true">→</span>
      </a>
      <p className="mono-s cabina__aviso">SI NO APARECE, PROBALO EN LA OTRA.</p>
    </section>
  )
}
