import type { MouseEvent } from 'react'

/** El nombre que une la caja del estante con la del detalle durante el vuelo */
export const CAJA_QUE_VUELA = 'caja-que-vuela'
/** El nombre que une el ticket con el talón de ese disco en el estante (E-04) */
export const TICKET_A_TALON = 'ticket-a-talon'

/** Lo que el detalle necesita para mostrar la caja apenas llega, antes de traer el resto (E-02) */
export type CajaEnVuelo = { tapa: string | null; titulo: string; catalogo: string }

type Transicion = { finished: Promise<void> }
type DocumentoConTransicion = Document & { startViewTransition?: (cb: () => Promise<void>) => Transicion }

/** No pidieron reducir el movimiento */
export function sinReducirMovimiento() {
  return typeof window === 'undefined' || !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

/** Hay transiciones de vista (Safari 18, Chrome 111) y no pidieron reducir el movimiento */
export function sePuedeVolar() {
  if (typeof document === 'undefined' || !(document as DocumentoConTransicion).startViewTransition) return false
  return sinReducirMovimiento()
}

/** Un toque común: sin abrir en otra pestaña ni con teclas */
const toqueComun = (e: MouseEvent<HTMLElement>) => e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey

/**
 * Lleva un elemento de esta pantalla a otro de la siguiente con una transición de vista.
 * Le pone el nombre al de origen, navega y espera (con un MutationObserver: mientras dura la captura, el
 * navegador no corre requestAnimationFrame) a que aparezca el de destino para ponerle el mismo nombre.
 * Si no aparece a tiempo, la pantalla cambia con un fundido. Al terminar le saca el nombre: con el nombre
 * puesto, Safari lo sigue pintando aparte (#93).
 */
function volar({
  origen,
  nombre,
  destino,
  espera,
  navegar,
  alAterrizar,
}: {
  origen: HTMLElement
  nombre: string
  destino: string
  espera: number
  navegar: () => void
  alAterrizar?: (el: HTMLElement | null) => void
}) {
  origen.style.viewTransitionName = nombre
  let aterrizado: HTMLElement | null = null
  const transicion = (document as DocumentoConTransicion).startViewTransition!(
    () =>
      new Promise<void>((listo) => {
        let terminado = false
        const aterrizar = () => {
          if (terminado) return
          terminado = true
          observador.disconnect()
          clearTimeout(reloj)
          aterrizado = document.querySelector<HTMLElement>(destino)
          if (aterrizado) aterrizado.style.viewTransitionName = nombre
          alAterrizar?.(aterrizado)
          listo()
        }
        const observador = new MutationObserver(() => {
          if (document.querySelector(destino)) aterrizar()
        })
        observador.observe(document.body, { childList: true, subtree: true })
        const reloj = setTimeout(aterrizar, espera)
        navegar()
      }),
  )
  const sacarNombre = () => {
    if (aterrizado) aterrizado.style.viewTransitionName = ''
  }
  transicion.finished.then(sacarNombre, sacarNombre)
}

/**
 * E-02: la caja tocada vuela del estante hasta arriba del detalle y recién ahí se abre.
 * Devuelve false si no se puede (navegador viejo, reducir movimiento, abrir en otra pestaña):
 * entonces el link navega como siempre.
 */
export function abrirVolando(e: MouseEvent<HTMLElement>, navegar: () => void) {
  if (!toqueComun(e) || !sePuedeVolar()) return false
  const caja = e.currentTarget.querySelector<HTMLElement>('.caja-cd')
  if (!caja) return false
  e.preventDefault()
  volar({
    origen: caja,
    nombre: CAJA_QUE_VUELA,
    destino: '.detalle--vuela .caja-cd',
    espera: 400,
    navegar,
    // El detalle arranca arriba aunque el exhibidor estuviera scrolleado: ahí aterriza la caja
    alAterrizar: () => window.scrollTo(0, 0),
  })
  return true
}

/**
 * E-04: "Volver al exhibidor" lleva el ticket (ya arrancado) hasta el estante, donde se vuelve el talón con el
 * puntaje en la caja de ese disco. Antes de mostrarlo, corre el estante (y la pantalla) hasta esa caja.
 */
export function guardarTicketEnElTalon(ticket: HTMLElement, paseId: string, navegar: () => void) {
  volar({
    origen: ticket,
    nombre: TICKET_A_TALON,
    destino: `.disco-estante__talon[data-pase="${paseId}"]`,
    espera: 700,
    navegar,
    alAterrizar: (talon) => {
      if (talon) talon.closest('.disco-estante')?.scrollIntoView({ block: 'center', inline: 'center' })
      else window.scrollTo(0, 0)
    },
  })
}

/** Se puede hacer el vuelo con este toque (si no, el link navega como siempre) */
export function sePuedeVolarCon(e: MouseEvent<HTMLElement>) {
  return toqueComun(e) && sePuedeVolar()
}
