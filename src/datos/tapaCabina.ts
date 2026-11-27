/**
 * La tapa ilustrada (#125): la "edición Cabina" de cada disco, para las tarjetas que se comparten.
 * Deezer no deja guardar ni redistribuir sus tapas (RN-09, T-12), así que la app dibuja la suya
 * con los dibujos de C86/Tapa (Figma 13:1353) y la paleta de la app. Todo sale del deezer_id:
 * el mismo disco tiene siempre la misma tapa.
 *
 * Acá está solo la lógica (qué dibujo, qué colores, cómo se acomoda el texto); el SVG es
 * componentes/TapaCabina.tsx. Las medidas son las del Figma, en una tapa de 200 × 200.
 */

export type Dibujo = 'ART' | 'BOC' | 'CLI' | 'DIN' | 'INR' | 'TPB'

const C = {
  mostaza: '#E3C16F',
  negro: '#1F231C',
  magenta: '#C23F78',
  marino: '#26324F',
  crema: '#DDE6BF',
  verde: '#A9B884',
  naranja: '#FF7A1A',
  oscuro: '#33392D',
  verdeClaro: '#C9D6A3',
} as const

/**
 * Colores de cada dibujo: la primera es la del Figma; las otras dos, la misma idea con otros colores de la paleta.
 * `formas` va en el orden en que las usa cada dibujo (ver TapaCabina.tsx).
 */
export type Paleta = { fondo: string; formas: string[]; titulo: string; artista: string }

export const PALETAS: Record<Dibujo, Paleta[]> = {
  // círculo, triángulo, rayas
  ART: [
    { fondo: C.mostaza, formas: [C.negro, C.magenta, C.negro], titulo: C.negro, artista: C.negro },
    { fondo: C.verde, formas: [C.marino, C.naranja, C.marino], titulo: C.marino, artista: C.marino },
    { fondo: C.crema, formas: [C.magenta, C.marino, C.negro], titulo: C.negro, artista: C.negro },
  ],
  // anillos (claro, oscuro = el fondo), barra de arriba
  BOC: [
    { fondo: C.marino, formas: [C.mostaza, C.magenta], titulo: C.crema, artista: C.crema },
    { fondo: C.negro, formas: [C.naranja, C.mostaza], titulo: C.crema, artista: C.crema },
    { fondo: C.magenta, formas: [C.crema, C.marino], titulo: C.crema, artista: C.crema },
  ],
  // rayas, puntos
  CLI: [
    { fondo: C.magenta, formas: [C.negro, C.crema], titulo: C.crema, artista: C.crema },
    { fondo: C.mostaza, formas: [C.marino, C.negro], titulo: C.negro, artista: C.negro },
    { fondo: C.verde, formas: [C.negro, C.naranja], titulo: C.negro, artista: C.negro },
  ],
  // estrella y barra de abajo, centro
  DIN: [
    { fondo: C.verde, formas: [C.negro, C.naranja], titulo: C.negro, artista: C.negro },
    { fondo: C.marino, formas: [C.mostaza, C.magenta], titulo: C.crema, artista: C.crema },
    { fondo: C.naranja, formas: [C.negro, C.crema], titulo: C.negro, artista: C.negro },
  ],
  // círculo chico izquierda, grande, derecha, el de arriba
  INR: [
    { fondo: C.naranja, formas: [C.mostaza, C.marino, C.magenta, C.negro], titulo: C.negro, artista: C.negro },
    { fondo: C.crema, formas: [C.magenta, C.marino, C.naranja, C.negro], titulo: C.negro, artista: C.negro },
    { fondo: C.marino, formas: [C.mostaza, C.naranja, C.magenta, C.crema], titulo: C.crema, artista: C.crema },
  ],
  // triángulos de las filas 1 y 3, de las filas 2 y 4
  TPB: [
    { fondo: C.oscuro, formas: [C.mostaza, C.magenta], titulo: C.mostaza, artista: C.verdeClaro },
    { fondo: C.magenta, formas: [C.crema, C.negro], titulo: C.crema, artista: C.crema },
    { fondo: C.crema, formas: [C.marino, C.naranja], titulo: C.marino, artista: C.marino },
  ],
}

export const DIBUJOS: Dibujo[] = ['ART', 'BOC', 'CLI', 'DIN', 'INR', 'TPB']

/**
 * Lugar para el texto en cada dibujo: ancho máximo de las líneas y hasta dónde puede bajar la línea del artista
 * (su base, en y) sin pisar el dibujo. `arriba` corre todo el texto (BOC tiene una barra de 8 arriba).
 */
export const LUGAR: Record<Dibujo, { ancho: number; fondo: number; arriba: number }> = {
  ART: { ancho: 178, fondo: 92, arriba: 0 }, // el ancho lo achica el triángulo (anchoEn); las rayas empiezan en 96
  BOC: { ancho: 178, fondo: 66, arriba: 8 }, // los anillos asoman en y 70
  CLI: { ancho: 178, fondo: 104, arriba: 0 }, // las rayas empiezan en 110
  DIN: { ancho: 178, fondo: 66, arriba: 0 }, // la punta de la estrella está en y 60
  INR: { ancho: 178, fondo: 66, arriba: 0 }, // el círculo de arriba empieza en y 70
  TPB: { ancho: 178, fondo: 78, arriba: 0 }, // los triángulos empiezan en y 80
}

export const MARGEN = 14

/**
 * El ancho para una línea con base en y. En ART el triángulo de arriba a la derecha (de y 18 a 76,5) se ensancha
 * hacia abajo: la línea termina 6 antes de su borde a la altura de la base.
 */
export function anchoEn(d: Dibujo, y: number) {
  if (d !== 'ART') return LUGAR[d].ancho
  const borde = 171 - (Math.min(y, 76.5) - 18) * (38.97 / 58.5)
  return Math.min(LUGAR.ART.ancho, Math.floor(borde - MARGEN - 6))
}

/** Ancho de cada letra en Zalando Sans Expanded Black Italic, cada 100 px (medido en Figma) */
const ANCHO_ZALANDO: Record<string, number> = {
  A: 96.7, B: 90.2, C: 96.1, D: 96.5, E: 82.4, F: 81, G: 99.7, H: 95.9, I: 36.5, J: 56.6, K: 92.5, L: 76.1, M: 111.5,
  N: 96.7, O: 98.7, P: 86.8, Q: 103.9, R: 92.7, S: 88, T: 85.3, U: 89.5, V: 99.7, W: 128.8, X: 95.9, Y: 90.7, Z: 84.5,
  '0': 92.7, '1': 54.3, '2': 84, '3': 88.2, '4': 89.7, '5': 87.6, '6': 89.3, '7': 83.7, '8': 88.3, '9': 89.3,
  ' ': 27, '.': 32.5, ',': 38.7, "'": 29.4, '&': 92.5, '-': 56.2, '!': 34.1, '?': 79.3, ':': 36.7, '/': 52.6,
  '(': 52.5, ')': 52.4, '+': 72, $: 88, '#': 97.6, '…': 97.5,
}

/** Lo que mide un texto en mayúsculas, en px, en Zalando a ese tamaño (con el espaciado del Figma, o el que se pase) */
export function anchoTitulo(texto: string, tamano: number, espaciado = tamano === 14 ? 0.3 : 0) {
  let total = 0
  for (const letra of texto) {
    const base = letra.normalize('NFD').replace(/[̀-ͯ]/g, '')
    total += ((ANCHO_ZALANDO[base] ?? 95) * tamano) / 100 + espaciado
  }
  return total
}

/** IBM Plex Mono a 11 px con 0,8 de espaciado: 7,4 px por letra */
export const anchoArtista = (texto: string) => [...texto].length * 7.4

/** "Friends (Deluxe Edition)" → "FRIENDS"; "Abbey Road - Remastered 2009" → "ABBEY ROAD" */
export function tituloLimpio(titulo: string) {
  const sin = titulo
    .replace(/\s*[([][^)\]]*[)\]]\s*$/g, '')
    .replace(/\s+-\s+.*(remaster|edition|edición|version|versión|deluxe|live|en vivo|anniversary|mono|stereo).*$/i, '')
    .trim()
  return (sin || titulo.trim()).toUpperCase()
}

/** "L.A. SPINETTA '73", cortado con "…" antes del año si no entra */
export function lineaArtista(artista: string, anio: number | null, ancho: number) {
  const año = anio ? ` '${String(anio % 100).padStart(2, '0')}` : ''
  let nombre = artista.trim().toUpperCase()
  if (anchoArtista(nombre + año) <= ancho) return nombre + año
  while (nombre.length > 1 && anchoArtista(nombre + '…' + año) > ancho) nombre = nombre.slice(0, -1).trimEnd()
  return nombre + '…' + año
}

/** Corta en líneas (la i-ésima de hasta ancho(i) px); null si no entra en `maximo` líneas */
function enLineas(texto: string, tamano: number, ancho: (i: number) => number, maximo: number): string[] | null {
  const palabras = texto.split(/\s+/).filter(Boolean)
  const lineas: string[] = []
  let actual = ''
  for (const p of palabras) {
    const con = actual ? `${actual} ${p}` : p
    if (anchoTitulo(con, tamano) <= ancho(lineas.length)) actual = con
    else {
      if (!actual || anchoTitulo(p, tamano) > ancho(lineas.length + 1)) return null
      lineas.push(actual)
      actual = p
    }
  }
  if (actual) lineas.push(actual)
  return lineas.length <= maximo ? lineas : null
}

/** Como enLineas, pero llena hasta `maximo` líneas y corta el resto con "…" */
function recortado(texto: string, tamano: number, anchoDe: (i: number) => number, maximo: number): string[] {
  const letras = [...texto]
  const lineas: string[] = []
  let resto = letras
  while (resto.length && lineas.length < maximo) {
    const ultima = lineas.length === maximo - 1
    const ancho = anchoDe(lineas.length)
    let n = resto.length
    const mide = (k: number) => anchoTitulo(resto.slice(0, k).join('').trim() + (ultima && k < resto.length ? '…' : ''), tamano)
    while (n > 1 && mide(n) > ancho) n--
    // en las líneas que no son la última, cortar en un espacio si hay uno
    if (!ultima && n < resto.length) {
      const espacio = resto.slice(0, n).lastIndexOf(' ')
      if (espacio > 0) n = espacio + 1
    }
    const linea = resto.slice(0, n).join('').trim()
    lineas.push(ultima && n < resto.length ? `${linea}…` : linea)
    resto = resto.slice(n)
    while (resto[0] === ' ') resto = resto.slice(1)
  }
  return lineas
}

/** Primera línea del título (su base) y alto de línea, como en el Figma */
const TIPO = {
  20: { base: 31.64, alto: 21 },
  14: { base: 26.5, alto: 15 },
} as const

/** De la última línea del título a la del artista hay 21, a cualquier tamaño */
const AL_ARTISTA = 21

export type Texto = {
  tamano: 20 | 14
  /** base de cada línea del título */
  lineas: { texto: string; y: number }[]
  artista: { texto: string; y: number }
}

/** Las combinaciones que se prueban, de la más grande a la más chica */
const PRUEBAS: { tamano: 20 | 14; lineas: number }[] = [
  { tamano: 20, lineas: 1 },
  { tamano: 20, lineas: 2 },
  { tamano: 14, lineas: 1 },
  { tamano: 14, lineas: 2 },
  { tamano: 14, lineas: 3 },
]

const yLinea = (d: Dibujo, tamano: 20 | 14, i: number) => LUGAR[d].arriba + TIPO[tamano].base + TIPO[tamano].alto * i
const yArtista = (d: Dibujo, tamano: 20 | 14, n: number) => yLinea(d, tamano, n - 1) + AL_ARTISTA
const anchoLinea = (d: Dibujo, tamano: 20 | 14) => (i: number) => anchoEn(d, yLinea(d, tamano, i))

function armar(d: Dibujo, tamano: 20 | 14, lineas: string[], artista: string, anio: number | null): Texto {
  const y = yArtista(d, tamano, lineas.length)
  return {
    tamano,
    lineas: lineas.map((texto, i) => ({ texto, y: round(yLinea(d, tamano, i)) })),
    artista: { texto: lineaArtista(artista, anio, anchoEn(d, y)), y: round(y) },
  }
}

const round = (n: number) => Math.round(n * 100) / 100

/**
 * El texto en ese dibujo con el título entero, o null si no entra. Con `artistaEntero`, también el artista
 * tiene que entrar sin cortarse.
 */
export function textoQueEntra(d: Dibujo, titulo: string, artista: string, anio: number | null, artistaEntero = false): Texto | null {
  for (const p of PRUEBAS) {
    if (yArtista(d, p.tamano, p.lineas) > LUGAR[d].fondo) continue
    const lineas = enLineas(titulo, p.tamano, anchoLinea(d, p.tamano), p.lineas)
    if (!lineas || lineas.length !== p.lineas) continue
    const texto = armar(d, p.tamano, lineas, artista, anio)
    if (artistaEntero && texto.artista.texto.includes('…')) continue
    return texto
  }
  return null
}

/** El texto cortado con "…" en el dibujo que más líneas permite */
function textoRecortado(d: Dibujo, titulo: string, artista: string, anio: number | null): Texto {
  const n = Math.max(...PRUEBAS.filter((p) => p.tamano === 14 && yArtista(d, 14, p.lineas) <= LUGAR[d].fondo).map((p) => p.lineas))
  return armar(d, 14, recortado(titulo, 14, anchoLinea(d, 14), n), artista, anio)
}

/** Un número que sale siempre igual del deezer_id y se reparte bien (FNV-1a) */
export function mezcla(n: number | string) {
  let h = 0x811c9dc5
  for (const c of String(n)) {
    h ^= c.charCodeAt(0)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

export type Tapa = { dibujo: Dibujo; paleta: Paleta; texto: Texto }

/**
 * La tapa de un disco: el dibujo sale del deezer_id, pero si el texto no entra en ese dibujo se prueba el siguiente
 * (en el mismo orden para el mismo disco): primero buscando que entren el título y el artista enteros, después
 * solo el título. Si el título no entra en ninguno, va cortado con "…" en el que más lugar tiene.
 */
export function tapaCabina(disco: { deezerId: number | string; titulo: string; artista: string; anio: number | null }): Tapa {
  const h = mezcla(disco.deezerId)
  const titulo = tituloLimpio(disco.titulo)
  const primero = h % DIBUJOS.length
  const paleta = Math.floor(h / DIBUJOS.length) % 3
  for (const artistaEntero of [true, false]) {
    for (let k = 0; k < DIBUJOS.length; k++) {
      const dibujo = DIBUJOS[(primero + k) % DIBUJOS.length]
      const texto = textoQueEntra(dibujo, titulo, disco.artista, disco.anio, artistaEntero)
      if (texto) return { dibujo, paleta: PALETAS[dibujo][paleta], texto }
    }
  }
  return { dibujo: 'CLI', paleta: PALETAS.CLI[paleta], texto: textoRecortado('CLI', titulo, disco.artista, disco.anio) }
}

// ── Las formas de cada dibujo, exportadas del Figma (las dibujan el SVG y el canvas de las tarjetas) ──

export type Forma =
  | { tipo: 'circulo'; cx: number; cy: number; r: number; color: string }
  | { tipo: 'rect'; x: number; y: number; w: number; h: number; color: string; giro?: number }
  | { tipo: 'path'; d: string; color: string }

const ESTRELLA =
  'M133 60L142.471 92.134L171.891 76.1091L155.866 105.529L188 115L155.866 124.471L171.891 153.891L142.471 137.866L133 170L123.529 137.866L94.1091 153.891L110.134 124.471L78 115L110.134 105.529L94.1091 76.1091L123.529 92.134L133 60Z'

const triangulo = (x: number, y: number, color: string): Forma => ({
  tipo: 'path',
  d: `M${x} ${y}L${x + 12.99} ${y + 19.5}H${x - 12.99}L${x} ${y}Z`,
  color,
})

/** Las formas, en orden, sobre el fondo. `giro` es en grados alrededor de la esquina de arriba a la izquierda. */
export function formasDe(tapa: Pick<Tapa, 'dibujo' | 'paleta'>): Forma[] {
  const f = tapa.paleta.formas
  const fondo = tapa.paleta.fondo
  switch (tapa.dibujo) {
    case 'ART':
      return [
        { tipo: 'circulo', cx: 186, cy: 186, r: 90, color: f[0] },
        { tipo: 'path', d: 'M171 18L209.971 76.5H132.029L171 18Z', color: f[1] },
        ...[96, 105, 114, 123, 132].map((y): Forma => ({ tipo: 'rect', x: 18, y, w: 70, h: 3, color: f[2] })),
      ]
    case 'BOC':
      return [
        ...[130, 100, 70, 40].map((r, i): Forma => ({ tipo: 'circulo', cx: 100, cy: 200, r, color: i % 2 ? fondo : f[0] })),
        { tipo: 'rect', x: 0, y: 0, w: 200, h: 8, color: f[1] },
      ]
    case 'CLI':
      return [
        ...[-6, 28, 62, 96, 130, 164].map((x): Forma => ({ tipo: 'rect', x, y: 120, w: 16, h: 160, color: f[0], giro: 35 })),
        ...[148, 164, 180].flatMap((cy) => [156, 172, 188].map((cx): Forma => ({ tipo: 'circulo', cx, cy, r: 4, color: f[1] }))),
      ]
    case 'DIN':
      return [
        { tipo: 'path', d: ESTRELLA, color: f[0] },
        { tipo: 'circulo', cx: 133, cy: 115, r: 12, color: f[1] },
        { tipo: 'rect', x: 0, y: 186, w: 200, h: 14, color: f[0] },
      ]
    case 'INR':
      return [
        { tipo: 'circulo', cx: 45, cy: 145, r: 35, color: f[0] },
        { tipo: 'circulo', cx: 108, cy: 144, r: 48, color: f[1] },
        { tipo: 'circulo', cx: 158, cy: 148, r: 28, color: f[2] },
        { tipo: 'circulo', cx: 170, cy: 90, r: 20, color: f[3] },
      ]
    case 'TPB':
      return [
        triangulo(91, 80, f[0]), triangulo(151, 80, f[0]), triangulo(121, 108, f[1]), triangulo(181, 108, f[1]),
        triangulo(91, 136, f[0]), triangulo(151, 136, f[0]), triangulo(121, 164, f[1]), triangulo(181, 164, f[1]),
      ]
  }
}
