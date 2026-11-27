/**
 * Las tarjetas para compartir (#127), dibujadas en un canvas de 1080 × 1920 (el doble del Figma, 540 × 960).
 * Las coordenadas son las del Figma: 08a · foto analógica (17:2469) y 08c · ticket del informe (265:4200).
 * Qué dice cada una sale de datos/tarjetas.ts; la tapa es la ilustrada (#125), nunca la de Deezer.
 * Sin luz de rollo ni grano (#30).
 */
import { formasDe, MARGEN, type Tapa, tapaCabina } from '../datos/tapaCabina'
import type { TarjetaDisco, TarjetaInforme } from '../datos/tarjetas'

const ANCHO = 540
const ALTO = 960
const ESCALA = 2

const C = {
  negro: '#1f231c',
  negro2: '#33392d',
  crema: '#dde6bf',
  verde: '#a9b884',
  verdeClaro: '#c9d6a3',
  mostaza: '#e3c16f',
  naranja: '#ff7a1a',
  papel: '#f2efdd',
}

const F = {
  cartel: (px: number) => `italic 900 ${px}px 'Zalando Sans Expanded', 'Arial Black', sans-serif`,
  mono: (px: number, peso = 500) => `${peso} ${px}px 'IBM Plex Mono', ui-monospace, monospace`,
  lcd: (px: number) => `400 ${px}px 'VT323', ui-monospace, monospace`,
}

/** Que las fuentes estén cargadas antes de dibujar (el canvas no espera) */
async function fuentes() {
  await Promise.all(
    [F.cartel(28), F.mono(11), F.mono(11, 700), F.lcd(34)].map((f) => document.fonts.load(f).catch(() => undefined)),
  )
}

function lienzo() {
  const canvas = document.createElement('canvas')
  canvas.width = ANCHO * ESCALA
  canvas.height = ALTO * ESCALA
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Sin canvas')
  ctx.scale(ESCALA, ESCALA)
  return { canvas, ctx }
}

function aPng(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((ok, mal) => canvas.toBlob((b) => (b ? ok(b) : mal(new Error('Sin imagen'))), 'image/png'))
}

type Ctx = CanvasRenderingContext2D

/** Texto con el centro de la línea en `y` (las cajas de texto del Figma se miden desde arriba) */
function texto(ctx: Ctx, t: string, x: number, y: number, fuente: string, color: string, espaciado = 0, alinear: CanvasTextAlign = 'left') {
  ctx.font = fuente
  ctx.fillStyle = color
  ctx.textAlign = alinear
  ctx.textBaseline = 'middle'
  // Safari viejo no tiene letterSpacing en el canvas: sale un poco más apretado, nada más
  if ('letterSpacing' in ctx) (ctx as Ctx & { letterSpacing: string }).letterSpacing = `${espaciado}px`
  ctx.fillText(t, x, y)
  if ('letterSpacing' in ctx) (ctx as Ctx & { letterSpacing: string }).letterSpacing = '0px'
}

function rectRedondo(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

/** La tapa ilustrada en un cuadrado de 200 (el que llama pone la posición y la escala) */
export function dibujarTapa(ctx: Ctx, tapa: Tapa, conTexto = true) {
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, 0, 200, 200)
  ctx.clip()
  ctx.fillStyle = tapa.paleta.fondo
  ctx.fillRect(0, 0, 200, 200)
  for (const f of formasDe(tapa)) {
    ctx.fillStyle = f.color
    if (f.tipo === 'circulo') {
      ctx.beginPath()
      ctx.arc(f.cx, f.cy, f.r, 0, Math.PI * 2)
      ctx.fill()
    } else if (f.tipo === 'rect') {
      ctx.save()
      ctx.translate(f.x, f.y)
      if (f.giro) ctx.rotate((f.giro * Math.PI) / 180)
      ctx.fillRect(0, 0, f.w, f.h)
      ctx.restore()
    } else ctx.fill(new Path2D(f.d))
  }
  if (conTexto) {
    const t = tapa.texto
    ctx.textBaseline = 'alphabetic'
    ctx.textAlign = 'left'
    const conEspaciado = (e: number) => 'letterSpacing' in ctx && ((ctx as Ctx & { letterSpacing: string }).letterSpacing = `${e}px`)
    ctx.font = F.cartel(t.tamano)
    ctx.fillStyle = tapa.paleta.titulo
    conEspaciado(t.tamano === 14 ? 0.3 : 0)
    for (const l of t.lineas) ctx.fillText(l.texto, MARGEN, l.y)
    ctx.font = F.mono(11)
    ctx.fillStyle = tapa.paleta.artista
    conEspaciado(0.8)
    ctx.fillText(t.artista.texto, MARGEN, t.artista.y)
    conEspaciado(0)
  }
  ctx.restore()
}

/** C86/Caja CD (base 110 × 102) con la tapa ilustrada adentro, en (0, 0) con ese ancho */
function dibujarCaja(ctx: Ctx, tapa: Tapa, ancho: number, conTexto: boolean, sombra: { y: number; blur: number }) {
  const u = ancho / 110
  ctx.save()
  ctx.shadowColor = 'rgba(31, 36, 28, 0.35)'
  ctx.shadowOffsetY = sombra.y
  ctx.shadowBlur = sombra.blur
  ctx.fillStyle = C.negro2
  rectRedondo(ctx, 0, 0, 110 * u, 102 * u, 1.5 * u)
  ctx.fill()
  ctx.restore()
  // La tapa
  ctx.save()
  ctx.translate(9 * u, u)
  ctx.scale((100 * u) / 200, (100 * u) / 200)
  dibujarTapa(ctx, tapa, conTexto)
  ctx.restore()
  // La bisagra con 12 nervios
  ctx.fillStyle = C.negro
  rectRedondo(ctx, 0, 0, 8 * u, 102 * u, u)
  ctx.fill()
  ctx.fillStyle = C.verde
  for (let k = 0; k < 12; k++) ctx.fillRect(1.5 * u, (5 + 8 * k) * u, 5 * u, u)
  // El reflejo del plástico
  const r = ctx.createLinearGradient(9 * u, u, 110 * u, 101 * u)
  r.addColorStop(0.44, 'rgba(255, 255, 242, 0)')
  r.addColorStop(0.5, 'rgba(255, 255, 242, 0.32)')
  r.addColorStop(0.571, 'rgba(255, 255, 242, 0)')
  r.addColorStop(0.857, 'rgba(255, 255, 242, 0.08)')
  ctx.fillStyle = r
  ctx.fillRect(9 * u, u, 101 * u, 100 * u)
  // El borde acrílico
  ctx.strokeStyle = 'rgba(255, 255, 242, 0.35)'
  ctx.lineWidth = 0.75 * u
  rectRedondo(ctx, 0.375 * u, 0.375 * u, 109.25 * u, 101.25 * u, 1.5 * u)
  ctx.stroke()
}

const grados = (g: number) => (g * Math.PI) / 180

// ── 08a · La foto analógica ──

export async function tarjetaDelDiscoEnPng(t: TarjetaDisco): Promise<Blob> {
  await fuentes()
  const { canvas, ctx } = lienzo()
  ctx.fillStyle = C.negro
  ctx.fillRect(0, 0, ANCHO, ALTO)
  // Las perforaciones del rollo
  ctx.fillStyle = C.crema
  for (let k = 0; k < 22; k++) {
    for (const x of [12, 512]) {
      rectRedondo(ctx, x, 14 + 43 * k, 16, 22, 3)
      ctx.fill()
    }
  }
  texto(ctx, '400 · 24A ▸', 44, 24.6, F.mono(11), C.mostaza, 0.8)
  texto(ctx, '25', 484, 24.6, F.mono(11), C.mostaza, 0.8, 'right')

  // La foto
  ctx.save()
  ctx.translate(44, 44)
  ctx.beginPath()
  ctx.rect(0, 0, 452, 800)
  ctx.clip()
  const luz = ctx.createRadialGradient(226, 400, 0, 226, 400, 460)
  luz.addColorStop(0, '#f2f7db')
  luz.addColorStop(1, C.verdeClaro)
  ctx.fillStyle = luz
  ctx.fillRect(0, 0, 452, 800)

  // La disquería de fondo, desenfocada (o más suave, donde el canvas no desenfoca)
  ctx.save()
  if (typeof (ctx as { filter?: unknown }).filter === 'string') ctx.filter = 'blur(3px)'
  else ctx.globalAlpha = 0.55
  for (const [fila, y] of [20, 180, 340].entries()) {
    for (let k = 0; k < 4; k++) {
      const tapa = tapaCabina({ deezerId: `${t.disco.deezerId}-${fila}-${k}`, titulo: 'X', artista: '', anio: null })
      ctx.save()
      ctx.translate(10 + 112 * k, y)
      dibujarCaja(ctx, tapa, 103, false, { y: 2.8, blur: 4.7 })
      ctx.restore()
    }
    ctx.fillStyle = C.verde
    ctx.fillRect(0, y + 102, 452, 8)
  }
  ctx.restore()

  // La caja del disco, torcida; si la frase tiene más de dos líneas, sube para dejarle lugar
  ctx.save()
  ctx.translate(60, 300 - 28 * Math.max(0, t.frase.length - 2))
  ctx.rotate(grados(5))
  dibujarCaja(ctx, tapaCabina(t.disco), 352, true, { y: 9.6, blur: 16 })
  ctx.restore()

  // Dominante y sombra de abajo, para que se lea el texto
  ctx.fillStyle = 'rgba(227, 194, 112, 0.16)'
  ctx.fillRect(0, 0, 452, 800)
  const sombra = ctx.createLinearGradient(0, 500, 0, 800)
  sombra.addColorStop(0, 'rgba(31, 36, 28, 0)')
  sombra.addColorStop(1, 'rgba(31, 36, 28, 0.85)')
  ctx.fillStyle = sombra
  ctx.fillRect(0, 500, 452, 300)

  // "MAXI ME PASÓ / ARTAUD Y LE PUSE": la última línea termina donde en el Figma (696)
  const arriba = 696 - 28 * t.frase.length
  t.frase.forEach((linea, i) => texto(ctx, linea, 24, arriba + 14 + 28 * i, F.cartel(28), C.crema, -0.2))
  texto(ctx, t.puntaje, 24, 737, F.lcd(56), C.mostaza)
  ctx.save()
  ctx.shadowColor = 'rgba(255, 122, 26, 0.6)'
  ctx.shadowBlur = 4
  texto(ctx, t.fecha, 300, 769, F.lcd(34), C.naranja, 0.5)
  ctx.restore()
  ctx.restore()

  texto(ctx, t.ronda, 44, 872.6, F.mono(11), C.verdeClaro, 0.8)
  texto(ctx, 'CABINA86.COM', 496, 872.6, F.mono(11, 700), C.mostaza, 0.8, 'right')
  return aPng(canvas)
}

// ── 08c · El ticket del informe ──

const CORTE = '- - - - - - - - - - - - - - - - - - - - - - -'
/** El código de barras del Figma: una raya cada 6, con estos anchos */
const BARRAS = [2, 1, 3, 1, 2, 4]

type Pieza = { alto: number; dibujar: (ctx: Ctx, y: number) => void }

export async function tarjetaDelInformeEnPng(t: TarjetaInforme): Promise<Blob> {
  await fuentes()
  const { canvas, ctx } = lienzo()
  ctx.fillStyle = C.verde
  ctx.fillRect(0, 0, ANCHO, ALTO)
  texto(ctx, 'CABINA 86', 36, 47.5, F.cartel(14), C.negro)

  const izq = 22
  const der = 22 + 316
  const corte: Pieza = { alto: 13, dibujar: (c, y) => texto(c, CORTE, izq, y + 6.5, F.mono(11), C.negro) }
  const fila = (a: string, b: string): Pieza => ({
    alto: 34,
    dibujar: (c, y) => {
      texto(c, a, izq, y + 17, F.mono(13), C.negro, 0.6)
      texto(c, b, der, y + 17, F.lcd(34), C.negro, 0, 'right')
    },
  })
  const linea = (s: string, fuente: string, alto: number): Pieza => ({ alto, dibujar: (c, y) => texto(c, s, izq, y + alto / 2, fuente, C.negro, 0.6) })

  const piezas: Pieza[] = [
    {
      alto: 56,
      dibujar: (c, y) => {
        texto(c, 'EL INFORME', izq, y + 14, F.cartel(28), C.negro, -0.2)
        texto(c, '· DE LA RONDA', izq, y + 42, F.cartel(28), C.negro, -0.2)
      },
    },
    linea(t.sub, F.mono(11), 13),
  ]
  if (t.tibio) piezas.push(corte, fila('ENTRE 6 Y 8', t.tibio.pct), linea(t.tibio.frase, F.mono(11), 13))
  if (t.podio.length) piezas.push(corte, linea('EL PODIO', F.mono(13, 700), 16), ...t.podio.map((p) => fila(p.texto, p.nota)))
  if (t.renglones.length) piezas.push(corte, ...t.renglones.map((r) => linea(r, F.mono(12, 700), 15)))
  if (!t.tibio && !t.podio.length && !t.renglones.length) piezas.push(corte, linea('TODAVÍA FALTAN DISCOS CERRADOS.', F.mono(11), 13))
  piezas.push(
    corte,
    {
      alto: 40,
      dibujar: (c, y) => {
        c.fillStyle = C.negro
        for (let x = 0, k = 0; x < 310; x += 6, k++) c.fillRect(izq + x, y, BARRAS[k % BARRAS.length], 40)
      },
    },
    {
      alto: 34,
      dibujar: (c, y) => {
        texto(c, t.fecha, izq, y + 17, F.lcd(34), C.naranja)
        texto(c, '¿Y TU RONDA?', der, y + 10.5, F.mono(11, 700), C.negro, 0.6, 'right')
        texto(c, 'CABINA86.COM', der, y + 23.7, F.mono(11, 700), C.negro, 0.6, 'right')
      },
    },
  )
  const espacio = 7
  const alto = 26 + piezas.reduce((s, p) => s + p.alto, 0) + espacio * (piezas.length - 1) + 22

  // El ticket, un poco torcido, con una sombra suave
  ctx.save()
  ctx.translate(90, Math.max(110, Math.min(130, 840 - alto)))
  ctx.rotate(grados(2))
  ctx.save()
  ctx.shadowColor = 'rgba(31, 35, 28, 0.25)'
  ctx.shadowOffsetY = 6
  ctx.shadowBlur = 14
  ctx.fillStyle = C.papel
  ctx.fillRect(0, 0, 360, alto)
  ctx.restore()
  ctx.beginPath()
  ctx.rect(0, 0, 360, alto)
  ctx.clip()
  let y = 26
  for (const p of piezas) {
    p.dibujar(ctx, y)
    y += p.alto + espacio
  }
  ctx.restore()

  // El sticker con el veredicto del termómetro
  if (t.sticker) {
    ctx.save()
    ctx.translate(432, 128)
    ctx.rotate(grados(14))
    ctx.fillStyle = C.naranja
    ctx.beginPath()
    for (let k = 0; k < 32; k++) {
      const r = k % 2 ? 42 : 48
      const a = (k / 32) * Math.PI * 2
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r)
    }
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = C.negro
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(0, 0, 34, 0, Math.PI * 2)
    ctx.stroke()
    const n = t.sticker.length
    t.sticker.forEach((s, i) => texto(ctx, s, 0, (i - (n - 1) / 2) * 16, F.mono(14, 700), C.negro, 0.6, 'center'))
    ctx.restore()
  }
  return aPng(canvas)
}
