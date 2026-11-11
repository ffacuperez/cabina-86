import { useState } from 'react'

/*
 * #59 · En iPhone una app web instalada no atrapa links: el de la ronda (/r/<codigo>) o el del disco
 * que se avisa por WhatsApp se abren en Safari, que no comparte la sesión con la app instalada.
 * Si la app arrancó en Safari de iPhone por uno de esos links, el exhibidor avisa una sola vez
 * que la abra desde la pantalla de inicio (Figma 02g).
 */
const CLAVE = 'cabina86.avisoIphone'

/** iPhone o iPad, en el navegador (no en la app instalada) */
export function esIphoneEnElNavegador(nav: Navigator = navigator, ventana: Window = window) {
  const ios = /iPhone|iPad|iPod/.test(nav.userAgent) || (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1)
  const instalada = (nav as Navigator & { standalone?: boolean }).standalone === true || ventana.matchMedia?.('(display-mode: standalone)').matches
  return ios && !instalada
}

/** Al arrancar: si entró por un link de la ronda o de un disco, queda pendiente el aviso (salvo que ya lo haya visto) */
export function marcarSiEntraPorLink(ruta: string, nav?: Navigator, ventana?: Window) {
  if (!/^\/(r|ronda)\//.test(ruta) || !esIphoneEnElNavegador(nav, ventana)) return
  try {
    if (localStorage.getItem(CLAVE) !== 'visto') localStorage.setItem(CLAVE, 'pendiente')
  } catch {
    // sin almacenamiento no hay aviso
  }
}

export function useAvisoIphone() {
  const [mostrar, setMostrar] = useState(() => {
    try {
      return localStorage.getItem(CLAVE) === 'pendiente' && esIphoneEnElNavegador()
    } catch {
      return false
    }
  })
  const cerrar = () => {
    setMostrar(false)
    try {
      localStorage.setItem(CLAVE, 'visto')
    } catch {
      // nada
    }
  }
  return { mostrar, cerrar }
}
