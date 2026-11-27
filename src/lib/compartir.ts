/**
 * Compartir o guardar una imagen (#127, #129).
 * En el iPhone una página web no puede guardar una imagen directo en Fotos: la única forma es el menú del
 * teléfono, que tiene "Guardar imagen" (bajarla con un link abre de golpe un visor de archivos). Por eso en el
 * teléfono hay un solo botón, "Compartir o guardar", que abre ese menú con la imagen y el link. En la compu,
 * o si el navegador no comparte archivos, el botón es "Guardar imagen" y la baja.
 * En iPhone el menú tiene que abrirse con el toque, así que la imagen tiene que estar lista antes.
 */
export const TEXTO_AL_COMPARTIR = 'Con mis amigos nos pasamos discos en Cabina 86. Armá tu ronda: https://cabina86.com/?ref=tarjeta'

export type Modo = 'menu' | 'bajar'

/** 'menu' en el teléfono con un navegador que comparte archivos; si no, 'bajar' */
export function modoDeCompartir({ telefono, comparteArchivos }: { telefono: boolean; comparteArchivos: boolean }): Modo {
  return telefono && comparteArchivos ? 'menu' : 'bajar'
}

/** El modo en este navegador (con el archivo, si ya está, para preguntar si se puede compartir ese en particular) */
export function modoAca(archivo?: File): Modo {
  const telefono = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches === true
  const puede = typeof navigator !== 'undefined' && typeof navigator.canShare === 'function'
  return modoDeCompartir({ telefono, comparteArchivos: puede && (!archivo || navigator.canShare({ files: [archivo] })) })
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

/** 'compartido' (eligió algo en el menú), 'cancelado' (lo cerró) o 'bajado' */
export async function compartirOGuardar(imagen: Blob, nombre: string): Promise<'compartido' | 'cancelado' | 'bajado'> {
  const archivo = aArchivo(imagen, nombre)
  if (modoAca(archivo) === 'menu') {
    try {
      await navigator.share({ files: [archivo], text: TEXTO_AL_COMPARTIR })
      return 'compartido'
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'cancelado'
    }
  }
  bajar(imagen, nombre)
  return 'bajado'
}
