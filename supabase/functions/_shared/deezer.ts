// Cabina 86 · Deezer: lo que usan buscar_discos (T-09) y pasar_disco (T-10).
// API pública sin clave: https://developers.deezer.com/api
// Desde el navegador no se puede (no manda CORS), por eso va en una Edge Function.
// Términos de Deezer: se guarda solo texto y la URL de la tapa, nunca la imagen (RN-09).

const API = 'https://api.deezer.com'

/** Deezer no contesta, contesta con error o se pasó del límite (50 pedidos cada 5 segundos). */
export class DeezerNoResponde extends Error {
  constructor(detalle: string) {
    super(`Deezer no responde: ${detalle}`)
    this.name = 'DeezerNoResponde'
  }
}

export type Pedir = (url: string) => Promise<Response>

type AlbumDeBusqueda = {
  id: number
  title: string
  cover_medium?: string | null
  nb_tracks?: number
  record_type?: string
  artist?: { name?: string }
}

type AlbumCompleto = AlbumDeBusqueda & {
  cover_big?: string | null
  release_date?: string
  duration?: number
  tracks?: { data?: { title: string; duration: number }[] }
}

/** Un resultado de búsqueda como lo muestra Pasar (Figma 05a): tapa, título, artista · año. */
export type DiscoEncontrado = {
  deezer_id: number
  titulo: string
  artista: string
  anio: number | null
  /** Tapa de 250 px para la lista; null = S/T */
  tapa_url: string | null
  cantidad_temas: number | null
}

/** GET a la API. Deezer devuelve los errores con 200 y { error: { code, message } }. */
async function pedirJson<T>(ruta: string, pedir: Pedir): Promise<T> {
  let respuesta: Response
  try {
    respuesta = await pedir(`${API}${ruta}`)
  } catch (e) {
    throw new DeezerNoResponde(e instanceof Error ? e.message : String(e))
  }
  if (!respuesta.ok) throw new DeezerNoResponde(`HTTP ${respuesta.status}`)
  let cuerpo: unknown
  try {
    cuerpo = await respuesta.json()
  } catch {
    throw new DeezerNoResponde('respuesta que no es JSON')
  }
  const error = (cuerpo as { error?: { code?: number; message?: string } }).error
  if (error) throw new DeezerNoResponde(`${error.code ?? '?'} ${error.message ?? ''}`.trim())
  return cuerpo as T
}

/** "2012-03-27" → 2012. Deezer usa "0000-00-00" cuando no sabe la fecha. */
export function anioDe(fecha: string | undefined): number | null {
  const anio = Number(fecha?.slice(0, 4))
  return Number.isInteger(anio) && anio >= 1900 && anio <= 2100 ? anio : null
}

/** Las tapas por defecto de Deezer (sin imagen del disco) terminan en /images/cover//... */
function tapa(url: string | null | undefined): string | null {
  return url && !url.includes('/images/cover//') ? url : null
}

/**
 * El año no viene en la búsqueda: sale del detalle de cada álbum.
 * Se guarda en memoria mientras la función esté viva, para no volver a pedirlo.
 */
const aniosConocidos = new Map<number, number | null>()
const MAX_CONOCIDOS = 2000

async function anioDelAlbum(id: number, pedir: Pedir): Promise<number | null> {
  if (aniosConocidos.has(id)) return aniosConocidos.get(id) ?? null
  const album = await pedirJson<AlbumCompleto>(`/album/${id}`, pedir)
  const anio = anioDe(album.release_date)
  if (aniosConocidos.size >= MAX_CONOCIDOS) aniosConocidos.clear()
  aniosConocidos.set(id, anio)
  return anio
}

/**
 * Busca álbumes por nombre o artista (HU-07).
 * Si el detalle de alguno falla, ese resultado queda sin año: la búsqueda no se cae por eso.
 */
export async function buscarAlbumes(texto: string, limite: number, pedir: Pedir = fetch): Promise<DiscoEncontrado[]> {
  const q = encodeURIComponent(texto)
  const { data = [] } = await pedirJson<{ data?: AlbumDeBusqueda[] }>(`/search/album?q=${q}&limit=${limite}`, pedir)
  const albumes = data.slice(0, limite)
  const anios = await Promise.allSettled(albumes.map((a) => anioDelAlbum(a.id, pedir)))
  return albumes.map((a, i) => {
    const anio = anios[i]
    return {
      deezer_id: a.id,
      titulo: a.title,
      artista: a.artist?.name ?? '',
      anio: anio.status === 'fulfilled' ? anio.value : null,
      tapa_url: tapa(a.cover_medium),
      cantidad_temas: typeof a.nb_tracks === 'number' ? a.nb_tracks : null,
    }
  })
}

/** Solo para las pruebas: arranca sin años guardados. */
export function olvidarAnios() {
  aniosConocidos.clear()
}
