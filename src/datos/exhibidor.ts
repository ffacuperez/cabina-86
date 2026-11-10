import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { dosCifras } from '../lib/texto'
import type { RondaActual } from './ronda'

/** Un disco en mi exhibidor: me lo pasó otro en esta ronda después de que me sumé */
export type DiscoEnEstante = {
  paseId: string
  /** MAX-07 */
  catalogo: string
  titulo: string
  artista: string
  anio: number | null
  tapa: string | null
  tarjetita: string
  creadoEn: string
  /** Mi puntaje si ya lo califiqué (talón "09/10"); null = PENDIENTE */
  puntaje: number | null
}

/** S-04 / T-11: por pasillo quedan todos los pendientes y los últimos 6 calificados; el resto se archiva */
export const QUEDAN_CALIFICADOS = 6

/** Un pasillo por integrante que me pasó discos (HU-11) */
export type Pasillo = {
  de: { id: string; nombre: string; sigla: string }
  /** Los del estante del exhibidor, del más nuevo al más viejo: pendientes y los últimos 6 calificados */
  discos: DiscoEnEstante[]
  /** Los calificados más viejos, del más viejo al más nuevo (de lomo en el pasillo entero, Figma 02f) */
  archivados: DiscoEnEstante[]
  /** La tarjetita de su último pendiente, pegada debajo del estante; null si no le debo nada */
  tarjetita: string | null
}

export type Exhibidor = {
  pasillos: Pasillo[]
  /** RN-05: mis pendientes en esta ronda */
  deuda: number
}

type FilaPase = {
  id: string
  numero: number
  tarjetita: string
  creado_en: string
  pasado_por: string
  discos: { titulo: string; artista: string; anio: number | null; tapa_url: string | null } | null
  calificaciones: { puntaje: number }[]
}

type Estado = { tipo: 'cargando' } | { tipo: 'error' } | { tipo: 'listo'; exhibidor: Exhibidor }

/**
 * Lo que me pasaron en esta ronda: pendientes y ya calificados, del más nuevo al más viejo.
 * Mis propios pases no van (no me los debo) y lo pasado antes de que me sumara tampoco (RN-06).
 */
export function useExhibidor(ronda: RondaActual) {
  const [estado, setEstado] = useState<Estado>({ tipo: 'cargando' })
  const [intento, setIntento] = useState(0)
  const { id, yo, unidoEn, otros } = ronda

  useEffect(() => {
    let vigente = true
    supabase
      .from('pases')
      .select('id, numero, tarjetita, creado_en, pasado_por, discos(titulo, artista, anio, tapa_url), calificaciones(puntaje)')
      .eq('ronda_id', id)
      .neq('pasado_por', yo.id)
      .gt('creado_en', unidoEn)
      .eq('calificaciones.usuario_id', yo.id)
      .order('creado_en', { ascending: false })
      .then(({ data, error }) => {
        if (!vigente) return
        if (error) return setEstado({ tipo: 'error' })
        setEstado({ tipo: 'listo', exhibidor: armar(data as unknown as FilaPase[], otros) })
      })
    return () => {
      vigente = false
    }
  }, [id, yo.id, unidoEn, otros, intento])

  const reintentar = () => {
    setEstado({ tipo: 'cargando' })
    setIntento((n) => n + 1)
  }
  return { estado, reintentar }
}

/**
 * Agrupa por quién lo pasó; el pasillo de quien me pasó algo más recientemente va primero.
 * Los pendientes nunca se archivan; de los calificados quedan los 6 más nuevos (por fecha en que se pasaron).
 */
export function armar(filas: FilaPase[], otros: RondaActual['otros']): Exhibidor {
  const integrantes = new Map(otros.map((o) => [o.id, o]))
  const pasillos = new Map<string, Pasillo & { calificados: number }>()
  let deuda = 0
  for (const f of filas) {
    const puntaje = f.calificaciones[0]?.puntaje ?? null
    const quien = integrantes.get(f.pasado_por)
    const pasillo = pasillos.get(f.pasado_por) ?? {
      de: { id: f.pasado_por, nombre: quien?.nombre ?? '?', sigla: quien?.sigla ?? '???' },
      discos: [],
      archivados: [],
      tarjetita: null,
      calificados: 0,
    }
    if (puntaje === null) {
      deuda++
      // Las filas vienen de la más nueva a la más vieja: el primer pendiente es el último que me pasó
      pasillo.tarjetita ??= f.tarjetita
    }
    const archivado = puntaje !== null && pasillo.calificados >= QUEDAN_CALIFICADOS
    if (puntaje !== null) pasillo.calificados++
    // Del más viejo al más nuevo: las filas llegan al revés, así que cada archivado va adelante
    const destino = archivado ? (d: DiscoEnEstante) => pasillo.archivados.unshift(d) : (d: DiscoEnEstante) => pasillo.discos.push(d)
    destino({
      paseId: f.id,
      catalogo: `${pasillo.de.sigla}-${dosCifras(f.numero)}`,
      titulo: f.discos?.titulo ?? '',
      artista: f.discos?.artista ?? '',
      anio: f.discos?.anio ?? null,
      tapa: f.discos?.tapa_url ?? null,
      tarjetita: f.tarjetita,
      creadoEn: f.creado_en,
      puntaje,
    })
    pasillos.set(f.pasado_por, pasillo)
  }
  return { pasillos: [...pasillos.values()].map((p) => ({ de: p.de, discos: p.discos, archivados: p.archivados, tarjetita: p.tarjetita })), deuda }
}

/** "MAX-01 AL MAX-04", o "MAX-01" si es uno solo (archivados, del más viejo al más nuevo) */
export function rangoDeCatalogo(archivados: DiscoEnEstante[]) {
  const primero = archivados[0]?.catalogo ?? ''
  const ultimo = archivados[archivados.length - 1]?.catalogo ?? ''
  return primero === ultimo ? primero : `${primero} AL ${ultimo}`
}
