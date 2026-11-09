import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { dosCifras } from '../lib/texto'
import type { Integrante, RondaActual } from './ronda'

/** Un disco abierto (HU-12): el disco, quién lo pasó y su tarjetita, y quiénes ya lo calificaron */
export type Detalle = {
  paseId: string
  /** MAX-07 */
  catalogo: string
  titulo: string
  artista: string
  anio: number | null
  tapa: string | null
  cantidadTemas: number | null
  duracionSeg: number | null
  tarjetita: string
  creadoEn: string
  de: Integrante
  /** Lo pasé yo (no lo califico, S-03) */
  esMio: boolean
  /** Mi puntaje si ya lo califiqué */
  miPuntaje: number | null
  /** RN-01: quiénes lo calificaron, sin puntaje ni comentario, en el orden en que calificaron */
  calificaron: Integrante[]
}

type FilaPase = {
  id: string
  numero: number
  tarjetita: string
  creado_en: string
  pasado_por: string
  discos: {
    titulo: string
    artista: string
    anio: number | null
    tapa_url: string | null
    cantidad_temas: number | null
    duracion_seg: number | null
  } | null
  calificaciones: { puntaje: number }[]
}

type Estado = { tipo: 'cargando' } | { tipo: 'error' } | { tipo: 'no-esta' } | { tipo: 'listo'; detalle: Detalle }

/** Un id que no es uuid hace fallar la consulta (22P02): para la app es un disco que no está. */
const ID_INVALIDO = '22P02'

export function useDetalle(ronda: RondaActual, paseId: string) {
  const [estado, setEstado] = useState<Estado>({ tipo: 'cargando' })
  const [intento, setIntento] = useState(0)

  useEffect(() => {
    let vigente = true
    Promise.all([
      supabase
        .from('pases')
        .select(
          'id, numero, tarjetita, creado_en, pasado_por, ' +
            'discos(titulo, artista, anio, tapa_url, cantidad_temas, duracion_seg), calificaciones(puntaje)',
        )
        .eq('id', paseId)
        .eq('ronda_id', ronda.id)
        .eq('calificaciones.usuario_id', ronda.yo.id)
        .maybeSingle(),
      supabase.rpc('quienes_calificaron', { p_pase: paseId }),
    ]).then(([pase, calificaron]) => {
      if (!vigente) return
      if (pase.error?.code === ID_INVALIDO || (!pase.error && !pase.data)) return setEstado({ tipo: 'no-esta' })
      if (pase.error || calificaron.error || !pase.data) return setEstado({ tipo: 'error' })
      setEstado({
        tipo: 'listo',
        detalle: armar(pase.data as unknown as FilaPase, (calificaron.data ?? []) as { usuario_id: string }[], ronda),
      })
    })
    return () => {
      vigente = false
    }
  }, [ronda, paseId, intento])

  const reintentar = () => {
    setEstado({ tipo: 'cargando' })
    setIntento((n) => n + 1)
  }
  return { estado, reintentar }
}

export function armar(f: FilaPase, calificaron: { usuario_id: string }[], ronda: RondaActual): Detalle {
  const integrantes = new Map([ronda.yo, ...ronda.otros].map((i) => [i.id, i]))
  const quien = (id: string): Integrante => integrantes.get(id) ?? { id, nombre: '?', sigla: '???' }
  const de = quien(f.pasado_por)
  return {
    paseId: f.id,
    catalogo: `${de.sigla}-${dosCifras(f.numero)}`,
    titulo: f.discos?.titulo ?? '',
    artista: f.discos?.artista ?? '',
    anio: f.discos?.anio ?? null,
    tapa: f.discos?.tapa_url ?? null,
    cantidadTemas: f.discos?.cantidad_temas ?? null,
    duracionSeg: f.discos?.duracion_seg ?? null,
    tarjetita: f.tarjetita,
    creadoEn: f.creado_en,
    de,
    esMio: f.pasado_por === ronda.yo.id,
    miPuntaje: f.calificaciones[0]?.puntaje ?? null,
    calificaron: calificaron.filter((c) => c.usuario_id !== ronda.yo.id).map((c) => quien(c.usuario_id)),
  }
}

/** "9 TEMAS · 37 MIN"; lo que Deezer no trajo no se muestra */
export function duracion(cantidadTemas: number | null, duracionSeg: number | null) {
  const partes: string[] = []
  if (cantidadTemas) partes.push(`${cantidadTemas} ${cantidadTemas === 1 ? 'TEMA' : 'TEMAS'}`)
  if (duracionSeg) partes.push(`${Math.max(1, Math.round(duracionSeg / 60))} MIN`)
  return partes.join(' · ')
}
