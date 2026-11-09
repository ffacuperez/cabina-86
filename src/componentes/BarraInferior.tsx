import { type ReactNode, useEffect, useRef, useState } from 'react'

/**
 * Barra inferior (Figma 03b y 04): el botón de la acción, fijo abajo de borde a borde.
 * La línea de arriba solo aparece mientras hay contenido pasando por debajo; al llegar al final
 * (o si todo entra en la pantalla) se va y el botón queda como parte de la pantalla.
 */
export function BarraInferior({ children }: { children: ReactNode }) {
  const marca = useRef<HTMLSpanElement>(null)
  const barra = useRef<HTMLDivElement>(null)
  const [tapa, setTapa] = useState(false)

  useEffect(() => {
    const m = marca.current
    const b = barra.current
    if (!m || !b || typeof IntersectionObserver === 'undefined') return
    // La marca es el final del contenido: si queda escondida detrás de la barra (o más abajo), la barra tapa algo
    const obs = new IntersectionObserver(([e]) => setTapa(!e.isIntersecting), {
      rootMargin: `0px 0px -${Math.ceil(b.offsetHeight)}px 0px`,
    })
    obs.observe(m)
    return () => obs.disconnect()
  }, [])

  return (
    <>
      <span ref={marca} className="barra-inferior__marca" aria-hidden="true" />
      <div ref={barra} className={`barra-inferior${tapa ? ' barra-inferior--tapa' : ''}`}>
        {children}
      </div>
    </>
  )
}
