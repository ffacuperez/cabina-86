/**
 * #133 · En el iPhone (sobre todo con la app instalada), al cerrar el menú de compartir o una hoja que trabó el
 * scroll, Safari a veces se queda con la pantalla medida más corta: lo que va pegado abajo (la barra inferior)
 * queda flotando a mitad de pantalla y el contenido pasa por debajo. Mover el scroll un píxel y volver lo obliga
 * a medir de nuevo. Se llama dos veces (ahora y un poco después) porque el menú tarda en terminar de irse.
 */
export function reacomodarPantalla() {
  if (typeof window === 'undefined') return
  const reacomodar = () => {
    const y = window.scrollY
    window.scrollTo(window.scrollX, y + 1)
    window.scrollTo(window.scrollX, y)
    window.dispatchEvent(new Event('resize'))
  }
  requestAnimationFrame(reacomodar)
  setTimeout(reacomodar, 350)
}
