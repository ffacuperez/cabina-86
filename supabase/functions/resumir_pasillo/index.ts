// Cabina 86 · HU-19 · resumir_pasillo
// "La cabina dice": rehace el resumen del pasillo de una persona en una ronda, de su última tanda
// (los discos de los 3 días antes de su último pase), con sus últimos discos como contexto.
// Lo escribe Gemini (nivel gratis) con solo título, artista y año: ni tarjetitas, ni puntajes, ni notas
// (RN-01), ni el nombre de nadie (va el marcador {NOMBRE}, que se reemplaza acá).
//
// Lo llama el exhibidor cuando ve un resumen viejo o que falta. Si ya está al día, no llama a la IA.
// Si la IA falla, guarda el intento sin texto y no insiste por una hora: la app muestra una frase armada.
//
// POST { ronda_id: "<uuid>", pasado_por: "<uuid>" }  con la sesión del usuario
// 200 { resumen: { texto, tanda_hasta, generado_en } | null }
// 400 pedido mal armado · 401 sin sesión · 403 no estás en esa ronda
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.58.0'
import { clienteDeQuienLlama, clienteDeServicio, CORS, error, json } from '../_shared/http.ts'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
/** La tanda: lo que pasó en estos días antes de su último pase (cargan de a 3, a veces en días seguidos) */
export const DIAS_DE_TANDA = 3
/** Cuántos de sus últimos discos ve la IA como contexto */
export const CONTEXTO = 15
/** Si la IA falló, no se vuelve a probar hasta dentro de una hora */
export const ESPERA_SI_FALLA_MS = 60 * 60 * 1000
/** Dos exhibidores abiertos a la vez no piden el mismo resumen dos veces */
export const ESPERA_ENTRE_INTENTOS_MS = 60 * 1000
export const LARGO_MAXIMO = 300
export const MARCADOR = '{NOMBRE}'

export type PaseDelPasillo = { creado_en: string; titulo: string; artista: string; anio: number | null }
export type Resumen = { texto: string | null; tanda_hasta: string; generado_en: string | null; intentado_en: string }

/** Lo que la función necesita de la base. Leer y escribir el resumen va con la clave secreta. */
export type Base = {
  estoyEnLaRonda(rondaId: string): Promise<boolean>
  /** Si esa persona está en la ronda (si no, no hay pasillo) */
  estaEnLaRonda(rondaId: string, uid: string): Promise<boolean>
  /** Sus últimos pases en la ronda, del más nuevo al más viejo */
  pasesDe(rondaId: string, uid: string, cuantos: number): Promise<PaseDelPasillo[]>
  resumen(rondaId: string, uid: string): Promise<Resumen | null>
  guardar(rondaId: string, uid: string, r: Resumen): Promise<void>
  nombreDe(uid: string): Promise<string>
}

/** Escribe el texto: recibe las instrucciones y el pedido, devuelve lo que escribió la IA */
export type Escribir = (instrucciones: string, pedido: string) => Promise<string>

export class IaNoResponde extends Error {
  constructor(detalle: string) {
    super(`La IA no respondió: ${detalle}`)
    this.name = 'IaNoResponde'
  }
}

export const nombreDePila = (nombre: string) => nombre.trim().split(/\s+/)[0] || 'alguien'

export function baseDe(db: SupabaseClient, servicio: () => SupabaseClient): Base {
  return {
    async estoyEnLaRonda(rondaId) {
      const { data, error: fallo } = await db.from('rondas').select('id').eq('id', rondaId).maybeSingle()
      if (fallo) throw fallo
      return data !== null
    },
    async estaEnLaRonda(rondaId, uid) {
      const { data, error: fallo } = await db
        .from('miembros_ronda')
        .select('usuario_id')
        .eq('ronda_id', rondaId)
        .eq('usuario_id', uid)
        .maybeSingle()
      if (fallo) throw fallo
      return data !== null
    },
    async pasesDe(rondaId, uid, cuantos) {
      const { data, error: fallo } = await db
        .from('pases')
        .select('creado_en, discos(titulo, artista, anio)')
        .eq('ronda_id', rondaId)
        .eq('pasado_por', uid)
        .order('creado_en', { ascending: false })
        .limit(cuantos)
      if (fallo) throw fallo
      return ((data ?? []) as unknown as { creado_en: string; discos: { titulo: string; artista: string; anio: number | null } | null }[])
        .map((p) => ({ creado_en: p.creado_en, titulo: p.discos?.titulo ?? '', artista: p.discos?.artista ?? '', anio: p.discos?.anio ?? null }))
    },
    async resumen(rondaId, uid) {
      const { data, error: fallo } = await db
        .from('resumenes_pasillo')
        .select('texto, tanda_hasta, generado_en, intentado_en')
        .eq('ronda_id', rondaId)
        .eq('pasado_por', uid)
        .maybeSingle()
      if (fallo) throw fallo
      return data as Resumen | null
    },
    async guardar(rondaId, uid, r) {
      const { error: fallo } = await servicio()
        .from('resumenes_pasillo')
        .upsert({ ronda_id: rondaId, pasado_por: uid, ...r }, { onConflict: 'ronda_id,pasado_por' })
      if (fallo) throw fallo
    },
    async nombreDe(uid) {
      const { data } = await db.from('usuarios').select('nombre').eq('id', uid).maybeSingle()
      return nombreDePila((data as { nombre: string } | null)?.nombre ?? '')
    },
  }
}

/** La última tanda: los pases de los DIAS_DE_TANDA días antes del último (vienen del más nuevo al más viejo) */
export function tandaDe(pases: PaseDelPasillo[]): PaseDelPasillo[] {
  if (pases.length === 0) return []
  const desde = Date.parse(pases[0].creado_en) - DIAS_DE_TANDA * 24 * 60 * 60 * 1000
  return pases.filter((p) => Date.parse(p.creado_en) >= desde)
}

/** La voz de la cabina. Se ajusta acá, sin tocar el resto. */
export const INSTRUCCIONES = `Sos la voz de Cabina 86, una disquería de barrio que comparten un grupo de amigos de Córdoba, Argentina.
Escribís el cartelito que va debajo del pasillo de una persona: un comentario sobre los últimos discos que pasó a la ronda.

Cómo escribís:
- Español rioplatense, con voseo. Tono cómplice, con humor seco, como un vendedor de disquería que conoce a sus clientes.
- Una o dos oraciones, en total menos de 200 caracteres.
- Hablá sobre todo de la última tanda. Si sirve, compará con lo que venía pasando antes (fiel a lo suyo, se fue de su zona, otra vez el mismo artista).
- Nombrá a la persona solo como ${MARCADOR}, tal cual, sin cambiarlo.
- Podés usar lo que sabés de los artistas (época, estilo, país) solo si estás seguro. No inventes datos de los discos.
- No digas si los discos son buenos o malos ni recomiendes un orden de escucha.
- Sin comillas, sin emojis, sin hashtags, sin títulos ni listas: solo el texto del cartel.`

const disco = (p: PaseDelPasillo) => `- ${p.titulo} — ${p.artista}${p.anio ? ` (${p.anio})` : ''}`

/** El pedido para la IA: la tanda y, aparte, lo que venía pasando. Sin tarjetitas, notas ni nombres. */
export function pedidoDe(pases: PaseDelPasillo[]): string {
  const tanda = tandaDe(pases)
  const antes = pases.slice(tanda.length)
  const fecha = new Date(pases[0].creado_en).toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Cordoba' })
  return [
    `Última tanda de ${MARCADOR} (${tanda.length === 1 ? '1 disco' : `${tanda.length} discos`}, hasta el ${fecha}):`,
    ...tanda.map(disco),
    ...(antes.length ? ['', 'Lo que venía pasando antes:', ...antes.map(disco)] : []),
  ].join('\n')
}

/** Limpia lo que escribió la IA y pone el nombre donde va el marcador */
export function limpiar(texto: string, nombre: string): string | null {
  let t = texto
    .replace(/[*_#`"“”«»]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  t = t.replaceAll(MARCADOR, nombre).replace(/\{\s*nombre\s*\}/gi, nombre)
  if (t.length === 0) return null
  if (t.length > LARGO_MAXIMO) {
    // Corta en la última oración que entra; si no hay, en la última palabra
    const corto = t.slice(0, LARGO_MAXIMO)
    const punto = corto.lastIndexOf('.')
    t = punto > 60 ? corto.slice(0, punto + 1) : `${corto.slice(0, corto.lastIndexOf(' '))}…`
  }
  return t
}

/**
 * El resumen en sí. Devuelve el que queda guardado (o null si todavía no hay ninguno bueno).
 * `ahora` se inyecta para poder probar las esperas.
 */
export async function resumir(rondaId: string, uid: string, base: Base, escribir: Escribir, ahora = Date.now()) {
  const pases = await base.pasesDe(rondaId, uid, CONTEXTO)
  if (pases.length === 0) return null
  const tandaHasta = pases[0].creado_en
  const actual = await base.resumen(rondaId, uid)
  const mismaTanda = actual !== null && Date.parse(actual.tanda_hasta) === Date.parse(tandaHasta)
  if (mismaTanda && actual.texto !== null) return actual
  if (actual !== null) {
    const desdeElIntento = ahora - Date.parse(actual.intentado_en)
    if (mismaTanda && desdeElIntento < ESPERA_SI_FALLA_MS) return null
    if (desdeElIntento < ESPERA_ENTRE_INTENTOS_MS) return mismaTanda ? actual : null
  }

  const intentadoEn = new Date(ahora).toISOString()
  let texto: string | null = null
  try {
    texto = limpiar(await escribir(INSTRUCCIONES, pedidoDe(pases)), await base.nombreDe(uid))
  } catch (e) {
    console.error(e instanceof Error ? e.message : e)
  }
  const nuevo: Resumen = { texto, tanda_hasta: tandaHasta, generado_en: texto ? intentadoEn : null, intentado_en: intentadoEn }
  await base.guardar(rondaId, uid, nuevo)
  return texto ? nuevo : null
}

/** Gemini, nivel gratis. El modelo se puede cambiar con el secreto GEMINI_MODELO sin tocar el código. */
export function gemini(clave: string, modelo: string, pedir: typeof fetch = fetch): Escribir {
  return async (instrucciones, pedido) => {
    let r: Response
    try {
      r = await pedir(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': clave },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: instrucciones }] },
          contents: [{ role: 'user', parts: [{ text: pedido }] }],
          generationConfig: { temperature: 0.9, maxOutputTokens: 400 },
        }),
        signal: AbortSignal.timeout(20_000),
      })
    } catch (e) {
      throw new IaNoResponde(e instanceof Error ? e.message : String(e))
    }
    if (!r.ok) throw new IaNoResponde(`${r.status} ${(await r.text()).slice(0, 200)}`)
    const cuerpo = (await r.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] }
    const texto = cuerpo.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? ''
    if (!texto.trim()) throw new IaNoResponde('respuesta vacía')
    return texto
  }
}

export type Pedido = { rondaId: string; pasadoPor: string }

export function leerPedido(cuerpo: unknown): Pedido | string {
  const c = (cuerpo ?? {}) as { ronda_id?: unknown; pasado_por?: unknown }
  const rondaId = typeof c.ronda_id === 'string' ? c.ronda_id : ''
  const pasadoPor = typeof c.pasado_por === 'string' ? c.pasado_por : ''
  if (!UUID.test(rondaId)) return 'Falta la ronda'
  if (!UUID.test(pasadoPor)) return 'Falta de quién es el pasillo'
  return { rondaId, pasadoPor }
}

export type Dependencias = {
  quienLlama: (req: Request) => Promise<{ base: Base } | null>
  escribir: () => Escribir | null
}

const porDefecto: Dependencias = {
  async quienLlama(req) {
    const quien = await clienteDeQuienLlama(req)
    return quien && { base: baseDe(quien.db, clienteDeServicio) }
  },
  escribir() {
    const clave = Deno.env.get('GEMINI_API_KEY')
    return clave ? gemini(clave, Deno.env.get('GEMINI_MODELO') || 'gemini-flash-lite-latest') : null
  },
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
    if (!(await quien.base.estaEnLaRonda(pedido.rondaId, pedido.pasadoPor))) return error('Esa persona no está en la ronda', 400)
    const escribir = deps.escribir()
    if (!escribir) {
      console.error('Falta GEMINI_API_KEY en los secretos de la función')
      return json({ resumen: null })
    }
    const resumen = await resumir(pedido.rondaId, pedido.pasadoPor, quien.base, escribir)
    return json({ resumen: resumen && { texto: resumen.texto, tanda_hasta: resumen.tanda_hasta, generado_en: resumen.generado_en } })
  } catch (e) {
    console.error(e)
    return error('No pudimos armar el resumen.', 500)
  }
}

if (import.meta.main) Deno.serve((req) => manejar(req))
