import { useId } from 'react'
import { formasDe, MARGEN, type Tapa, tapaCabina } from '../datos/tapaCabina'

/**
 * C86/Tapa (Figma 13:1353), la edición Cabina de un disco (#125): la tapa que dibuja la app para lo que sale
 * de la app (las tarjetas para compartir), porque las de Deezer no se pueden redistribuir. Un SVG de 200 × 200
 * con las formas del Figma; el tamaño lo da quien la usa (width: 100%). Qué dibujo, qué colores y cómo va
 * el texto se decide en datos/tapaCabina.ts.
 */
export function TapaCabina({
  disco,
  className = '',
}: {
  disco: { deezerId: number | string; titulo: string; artista: string; anio: number | null }
  className?: string
}) {
  return <TapaDibujada tapa={tapaCabina(disco)} etiqueta={`${disco.titulo}, de ${disco.artista}`} className={className} />
}

/** La tapa ya decidida (dibujo, colores y texto): para mostrar una combinación puntual */
export function TapaDibujada({ tapa, etiqueta, className = '' }: { tapa: Tapa; etiqueta: string; className?: string }) {
  const recorte = useId()
  return (
    <svg className={`tapa-cabina ${className}`} viewBox="0 0 200 200" role="img" aria-label={etiqueta}>
      <clipPath id={recorte}>
        <rect width="200" height="200" />
      </clipPath>
      <g clipPath={`url(#${recorte})`}>
        <rect width="200" height="200" fill={tapa.paleta.fondo} />
        <Formas tapa={tapa} />
        <TextoTapa tapa={tapa} />
      </g>
    </svg>
  )
}

function TextoTapa({ tapa }: { tapa: Tapa }) {
  const { texto, paleta } = tapa
  return (
    <>
      <text
        fill={paleta.titulo}
        fontFamily="'Zalando Sans Expanded', 'Arial Black', sans-serif"
        fontSize={texto.tamano}
        fontStyle="italic"
        fontWeight={900}
        letterSpacing={texto.tamano === 14 ? 0.3 : 0}
      >
        {texto.lineas.map((l) => (
          <tspan key={l.y} x={MARGEN} y={l.y}>
            {l.texto}
          </tspan>
        ))}
      </text>
      <text
        x={MARGEN}
        y={texto.artista.y}
        fill={paleta.artista}
        fontFamily="'IBM Plex Mono', ui-monospace, monospace"
        fontSize={11}
        fontWeight={500}
        letterSpacing={0.8}
      >
        {texto.artista.texto}
      </text>
    </>
  )
}

/** Las formas de cada dibujo, exportadas del Figma (datos/tapaCabina.ts, formasDe) */
function Formas({ tapa }: { tapa: Tapa }) {
  return (
    <>
      {formasDe(tapa).map((f, i) =>
        f.tipo === 'circulo' ? (
          <circle key={i} cx={f.cx} cy={f.cy} r={f.r} fill={f.color} />
        ) : f.tipo === 'rect' ? (
          <rect
            key={i}
            x={f.x}
            y={f.y}
            width={f.w}
            height={f.h}
            fill={f.color}
            transform={f.giro ? `rotate(${f.giro} ${f.x} ${f.y})` : undefined}
          />
        ) : (
          <path key={i} d={f.d} fill={f.color} />
        ),
      )}
    </>
  )
}
