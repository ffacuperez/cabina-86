/**
 * Las tarjetas para compartir en historias (#127): qué dice cada una. El dibujo es lib/tarjetas.ts (canvas).
 * - 08a · la foto analógica (Figma 17:2469): "MAXI ME PASÓ ARTAUD Y LE PUSE 09/10", con la tapa ilustrada (#125).
 * - 08c · el ticket del informe (Figma 265:4200): lo mejor del informe de la ronda.
 * Nombres de pila, nunca apellidos. Medidas en el tamaño del Figma (540 × 960); la imagen sale al doble.
 */
import type { Detalle } from './detalle'
import { fraseTermometro, type Informe, porcentajeTibio, puestos } from './informe'
import { anchoTitulo, tituloLimpio } from './tapaCabina'
import { dosCifras, fechaDeCamara, nombreDePila } from '../lib/texto'

const pila = (nombre: string | null | undefined) => (nombre ? (nombreDePila(nombre) || nombre).toUpperCase() : '')

/** Corta con "…" a esa cantidad de letras (para las líneas en Plex Mono, que tienen todas el mismo ancho) */
export function cortar(texto: string, letras: number) {
  const t = [...texto]
  return t.length <= letras ? texto : `${t.slice(0, letras - 1).join('').trimEnd()}…`
}

// ── 08a · El disco ──

export type TarjetaDisco = {
  /** "MAXI ME PASÓ" / "ARTAUD Y LE PUSE": en Zalando 28, hasta 4 líneas */
  frase: string[]
  /** "09/10" */
  puntaje: string
  /** "'26 11 01", el día que lo calificaste */
  fecha: string
  /** Para el pie: "CABINA 86 · BIRRINHAS DO SABADO" */
  ronda: string
  disco: { deezerId: number | string; titulo: string; artista: string; anio: number | null }
}

/** El ancho del texto de la foto (452 menos 24 de cada lado) y el tamaño, como en el Figma */
export const FRASE = { ancho: 404, tamano: 28, espaciado: -0.2, lineas: 4 }

/**
 * "MAXI ME PASÓ" en la primera línea y después "ARTAUD Y LE PUSE", cortado en líneas que entren. Si el título es muy
 * largo, se corta con "…" para que todo entre en 4 líneas.
 */
export function lineasDeLaFrase(deQuien: string, titulo: string): string[] {
  const { ancho, tamano, espaciado, lineas: maximo } = FRASE
  const mide = (t: string) => anchoTitulo(t, tamano, espaciado)
  const primera = `${deQuien} ME PASÓ`
  const cola = ['Y', 'LE', 'PUSE']
  const enLineas = (palabras: string[]) => {
    const lineas: string[] = []
    let actual = ''
    for (const p of palabras) {
      const con = actual ? `${actual} ${p}` : p
      if (mide(con) <= ancho || !actual) actual = con
      else {
        lineas.push(actual)
        actual = p
      }
    }
    if (actual) lineas.push(actual)
    return lineas
  }
  let palabras = titulo.split(/\s+/).filter(Boolean)
  let resto = enLineas([...palabras, ...cola])
  // Si no entra, se le sacan palabras al título y se marca con "…"
  while ((resto.length > maximo - 1 || resto.some((l) => mide(l) > ancho)) && palabras.length > 1) {
    palabras = palabras.slice(0, -1)
    resto = enLineas([...palabras.slice(0, -1), `${palabras.at(-1)}…`, ...cola])
  }
  return [primera, ...resto]
}

/** La tarjeta del disco: solo si lo calificaste (y no lo pasaste vos) */
export function tarjetaDelDisco(d: Detalle, nombreRonda: string): TarjetaDisco | null {
  if (!d.mia || d.esMio) return null
  return {
    frase: lineasDeLaFrase(pila(d.de.nombre), tituloLimpio(d.titulo)),
    puntaje: `${dosCifras(d.mia.puntaje)}/10`,
    fecha: fechaDeCamara(d.mia.creadaEn),
    ronda: `CABINA 86 · ${nombreRonda.toUpperCase()}`,
    disco: { deezerId: d.deezerId ?? d.paseId, titulo: d.titulo, artista: d.artista, anio: d.anio },
  }
}

// ── 08c · El informe ──

/** Letras por línea en el ticket (316 de ancho, Plex Mono con 0,6 de espaciado) */
export const LETRAS = { linea11: 44, fila13: 31, renglon12: 40 }

export type TarjetaInforme = {
  /** "BIRRINHAS DO SABADO · FACU, MAXI, MANU" */
  sub: string
  /** "72%" y "RONDA TIBIA. EL MÁS TIBIO: MAXI (80 %)." */
  tibio: { pct: string; frase: string } | null
  /** "1  FRIENDS · MANU" y "9,5" */
  podio: { texto: string; nota: string }[]
  /** "* DISCORDIA: MENSAJES DEL ALMA · 4 Y 8" y las otras */
  renglones: string[]
  /** El sticker según el termómetro: TI-BIA, PI-CAN-TE o nada */
  sticker: string[] | null
  fecha: string
}

const coma = (n: number) => n.toFixed(1).replace('.', ',')

export function tarjetaDelInforme(i: Informe, nombreRonda: string, hoy = new Date()): TarjetaInforme {
  const integrantes = i.integrantes.map((p) => pila(p.nombre)).join(', ')
  const t = i.termometro
  const pct = porcentajeTibio(t)
  const frase = t.faltan === 0 ? fraseTermometro(t) : ''
  const veredicto = /tibia/i.test(frase) ? 'RONDA TIBIA.' : /se juegan/i.test(frase) ? 'ACÁ SE JUEGAN.' : ''
  const tibios = i.tibiometro.filter((f) => f.faltan === 0 && f.entre_6_y_8_pct !== null)
  const masTibio = tibios[0]
  const tibio =
    t.faltan === 0
      ? {
          pct: `${pct}%`,
          frase: cortar([veredicto, masTibio ? `EL MÁS TIBIO: ${pila(masTibio.nombre)} (${masTibio.entre_6_y_8_pct} %).` : ''].filter(Boolean).join(' '), LETRAS.linea11),
        }
      : null
  const podio =
    i.faltan_cerrados === 0
      ? puestos(i.podio).map(({ puesto, disco, empatados }) => {
          const titulo = tituloLimpio(disco.titulo)
          const cola = empatados > 1 ? ` Y ${empatados - 1} MÁS` : ` · ${pila(disco.de_nombre)}`
          return { texto: `${puesto}  ${cortar(titulo, LETRAS.fila13 - 3 - cola.length)}${cola}`, nota: coma(disco.promedio) }
        })
      : []
  const renglones: string[] = []
  const d = i.faltan_cerrados === 0 ? i.discordia[0] : undefined
  if (d) {
    const cola = ` · ${d.alta.puntaje} Y ${d.baja.puntaje}`
    renglones.push(`* DISCORDIA: ${cortar(tituloLimpio(d.titulo), LETRAS.renglon12 - 14 - cola.length)}${cola}`)
  }
  const m = i.punteria.mejor
  if (m) {
    const cola = ` ${m.puntaje}`
    const quien = `${pila(m.de_nombre)}→${pila(m.a_nombre)} · `
    renglones.push(`* MEJOR TIRO: ${quien}${cortar(tituloLimpio(m.titulo), LETRAS.renglon12 - 14 - quien.length - cola.length)}${cola}`)
  }
  const f = i.faltan_cerrados === 0 ? i.fondo[0] : undefined
  if (f) {
    const cola = ` · ${f.notas.map((n) => n.puntaje).join(' Y ')}`
    renglones.push(`* EL FONDO: ${cortar(tituloLimpio(f.titulo), LETRAS.renglon12 - 12 - cola.length)}${cola}`)
  }
  return {
    sub: cortar(`${nombreRonda.toUpperCase()} · ${integrantes}`, LETRAS.linea11),
    tibio,
    podio,
    renglones,
    sticker: veredicto === 'RONDA TIBIA.' ? ['TI-', 'BIA'] : veredicto === 'ACÁ SE JUEGAN.' ? ['PI-CAN-', 'TE'] : null,
    fecha: fechaDeCamara(hoy.toISOString()),
  }
}
