/**
 * Compartir una imagen (#127): el menú del teléfono si el navegador comparte archivos; si no, se baja.
 * En iPhone el menú tiene que abrirse con el toque, así que la imagen tiene que estar lista antes.
 */
export const TEXTO_AL_COMPARTIR = 'Con mis amigos nos pasamos discos en Cabina 86. Armá tu ronda: https://cabina86.com/?ref=tarjeta'

export function sePuedeCompartir(archivo: File) {
  return typeof navigator !== 'undefined' && typeof navigator.canShare === 'function' && navigator.canShare({ files: [archivo] })
}

export function aArchivo(imagen: Blob, nombre: string) {
  return new File([imagen], nombre, { type: 'image/png' })
}

export function guardarImagen(imagen: Blob, nombre: string) {
  const url = URL.createObjectURL(imagen)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

/** 'compartido', 'cancelado' (cerró el menú) o 'guardado' (no se podía compartir y se bajó) */
export async function compartirImagen(imagen: Blob, nombre: string): Promise<'compartido' | 'cancelado' | 'guardado'> {
  const archivo = aArchivo(imagen, nombre)
  if (sePuedeCompartir(archivo)) {
    try {
      await navigator.share({ files: [archivo], text: TEXTO_AL_COMPARTIR })
      return 'compartido'
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'cancelado'
    }
  }
  guardarImagen(imagen, nombre)
  return 'guardado'
}
