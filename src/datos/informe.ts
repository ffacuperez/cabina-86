import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { nombreDePila } from '../lib/texto'

/*
 * HU-21 (#113) · El informe de la ronda (Figma 06f; ronda nueva, 06g).
 * Todo sale de la función informe_ronda de la base: solo discos cerrados que podés ver (RN-13, RN-01)
 * y, en cada bloque, cuánto falta para mostrarlo (RN-12). Acá solo se arman las frases.
 */

export type NotaDeDisco = { sigla: string; puntaje: number }

export type DiscoDelInforme = {
  pase_id: string
  titulo: string
  artista: string
  tapa_url: string | null
  /** Sigla de quien lo pasó */
  de: string | null
  de_nombre: string | null
  promedio: number
  notas: NotaDeDisco[]
}

export type Informe = {
  /** Discos cerrados que cuentan */
  discos: number
  notas: number
  /** Cuántos discos cerrados faltan para podio, fondo, discordia y extremos (mínimo 3) */
  faltan_cerrados: number
  termometro: {
    /** Cuántas notas faltan para mostrarlo (mínimo 10) */
    faltan: number
    notas: number
    promedio: number | null
    uno_y_dos: number
    nueve_y_diez: number
    entre_6_y_8: number
    la_que_mas: number | null
    /** Cuántas notas de cada valor, del 1 al 10 */
    reparto: number[]
  }
  tibiometro: {
    sigla: string
    nombre: string
    notas: number
    /** Cuántas notas le faltan para entrar (mínimo 5) */
    faltan: number
    entre_6_y_8_pct: number | null
    nueve_y_diez: number
    dieces: number
    mas_alta: number | null
    mas_baja: number | null
  }[]
  podio: (DiscoDelInforme & { puesto: number })[]
  fondo: DiscoDelInforme[]
  discordia: (Omit<DiscoDelInforme, 'promedio' | 'notas'> & { alta: NotaDeDisco; baja: NotaDeDisco; puntos: number; desvios: number })[]
  compatibilidad: {
    a: { sigla: string; nombre: string }
    b: { sigla: string; nombre: string }
    /** Discos cerrados que calificaron los dos */
    discos: number
    /** Cuántos discos en común faltan (mínimo 5) */
    faltan: number
    /** Correlación × 100, 0 si es negativa; null si faltan discos */
    pct: number | null
    une: { titulo: string; a: number; b: number } | null
    separa: { titulo: string; a: number; b: number } | null
  }[]
  extremos: {
    sigla: string
    nombre: string
    alta: { puntaje: number; discos: string[] }
    baja: { puntaje: number; discos: string[] }
  }[]
  oportunidad: {
    comentarios: number
    promesas: number
    citas: Cita[]
  }
  picante: Cita | null
}

export type Cita = { sigla: string; nombre: string; puntaje: number; titulo: string; de: string | null; comentario: string }

type Estado = { tipo: 'cargando' } | { tipo: 'error' } | { tipo: 'listo'; informe: Informe }

export function useInforme(rondaId: string) {
  const [estado, setEstado] = useState<Estado>({ tipo: 'cargando' })
  const [intento, setIntento] = useState(0)

  useEffect(() => {
    let vigente = true
    supabase.rpc('informe_ronda', { p_ronda: rondaId }).then(({ data, error }) => {
      if (!vigente) return
      if (error || !data) return setEstado({ tipo: 'error' })
      setEstado({ tipo: 'listo', informe: data as Informe })
    })
    return () => {
      vigente = false
    }
  }, [rondaId, intento])

  return { estado, reintentar: () => { setEstado({ tipo: 'cargando' }); setIntento((i) => i + 1) } }
}

// ── Frases (Figma 06f) ──

const pila = (nombre: string) => nombreDePila(nombre) || nombre

/** "72%": el porcentaje de notas entre 6 y 8 */
export function porcentajeTibio(t: Informe['termometro']) {
  return t.notas ? Math.round((100 * t.entre_6_y_8) / t.notas) : 0
}

/** Termómetro: "7 de cada 10 notas caen entre 6 y 8. Ronda tibia." */
export function fraseTermometro(t: Informe['termometro']) {
  const deCadaDiez = Math.round(porcentajeTibio(t) / 10)
  const base = `${deCadaDiez} de cada 10 notas caen entre 6 y 8.`
  if (deCadaDiez >= 6) return `${base} Ronda tibia.`
  if (deCadaDiez <= 3) return `Solo ${base} Acá se juegan.`
  return base
}

/** Tibiómetro: el más tibio, si nunca puso un 10, y el que más se juega (más notas de 9 o 10). */
export function fraseTibiometro(filas: Informe['tibiometro']) {
  const entran = filas.filter((f) => f.faltan === 0)
  if (entran.length === 0) return null
  const partes: string[] = []
  const masTibio = entran[0]
  if (masTibio.dieces === 0) partes.push(`${pila(masTibio.nombre)} nunca puso un 10.`)
  const seJuega = [...entran].sort((a, b) => b.nueve_y_diez - a.nueve_y_diez)[0]
  if (seJuega.nueve_y_diez > 0 && seJuega !== masTibio) {
    partes.push(`${pila(seJuega.nombre)} es el que más se juega: ${seJuega.nueve_y_diez} ${seJuega.nueve_y_diez === 1 ? 'nota' : 'notas'} de 9 o 10.`)
  }
  return partes.length ? partes.join(' ') : null
}

/** Reparto: "Nadie puso un 1 ni un 2. La nota que más se pone: 8." */
export function fraseReparto(t: Informe['termometro']) {
  const masPuesta = t.la_que_mas === null ? '' : `La nota que más se pone: ${t.la_que_mas}.`
  return t.uno_y_dos === 0 ? `Nadie puso un 1 ni un 2. ${masPuesta}`.trim() : masPuesta
}

/** Podio: un renglón por puesto; si hay empate, el primero por título "y N más". */
export function puestos(podio: Informe['podio']) {
  const porPuesto = new Map<number, DiscoDelInforme[]>()
  for (const d of podio) porPuesto.set(d.puesto, [...(porPuesto.get(d.puesto) ?? []), d])
  return [...porPuesto.entries()]
    .sort(([a], [b]) => a - b)
    .map(([puesto, discos]) => ({ puesto, disco: discos[0], empatados: discos.length }))
}

/** Cuántas luces del vúmetro van prendidas (de 10) */
export const lucesPrendidas = (pct: number | null) => (pct === null ? 0 : Math.max(0, Math.min(10, Math.round(pct / 10))))

/** "DE FACU · 3 Y 3": quién lo pasó y las notas, para el fondo de la bandeja */
export function notasEnLinea(d: DiscoDelInforme) {
  const notas = d.notas.map((n) => n.puntaje)
  const todas = notas.length > 1 && notas.every((n) => n === notas[0]) ? notas.join(' Y ') : d.notas.map((n) => `${n.sigla} ${n.puntaje}`).join(' · ')
  return d.de_nombre ? `DE ${pila(d.de_nombre).toUpperCase()} · ${todas}` : todas
}

/** Qué falta, en la voz de la app (Figma 06g) */
export const faltan = {
  notas: (n: number) => `FALTAN ${n} ${n === 1 ? 'NOTA' : 'NOTAS'}`,
  podio: (n: number) => `${n === 1 ? 'FALTA 1 DISCO QUE ESCUCHEN' : `FALTAN ${n} DISCOS QUE ESCUCHEN`} TODOS PARA ARMAR EL PODIO.`,
  enComun: (n: number) => `${n === 1 ? 'FALTA 1 DISCO' : `FALTAN ${n} DISCOS`} EN COMÚN PARA SABER SI SON COMPATIBLES.`,
}

export { pila as nombreCorto }
