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
  const frase = (p: Pasillo) => fraseArmada(p, tandaDe(p)!, HOY)

  it('no repite los títulos, que ya están en el estante', () => {
    const p = pasillo([disco('Artaud', 'Pescado Rabioso', 1973, 1), disco('Clics Modernos', 'Charly García', 1983, 1.1)])
    expect(frase(p)).not.toMatch(/Artaud|Clics Modernos/)
  })

  it('si todo es viejo, se ríe de eso', () => {
    const p = pasillo([disco('Artaud', 'Pescado Rabioso', 1973, 1), disco('Clics Modernos', 'Charly García', 1983, 1.1)])
    expect(frase(p)).toBe("Lo más nuevo es del '83. Maxi no confía en nada que tenga wifi.")
  })

  it('con años muy separados, la máquina del tiempo', () => {
    const p = pasillo([disco('Artaud', 'Pescado Rabioso', 1973, 1), disco('Halcyon', 'X', 2025, 1.1)])
    expect(frase(p)).toBe("Del '73 al '25 en una tanda. Maxi usa la ronda de máquina del tiempo.")
  })

  it('si un artista ya había pasado antes, le prende velas', () => {
    const p = pasillo([disco('Artaud', 'Spinetta', null, 1), disco('Kamikaze', 'Spinetta', null, 30, 8)])
    expect(frase(p)).toMatch(/^(Otra vez Spinetta\. Maxi no pasa discos, le prende velas\.|Un solo disco y a dormir\. Maxi pasa poco pero con intención\.)$/)
  })

  it('dos del mismo artista en la tanda es devoción', () => {
    const p = pasillo([disco('A', 'Cerati', null, 1), disco('B', 'Cerati', null, 1.1)])
    expect(frase(p)).toBe('Dos de Cerati en la misma tanda. Lo de Maxi ya no es gusto, es devoción.')
  })

  it('con más de 30 días quieto, lo extraña', () => {
    expect(frase(pasillo([disco('A', 'X', 1990, 45)]))).toMatch(/Maxi (salió a comprar puchos|no pasa nada hace rato)/)
  })

  it('sin nada que decir, igual tira una', () => {
    const p = pasillo([disco('A', 'X', null, 1), disco('B', 'Y', null, 1.1)])
    expect(frase(p)).toMatch(/Maxi/)
  })

  it('la frase no cambia entre visitas', () => {
    const p = pasillo([disco('A', 'X', 1990, 1), disco('B', 'Y', 2010, 1.1), disco('C', 'Z', 2000, 1.2), disco('D', 'W', 2005, 1.3)])
    expect(frase(p)).toBe(frase(p))
  })

  it('nunca usa puntajes ni tarjetitas', () => {
    const p = pasillo([disco('Artaud', 'Pescado Rabioso', 1973, 1, 9)])
    expect(frase(p)).not.toMatch(/9\/10|\bx\b/)
  })
})
