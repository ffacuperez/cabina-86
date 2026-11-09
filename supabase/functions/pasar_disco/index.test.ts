// Pruebas de pasar_disco (T-10) con Deezer y la base simulados.
// Correr con: cd supabase/functions && deno test --no-lock
import assert from 'node:assert/strict'
import { type DiscoCompleto, linksDeBusqueda, type Pedir } from '../_shared/deezer.ts'
import { type Base, catalogo, type DiscoGuardado, manejar, MAX_TARJETITA, type PaseAnterior, YaSePaso } from './index.ts'

const RONDA = '10000000-0000-0000-0000-0000000000b1'
const FACU = 'f1'

const ALBUM = {
  id: 101,
  title: 'La Dinastía Scorpio',
  cover_big: 'https://e-cdns-images.dzcdn.net/images/cover/aaa/500x500-000000-80-0-0.jpg',
  nb_tracks: 2,
  duration: 410,
  release_date: '2012-11-20',
  artist: { name: 'El Mató a un Policía Motorizado' },
  tracks: { data: [{ title: 'El magnetismo', duration: 200 }, { title: 'Chica de oro', duration: 210 }] },
}

function deezer(op: { album?: unknown; pistas?: unknown; caido?: boolean } = {}) {
  const pedidos: string[] = []
  const pedir: Pedir = (url) => {
    pedidos.push(url)
    if (op.caido) return Promise.reject(new TypeError('network error'))
    const ruta = new URL(url).pathname
    if (ruta.endsWith('/tracks')) return Promise.resolve(Response.json(op.pistas ?? { data: [] }))
    return Promise.resolve(Response.json(op.album ?? ALBUM))
  }
  return { pedir, pedidos }
}

type OpBase = { miembro?: boolean; anterior?: PaseAnterior | null; guardado?: DiscoGuardado | null; carrera?: boolean }
function base(op: OpBase = {}) {
  const registro = { guardados: [] as DiscoCompleto[], pases: [] as { rondaId: string; discoId: string; tarjetita: string }[] }
  let carrera = op.carrera ?? false
  const b: Base = {
    estoyEnLaRonda: (r) => Promise.resolve(r === RONDA && op.miembro !== false),
    miSigla: () => Promise.resolve('FAC'),
    paseAnterior: () => Promise.resolve(carrera ? null : op.anterior ?? null),
    discoGuardado: () => Promise.resolve(op.guardado ?? null),
    guardarDisco: (d) => {
      registro.guardados.push(d)
      return Promise.resolve({ id: 'd-nuevo', deezer_id: d.deezer_id, titulo: d.titulo, artista: d.artista, anio: d.anio, tapa_url: d.tapa_url })
    },
    crearPase: (rondaId, discoId, tarjetita) => {
      if (carrera) {
        carrera = false // la próxima consulta ya ve el pase del otro
        op.anterior = { por: 'Manu', por_mi: false, el: '2026-11-08T23:59:00+00:00' }
        return Promise.reject(new YaSePaso())
      }
      registro.pases.push({ rondaId, discoId, tarjetita })
      return Promise.resolve({ id: 'p1', numero: 5, tarjetita, creado_en: '2026-11-09T00:00:00+00:00' })
    },
  }
  return { b, registro }
}

async function llamar(cuerpo: unknown, op: { base?: OpBase; deezer?: Parameters<typeof deezer>[0]; sinSesion?: boolean } = {}) {
  const d = deezer(op.deezer)
  const b = base(op.base)
  const res = await manejar(
    new Request('http://localhost/pasar_disco', { method: 'POST', body: typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo) }),
    { quienLlama: () => Promise.resolve(op.sinSesion ? null : { base: b.b, uid: FACU }), pedir: d.pedir },
  )
  return { res, cuerpo: await res.json(), pedidos: d.pedidos, ...b.registro }
}

const PEDIDO = { ronda_id: RONDA, deezer_id: 101, tarjetita: '  De noche y entero. Si saltás temas, no vale.  ' }

Deno.test('HU-08 Paso el disco: se crea el pase con catálogo FAC-05 y la tarjetita', async () => {
  const { res, cuerpo, pases } = await llamar(PEDIDO)
  assert.equal(res.status, 201)
  assert.deepEqual(pases, [{ rondaId: RONDA, discoId: 'd-nuevo', tarjetita: 'De noche y entero. Si saltás temas, no vale.' }])
  assert.equal(cuerpo.pase.catalogo, 'FAC-05')
  assert.equal(cuerpo.pase.tarjetita, 'De noche y entero. Si saltás temas, no vale.')
  assert.equal(cuerpo.disco.titulo, 'La Dinastía Scorpio')
})

Deno.test('HU-08 Se guardan los datos del disco desde Deezer: título, artista, año, tapa, temas, duración y links', async () => {
  const { guardados } = await llamar(PEDIDO)
  assert.deepEqual(guardados, [{
    deezer_id: 101,
    titulo: 'La Dinastía Scorpio',
    artista: 'El Mató a un Policía Motorizado',
    anio: 2012,
    tapa_url: 'https://e-cdns-images.dzcdn.net/images/cover/aaa/500x500-000000-80-0-0.jpg',
    cantidad_temas: 2,
    duracion_seg: 410,
    temas: [{ titulo: 'El magnetismo', duracion_seg: 200 }, { titulo: 'Chica de oro', duracion_seg: 210 }],
    link_spotify: 'https://open.spotify.com/search/La%20Dinast%C3%ADa%20Scorpio%20El%20Mat%C3%B3%20a%20un%20Polic%C3%ADa%20Motorizado',
    link_ytm: 'https://music.youtube.com/search?q=La%20Dinast%C3%ADa%20Scorpio%20El%20Mat%C3%B3%20a%20un%20Polic%C3%ADa%20Motorizado',
  }])
})

Deno.test('RN-09: si el disco ya está guardado (de otra ronda), no se vuelve a pedir a Deezer', async () => {
  const guardado = { id: 'd-viejo', deezer_id: 101, titulo: 'La Dinastía Scorpio', artista: 'EMAPM', anio: 2012, tapa_url: null }
  const { res, pedidos, guardados, pases } = await llamar(PEDIDO, { base: { guardado } })
  assert.equal(res.status, 201)
  assert.equal(pedidos.length, 0)
  assert.equal(guardados.length, 0)
  assert.equal(pases[0].discoId, 'd-viejo')
})

Deno.test('Disco largo: si el detalle trae menos temas que nb_tracks, se piden todos', async () => {
  const album = { ...ALBUM, nb_tracks: 3, tracks: { data: ALBUM.tracks.data } }
  const pistas = { data: [...ALBUM.tracks.data, { title: 'Excalibur', duration: 300 }] }
  const { guardados, pedidos } = await llamar(PEDIDO, { deezer: { album, pistas } })
  assert.equal(pedidos[1], 'https://api.deezer.com/album/101/tracks?limit=200')
  assert.equal(guardados[0].temas.length, 3)
  assert.equal(guardados[0].cantidad_temas, 3)
})

Deno.test('RN-11: el disco ya se pasó en esta ronda → 409 con quién y cuándo, sin tocar Deezer', async () => {
  const anterior = { por: 'Manu', por_mi: false, el: '2026-08-12T21:30:00+00:00' }
  const { res, cuerpo, pedidos, pases } = await llamar(PEDIDO, { base: { anterior } })
  assert.equal(res.status, 409)
  assert.deepEqual(cuerpo.ya_pasado, anterior)
  assert.equal(pedidos.length, 0)
  assert.equal(pases.length, 0)
})

Deno.test('RN-11 con dos a la vez: la base rechaza el repetido y se avisa quién lo pasó', async () => {
  const { res, cuerpo } = await llamar(PEDIDO, { base: { carrera: true } })
  assert.equal(res.status, 409)
  assert.equal(cuerpo.ya_pasado.por, 'Manu')
})

Deno.test('S-01: tarjetita obligatoria y de hasta 200 caracteres', async () => {
  assert.equal((await llamar({ ...PEDIDO, tarjetita: '   ' })).res.status, 400)
  assert.equal((await llamar({ ...PEDIDO, tarjetita: undefined })).res.status, 400)
  assert.equal((await llamar({ ...PEDIDO, tarjetita: 'é'.repeat(MAX_TARJETITA) })).res.status, 201, '200 con tildes entra')
  const larga = await llamar({ ...PEDIDO, tarjetita: 'x'.repeat(MAX_TARJETITA + 1) })
  assert.equal(larga.res.status, 400)
  assert.equal(larga.cuerpo.error, 'La tarjetita tiene hasta 200 caracteres')
})

Deno.test('Pedidos mal armados: 400', async () => {
  for (const cuerpo of [{ ...PEDIDO, ronda_id: 'x' }, { ...PEDIDO, deezer_id: '101' }, { ...PEDIDO, deezer_id: -1 }, { ...PEDIDO, deezer_id: 1.5 }, 'no es json']) {
    assert.equal((await llamar(cuerpo)).res.status, 400, JSON.stringify(cuerpo))
  }
})

Deno.test('Sin sesión: 401 · ronda ajena: 403, sin guardar nada', async () => {
  assert.equal((await llamar(PEDIDO, { sinSesion: true })).res.status, 401)
  const ajena = await llamar(PEDIDO, { base: { miembro: false } })
  assert.equal(ajena.res.status, 403)
  assert.equal(ajena.guardados.length + ajena.pases.length + ajena.pedidos.length, 0)
})

Deno.test('Deezer no tiene el disco: 404 · Deezer caído: 502; en los dos casos no se crea el pase', async () => {
  const noEsta = await llamar(PEDIDO, { deezer: { album: { error: { type: 'DataException', message: 'no data', code: 800 } } } })
  assert.equal(noEsta.res.status, 404)
  assert.equal(noEsta.pases.length, 0)
  const caido = await llamar(PEDIDO, { deezer: { caido: true } })
  assert.equal(caido.res.status, 502)
  assert.equal(caido.pases.length, 0)
})

Deno.test('Catálogo: sigla y número con dos cifras', () => {
  assert.equal(catalogo('FAC', 5), 'FAC-05')
  assert.equal(catalogo('MAX2', 12), 'MAX2-12')
  assert.equal(catalogo('YO', 105), 'YO-105')
})

Deno.test('RN-10: links de búsqueda del álbum en Spotify y YouTube Music', () => {
  assert.deepEqual(linksDeBusqueda('Artaud', 'Pescado Rabioso'), {
    link_spotify: 'https://open.spotify.com/search/Artaud%20Pescado%20Rabioso',
    link_ytm: 'https://music.youtube.com/search?q=Artaud%20Pescado%20Rabioso',
  })
})
