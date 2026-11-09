import { useId } from 'react'

/**
 * C86/CD (Figma, set 116:1817): el CD que sale de la caja en el detalle (03b).
 * Impresión=Tapa: la tapa del álbum recortada en círculo sobre la zona impresa.
 * Impresión=Título: si Deezer no trae tapa, el título del álbum impreso en una línea (con …).
 * Formas exportadas del Figma (disco de 180). Que gire es E-02.
 */
export function CD({ tapa, titulo, className = '' }: { tapa: string | null; titulo: string; className?: string }) {
  const recorte = useId()
  return (
    <div className={`cd ${className}`}>
      <svg className="cd__disco" viewBox="0 0 180 180" fill="none" aria-hidden="true">
        <circle className="cd__plata" cx="90" cy="90" r="90" />
        <circle className="cd__surco" cx="90" cy="90" r="84" strokeWidth="0.6" />
        <circle className="cd__surco" cx="90" cy="90" r="76" strokeWidth="0.6" />
        <circle className="cd__surco" cx="90" cy="90" r="68" strokeWidth="0.6" />
        {tapa ? (
          <>
            <clipPath id={recorte}>
              <circle cx="90" cy="90" r="60" />
            </clipPath>
            <image
              href={tapa}
              x="30"
              y="30"
              width="120"
              height="120"
              preserveAspectRatio="xMidYMid slice"
              clipPath={`url(#${recorte})`}
            />
          </>
        ) : (
          <>
            <circle className="cd__impresion" cx="90" cy="90" r="60" />
            <path
              className="cd__media-luna"
              d="M150 90C150 97.8793 148.448 105.681 145.433 112.961C142.417 120.241 137.998 126.855 132.426 132.426C126.855 137.998 120.241 142.417 112.961 145.433C105.681 148.448 97.8793 150 90 150C82.1207 150 74.3185 148.448 67.039 145.433C59.7595 142.417 53.1451 137.998 47.5736 132.426C42.0021 126.855 37.5825 120.241 34.5672 112.961C31.5519 105.681 30 97.8793 30 90L90 90H150Z"
            />
          </>
        )}
        <circle className="cd__centro" cx="90" cy="90" r="24" />
        <circle className="cd__agujero" cx="90" cy="90" r="8" />
      </svg>
      {!tapa && <span className="cd__titulo" aria-hidden="true">{titulo.toUpperCase()}</span>}
    </div>
  )
}
