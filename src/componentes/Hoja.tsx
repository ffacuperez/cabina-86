import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react'

/** Arrastrando el asa hacia abajo: con más de esto (o un tirón rápido) se cierra */
const ARRASTRE_PARA_CERRAR = 90
const TIRON_RAPIDO = 0.6 // px por ms

/**
 * E-05 · Una hoja que sube desde abajo (Figma 09c y 05d): el velo aparece con un fundido y la hoja sube
 * desde el borde (unos 280 ms, frenando al final). Al cerrar (Escape, tocar el fondo o arrastrar el asa
 * hacia abajo) la hoja baja, el velo se va y recién entonces avisa con onCerrar. Con "reducir movimiento",
 * solo el fundido. Foco en el título al abrir y el fondo no scrollea.
 */
export function Hoja({ etiquetadaPor, onCerrar, children }: { etiquetadaPor: string; onCerrar: () => void; children: ReactNode }) {
  const hoja = useRef<HTMLElement>(null)
  const [cerrando, setCerrando] = useState(false)
  const [arrastre, setArrastre] = useState<number | null>(null)
  const inicio = useRef<{ y: number; t: number } | null>(null)

  const cerrar = useCallback(() => setCerrando(true), [])

  useEffect(() => {
    hoja.current?.querySelector<HTMLElement>('h2')?.focus()
    const alTeclear = (e: KeyboardEvent) => e.key === 'Escape' && cerrar()
    const overflowPrevio = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', alTeclear)
    return () => {
      document.body.style.overflow = overflowPrevio
      document.removeEventListener('keydown', alTeclear)
    }
  }, [cerrar])

  // Cuando termina de bajar, avisa. Por si la animación no corre (pestaña oculta), un tope.
  useEffect(() => {
    if (!cerrando) return
    const tope = setTimeout(onCerrar, 400)
    return () => clearTimeout(tope)
  }, [cerrando, onCerrar])

  function empezarArrastre(e: React.PointerEvent) {
    inicio.current = { y: e.clientY, t: performance.now() }
    setArrastre(0)
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  function arrastrar(e: React.PointerEvent) {
    if (!inicio.current) return
    setArrastre(Math.max(0, e.clientY - inicio.current.y))
  }
  function soltar(e: React.PointerEvent) {
    if (!inicio.current) return
    const dy = Math.max(0, e.clientY - inicio.current.y)
    const velocidad = dy / Math.max(1, performance.now() - inicio.current.t)
    inicio.current = null
    // Si se cierra, baja desde donde la soltaste; si no, vuelve a su lugar
    if (dy > ARRASTRE_PARA_CERRAR || (dy > 20 && velocidad > TIRON_RAPIDO)) cerrar()
    else setArrastre(null)
  }

  return (
    <div
      className={`hoja-velo${cerrando ? ' hoja-velo--cerrando' : ''}`}
      onClick={cerrar}
      onAnimationEnd={(e) => cerrando && e.target === e.currentTarget && onCerrar()}
    >
      <section
        ref={hoja}
        className={`hoja${arrastre !== null ? ' hoja--arrastrando' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={etiquetadaPor}
        style={arrastre ? { transform: `translateY(${arrastre}px)` } : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <span
          className="hoja__asa"
          aria-hidden="true"
          onPointerDown={empezarArrastre}
          onPointerMove={arrastrar}
          onPointerUp={soltar}
          onPointerCancel={soltar}
        />
        {children}
      </section>
    </div>
  )
}
