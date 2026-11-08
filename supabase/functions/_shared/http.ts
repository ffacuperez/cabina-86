// Cabina 86 · Lo común de las Edge Functions: CORS, respuestas JSON y quién llama.
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.58.0'

// La app llama desde su dominio y desde los previews de Vercel: se acepta cualquier origen,
// la seguridad la da el token de la sesión, no el origen.
export const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export function json(cuerpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(cuerpo), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8' },
  })
}

export function error(mensaje: string, status: number): Response {
  return json({ error: mensaje }, status)
}

/** Clave pública del proyecto: la legacy (anon) o la publicable nueva, según cuál exponga Supabase. */
function clavePublica(req: Request): string | undefined {
  const anon = Deno.env.get('SUPABASE_ANON_KEY')
  if (anon) return anon
  try {
    const nuevas = JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS') ?? '{}') as Record<string, string>
    if (nuevas.default) return nuevas.default
  } catch {
    // sigue con la del pedido
  }
  return req.headers.get('apikey') ?? undefined
}

/**
 * Un cliente de Supabase que actúa como quien llama: las consultas pasan por RLS como en la app.
 * null si no hay sesión válida. El token se valida acá (verify_jwt = false en config.toml),
 * así funciona con las claves de firma nuevas de Supabase.
 */
export async function clienteDeQuienLlama(req: Request): Promise<{ db: SupabaseClient; uid: string } | null> {
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
  const url = Deno.env.get('SUPABASE_URL')
  const clave = clavePublica(req)
  if (!token || !url || !clave) return null
  const db = createClient(url, clave, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error: fallo } = await db.auth.getUser(token)
  if (fallo || !data.user) return null
  return { db, uid: data.user.id }
}
