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

export type Integrante = { sigla: string; nombre: string }

/** Un tiro: lo que `de` le pasó a `a`, comparado con el promedio de `a` (se mide con 5 discos) */
export type Tiro = {
  de: string
  de_nombre: string
  a: string
  a_nombre: string
  discos: number
  faltan: number
  /** Promedio de lo que le puso menos su promedio; null si faltan discos */
  diferencia: number | null
  /** Lo que le pone a lo de quien pasa y a todo lo que escuchó en la ronda; null si faltan discos */
  le_pone: number | null
  a_todo: number | null
  mejor: { titulo: string; puntaje: number } | null
  errado: { titulo: string; puntaje: number } | null
}

/** Un disco en la diana: z es cuántos desvíos se aleja la nota del promedio de quien lo escuchó */
export type Dardo = { de: string; a: string; pase_id: string; titulo: string; tapa_url: string | null; puntaje: number; z: number }

type TiroDeLaRonda = { de: string; de_nombre: string; a: string; a_nombre: string; titulo: string; puntaje: number; sobre: number }

export type Informe = {
  /** Discos cerrados que cuentan */
  discos: number
  notas: number
  /** En el orden de la ronda (los colores de los dardos siguen este orden) */
  integrantes: Integrante[]
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
  punteria: {
    tiros: Tiro[]
    dardos: Dardo[]
    mejor: TiroDeLaRonda | null
    errado: (TiroDeLaRonda & { oyentes: number; fallo_con_todos: boolean }) | null
  }
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

// ── La puntería ──

/** PAREJO entre −0,3 y +0,3; desde +0,3, LE PEGA; desde −0,3, LE ERRA */
export function etiquetaTiro(diferencia: number | null) {
  if (diferencia === null) return null
  if (diferencia >= 0.3) return 'LE PEGA'
  if (diferencia <= -0.3) return 'LE ERRA'
  return 'PAREJO'
}

/** "+0,17", "−0,17" (con el signo menos de verdad) o "0,00" */
export function conSigno(n: number) {
  const texto = Math.abs(n).toFixed(2).replace('.', ',')
  if (Math.round(n * 100) === 0) return '0,00'
  return n > 0 ? `+${texto}` : `−${texto}`
}

/** Los colores de los dardos (C86/Dardo): el orden de quien pasa en la ronda */
export const COLORES_DARDO = ['uno', 'dos', 'tres'] as const
export const colorDe = (integrantes: Integrante[], sigla: string) =>
  COLORES_DARDO[Math.max(0, integrantes.findIndex((i) => i.sigla === sigla)) % COLORES_DARDO.length]

/**
 * Dónde cae un dardo en una diana de 240 × 240 (centro en 120, 120; radio útil 110).
 * La distancia al centro sale de z: +2 desvíos o más al centro, su promedio a la mitad, −2 o menos al borde.
 * Cada uno de los que le pasan tiene su porción de la diana (con 10° de margen) y sus discos se reparten en ella.
 */
export function posicionDardo(z: number, indice: number, total: number, porcion: number, porciones: number) {
  const r = Math.max(0.03, Math.min(1, (2 - z) / 4)) * 110
  const ancho = 360 / porciones
  const desde = 90 + porcion * ancho + 10
  const hasta = 90 + (porcion + 1) * ancho - 10
  const angulo = ((desde + ((hasta - desde) * (indice + 0.5)) / total) * Math.PI) / 180
  return { x: Math.round((120 + r * Math.cos(angulo)) * 10) / 10, y: Math.round((120 - r * Math.sin(angulo)) * 10) / 10 }
}

/** "El mejor tiro de la ronda: Facu a Manu con The Black Parade. Le puso 10, 3,3 más que su promedio. El más errado: …" */
export function frasePunteria(p: Informe['punteria']) {
  if (!p.mejor) return null
  const m = p.mejor
  const partes = [`El mejor tiro de la ronda: ${pila(m.de_nombre)} a ${pila(m.a_nombre)} con ${m.titulo}. Le puso ${m.puntaje}, ${String(m.sobre.toFixed(1)).replace('.', ',')} más que su promedio.`]
  const e = p.errado
  if (e && e.sobre < 0) {
    const conQuien = e.fallo_con_todos && e.oyentes > 1 ? (e.oyentes === 2 ? ', que falló con los dos' : ', que falló con todos') : `: ${pila(e.a_nombre)} le puso ${e.puntaje}`
    partes.push(`El más errado: ${pila(e.de_nombre)} con ${e.titulo}${conQuien}.`)
  }
  return partes.join(' ')
}

/** Qué falta para medir un tiro */
export const faltanTiro = (n: number, de: string) => `${n === 1 ? 'FALTA 1 DISCO' : `FALTAN ${n} DISCOS`} DE ${pila(de).toUpperCase()} PARA MEDIR EL TIRO.`

/** "6,9" */
export const unDecimal = (n: number) => n.toFixed(1).replace('.', ',')

// ── La placa del pasillo (Figma 02i, C86/Placa del pasillo 245:3935, HU-23) ──

type Favorito = { titulo: string; puntaje: number } | null

export type Placa =
  | { tipo: 'faltan'; de: string; vas: number }
  | { tipo: 'medido'; de: string; lePones: number; aTodo: number; etiqueta: string; favorito: Favorito; z: number }
  | { tipo: 'mano-a-mano'; de: string; lePones: number; teDevuelve: number | null; favorito: Favorito; z: number }

/** La etiqueta de la placa, desde quien escucha: TE PEGA, NO TE PEGA o PAREJO (los mismos cortes que etiquetaTiro) */
export function etiquetaPlaca(diferencia: number) {
  return { 'LE PEGA': 'TE PEGA', 'LE ERRA': 'NO TE PEGA', PAREJO: 'PAREJO' }[etiquetaTiro(diferencia)!]
}

/**
 * Lo que dice la placa debajo del pasillo de `de` para `yo` (siglas): cuánto le ponés a lo suyo y cuánto a todo.
 * En rondas de dos no hay "a todo" que comparar (todo lo que escuchaste es suyo): mano a mano, lo que te pone él a vos.
 * null si el informe no trae ese tiro.
 */
export function placaDelPasillo(i: Informe, yo: string, de: string): Placa | null {
  const tiro = i.punteria.tiros.find((t) => t.de === de && t.a === yo)
  if (!tiro) return null
  const nombre = pila(tiro.de_nombre)
  if (tiro.le_pone == null || tiro.a_todo == null || tiro.diferencia === null) return { tipo: 'faltan', de: nombre, vas: tiro.discos }
  const suyos = i.punteria.dardos.filter((d) => d.de === de && d.a === yo)
  const z = suyos.length ? suyos.reduce((s, d) => s + d.z, 0) / suyos.length : 0
  if (i.integrantes.length === 2) {
    const vuelta = i.punteria.tiros.find((t) => t.de === yo && t.a === de)
    return { tipo: 'mano-a-mano', de: nombre, lePones: tiro.le_pone, teDevuelve: vuelta?.le_pone ?? null, favorito: tiro.mejor, z }
  }
  return { tipo: 'medido', de: nombre, lePones: tiro.le_pone, aTodo: tiro.a_todo, etiqueta: etiquetaPlaca(tiro.diferencia), favorito: tiro.mejor, z }
}

/** El dardo de la mini diana (viewBox 240): a la distancia de su z, como en la grande, arriba a la derecha */
export function posicionPlaca(z: number) {
  const r = Math.max(0.03, Math.min(1, (2 - z) / 4)) * 110
  const a = Math.PI / 4
  return { x: Math.round((120 + r * Math.cos(a)) * 10) / 10, y: Math.round((120 - r * Math.sin(a)) * 10) / 10 }
}

/** Para la puntería del informe: en rondas de dos, "a todo" es lo mismo que "a lo de él" */
export const esManoAMano = (i: Informe) => i.integrantes.length === 2

export { pila as nombreCorto }
