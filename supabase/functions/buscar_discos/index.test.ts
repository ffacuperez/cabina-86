// Pruebas de buscar_discos (T-09) con Deezer y la base simulados.
// Correr con: deno test supabase/functions
import assert from 'node:assert/strict'
import { olvidarAnios, type Pedir } from '../_shared/deezer.ts'
import { type Base, LIMITE, manejar } from './index.ts'

const RONDA = '10000000-0000-0000-0000-0000000000b1'
const FACU = 'f1'
const MANU = 'f2'

/** Respuestas de Deezer con la forma de su API */
const BUSQUEDA = {
  data: [
    { id: 101, title: 'La Dinastía Scorpio', cover_medium: 'https://e-cdns-images.dzcdn.net/images/cover/aaa/250x250-000000-80-0-0.jpg', nb_tracks: 11, artist: { name: 'El Mató a un Policía Motorizado' } },
    { id: 102, title: 'Día de los muertos', cover_medium: 'https://e-cdns-images.dzcdn.net/images/cover//250x250-000000-80-0-0.jpg', nb_tracks: 10, artist: { name: 'El Mató a un Policía Motorizado' } },
    { id: 103, title: "La síntesis O'Konor", cover_medium: null, nb_tracks: 9, artist: { name: 'El Mató a un Policía Motorizado' } },
  ],
  total: 3,
}
const DETALLES: Record<number, unknown> = {
  101: { id: 101, release_date: '2012-11-20' },
  102: { id: 102, release_date: '2008-05-01' },
  103: { id: 103, release_date: '0000-00-00' },
}

type Opciones = { busqueda?: unknown; detalles?: Record<number, unknown>; caido?: boolean; status?: number }
function deezer(op: Opciones = {}) {
  const pedidos: string[] = []
  const pedir: Pedir = (url) => {
    pedidos.push(url)
    if (op.caido) return Promise.reject(new TypeError('network error'))
    if (op.status) return Promise.resolve(new Response('', { status: op.status }))
    const u = new URL(url)
    if (u.pathname === '/search/album') return Promise.resolve(Response.json(op.busqueda ?? BUSQUEDA))
    const id = Number(u.pathname.split('/').pop())
    const detalle = (op.detalles ?? DETALLES)[id]
    return detalle === undefined ? Promise.reject(new TypeError('timeout')) : Promise.resolve(Response.json(detalle))
  }
  return { pedir, pedidos }
}

function base(op: { miembro?: boolean; pases?: { deezer_id: number; pasado_por: string; nombre: string; creado_en: string }[] } = {}) {
  const llamadas: { rondaId: string; ids: number[] }[] = []
  const b: Base = {
    estoyEnLaRonda: (rondaId) => Promise.resolve(rondaId === RONDA && op.miembro !== false),
    pasesDe: (rondaId, ids) => {
      llamadas.push({ rondaId, ids })
      return Promise.resolve((op.pases ?? []).filter((p) => ids.includes(p.deezer_id)))
    },
  }
  return { b, llamadas }
}

function pedido(cuerpo: unknown, metodo = 'POST') {
  return new Request('http://localhost/buscar_discos', {
    method: metodo,
    headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json' },
    body: metodo === 'POST' ? JSON.stringify(cuerpo) : undefined,
  })
}

async function llamar(cuerpo: unknown, op: { deezer?: Opciones; base?: Parameters<typeof base>[0]; sinSesion?: boolean; metodo?: string } = {}) {
  olvidarAnios()
  const d = deezer(op.deezer)
  const b = base(op.base)
  const res = await manejar(pedido(cuerpo, op.metodo), {
    quienLlama: () => Promise.resolve(op.sinSesion ? null : { base: b.b, uid: FACU }),
    pedir: d.pedir,
  })
  const texto = await res.text()
  return { res, cuerpo: texto && texto !== 'ok' ? JSON.parse(texto) : null, pedidos: d.pedidos, llamadas: b.llamadas }
}

Deno.test('HU-07 Encuentro el disco: tapa, título, artista y año', async () => {
  const { res, cuerpo, pedidos } = await llamar({ q: 'dinastía scorp', ronda_id: RONDA })
  assert.equal(res.status, 200)
  assert.equal(res.headers.get('Access-Control-Allow-Origin'), '*')
  assert.deepEqual(cuerpo.discos[0], {
    deezer_id: 101,
    titulo: 'La Dinastía Scorpio',
    artista: 'El Mató a un Policía Motorizado',
    anio: 2012,
    tapa_url: 'https://e-cdns-images.dzcdn.net/images/cover/aaa/250x250-000000-80-0-0.jpg',
    cantidad_temas: 11,
    ya_pasado: null,
  })
  assert.equal(pedidos[0], `https://api.deezer.com/search/album?q=${encodeURIComponent('dinastía scorp')}&limit=${LIMITE}`)
  assert.equal(pedidos.length, 4, 'una búsqueda + un detalle por resultado (para el año)')
})

Deno.test('Sin tapa en Deezer: tapa_url null (S/T); sin fecha: año null', async () => {
  const { cuerpo } = await llamar({ q: 'motorizado', ronda_id: RONDA })
  assert.equal(cuerpo.discos[1].tapa_url, null, 'tapa por defecto de Deezer')
  assert.equal(cuerpo.discos[2].tapa_url, null)
  assert.equal(cuerpo.discos[2].anio, null, '0000-00-00')
})

Deno.test('Si falla el detalle de uno, ese queda sin año y la búsqueda sigue', async () => {
  const { res, cuerpo } = await llamar({ q: 'motorizado', ronda_id: RONDA }, { deezer: { detalles: { 101: DETALLES[101], 103: DETALLES[103] } } })
  assert.equal(res.status, 200)
  assert.equal(cuerpo.discos.length, 3)
  assert.equal(cuerpo.discos[1].anio, null)
  assert.equal(cuerpo.discos[0].anio, 2012)
})

Deno.test('HU-07 Sin resultados: lista vacía', async () => {
  const { res, cuerpo } = await llamar({ q: 'asdfqwer', ronda_id: RONDA }, { deezer: { busqueda: { data: [], total: 0 } } })
  assert.equal(res.status, 200)
  assert.deepEqual(cuerpo.discos, [])
})

Deno.test('HU-07 El disco ya se pasó en esta ronda: viene marcado con quién y cuándo', async () => {
  const { cuerpo, llamadas } = await llamar({ q: 'motorizado', ronda_id: RONDA }, {
    base: { pases: [{ deezer_id: 102, pasado_por: MANU, nombre: 'Manu Gómez', creado_en: '2026-08-12T21:30:00+00:00' }] },
  })
  assert.deepEqual(llamadas, [{ rondaId: RONDA, ids: [101, 102, 103] }], 'busca los pases de esta ronda, no de otras')
  assert.deepEqual(cuerpo.discos[1].ya_pasado, { por: 'Manu', por_mi: false, el: '2026-08-12T21:30:00+00:00' })
  assert.equal(cuerpo.discos[0].ya_pasado, null, 'los demás se pueden elegir')
})

Deno.test('Si lo pasé yo: por_mi', async () => {
  const { cuerpo } = await llamar({ q: 'motorizado', ronda_id: RONDA }, {
    base: { pases: [{ deezer_id: 101, pasado_por: FACU, nombre: 'Facu Pérez', creado_en: '2026-08-01T10:00:00+00:00' }] },
  })
  assert.deepEqual(cuerpo.discos[0].ya_pasado, { por: 'Facu', por_mi: true, el: '2026-08-01T10:00:00+00:00' })
})

Deno.test('Sin sesión: 401 y no se consulta Deezer', async () => {
  const { res, pedidos } = await llamar({ q: 'artaud', ronda_id: RONDA }, { sinSesion: true })
  assert.equal(res.status, 401)
  assert.equal(pedidos.length, 0)
})

Deno.test('Ronda donde no estoy: 403 y no se consulta Deezer', async () => {
  const { res, cuerpo, pedidos } = await llamar({ q: 'artaud', ronda_id: RONDA }, { base: { miembro: false } })
  assert.equal(res.status, 403)
  assert.equal(cuerpo.error, 'No estás en esa ronda')
  assert.equal(pedidos.length, 0)
})

Deno.test('Pedidos mal armados: 400', async () => {
  for (const cuerpo of [{ q: 'a', ronda_id: RONDA }, { q: '  ', ronda_id: RONDA }, { q: 'x'.repeat(101), ronda_id: RONDA }, { q: 'artaud' }, { q: 'artaud', ronda_id: 'no-es-uuid' }, 'texto']) {
    const { res } = await llamar(cuerpo)
    assert.equal(res.status, 400, JSON.stringify(cuerpo))
  }
})

Deno.test('Deezer caído, con error HTTP o con error en el cuerpo: 502 con un mensaje para la app', async () => {
  for (const deezerOp of [{ caido: true }, { status: 503 }, { busqueda: { error: { type: 'Exception', message: 'Quota limit exceeded', code: 4 } } }]) {
    const { res, cuerpo } = await llamar({ q: 'artaud', ronda_id: RONDA }, { deezer: deezerOp })
    assert.equal(res.status, 502, JSON.stringify(deezerOp))
    assert.equal(cuerpo.error, 'Deezer no responde. Probá de nuevo en un rato.')
  }
})

Deno.test('Preflight CORS y métodos', async () => {
  const opciones = await llamar(null, { metodo: 'OPTIONS' })
  assert.equal(opciones.res.status, 200)
  assert.match(opciones.res.headers.get('Access-Control-Allow-Headers') ?? '', /authorization/)
  const get = await llamar(null, { metodo: 'GET' })
  assert.equal(get.res.status, 405)
})

Deno.test('El año se pide una sola vez por disco mientras la función está viva', async () => {
  const d = deezer()
  const b = base()
  const deps = { quienLlama: () => Promise.resolve({ base: b.b, uid: FACU }), pedir: d.pedir }
  olvidarAnios()
  await manejar(pedido({ q: 'motorizado', ronda_id: RONDA }), deps)
  await manejar(pedido({ q: 'motorizado', ronda_id: RONDA }), deps)
  assert.equal(d.pedidos.length, 4 + 1, 'la segunda búsqueda no vuelve a pedir los detalles')
})
