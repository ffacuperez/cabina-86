import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

/** Figma 04 "¿QUÉ TE PASÓ?": se guarda el código y se muestra el texto */
export const REACCIONES = [
  { codigo: 'temazo', texto: 'Temazo' },
  { codigo: 'me-volo', texto: 'Me voló la cabeza' },
  { codigo: 'no-me-llego', texto: 'No me llegó' },
  { codigo: 'revisitar', texto: 'Lo voy a revisitar' },
] as const

export type CodigoReaccion = (typeof REACCIONES)[number]['codigo']

export function textoDeReaccion(codigo: string | null) {
  return REACCIONES.find((r) => r.codigo === codigo)?.texto ?? null
}

/** S-06: "una línea para la ronda" */
export const LARGO_COMENTARIO = 140

/** Teclas − y +: antes de tocar nada no hay puntaje y la aguja está en el medio (entre 5 y 6),
 *  así que el primer + da 6 y el primer − da 5. Después, de a uno entre 1 y 10. */
export function moverPuntaje(actual: number | null, paso: 1 | -1) {
  if (actual === null) return paso === 1 ? 6 : 5
  return Math.min(10, Math.max(1, actual + paso))
}

export type Calificacion = {
  puntaje: number
  temaFavorito: string | null
  reaccion: CodigoReaccion | null
  comentario: string
}

/** HU-14: guarda mi calificación. RLS y el trigger validan que sea de la ronda y que no lo haya pasado yo. */
export async function calificar(paseId: string, c: Calificacion) {
  const comentario = c.comentario.trim().slice(0, LARGO_COMENTARIO)
  const { error } = await supabase.from('calificaciones').insert({
    pase_id: paseId,
    puntaje: c.puntaje,
    tema_favorito: c.temaFavorito,
    reaccion: c.reaccion,
    comentario: comentario || null,
  })
  if (error) throw error
}

/**
 * HU-15 / RN-02: cambia mi calificación (puntaje, tema, reacción o comentario).
 * La base marca editada_en y los demás ven "(editado)"; los promedios salen de las vistas y se recalculan solos.
 */
export async function editarCalificacion(paseId: string, usuarioId: string, c: Calificacion) {
  const comentario = c.comentario.trim().slice(0, LARGO_COMENTARIO)
  const { error } = await supabase
    .from('calificaciones')
    .update({ puntaje: c.puntaje, tema_favorito: c.temaFavorito, reaccion: c.reaccion, comentario: comentario || null })
    .eq('pase_id', paseId)
    .eq('usuario_id', usuarioId)
  if (error) throw error
}

/** ¿Cambió algo respecto de lo que ya estaba? Si no, reimprimir no toca la base (ni marca "editado"). */
export function cambio(antes: { puntaje: number; temaFavorito: string | null; reaccion: string | null; comentario: string | null }, c: Calificacion) {
  return (
    antes.puntaje !== c.puntaje ||
    antes.temaFavorito !== c.temaFavorito ||
    antes.reaccion !== c.reaccion ||
    (antes.comentario ?? '') !== c.comentario.trim().slice(0, LARGO_COMENTARIO)
  )
}

/** Lo que debo en esta ronda después de calificar (renglón "LE DEBÉS" del ticket) */
export function useDeuda(rondaId: string, usuarioId: string) {
  const [deuda, setDeuda] = useState<number | null>(null)
  useEffect(() => {
    let vigente = true
    supabase
      .from('deuda')
      .select('pendientes')
      .eq('ronda_id', rondaId)
      .eq('usuario_id', usuarioId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (vigente && !error) setDeuda((data as { pendientes: number } | null)?.pendientes ?? 0)
      })
    return () => {
      vigente = false
    }
  }, [rondaId, usuarioId])
  return deuda
}
