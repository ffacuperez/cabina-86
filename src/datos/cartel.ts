import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { enLista } from '../lib/texto'
import type { DiscoEnEstante, Pasillo } from './exhibidor'
import type { RondaActual } from './ronda'

/**
 * HU-19 · La cabina dice (Figma 02h, variante B): el cartel debajo de cada estante.
 * El texto lo escribe la IA (Edge Function resumir_pasillo) sobre la última tanda de esa persona; mientras no hay
 * uno al día, o si la IA falla, va una frase armada con los mismos datos. Nunca usa puntajes ni notas (RN-01).
 */

/** La tanda: lo que pasó en los 3 días antes de su último pase (igual que en resumir_pasillo) */
export const DIAS_DE_TANDA = 3
/** Con más de esto sin pasar nada, el cartel lo dice */
export const DIAS_QUIETO = 30

const DIA = 24 * 60 * 60 * 1000

export type Tanda = {
  /** creado_en de su último pase: si el resumen guardado no es de este, está viejo */
  hasta: string
  /** Del más nuevo al más viejo */
  discos: DiscoEnEstante[]
}

/** Todo lo que me pasó esa persona, del más nuevo al más viejo (estante y archivo) */
function todos(p: Pasillo) {
  return [...p.discos, ...p.archivados].sort((a, b) => Date.parse(b.creadoEn) - Date.parse(a.creadoEn))
}

export function tandaDe(p: Pasillo): Tanda | null {
  const discos = todos(p)
  if (discos.length === 0) return null
  const desde = Date.parse(discos[0].creadoEn) - DIAS_DE_TANDA * DIA
  return { hasta: discos[0].creadoEn, discos: discos.filter((d) => Date.parse(d.creadoEn) >= desde) }
}

/** "TANDA DEL 12/11 · 3 DISCOS", y si está quieto hace mucho, "· HACE 2 MESES SIN PASAR NADA" */
export function pieDelCartel(t: Tanda, hoy = new Date()) {
  const fecha = new Date(t.hasta)
  const dia = `${String(fecha.getDate()).padStart(2, '0')}/${String(fecha.getMonth() + 1).padStart(2, '0')}`
  const partes = [`TANDA DEL ${dia}`, t.discos.length === 1 ? '1 DISCO' : `${t.discos.length} DISCOS`]
  const dias = Math.floor((hoy.getTime() - fecha.getTime()) / DIA)
  if (dias > DIAS_QUIETO) {
    const meses = Math.floor(dias / 30)
    partes.push(`HACE ${meses >= 2 ? `${meses} MESES` : `${dias} DÍAS`} SIN PASAR NADA`)
  }
  return partes.join(' · ')
}

/** Cada pasillo tiene su frase y cambia con la tanda, no cada vez que entrás */
function numeroDe(texto: string) {
  let h = 0
  for (const c of texto) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return h
}

const decada = (anio: number) => Math.floor(anio / 10) * 10
/** "los 70", pero "los 2000" y "los 2010" */
const nombreDeDecada = (d: number) => (d >= 2000 ? String(d) : String(d).slice(2))
const corto = (anio: number) => `'${String(anio).slice(2)}`

/**
 * La frase armada, sin IA: qué pasó y un dato de la tanda (las décadas, un artista que repite).
 * Solo títulos, artistas y años, como la IA.
 */
export function fraseArmada(p: Pasillo, t: Tanda): string {
  const nombre = p.de.nombre
  const titulos = t.discos.map((d) => d.titulo)
  const lista = titulos.length > 3 ? `${titulos.slice(0, 2).join(', ')} y ${titulos.length - 2} más` : enLista(titulos)
  const primera = titulos.length === 1 ? `${nombre} pasó ${lista}, de ${t.discos[0].artista}.` : `${nombre} pasó ${lista}.`

  const extras: string[] = []
  const anios = t.discos.map((d) => d.anio).filter((a): a is number => a !== null)
  if (anios.length > 0) {
    const min = Math.min(...anios)
    const max = Math.max(...anios)
    if (decada(min) === decada(max)) extras.push(`Todo de los ${nombreDeDecada(decada(min))}.`)
    else extras.push(`Del ${corto(min)} al ${corto(max)}.`)
  }
  // Un artista de la tanda que ya había pasado antes
  const antes = todos(p).slice(t.discos.length)
  const repite = t.discos.find((d) => antes.some((a) => a.artista === d.artista))
  if (repite) extras.push(`Otra vez ${repite.artista}.`)
  const enLaTanda = new Map<string, number>()
  for (const d of t.discos) enLaTanda.set(d.artista, (enLaTanda.get(d.artista) ?? 0) + 1)
  const doble = [...enLaTanda].find(([, n]) => n > 1)
  if (doble) extras.push(`${doble[0]} por partida doble.`)

  if (extras.length === 0) return primera
  return `${primera} ${extras[numeroDe(`${p.de.id}:${t.hasta}`) % extras.length]}`
}

type Guardado = { pasado_por: string; texto: string | null; tanda_hasta: string }

/**
 * Los resúmenes de la IA que están al día con la última tanda de cada pasillo, por persona.
 * Los que faltan o quedaron viejos se piden a resumir_pasillo en segundo plano (una vez por visita):
 * cuando llega uno nuevo, el cartel lo muestra sin recargar.
 */
export function useResumenes(ronda: RondaActual, pasillos: Pasillo[] | null) {
  const [porPersona, setPorPersona] = useState<Map<string, string>>(new Map())
  // Lo que identifica las tandas de esta visita: si no cambian, no se vuelve a pedir nada
  const tandas = (pasillos ?? []).map((p) => [p.de.id, tandaDe(p)?.hasta ?? ''] as const).filter(([, h]) => h)
  const clave = tandas.map(([id, h]) => `${id}:${h}`).join('|')

  useEffect(() => {
    if (!clave) return
    const visita = { vigente: true }
    const lista = clave.split('|').map((x) => x.split(/:(.+)/)) as [string, string][]
    const alDia = (r: { texto: string | null; tanda_hasta: string } | null | undefined, hasta: string) =>
      r?.texto && Date.parse(r.tanda_hasta) === Date.parse(hasta) ? r.texto : null

    supabase
      .from('resumenes_pasillo')
      .select('pasado_por, texto, tanda_hasta')
      .eq('ronda_id', ronda.id)
      .then(({ data, error }) => {
        if (!visita.vigente) return
        // Sin la tabla todavía (o sin red), quedan las frases armadas
        const guardados = new Map(((error ? [] : data) as Guardado[]).map((r) => [r.pasado_por, r]))
        const listos = new Map<string, string>()
        for (const [id, hasta] of lista) {
          const texto = alDia(guardados.get(id), hasta)
          if (texto) listos.set(id, texto)
          else pedirResumen(id, hasta)
        }
        setPorPersona(listos)
      })

    function pedirResumen(id: string, hasta: string) {
      supabase.functions
        .invoke('resumir_pasillo', { body: { ronda_id: ronda.id, pasado_por: id } })
        .then(({ data }) => {
          const texto = alDia((data as { resumen?: Guardado | null } | null)?.resumen, hasta)
          if (visita.vigente && texto) setPorPersona((antes) => new Map(antes).set(id, texto))
        })
        .catch(() => {})
    }

    return () => {
      visita.vigente = false
    }
  }, [ronda.id, clave])

  return porPersona
}
