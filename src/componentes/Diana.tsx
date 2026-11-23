import type { Dardo } from '../datos/informe'

export type DardoEnDiana = Dardo & { x: number; y: number; color: 'uno' | 'dos' | 'tres' }

/**
 * C86/Diana (Figma, Componentes 225:3834) con sus C86/Dardo (225:3851): La puntería del informe (HU-21).
 * Anillos negro y acrílico, centro mostaza y magenta, filete mostaza, la mira y la punteada del promedio.
 * Cada dardo es un disco: más cerca del centro, más le gustó a quien lo escuchó comparado con su promedio.
 */
export function Diana({ dardos, apagada = false, etiqueta }: { dardos: DardoEnDiana[]; apagada?: boolean; etiqueta: string }) {
  return (
    <svg className={`diana${apagada ? ' diana--apagada' : ''}`} viewBox="0 0 240 240" role="img" aria-label={etiqueta}>
      <circle className="diana__oscuro" cx="120" cy="120" r="120" />
      <circle className="diana__claro" cx="120" cy="120" r="98" />
      <circle className="diana__oscuro" cx="120" cy="120" r="76" />
      <circle className="diana__claro" cx="120" cy="120" r="54" />
      <circle className="diana__mostaza" cx="120" cy="120" r="32" />
      <circle className="diana__centro" cx="120" cy="120" r="12" />
      <path className="diana__mira" d="M0 120H240M120 0V240" />
      <circle className="diana__promedio" cx="120" cy="120" r="60" />
      <circle className="diana__filete" cx="120" cy="120" r="119" />
      {dardos.map((d) => (
        <circle key={`${d.pase_id}-${d.a}`} className={`dardo dardo--${d.color}`} cx={d.x} cy={d.y} r="5">
          <title>{`${d.titulo}: ${d.puntaje}`}</title>
        </circle>
      ))}
    </svg>
  )
}
