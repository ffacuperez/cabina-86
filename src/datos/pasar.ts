import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { dosCifras } from '../lib/texto'

/** Quién y cuándo pasó un disco en esta ronda (RN-11) */
export type YaPasado = { por: string; por_mi: boolean; el: string }

/** Un resultado de buscar_discos (T-09) */
export type DiscoEncontrado = {
  deezer_id: number
  titulo: string
  artista: string
  anio: number | null
  /** null = S/T */
  tapa_url: string | null
  cantidad_temas: number | null
  ya_pasado: YaPasado | null
}

/** Lo que devuelve pasar_disco (T-10) */
export type PaseHecho = {
  pase: { id: string; numero: number; catalogo: string; tarjetita: string; creado_en: string }
  disco: { id: string; deezer_id: number; titulo: string; artista: string; anio: number | null; tapa_url: string | null }
}

/** S-01 */
export const MAX_TARJETITA = 200

/** Error de una Edge Function con el mensaje que manda la función */
export class ErrorDeFuncion extends Error {
  readonly status: number
  readonly cuerpo: Record<string, unknown>
  constructor(mensaje: string, status: number, cuerpo: Record<string, unknown>) {
    super(mensaje)
    this.name = 'ErrorDeFuncion'
    this.status = status
    this.cuerpo = cuerpo
  }
}

async function llamar<T>(funcion: string, body: Record<string, unknown>, signal?: AbortSignal): Promise<T> {
  const { data, error } = await supabase.functions.invoke(funcion, { body, signal })
  if (!error) return data as T
  if (error instanceof FunctionsHttpError) {
    const respuesta = error.context as Response
    const cuerpo = (await respuesta.json().catch(() => ({}))) as Record<string, unknown>
    throw new ErrorDeFuncion(typeof cuerpo.error === 'string' ? cuerpo.error : 'Algo salió mal', respuesta.status, cuerpo)
  }
  throw error
}

/** HU-07: busca en Deezer, con los repetidos de esta ronda marcados */
export async function buscarDiscos(q: string, rondaId: string, signal?: AbortSignal) {
  const { discos } = await llamar<{ discos: DiscoEncontrado[] }>('buscar_discos', { q, ronda_id: rondaId }, signal)
  return discos
}

/** Justo lo pasó otro mientras escribías la tarjetita */
export class YaSePaso extends Error {
  readonly yaPasado: YaPasado | null
  constructor(yaPasado: YaPasado | null) {
    super('Ese disco ya se pasó en esta ronda')
    this.name = 'YaSePaso'
    this.yaPasado = yaPasado
  }
}

/** HU-08: pasa el disco a toda la ronda */
export async function pasarDisco(rondaId: string, deezerId: number, tarjetita: string) {
  try {
    return await llamar<PaseHecho>('pasar_disco', { ronda_id: rondaId, deezer_id: deezerId, tarjetita })
  } catch (e) {
    if (e instanceof ErrorDeFuncion && e.status === 409) throw new YaSePaso((e.cuerpo.ya_pasado as YaPasado) ?? null)
    throw e
  }
}

/** S-02: el catálogo que va a tener mi próximo pase en esta ronda (FAC-05) */
export async function proximoCatalogo(rondaId: string, uid: string, sigla: string) {
  const { data, error } = await supabase
    .from('pases')
    .select('numero')
    .eq('ronda_id', rondaId)
    .eq('pasado_por', uid)
    .order('numero', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return `${sigla}-${dosCifras(((data as { numero: number } | null)?.numero ?? 0) + 1)}`
}
