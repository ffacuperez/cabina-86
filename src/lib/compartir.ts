/**
 * Compartir y guardar una imagen (#127).
 * - Compartir: el menú del teléfono con la imagen y el link; si el navegador no comparte archivos, se baja.
 * - Guardar imagen: en el teléfono también es el menú (sin el texto), porque ahí está "Guardar imagen" y la foto
 *   va a la galería. Bajarla con un link de descarga en iPhone abre un visor de archivos de golpe, con el
 *   ícono de PNG, y no la guarda en Fotos. En la compu, se baja.
 * En iPhone el menú tiene que abrirse con el toque, así que la imagen tiene que estar lista antes.
 */
export const TEXTO_AL_COMPARTIR = 'Con mis amigos nos pasamos discos en Cabina 86. Armá tu ronda: https://cabina86.com/?ref=tarjeta'

export function sePuedeCompartir(archivo: File) {
  return typeof navigator !== 'undefined' && typeof navigator.canShare === 'function' && navigator.canShare({ files: [archivo] })
}

/** Teléfono o tablet: pantalla táctil como puntero principal */
export const esTelefono = () => typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches === true

/** Cómo se guarda: con el menú del teléfono (que tiene "Guardar imagen") o bajando el archivo */
export function comoGuardar({ telefono, comparteArchivos }: { telefono: boolean; comparteArchivos: boolean }): 'menu' | 'bajar' {
  return telefono && comparteArchivos ? 'menu' : 'bajar'
}

export function aArchivo(imagen: Blob, nombre: string) {
  return new File([imagen], nombre, { type: imagen.type || 'image/jpeg' })
}

function bajar(imagen: Blob, nombre: string) {
  const url = URL.createObjectURL(imagen)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

type Resultado = 'compartido' | 'cancelado' | 'bajado'

async function menu(archivo: File, conTexto: boolean): Promise<Resultado | null> {
  try {
    await navigator.share(conTexto ? { files: [archivo], text: TEXTO_AL_COMPARTIR } : { files: [archivo] })
    return 'compartido'
  } catch (e) {
    return (e as Error).name === 'AbortError' ? 'cancelado' : null
  }
}

export async function compartirImagen(imagen: Blob, nombre: string): Promise<Resultado> {
  const archivo = aArchivo(imagen, nombre)
  if (sePuedeCompartir(archivo)) {
    const r = await menu(archivo, true)
    if (r) return r
  }
  bajar(imagen, nombre)
  return 'bajado'
}

export async function guardarImagen(imagen: Blob, nombre: string): Promise<Resultado> {
  const archivo = aArchivo(imagen, nombre)
  if (comoGuardar({ telefono: esTelefono(), comparteArchivos: sePuedeCompartir(archivo) }) === 'menu') {
    const r = await menu(archivo, false)
    if (r) return r
  }
  bajar(imagen, nombre)
  return 'bajado'
}
