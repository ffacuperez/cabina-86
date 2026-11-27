import { useId } from 'react'
import { MARGEN, type Tapa, tapaCabina } from '../datos/tapaCabina'

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

/** Las formas de cada dibujo, exportadas del Figma */
function Formas({ tapa }: { tapa: Tapa }) {
  const f = tapa.paleta.formas
  switch (tapa.dibujo) {
    case 'ART':
      return (
        <>
          <circle cx="186" cy="186" r="90" fill={f[0]} />
          <path d="M171 18L209.971 76.5H132.029L171 18Z" fill={f[1]} />
          {[96, 105, 114, 123, 132].map((y) => (
            <rect key={y} x="18" y={y} width="70" height="3" fill={f[2]} />
          ))}
        </>
      )
    case 'BOC':
      return (
        <>
          <circle cx="100" cy="200" r="130" fill={f[0]} />
          <circle cx="100" cy="200" r="100" fill={tapa.paleta.fondo} />
          <circle cx="100" cy="200" r="70" fill={f[0]} />
          <circle cx="100" cy="200" r="40" fill={tapa.paleta.fondo} />
          <rect width="200" height="8" fill={f[1]} />
        </>
      )
    case 'CLI':
      return (
        <>
          {[-6, 28, 62, 96, 130, 164].map((x) => (
            <rect key={x} x={x} y="120" width="16" height="160" transform={`rotate(35 ${x} 120)`} fill={f[0]} />
          ))}
          {[148, 164, 180].flatMap((y) => [156, 172, 188].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="4" fill={f[1]} />))}
        </>
      )
    case 'DIN':
      return (
        <>
          <path
            d="M133 60L142.471 92.134L171.891 76.1091L155.866 105.529L188 115L155.866 124.471L171.891 153.891L142.471 137.866L133 170L123.529 137.866L94.1091 153.891L110.134 124.471L78 115L110.134 105.529L94.1091 76.1091L123.529 92.134L133 60Z"
            fill={f[0]}
          />
          <circle cx="133" cy="115" r="12" fill={f[1]} />
          <rect y="186" width="200" height="14" fill={f[0]} />
        </>
      )
    case 'INR':
      return (
        <>
          <circle cx="45" cy="145" r="35" fill={f[0]} />
          <circle cx="108" cy="144" r="48" fill={f[1]} />
          <circle cx="158" cy="148" r="28" fill={f[2]} />
          <circle cx="170" cy="90" r="20" fill={f[3]} />
        </>
      )
    case 'TPB':
      return (
        <>
          {[
            [91, 80, 0],
            [151, 80, 0],
            [121, 108, 1],
            [181, 108, 1],
            [91, 136, 0],
            [151, 136, 0],
            [121, 164, 1],
            [181, 164, 1],
          ].map(([x, y, c]) => (
            <path key={`${x}-${y}`} d={`M${x} ${y}L${x + 12.99} ${y + 19.5}H${x - 12.99}L${x} ${y}Z`} fill={f[c]} />
          ))}
        </>
      )
  }
}
