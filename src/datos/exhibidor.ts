import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { RondaActual } from './ronda'

/** Un disco en mi exhibidor: me lo pasó otro en esta ronda después de que me sumé */
export type DiscoEnEstante = {
  paseId: string
  titulo: string
  artista: string
  anio: number | null
  tapa: string | null
  tarjetita: string
  creadoEn: string
  /** Mi puntaje si ya lo califiqué (talón "09/10"); null = PENDIENTE */
  puntaje: number | null
}

/** Un pasillo por integrante que me pasó discos (HU-11) */
export type Pasillo = { de: { id: string; nombre: string }; discos: DiscoEnEstante[] }

export type Exhibidor = {
  pasillos: Pasillo[]
  /** RN-05: mis pendientes en esta ronda */
  deuda: number
  /** La tarjetita del último pendiente: va pegada debajo de su estante */
  ultimaTarjetita: { paseId: string; por: string; nota: string } | null
}

type FilaPase = {
  id: string
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
      .select('id, tarjetita, creado_en, pasado_por, discos(titulo, artista, anio, tapa_url), calificaciones(puntaje)')
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

/** Agrupa por quién lo pasó; el pasillo de quien me pasó algo más recientemente va primero. */
export function armar(filas: FilaPase[], otros: RondaActual['otros']): Exhibidor {
  const nombres = new Map(otros.map((o) => [o.id, o.nombre]))
  const pasillos = new Map<string, Pasillo>()
  let deuda = 0
  let ultimaTarjetita: Exhibidor['ultimaTarjetita'] = null
  for (const f of filas) {
    const puntaje = f.calificaciones[0]?.puntaje ?? null
    const nombre = nombres.get(f.pasado_por) ?? '?'
    if (puntaje === null) {
      deuda++
      ultimaTarjetita ??= { paseId: f.id, por: nombre, nota: f.tarjetita }
    }
    const pasillo = pasillos.get(f.pasado_por) ?? { de: { id: f.pasado_por, nombre }, discos: [] }
    pasillo.discos.push({
      paseId: f.id,
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
  return { pasillos: [...pasillos.values()], deuda, ultimaTarjetita }
}
