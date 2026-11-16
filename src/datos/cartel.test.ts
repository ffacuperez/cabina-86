import { describe, expect, it } from 'vitest'
import { fraseArmada, pieDelCartel, tandaDe } from './cartel'
import type { DiscoEnEstante, Pasillo } from './exhibidor'

const HOY = new Date('2026-11-16T15:00:00-03:00')
const hace = (dias: number) => new Date(HOY.getTime() - dias * 24 * 60 * 60 * 1000).toISOString()

let n = 0
const disco = (titulo: string, artista: string, anio: number | null, dias: number, puntaje: number | null = null): DiscoEnEstante => ({
  paseId: `p${++n}`,
  catalogo: `MAX-${String(n).padStart(2, '0')}`,
  titulo,
  artista,
  anio,
  tapa: null,
  tarjetita: 'x',
  creadoEn: hace(dias),
  puntaje,
})

const pasillo = (discos: DiscoEnEstante[], archivados: DiscoEnEstante[] = []): Pasillo => ({
  de: { id: 'maxi', nombre: 'Maxi', sigla: 'MAX' },
  discos,
  archivados,
})

describe('la tanda del pasillo', () => {
  it('son los discos de los 3 días antes del último pase, mirando también el archivo', () => {
    const p = pasillo(
      [disco('Oktubre', 'Patricio Rey', 1986, 2.5), disco('Artaud', 'Pescado Rabioso', 1973, 1), disco('Bocanada', 'Cerati', 1999, 40)],
      [disco('Clics Modernos', 'Charly García', 1983, 1.01)],
    )
    const t = tandaDe(p)!
    expect(t.discos.map((d) => d.titulo)).toEqual(['Artaud', 'Clics Modernos', 'Oktubre'])
    expect(t.hasta).toBe(hace(1))
  })

  it('sin discos no hay tanda', () => {
    expect(tandaDe(pasillo([]))).toBeNull()
  })
})

describe('el pie del cartel', () => {
  it('dice la fecha y cuántos discos', () => {
    const t = tandaDe(pasillo([disco('A', 'X', 1990, 1), disco('B', 'Y', 1991, 1.2), disco('C', 'Z', 1992, 1.3)]))!
    expect(pieDelCartel(t, HOY)).toBe('TANDA DEL 15/11 · 3 DISCOS')
  })

  it('con más de 30 días quieto, lo dice', () => {
    expect(pieDelCartel(tandaDe(pasillo([disco('A', 'X', 1990, 45)]))!, HOY)).toMatch(/1 DISCO · HACE 45 DÍAS SIN PASAR NADA$/)
    expect(pieDelCartel(tandaDe(pasillo([disco('A', 'X', 1990, 70)]))!, HOY)).toMatch(/HACE 2 MESES SIN PASAR NADA$/)
  })
})

describe('la frase armada (sin IA)', () => {
  it('nombra la tanda y suma un dato de los años', () => {
    const p = pasillo([disco('Artaud', 'Pescado Rabioso', 1973, 1), disco('Clics Modernos', 'Charly García', 1983, 1.1)])
    expect(fraseArmada(p, tandaDe(p)!)).toBe("Maxi pasó Artaud y Clics Modernos. Del '73 al '83.")
  })

  it('con un solo disco dice de quién es', () => {
    const p = pasillo([disco('In Rainbows', 'Radiohead', 2007, 1)])
    expect(fraseArmada(p, tandaDe(p)!)).toBe('Maxi pasó In Rainbows, de Radiohead. Todo de los 2000.')
  })

  it('con más de 3 discos resume la lista', () => {
    const p = pasillo([1, 2, 3, 4].map((i) => disco(`Disco ${i}`, `Artista ${i}`, null, 1 + i / 100)))
    expect(fraseArmada(p, tandaDe(p)!)).toBe('Maxi pasó Disco 1, Disco 2 y 2 más.')
  })

  it('si un artista ya había pasado antes, puede decir "otra vez"', () => {
    const p = pasillo([disco('Artaud', 'Spinetta', null, 1), disco('Kamikaze', 'Spinetta', null, 30, 8)])
    expect(fraseArmada(p, tandaDe(p)!)).toBe('Maxi pasó Artaud, de Spinetta. Otra vez Spinetta.')
  })

  it('nunca usa puntajes ni tarjetitas', () => {
    const p = pasillo([disco('Artaud', 'Pescado Rabioso', 1973, 1, 9)])
    const frase = fraseArmada(p, tandaDe(p)!)
    expect(frase).not.toMatch(/9\/10|\bx\b/)
  })
})
