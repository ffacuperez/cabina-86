import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { enLista } from '../lib/texto'
import type { Integrante, RondaActual } from './ronda'

/** Una ficha de la pared de exhibidores (Figma 06, HU-17): lo de un integrante en esta ronda */
export type Ficha = {
  integrante: Integrante
  esMia: boolean
  paso: number
  escucho: number
  /**
   * Promedio de lo que le pusieron. De los demás cuentan los discos suyos que yo ya califiqué (sus notas
   * ya las veo, así no adelanta ninguna, RN-01); el mío cuenta todo. Null si no hay notas.
   */
  promedio: number | null
  debe: number
  /** La línea de abajo: "Le debés 2 a Maxi y 3 a Manu." o una con humor */
  frase: string
}

export type Tablero = {
  fichas: Ficha[]
  /** Discos pasados en la ronda, de todos */
  discos: number
  /** Código del link si la creé yo (para INVITAR, #52); null si no */
  codigo: string | null
}

type FilaTablero = {
  usuario_id: string
  sigla: string
  pases_hechos: number
  escuchados: number
  deuda: number
  promedio: number | null
}

type Estado = { tipo: 'cargando' } | { tipo: 'error' } | { tipo: 'listo'; tablero: Tablero }

/** Cuánto pasó, escuchó y debe cada integrante de esta ronda (RN-05: solo esta ronda). */
export function useTablero(ronda: RondaActual) {
  const [estado, setEstado] = useState<Estado>({ tipo: 'cargando' })
  const [intento, setIntento] = useState(0)

  useEffect(() => {
    let vigente = true
    Promise.all([
      supabase
        .from('tablero')
        .select('usuario_id, sigla, pases_hechos, escuchados, deuda, promedio')
        .eq('ronda_id', ronda.id),
      // Lo que debo yo, para decir a quién
      supabase.from('pendientes').select('pasado_por').eq('ronda_id', ronda.id).eq('usuario_id', ronda.yo.id),
      // Solo quien creó la ronda obtiene el código (#52)
      supabase.rpc('mis_codigos_de_invitacion'),
    ]).then(([tablero, pendientes, codigos]) => {
      if (!vigente) return
      if (tablero.error || pendientes.error || codigos.error) return setEstado({ tipo: 'error' })
      const codigo = (codigos.data as { ronda_id: string; codigo: string }[]).find((c) => c.ronda_id === ronda.id)?.codigo ?? null
      setEstado({
        tipo: 'listo',
        tablero: {
          ...armarTablero(ronda, tablero.data as FilaTablero[], (pendientes.data as { pasado_por: string }[]).map((p) => p.pasado_por)),
          codigo,
        },
      })
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

/** Mi ficha primero y después los demás, en el orden en que se sumaron (como en el Figma) */
export function armarTablero(ronda: RondaActual, filas: FilaTablero[], meLoPasaron: string[], hoy = new Date()): Omit<Tablero, 'codigo'> {
  const porId = new Map(filas.map((f) => [f.usuario_id, f]))
  const fichas: Ficha[] = []
  for (const integrante of [ronda.yo, ...ronda.otros]) {
    const f = porId.get(integrante.id)
    if (!f) continue
    const esMia = integrante.id === ronda.yo.id
    const ficha = { integrante, esMia, paso: f.pases_hechos, escucho: f.escuchados, promedio: f.promedio, debe: f.deuda }
    fichas.push({ ...ficha, frase: esMia ? fraseMia(ficha, ronda, meLoPasaron) : fraseDeOtro(ficha, hoy) })
  }
  return { fichas, discos: filas.reduce((n, f) => n + f.pases_hechos, 0) }
}

type Numeros = Pick<Ficha, 'integrante' | 'paso' | 'escucho' | 'debe'>

const recienLlegado = (f: Numeros) => f.paso === 0 && f.escucho === 0 && f.debe === 0

/** "Le debés 2 a Maxi y 3 a Manu." (en el orden en que se sumaron) */
function fraseMia(f: Numeros, ronda: RondaActual, meLoPasaron: string[]) {
  if (recienLlegado(f)) return 'Recién llegás. Pasá el primero.'
  if (f.debe === 0) return 'Estás al día. Bien ahí.'
  const cuantos = new Map<string, number>()
  for (const id of meLoPasaron) cuantos.set(id, (cuantos.get(id) ?? 0) + 1)
  const partes = ronda.otros.filter((o) => cuantos.has(o.id)).map((o) => `${cuantos.get(o.id)} a ${o.nombre}`)
  return partes.length ? `Le debés ${enLista(partes)}.` : `Debés ${f.debe}.`
}

/** Del Figma ("Al día. Insoportable.", "Debe 4. Dice que esta semana sí.") y otras en el mismo tono */
export const FRASES_AL_DIA = [
  'Al día. Insoportable.',
  'No debe nada. Sospechoso.',
  'Al día. Escucha todo, el muy careta.',
  'Al día. Que alguien le pase algo.',
]
export const FRASES_DEBE = [
  'Dice que esta semana sí.',
  'Lo tiene anotado, dice.',
  'Los auriculares, otra vez.',
  'Que lo escuche en el bondi.',
]

/** Cada integrante tiene su frase y cambia cada día (siempre la misma para todos ese día) */
function fraseDeOtro(f: Numeros, hoy: Date) {
  if (recienLlegado(f)) return 'Recién llegado. Bienvenido a la cabina.'
  const dia = `${hoy.getFullYear()}-${hoy.getMonth()}-${hoy.getDate()}`
  const n = numeroDe(`${f.integrante.id}:${dia}`)
  return f.debe === 0 ? FRASES_AL_DIA[n % FRASES_AL_DIA.length] : `Debe ${f.debe}. ${FRASES_DEBE[n % FRASES_DEBE.length]}`
}

function numeroDe(texto: string) {
  let h = 0
  for (const c of texto) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return h
}
