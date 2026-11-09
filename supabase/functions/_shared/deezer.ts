// Cabina 86 · Deezer: lo que usan buscar_discos (T-09) y pasar_disco (T-10).
// API pública sin clave: https://developers.deezer.com/api
// Desde el navegador no se puede (no manda CORS), por eso va en una Edge Function.
// Términos de Deezer: se guarda solo texto y la URL de la tapa, nunca la imagen (RN-09).

const API = 'https://api.deezer.com'

/** Deezer no tiene ese álbum (código 800, "no data"). */
export class DeezerNoLoTiene extends Error {
  constructor() {
    super('Deezer no tiene ese disco')
    this.name = 'DeezerNoLoTiene'
  }
}

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
  if (error?.code === 800) throw new DeezerNoLoTiene()
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

/** Un tema del disco, en el orden de Deezer */
export type Tema = { titulo: string; duracion_seg: number }

/** Lo que se guarda en discos al pasarlo (HU-08, RN-09, RN-10) */
export type DiscoCompleto = {
  deezer_id: number
  titulo: string
  artista: string
  anio: number | null
  /** Tapa de 500 px para el detalle */
  tapa_url: string | null
  cantidad_temas: number
  duracion_seg: number
  temas: Tema[]
  link_spotify: string
  link_ytm: string
}

/**
 * RN-10: links de búsqueda del álbum (título y artista), no de un tema.
 * Spotify: sin "/albums" al final; la app del teléfono toma el último tramo como la búsqueda.
 */
export function linksDeBusqueda(titulo: string, artista: string) {
  const q = encodeURIComponent(`${titulo} ${artista}`.trim())
  return {
    link_spotify: `https://open.spotify.com/search/${q}`,
    link_ytm: `https://music.youtube.com/search?q=${q}`,
  }
}

/**
 * El álbum completo para guardarlo: datos, duración y lista de temas.
 * El detalle trae los temas; si vienen menos que nb_tracks (discos largos), se piden aparte.
 */
export async function traerAlbum(id: number, pedir: Pedir = fetch): Promise<DiscoCompleto> {
  const album = await pedirJson<AlbumCompleto>(`/album/${id}`, pedir)
  let pistas = album.tracks?.data ?? []
  if (typeof album.nb_tracks === 'number' && pistas.length < album.nb_tracks) {
    const todas = await pedirJson<{ data?: { title: string; duration: number }[] }>(`/album/${id}/tracks?limit=200`, pedir)
    pistas = todas.data ?? pistas
  }
  const temas = pistas.map((t) => ({ titulo: t.title, duracion_seg: Math.max(0, Math.round(t.duration ?? 0)) }))
  const titulo = album.title
  const artista = album.artist?.name ?? ''
  return {
    deezer_id: album.id,
    titulo,
    artista,
    anio: anioDe(album.release_date),
    tapa_url: tapa(album.cover_big),
    cantidad_temas: temas.length || album.nb_tracks || 0,
    duracion_seg: album.duration ?? temas.reduce((total, t) => total + t.duracion_seg, 0),
    temas,
    ...linksDeBusqueda(titulo, artista),
  }
}

/** Solo para las pruebas: arranca sin años guardados. */
export function olvidarAnios() {
  aniosConocidos.clear()
}
