// Cabina 86 · T-09 · buscar_discos
// Busca álbumes en Deezer para Pasar (HU-07) y marca los que ya se pasaron en esta ronda (RN-11):
// "Ya lo pasó Manu el 12/08". Un disco pasado en otra ronda se puede elegir normalmente.
//
// POST { q: "dinastía scorp", ronda_id: "<uuid>" }  con la sesión del usuario (Authorization: Bearer ...)
// 200 { discos: [{ deezer_id, titulo, artista, anio, tapa_url, cantidad_temas, ya_pasado }] }
// 400 pedido mal armado · 401 sin sesión · 403 no estás en esa ronda · 502 Deezer no responde
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.58.0'
import { buscarAlbumes, DeezerNoResponde, type DiscoEncontrado, type Pedir } from '../_shared/deezer.ts'
import { clienteDeQuienLlama, CORS, error, json } from '../_shared/http.ts'

/** Cuántos resultados se muestran (cada uno pide además su detalle a Deezer, para el año) */
export const LIMITE = 8
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type YaPasado = {
  /** Nombre de pila de quien lo pasó */
  por: string
  /** Lo pasé yo: "Ya lo pasaste vos" */
  por_mi: boolean
  /** Cuándo (ISO) */
  el: string
}
export type Resultado = DiscoEncontrado & { ya_pasado: YaPasado | null }

type PaseExistente = { deezer_id: number; pasado_por: string; nombre: string; creado_en: string }

/** Lo que la búsqueda necesita de la base, consultado como quien llama (RLS). */
export type Base = {
  estoyEnLaRonda(rondaId: string): Promise<boolean>
  pasesDe(rondaId: string, deezerIds: number[]): Promise<PaseExistente[]>
}

export function baseDe(db: SupabaseClient): Base {
  return {
    async estoyEnLaRonda(rondaId) {
      // RLS: solo devuelve la ronda si soy integrante
      const { data, error: fallo } = await db.from('rondas').select('id').eq('id', rondaId).maybeSingle()
      if (fallo) throw fallo
      return data !== null
    },
    async pasesDe(rondaId, deezerIds) {
      if (deezerIds.length === 0) return []
      const { data, error: fallo } = await db
        .from('pases')
        .select('creado_en, pasado_por, discos!inner(deezer_id)')
        .eq('ronda_id', rondaId)
        .in('discos.deezer_id', deezerIds)
      if (fallo) throw fallo
      const pases = (data ?? []) as unknown as { creado_en: string; pasado_por: string; discos: { deezer_id: number } }[]
      if (pases.length === 0) return []
      const ids = [...new Set(pases.map((p) => p.pasado_por))]
      const { data: usuarios, error: falloUsuarios } = await db.from('usuarios').select('id, nombre').in('id', ids)
      if (falloUsuarios) throw falloUsuarios
      const nombres = new Map((usuarios ?? []).map((u: { id: string; nombre: string }) => [u.id, u.nombre]))
      return pases.map((p) => ({
        deezer_id: p.discos.deezer_id,
        pasado_por: p.pasado_por,
        nombre: nombres.get(p.pasado_por) ?? '',
        creado_en: p.creado_en,
      }))
    },
  }
}

const nombreDePila = (nombre: string) => nombre.trim().split(/\s+/)[0] || 'alguien'

/** La búsqueda en sí: Deezer + marcar los que ya se pasaron en esta ronda. */
export async function buscar(q: string, rondaId: string, uid: string, base: Base, pedir: Pedir): Promise<Resultado[]> {
  const discos = await buscarAlbumes(q, LIMITE, pedir)
  const pases = await base.pasesDe(rondaId, discos.map((d) => d.deezer_id))
  const porDisco = new Map(pases.map((p) => [p.deezer_id, p]))
  return discos.map((d) => {
    const pase = porDisco.get(d.deezer_id)
    return {
      ...d,
      ya_pasado: pase ? { por: nombreDePila(pase.nombre), por_mi: pase.pasado_por === uid, el: pase.creado_en } : null,
    }
  })
}

export type Dependencias = {
  quienLlama: (req: Request) => Promise<{ base: Base; uid: string } | null>
  pedir: Pedir
}

const porDefecto: Dependencias = {
  async quienLlama(req) {
    const quien = await clienteDeQuienLlama(req)
    return quien && { base: baseDe(quien.db), uid: quien.uid }
  },
  pedir: fetch,
}

export async function manejar(req: Request, deps: Dependencias = porDefecto): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return error('Usá POST', 405)

  let cuerpo: { q?: unknown; ronda_id?: unknown }
  try {
    cuerpo = await req.json()
  } catch {
    return error('El pedido tiene que ser JSON', 400)
  }
  const q = typeof cuerpo.q === 'string' ? cuerpo.q.trim() : ''
  const rondaId = typeof cuerpo.ronda_id === 'string' ? cuerpo.ronda_id : ''
  if (q.length < 2 || q.length > 100) return error('Escribí entre 2 y 100 letras', 400)
  if (!UUID.test(rondaId)) return error('Falta la ronda', 400)

  const quien = await deps.quienLlama(req)
  if (!quien) return error('Hay que iniciar sesión', 401)

  try {
    if (!(await quien.base.estoyEnLaRonda(rondaId))) return error('No estás en esa ronda', 403)
    const discos = await buscar(q, rondaId, quien.uid, quien.base, deps.pedir)
    return json({ discos })
  } catch (e) {
    if (e instanceof DeezerNoResponde) {
      console.error(e.message)
      return error('Deezer no responde. Probá de nuevo en un rato.', 502)
    }
    console.error(e)
    return error('No pudimos buscar. Probá de nuevo.', 500)
  }
}

if (import.meta.main) Deno.serve((req) => manejar(req))
