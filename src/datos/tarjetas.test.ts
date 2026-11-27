import { describe, expect, it } from 'vitest'
import type { Detalle } from './detalle'
import type { Informe } from './informe'
import { anchoTitulo } from './tapaCabina'
import { cortar, FRASE, LETRAS, lineasDeLaFrase, tarjetaDelDisco, tarjetaDelInforme } from './tarjetas'

describe('La tarjeta del disco (08a)', () => {
  const detalle = (cambios: Partial<Detalle> = {}) =>
    ({
      paseId: 'p1', deezerId: 302127, catalogo: 'MAX-07', titulo: 'Artaud', artista: 'Pescado Rabioso', anio: 1973,
      de: { id: 'u2', nombre: 'Maximiliano Gómez', sigla: 'MAX' }, esMio: false,
      mia: { puntaje: 9, temaFavorito: null, reaccion: null, comentario: null, creadaEn: '2026-11-01T15:00:00Z' },
      ...cambios,
    }) as Detalle

  it('como en el Figma: "MAXI ME PASÓ / ARTAUD Y LE PUSE" y 09/10, con nombre de pila', () => {
    const t = tarjetaDelDisco(detalle({ de: { id: 'u2', nombre: 'Maxi Gómez', sigla: 'MAX' } }), 'Birrinhas do Sabado')!
    expect(t.frase).toEqual(['MAXI ME PASÓ', 'ARTAUD Y LE PUSE'])
    expect(t.puntaje).toBe('09/10')
    expect(t.fecha).toBe("'26 11 01")
    expect(t.ronda).toBe('CABINA 86 · BIRRINHAS DO SABADO')
    expect(t.disco.deezerId).toBe(302127)
  })

  it('nunca lleva el apellido', () => {
    expect(tarjetaDelDisco(detalle(), 'R')!.frase[0]).toBe('MAXIMILIANO ME PASÓ')
  })

  it('sin calificar, o si lo pasaste vos, no hay tarjeta', () => {
    expect(tarjetaDelDisco(detalle({ mia: null }), 'R')).toBeNull()
    expect(tarjetaDelDisco(detalle({ esMio: true }), 'R')).toBeNull()
  })

  it('un título largo pasa a más líneas y, si no entra en 4, se corta con "…"', () => {
    const largo = lineasDeLaFrase('MANU', 'MELLON COLLIE AND THE INFINITE SADNESS')
    expect(largo.length).toBeLessThanOrEqual(FRASE.lineas)
    expect(largo.join(' ')).toContain('Y LE PUSE')
    const enorme = lineasDeLaFrase('MANU', 'THE HEAD HURTS BUT THE HEART KNOWS THE TRUTH AND THE TRUTH HURTS TOO MUCH TO SAY')
    expect(enorme.length).toBeLessThanOrEqual(FRASE.lineas)
    expect(enorme.join(' ')).toMatch(/… Y LE PUSE$/)
    for (const l of [...largo, ...enorme]) expect(anchoTitulo(l, FRASE.tamano, FRASE.espaciado)).toBeLessThanOrEqual(FRASE.ancho)
  })
})

describe('La tarjeta del informe (08c)', () => {
  const disco = (titulo: string, de: string, promedio: number, notas: number[]) => ({
    pase_id: titulo, titulo, artista: 'X', tapa_url: null, de: de.slice(0, 3).toUpperCase(), de_nombre: de, promedio,
    notas: notas.map((puntaje, k) => ({ sigla: ['FAC', 'MAX', 'MAN'][k], puntaje })),
  })
  const informe = {
    integrantes: [{ sigla: 'FAC', nombre: 'Facundo Pérez' }, { sigla: 'MAX', nombre: 'Maxi' }, { sigla: 'MAN', nombre: 'Manu' }],
    faltan_cerrados: 0,
    termometro: { faltan: 0, notas: 90, entre_6_y_8: 65, promedio: 6.8, uno_y_dos: 0, nueve_y_diez: 9, la_que_mas: 8, reparto: [] },
    tibiometro: [{ sigla: 'MAX', nombre: 'Maxi', notas: 30, faltan: 0, entre_6_y_8_pct: 80, nueve_y_diez: 0, dieces: 0, mas_alta: 9, mas_baja: 3 }],
    podio: [
      { ...disco('Friends (Deluxe Edition)', 'Manu', 9.5, [9, 10]), puesto: 1 },
      { ...disco('The Black Parade', 'Facu', 9, [9, 9]), puesto: 2 },
      { ...disco('A Different Age', 'Maxi', 8.5, [8, 9]), puesto: 3 },
      { ...disco('Otro', 'Maxi', 8.5, [8, 9]), puesto: 3 },
    ],
    fondo: [disco('Heaven or Las Vegas', 'Facu', 3, [3, 3])],
    discordia: [{ ...disco('Mensajes del Alma', 'Manu', 6, []), alta: { sigla: 'MAX', puntaje: 8 }, baja: { sigla: 'FAC', puntaje: 4 }, puntos: 4, desvios: 2 }],
    punteria: { tiros: [], dardos: [], mejor: { de: 'FAC', de_nombre: 'Facundo Pérez', a: 'MAN', a_nombre: 'Manu', titulo: 'The Black Parade', puntaje: 10, sobre: 3.3 }, errado: null },
  } as unknown as Informe

  it('arma el ticket con lo mejor del informe y nombres de pila', () => {
    const t = tarjetaDelInforme(informe, 'Birrinhas do Sabado', new Date('2026-11-26T15:00:00Z'))
    expect(t.sub).toBe('BIRRINHAS DO SABADO · FACUNDO, MAXI, MANU')
    expect(t.tibio).toEqual({ pct: '72%', frase: 'RONDA TIBIA. EL MÁS TIBIO: MAXI (80 %).' })
    expect(t.podio).toEqual([
      { texto: '1  FRIENDS · MANU', nota: '9,5' },
      { texto: '2  THE BLACK PARADE · FACU', nota: '9,0' },
      { texto: '3  A DIFFERENT AGE Y 1 MÁS', nota: '8,5' },
    ])
    expect(t.renglones).toEqual([
      '* DISCORDIA: MENSAJES DEL ALMA · 8 Y 4',
      '* MEJOR TIRO: FACUNDO→MANU · THE BLA… 10',
      '* EL FONDO: HEAVEN OR LAS VEGAS · 3 Y 3',
    ])
    expect(t.sticker).toEqual(['TI-', 'BIA'])
    expect(t.fecha).toBe("'26 11 26")
  })

  it('ninguna línea se pasa del ancho del ticket', () => {
    const t = tarjetaDelInforme(informe, 'Una ronda con un nombre larguísimo de verdad', new Date())
    expect([...t.sub].length).toBeLessThanOrEqual(LETRAS.linea11)
    for (const r of t.renglones) expect([...r].length).toBeLessThanOrEqual(LETRAS.renglon12)
    for (const p of t.podio) expect([...p.texto].length).toBeLessThanOrEqual(LETRAS.fila13)
  })

  it('con pocos datos, solo lo que alcanza su mínimo', () => {
    const nuevo = { ...informe, faltan_cerrados: 2, termometro: { ...informe.termometro, faltan: 4 }, punteria: { ...informe.punteria, mejor: null } } as Informe
    const t = tarjetaDelInforme(nuevo, 'R')
    expect(t.tibio).toBeNull()
    expect(t.podio).toEqual([])
    expect(t.renglones).toEqual([])
    expect(t.sticker).toBeNull()
  })

  it('cortar respeta las letras', () => {
    expect(cortar('ABCDEF', 4)).toBe('ABC…')
    expect(cortar('ABC', 4)).toBe('ABC')
  })
})
