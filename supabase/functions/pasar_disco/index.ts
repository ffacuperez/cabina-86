// Cabina 86 · T-10 · pasar_disco
// Pasa un disco a la ronda (HU-08): guarda el disco desde Deezer una sola vez (RN-09)
// y crea el pase a nombre de quien llama, con su tarjetita (S-01) y su número de catálogo (S-02).
// No hay destinatario: va a toda la ronda (RN-03). No se repite en la misma ronda (RN-11).
//
// POST { ronda_id: "<uuid>", deezer_id: 101, tarjetita: "Escuchalo entero" }  con la sesión del usuario
// 201 { pase: { id, numero, catalogo, tarjetita, creado_en }, disco: { id, deezer_id, titulo, artista, anio, tapa_url } }
// 400 pedido mal armado · 401 sin sesión · 403 no estás en esa ronda
// 404 Deezer no tiene ese disco · 409 ya se pasó en esta ronda · 502 Deezer no responde
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.58.0'
import { DeezerNoLoTiene, DeezerNoResponde, type DiscoCompleto, type Pedir, traerAlbum } from '../_shared/deezer.ts'
import { clienteDeQuienLlama, clienteDeServicio, CORS, error, json } from '../_shared/http.ts'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
/** S-01: la tarjetita es obligatoria y tiene hasta 200 caracteres */
export const MAX_TARJETITA = 200

export type DiscoGuardado = {
  id: string
  deezer_id: number
  titulo: string
  artista: string
  anio: number | null
  tapa_url: string | null
}
export type PaseCreado = { id: string; numero: number; tarjetita: string; creado_en: string }
export type PaseAnterior = { por: string; por_mi: boolean; el: string }

/** Ya hay un pase de ese disco en la ronda (el chequeo previo o la restricción única de la base) */
export class YaSePaso extends Error {
  constructor() {
    super('Ese disco ya se pasó en esta ronda')
    this.name = 'YaSePaso'
  }
}

/** Lo que la función necesita de la base. Todo como quien llama (RLS), salvo guardar el disco. */
export type Base = {
  estoyEnLaRonda(rondaId: string): Promise<boolean>
  /** Mi sigla en la ronda: FAC de FAC-05 */
  miSigla(rondaId: string, uid: string): Promise<string>
  paseAnterior(rondaId: string, deezerId: number, uid: string): Promise<PaseAnterior | null>
  discoGuardado(deezerId: number): Promise<DiscoGuardado | null>
  /** Con la clave secreta: el catálogo no se escribe desde la app */
  guardarDisco(disco: DiscoCompleto): Promise<DiscoGuardado>
  /** Lanza YaSePaso si la base rechaza el repetido (dos personas a la vez) */
  crearPase(rondaId: string, discoId: string, tarjetita: string): Promise<PaseCreado>
}

const COLUMNAS_DISCO = 'id, deezer_id, titulo, artista, anio, tapa_url'
const nombreDePila = (nombre: string) => nombre.trim().split(/\s+/)[0] || 'alguien'

export function baseDe(db: SupabaseClient, servicio: () => SupabaseClient): Base {
  return {
    async estoyEnLaRonda(rondaId) {
      const { data, error: fallo } = await db.from('rondas').select('id').eq('id', rondaId).maybeSingle()
      if (fallo) throw fallo
      return data !== null
    },
    async miSigla(rondaId, uid) {
      const { data, error: fallo } = await db
        .from('miembros_ronda')
        .select('sigla')
        .eq('ronda_id', rondaId)
        .eq('usuario_id', uid)
        .single()
      if (fallo) throw fallo
      return (data as { sigla: string }).sigla
    },
    async paseAnterior(rondaId, deezerId, uid) {
      const { data, error: fallo } = await db
        .from('pases')
        .select('creado_en, pasado_por, discos!inner(deezer_id)')
        .eq('ronda_id', rondaId)
        .eq('discos.deezer_id', deezerId)
        .maybeSingle()
      if (fallo) throw fallo
      if (!data) return null
      const pase = data as unknown as { creado_en: string; pasado_por: string }
      const { data: usuario } = await db.from('usuarios').select('nombre').eq('id', pase.pasado_por).maybeSingle()
      return {
        por: nombreDePila((usuario as { nombre: string } | null)?.nombre ?? ''),
        por_mi: pase.pasado_por === uid,
        el: pase.creado_en,
      }
    },
    async discoGuardado(deezerId) {
      const { data, error: fallo } = await db.from('discos').select(COLUMNAS_DISCO).eq('deezer_id', deezerId).maybeSingle()
      if (fallo) throw fallo
      return data as DiscoGuardado | null
    },
    async guardarDisco(disco) {
      // Si otro lo guardó recién, se queda el que ya estaba (RN-09: una sola vez)
      const { data, error: fallo } = await servicio()
        .from('discos')
        .upsert(disco, { onConflict: 'deezer_id', ignoreDuplicates: true })
        .select(COLUMNAS_DISCO)
        .maybeSingle()
      if (fallo) throw fallo
      if (data) return data as DiscoGuardado
      const { data: existente, error: falloExistente } = await servicio()
        .from('discos')
        .select(COLUMNAS_DISCO)
        .eq('deezer_id', disco.deezer_id)
        .single()
      if (falloExistente) throw falloExistente
      return existente as DiscoGuardado
    },
    async crearPase(rondaId, discoId, tarjetita) {
      // pasado_por lo pone la base (auth.uid()) y el número, su trigger
      const { data, error: fallo } = await db
        .from('pases')
        .insert({ ronda_id: rondaId, disco_id: discoId, tarjetita })
        .select('id, numero, tarjetita, creado_en')
        .single()
      if (fallo?.code === '23505') throw new YaSePaso()
      if (fallo) throw fallo
      return data as PaseCreado
    },
  }
}

/** FAC-05 */
export const catalogo = (sigla: string, numero: number) => `${sigla}-${String(numero).padStart(2, '0')}`

export type Pedido = { rondaId: string; deezerId: number; tarjetita: string }

/** Valida el cuerpo del pedido. Devuelve el mensaje de error o el pedido limpio. */
export function leerPedido(cuerpo: unknown): Pedido | string {
  const c = (cuerpo ?? {}) as { ronda_id?: unknown; deezer_id?: unknown; tarjetita?: unknown }
  const rondaId = typeof c.ronda_id === 'string' ? c.ronda_id : ''
  const deezerId = c.deezer_id
  const tarjetita = typeof c.tarjetita === 'string' ? c.tarjetita.trim() : ''
  if (!UUID.test(rondaId)) return 'Falta la ronda'
  if (typeof deezerId !== 'number' || !Number.isSafeInteger(deezerId) || deezerId <= 0) return 'Falta el disco'
  if (tarjetita.length === 0) return 'Escribí la tarjetita'
  if ([...tarjetita].length > MAX_TARJETITA) return `La tarjetita tiene hasta ${MAX_TARJETITA} caracteres`
  return { rondaId, deezerId, tarjetita }
}

export type Resultado =
  | { yaPasado: PaseAnterior }
  | { pase: PaseCreado & { catalogo: string }; disco: DiscoGuardado }

/** El pase en sí: chequeos, disco (guardado o desde Deezer) y pase. */
export async function pasar(pedido: Pedido, uid: string, base: Base, pedir: Pedir): Promise<Resultado> {
  const { rondaId, deezerId, tarjetita } = pedido
  const anterior = await base.paseAnterior(rondaId, deezerId, uid)
  if (anterior) return { yaPasado: anterior }

  const disco = (await base.discoGuardado(deezerId)) ?? (await base.guardarDisco(await traerAlbum(deezerId, pedir)))
  const pase = await base.crearPase(rondaId, disco.id, tarjetita)
  const sigla = await base.miSigla(rondaId, uid)
  return { pase: { ...pase, catalogo: catalogo(sigla, pase.numero) }, disco }
}

export type Dependencias = {
  quienLlama: (req: Request) => Promise<{ base: Base; uid: string } | null>
  pedir: Pedir
}

const porDefecto: Dependencias = {
  async quienLlama(req) {
    const quien = await clienteDeQuienLlama(req)
    return quien && { base: baseDe(quien.db, clienteDeServicio), uid: quien.uid }
  },
  pedir: fetch,
}

function yaSePasoRespuesta(anterior: PaseAnterior | null) {
  return json({ error: 'Ese disco ya se pasó en esta ronda', ya_pasado: anterior }, 409)
}

export async function manejar(req: Request, deps: Dependencias = porDefecto): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return error('Usá POST', 405)

  let cuerpo: unknown
  try {
    cuerpo = await req.json()
  } catch {
    return error('El pedido tiene que ser JSON', 400)
  }
  const pedido = leerPedido(cuerpo)
  if (typeof pedido === 'string') return error(pedido, 400)

  const quien = await deps.quienLlama(req)
  if (!quien) return error('Hay que iniciar sesión', 401)

  try {
    if (!(await quien.base.estoyEnLaRonda(pedido.rondaId))) return error('No estás en esa ronda', 403)
    const resultado = await pasar(pedido, quien.uid, quien.base, deps.pedir)
    if ('yaPasado' in resultado) return yaSePasoRespuesta(resultado.yaPasado)
    return json(resultado, 201)
  } catch (e) {
    if (e instanceof YaSePaso) {
      // Otro lo pasó en el mismo momento: se avisa quién
      return yaSePasoRespuesta(await quien.base.paseAnterior(pedido.rondaId, pedido.deezerId, quien.uid).catch(() => null))
    }
    if (e instanceof DeezerNoLoTiene) return error('Deezer no tiene ese disco', 404)
    if (e instanceof DeezerNoResponde) {
      console.error(e.message)
      return error('Deezer no responde. Probá de nuevo en un rato.', 502)
    }
    console.error(e)
    return error('No pudimos pasar el disco. Probá de nuevo.', 500)
  }
}

if (import.meta.main) Deno.serve((req) => manejar(req))
