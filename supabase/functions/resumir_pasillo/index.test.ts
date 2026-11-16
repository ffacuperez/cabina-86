// Pruebas de resumir_pasillo (HU-19) con la base y la IA simuladas.
// Correr con: cd supabase/functions && deno test --no-lock
import assert from 'node:assert/strict'
import {
  type Base,
  type Escribir,
  ESPERA_ENTRE_INTENTOS_MS,
  ESPERA_SI_FALLA_MS,
  gemini,
  limpiar,
  manejar,
  MARCADOR,
  type PaseDelPasillo,
  pedidoDe,
  type Resumen,
  resumir,
  tandaDe,
} from './index.ts'

const RONDA = '10000000-0000-0000-0000-0000000000b1'
const MAXI = '00000000-0000-0000-0000-0000000000a2'
const DIA = 24 * 60 * 60 * 1000
const AHORA = Date.parse('2026-11-16T15:00:00Z')
const hace = (dias: number) => new Date(AHORA - dias * DIA).toISOString()

// La tanda de ayer (3 discos) y dos más viejos
const PASES: PaseDelPasillo[] = [
  { creado_en: hace(1), titulo: 'Artaud', artista: 'Pescado Rabioso', anio: 1973 },
  { creado_en: hace(1.01), titulo: 'Clics Modernos', artista: 'Charly García', anio: 1983 },
  { creado_en: hace(2.5), titulo: 'Oktubre', artista: 'Patricio Rey y sus Redonditos de Ricota', anio: 1986 },
  { creado_en: hace(40), titulo: 'Bocanada', artista: 'Gustavo Cerati', anio: 1999 },
  { creado_en: hace(41), titulo: 'In Rainbows', artista: 'Radiohead', anio: 2007 },
]

function base(op: { pases?: PaseDelPasillo[]; resumen?: Resumen | null; miembro?: boolean; esta?: boolean } = {}) {
  const guardados: Resumen[] = []
  const b: Base = {
    estoyEnLaRonda: (r) => Promise.resolve(r === RONDA && op.miembro !== false),
    estaEnLaRonda: () => Promise.resolve(op.esta !== false),
    pasesDe: (_r, _u, cuantos) => Promise.resolve((op.pases ?? PASES).slice(0, cuantos)),
    resumen: () => Promise.resolve(op.resumen ?? null),
    guardar: (_r, _u, r) => {
      guardados.push(r)
      return Promise.resolve()
    },
    nombreDe: () => Promise.resolve('Maxi'),
  }
  return { b, guardados }
}

function ia(respuesta: string | Error = `${MARCADOR} cerró la semana a puro rock nacional de los 70 y 80.`) {
  const pedidos: { instrucciones: string; pedido: string }[] = []
  const escribir: Escribir = (instrucciones, pedido) => {
    pedidos.push({ instrucciones, pedido })
    return respuesta instanceof Error ? Promise.reject(respuesta) : Promise.resolve(respuesta)
  }
  return { escribir, pedidos }
}

Deno.test('la tanda son los discos de los 3 días antes del último pase', () => {
  assert.deepEqual(tandaDe(PASES).map((p) => p.titulo), ['Artaud', 'Clics Modernos', 'Oktubre'])
  assert.deepEqual(tandaDe([]), [])
})

Deno.test('el pedido trae la tanda y aparte lo anterior, sin tarjetitas ni nombres', () => {
  const p = pedidoDe(PASES)
  assert.match(p, /Última tanda de \{NOMBRE\} \(3 discos/)
  assert.match(p, /- Artaud — Pescado Rabioso \(1973\)/)
  assert.match(p, /Lo que venía pasando antes:\n- Bocanada — Gustavo Cerati \(1999\)/)
  assert.doesNotMatch(p, /Maxi/)
})

Deno.test('limpia lo que escribe la IA y pone el nombre', () => {
  assert.equal(limpiar('  "**{NOMBRE}** vuelve   a Spinetta."  ', 'Maxi'), 'Maxi vuelve a Spinetta.')
  assert.equal(limpiar('{ nombre } también', 'Maxi'), 'Maxi también')
  assert.equal(limpiar('   ', 'Maxi'), null)
  const largo = limpiar(`${'Una oración bastante larga para el cartel. '.repeat(10)}`, 'Maxi')!
  assert.ok(largo.length <= 300 && largo.endsWith('.'))
})

Deno.test('sin resumen: lo escribe con la IA y lo guarda con su tanda', async () => {
  const { b, guardados } = base()
  const { escribir, pedidos } = ia()
  const r = await resumir(RONDA, MAXI, b, escribir, AHORA)
  assert.equal(r?.texto, 'Maxi cerró la semana a puro rock nacional de los 70 y 80.')
  assert.equal(pedidos.length, 1)
  assert.equal(guardados[0].tanda_hasta, PASES[0].creado_en)
  assert.ok(guardados[0].generado_en)
})

Deno.test('si ya está al día, no llama a la IA', async () => {
  const actual: Resumen = { texto: 'Ya escrito', tanda_hasta: PASES[0].creado_en, generado_en: hace(0.5), intentado_en: hace(0.5) }
  const { b, guardados } = base({ resumen: actual })
  const { escribir, pedidos } = ia()
  assert.equal((await resumir(RONDA, MAXI, b, escribir, AHORA))?.texto, 'Ya escrito')
  assert.equal(pedidos.length, 0)
  assert.equal(guardados.length, 0)
})

Deno.test('si pasó un disco nuevo, lo rehace', async () => {
  const viejo: Resumen = { texto: 'De la tanda anterior', tanda_hasta: hace(40), generado_en: hace(40), intentado_en: hace(40) }
  const { b } = base({ resumen: viejo })
  const { escribir, pedidos } = ia()
  assert.match((await resumir(RONDA, MAXI, b, escribir, AHORA))!.texto!, /rock nacional/)
  assert.equal(pedidos.length, 1)
})

Deno.test('si la IA falla, guarda el intento sin texto y no insiste por una hora', async () => {
  const { b, guardados } = base()
  assert.equal(await resumir(RONDA, MAXI, b, ia(new Error('429')).escribir, AHORA), null)
  assert.equal(guardados[0].texto, null)
  assert.equal(guardados[0].generado_en, null)

  const fallido = guardados[0]
  const otra = base({ resumen: fallido })
  const llamada = ia()
  assert.equal(await resumir(RONDA, MAXI, otra.b, llamada.escribir, AHORA + ESPERA_SI_FALLA_MS - 1000), null)
  assert.equal(llamada.pedidos.length, 0, 'dentro de la hora no vuelve a probar')
  await resumir(RONDA, MAXI, otra.b, llamada.escribir, AHORA + ESPERA_SI_FALLA_MS + 1000)
  assert.equal(llamada.pedidos.length, 1, 'pasada la hora, prueba de nuevo')
})

Deno.test('dos pedidos seguidos con una tanda nueva no llaman dos veces a la IA', async () => {
  const recien: Resumen = { texto: 'Viejo', tanda_hasta: hace(40), generado_en: hace(40), intentado_en: new Date(AHORA - 5000).toISOString() }
  const { b } = base({ resumen: recien })
  const { escribir, pedidos } = ia()
  assert.equal(await resumir(RONDA, MAXI, b, escribir, AHORA), null)
  assert.equal(pedidos.length, 0)
  await resumir(RONDA, MAXI, b, escribir, AHORA + ESPERA_ENTRE_INTENTOS_MS + 1000)
  assert.equal(pedidos.length, 1)
})

Deno.test('sin pases no hay resumen', async () => {
  const { b, guardados } = base({ pases: [] })
  assert.equal(await resumir(RONDA, MAXI, b, ia().escribir, AHORA), null)
  assert.equal(guardados.length, 0)
})

Deno.test('gemini: arma el pedido y lee la respuesta', async () => {
  let visto: { url: string; init: RequestInit } | null = null
  const pedir = ((url: string, init: RequestInit) => {
    visto = { url, init }
    return Promise.resolve(Response.json({ candidates: [{ content: { parts: [{ text: 'Hola ' }, { text: 'cabina' }] } }] }))
  }) as unknown as typeof fetch
  assert.equal(await gemini('clave', 'modelo-x', pedir)('instr', 'pedido'), 'Hola cabina')
  assert.match(visto!.url, /models\/modelo-x:generateContent$/)
  assert.equal((visto!.init.headers as Record<string, string>)['x-goog-api-key'], 'clave')
  const cuerpo = JSON.parse(visto!.init.body as string)
  assert.equal(cuerpo.systemInstruction.parts[0].text, 'instr')
  assert.equal(cuerpo.contents[0].parts[0].text, 'pedido')
})

Deno.test('gemini: un error o una respuesta vacía son IaNoResponde', async () => {
  const caido = (() => Promise.resolve(new Response('cupo agotado', { status: 429 }))) as unknown as typeof fetch
  await assert.rejects(gemini('c', 'm', caido)('i', 'p'), /429/)
  const vacio = (() => Promise.resolve(Response.json({ candidates: [] }))) as unknown as typeof fetch
  await assert.rejects(gemini('c', 'm', vacio)('i', 'p'), /vacía/)
})

const pedidoHttp = (cuerpo: unknown, metodo = 'POST') =>
  new Request('http://local/resumir_pasillo', { method: metodo, body: metodo === 'POST' ? JSON.stringify(cuerpo) : undefined })

Deno.test('http: valida, pide sesión y que estés en la ronda', async () => {
  const { b } = base()
  const deps = (op: { sesion?: boolean; base?: Base } = {}) => ({
    quienLlama: () => Promise.resolve(op.sesion === false ? null : { base: op.base ?? b }),
    escribir: () => ia().escribir,
  })
  assert.equal((await manejar(pedidoHttp({ ronda_id: 'x' }), deps())).status, 400)
  assert.equal((await manejar(pedidoHttp({ ronda_id: RONDA, pasado_por: MAXI }), deps({ sesion: false }))).status, 401)
  assert.equal((await manejar(pedidoHttp({ ronda_id: RONDA, pasado_por: MAXI }), deps({ base: base({ miembro: false }).b }))).status, 403)
  assert.equal((await manejar(pedidoHttp({ ronda_id: RONDA, pasado_por: MAXI }), deps({ base: base({ esta: false }).b }))).status, 400)
  const ok = await manejar(pedidoHttp({ ronda_id: RONDA, pasado_por: MAXI }), deps())
  assert.equal(ok.status, 200)
  assert.match((await ok.json()).resumen.texto, /^Maxi /)
})

Deno.test('http: sin clave de Gemini responde sin resumen (la app muestra la frase armada)', async () => {
  const { b } = base()
  const r = await manejar(pedidoHttp({ ronda_id: RONDA, pasado_por: MAXI }), { quienLlama: () => Promise.resolve({ base: b }), escribir: () => null })
  assert.equal(r.status, 200)
  assert.deepEqual(await r.json(), { resumen: null })
})
