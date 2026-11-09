import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Detalle } from './detalle'
import type { Integrante, RondaActual } from './ronda'

/** Lo que dijo alguien de la ronda sobre un disco (HU-18). Sin nota: todavía no lo escuchó. */
export type NotaDeLaRonda = {
  de: Integrante
  nota: {
    puntaje: number
    reaccion: string | null
    comentario: string | null
    /** RN-02: si se editó, se muestra "editado" (HU-15) */
    editadaEn: string | null
  } | null
}

type FilaNota = {
  usuario_id: string
  puntaje: number
  reaccion: string | null
  comentario: string | null
  editada_en: string | null
  creada_en: string
}

/**
 * RN-01: las notas de los demás se ven recién después de calificar, o siempre para quien pasó el disco.
 * Devuelve primero a quienes ya lo calificaron (en el orden en que lo hicieron) y después a quienes
 * todavía lo deben: integrantes que estaban en la ronda cuando se pasó, menos quien lo pasó (RN-06, S-03).
 * Mientras no se puedan ver, devuelve null y no consulta nada.
 */
export function useNotasDeLaRonda(ronda: RondaActual, d: Detalle | null) {
  const puedeVer = d !== null && (d.esMio || d.mia !== null)
  const paseId = d?.paseId ?? ''
  const [filas, setFilas] = useState<FilaNota[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!puedeVer) return
    let vigente = true
    supabase
      .from('calificaciones')
      .select('usuario_id, puntaje, reaccion, comentario, editada_en, creada_en')
      .eq('pase_id', paseId)
      .neq('usuario_id', ronda.yo.id)
      .order('creada_en')
      .then(({ data, error }) => {
        if (!vigente) return
        if (error) return setError(true)
        setFilas((data ?? []) as FilaNota[])
      })
    return () => {
      vigente = false
    }
  }, [puedeVer, paseId, ronda.yo.id])

  if (!puedeVer || !d) return { notas: null, error: false }
  if (error) return { notas: null, error: true }
  if (filas === null) return { notas: null, error: false }
  return { notas: armarNotas(ronda, d, filas), error: false }
}

export function armarNotas(ronda: RondaActual, d: Detalle, filas: FilaNota[]): NotaDeLaRonda[] {
  const porId = new Map(ronda.otros.map((i) => [i.id, i]))
  const calificaron = filas
    .filter((f) => f.usuario_id !== ronda.yo.id)
    .map((f) => ({
      de: porId.get(f.usuario_id) ?? { id: f.usuario_id, nombre: '?', sigla: '???' },
      nota: { puntaje: f.puntaje, reaccion: f.reaccion, comentario: f.comentario, editadaEn: f.editada_en },
    }))
  const ya = new Set(filas.map((f) => f.usuario_id))
  const deben = ronda.otros
    .filter((i) => i.id !== d.de.id && !ya.has(i.id) && (!i.unidoEn || Date.parse(i.unidoEn) < Date.parse(d.creadoEn)))
    .map((i) => ({ de: i, nota: null }))
  return [...calificaron, ...deben]
}
