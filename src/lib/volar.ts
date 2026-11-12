import type { MouseEvent } from 'react'

/** El nombre que une la caja del estante con la del detalle durante el vuelo */
export const CAJA_QUE_VUELA = 'caja-que-vuela'

/** Lo que el detalle necesita para mostrar la caja apenas llega, antes de traer el resto (E-02) */
export type CajaEnVuelo = { tapa: string | null; titulo: string; catalogo: string }

type DocumentoConTransicion = Document & { startViewTransition?: (cb: () => Promise<void>) => unknown }

/** Hay transiciones de vista (Safari 18, Chrome 111) y no pidieron reducir el movimiento */
export function sePuedeVolar() {
  if (typeof document === 'undefined' || !(document as DocumentoConTransicion).startViewTransition) return false
  return !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

/**
 * E-02: la caja tocada vuela del estante hasta arriba del detalle y recién ahí se abre.
 * Le pone a la caja tocada el nombre del vuelo, navega y espera a que el detalle muestre su caja
 * (que tiene el mismo nombre) para que el navegador la lleve de un lugar al otro.
 * Devuelve false si no se puede (navegador viejo, reducir movimiento, abrir en otra pestaña):
 * entonces el link navega como siempre.
 */
export function abrirVolando(e: MouseEvent<HTMLElement>, navegar: () => void) {
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || !sePuedeVolar()) return false
  const caja = e.currentTarget.querySelector<HTMLElement>('.caja-cd')
  if (!caja) return false
  e.preventDefault()
  caja.style.viewTransitionName = CAJA_QUE_VUELA
  ;(document as DocumentoConTransicion).startViewTransition!(
    () =>
      new Promise<void>((listo) => {
        // React Router actualiza en una transición: esperar a que aparezca la caja del detalle (o 400 ms).
        // Con un MutationObserver: mientras dura la captura, el navegador no corre requestAnimationFrame.
        let terminado = false
        const aterrizar = () => {
          if (terminado) return
          terminado = true
          observador.disconnect()
          clearTimeout(reloj)
          // El detalle arranca arriba aunque el exhibidor estuviera scrolleado: ahí aterriza la caja
          window.scrollTo(0, 0)
          listo()
        }
        const observador = new MutationObserver(() => {
          if (document.querySelector('.detalle--vuela .caja-cd')) aterrizar()
        })
        observador.observe(document.body, { childList: true, subtree: true })
        const reloj = setTimeout(aterrizar, 400)
        navegar()
      }),
  )
  return true
}
