import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { dosCifras } from '../lib/texto'
import type { Integrante, RondaActual } from './ronda'

/** Un disco que pasé a esta ronda (HU-16), con cómo viene la escucha */
export type Pasado = {
  paseId: string
  /** FAC-05 */
  catalogo: string
  titulo: string
  creadoEn: string
  /** Cuántos ya lo calificaron */
  escucharon: number
  /** Quiénes todavía lo deben: estaban en la ronda cuando lo pasé y no lo calificaron (RN-06) */
  faltan: Integrante[]
  /** Promedio de lo que le pusieron, si alguien lo calificó */
  promedio: number | null
}

export type LoQuePasaste = {
  pasados: Pasado[]
  /** Discos de esta ronda que califiqué */
  escuchaste: number
  /** Promedio de todo lo que me pusieron en esta ronda */
  tePonen: number | null
}

type FilaPase = {
  id: string
  numero: number
  creado_en: string
  discos: { titulo: string } | null
  calificaciones: { usuario_id: string; puntaje: number }[]
}

type Estado = { tipo: 'cargando' } | { tipo: 'error' } | { tipo: 'listo'; perfil: LoQuePasaste }

/**
 * Lo que pasé a esta ronda, del más reciente al más viejo (RN-07: solo esta ronda).
 * Como los pasé yo, puedo leer sus calificaciones (S-03); lo escuchado sale del tablero.
 */
export function useLoQuePasaste(ronda: RondaActual) {
  const [estado, setEstado] = useState<Estado>({ tipo: 'cargando' })
  const [intento, setIntento] = useState(0)

  useEffect(() => {
    let vigente = true
    Promise.all([
      supabase
        .from('pases')
        .select('id, numero, creado_en, discos(titulo), calificaciones(usuario_id, puntaje)')
        .eq('ronda_id', ronda.id)
        .eq('pasado_por', ronda.yo.id)
        .order('creado_en', { ascending: false }),
      supabase.from('tablero').select('escuchados').eq('ronda_id', ronda.id).eq('usuario_id', ronda.yo.id).maybeSingle(),
    ]).then(([pases, tablero]) => {
      if (!vigente) return
      if (pases.error || tablero.error) return setEstado({ tipo: 'error' })
      const escuchaste = (tablero.data as { escuchados: number } | null)?.escuchados ?? 0
      setEstado({ tipo: 'listo', perfil: armarPerfil(ronda, (pases.data ?? []) as unknown as FilaPase[], escuchaste) })
    })
    return () => {
      vigente = false
    }
  }, [ronda, intento])

  const reintentar = () => {
    setEstado({ tipo: 'cargando' })
    setIntento((n) => n + 1)
  }
  return { estado, reintentar }
}

export function armarPerfil(ronda: RondaActual, filas: FilaPase[], escuchaste: number): LoQuePasaste {
  const todos: number[] = []
  const pasados = filas.map((f) => {
    const puntajes = f.calificaciones.filter((c) => c.usuario_id !== ronda.yo.id).map((c) => c.puntaje)
    todos.push(...puntajes)
    const ya = new Set(f.calificaciones.map((c) => c.usuario_id))
    const faltan = ronda.otros.filter(
      (i) => !ya.has(i.id) && (!i.unidoEn || Date.parse(i.unidoEn) < Date.parse(f.creado_en)),
    )
    return {
      paseId: f.id,
      catalogo: `${ronda.yo.sigla}-${dosCifras(f.numero)}`,
      titulo: f.discos?.titulo ?? '',
      creadoEn: f.creado_en,
      escucharon: puntajes.length,
      faltan,
      promedio: promedio(puntajes),
    }
  })
  return { pasados, escuchaste, tePonen: promedio(todos) }
}

function promedio(xs: number[]) {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null
}

/** 7,5: un decimal con coma */
export function conComa(n: number) {
  return (Math.round(n * 10) / 10).toFixed(1).replace('.', ',')
}

/** "MAXI Y MANU", "MAXI, MANU Y LU" */
export function enumerar(nombres: string[]) {
  if (nombres.length <= 1) return nombres.join('')
  return `${nombres.slice(0, -1).join(', ')} Y ${nombres[nombres.length - 1]}`
}
