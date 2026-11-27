import { describe, expect, it } from 'vitest'
import { anchoArtista, anchoEn, anchoTitulo, DIBUJOS, LUGAR, lineaArtista, PALETAS, tapaCabina, textoQueEntra, tituloLimpio } from './tapaCabina'

const DISCOS = [
  { deezerId: 1, titulo: 'Artaud', artista: 'L.A. Spinetta', anio: 1973 },
  { deezerId: 2, titulo: 'Friends (Deluxe Edition)', artista: 'White Lies', anio: 2016 },
  { deezerId: 3, titulo: "Sgt. Pepper's Lonely Hearts Club Band - Remastered 2009", artista: 'The Beatles', anio: 1967 },
  { deezerId: 4, titulo: 'Mellon Collie and the Infinite Sadness', artista: 'The Smashing Pumpkins', anio: 1995 },
  { deezerId: 5, titulo: 'Supercalifragilisticoespialidosoextraordinario', artista: 'Nadie', anio: null },
  { deezerId: 6, titulo: 'La síntesis O\'Konor', artista: 'El Mató a un Policía Motorizado', anio: 2017 },
]

describe('La tapa ilustrada (#125)', () => {
  it('el mismo disco tiene siempre la misma tapa', () => {
    for (const d of DISCOS) expect(tapaCabina(d)).toEqual(tapaCabina({ ...d }))
  })

  it('reparte los dibujos y las paletas', () => {
    const tapas = Array.from({ length: 300 }, (_, i) => tapaCabina({ deezerId: 1000 + i, titulo: 'Disco', artista: 'Banda', anio: 2000 }))
    expect(new Set(tapas.map((t) => t.dibujo)).size).toBe(6)
    expect(new Set(tapas.map((t) => t.paleta)).size).toBe(18)
  })

  it('saca las ediciones del título', () => {
    expect(tituloLimpio('Friends (Deluxe Edition)')).toBe('FRIENDS')
    expect(tituloLimpio('In Rainbows [Remastered]')).toBe('IN RAINBOWS')
    expect(tituloLimpio('Abbey Road - Remastered 2009')).toBe('ABBEY ROAD')
    expect(tituloLimpio('Kid A')).toBe('KID A')
    expect(tituloLimpio('(What\'s the Story) Morning Glory?')).toBe("(WHAT'S THE STORY) MORNING GLORY?")
    expect(tituloLimpio('()')).toBe('()')
  })

  it('el artista lleva el año y, si no entra, se corta antes del año', () => {
    expect(lineaArtista('L.A. Spinetta', 1973, 178)).toBe("L.A. SPINETTA '73")
    expect(lineaArtista('Wilco', 2001, 178)).toBe("WILCO '01")
    expect(lineaArtista('Nadie', null, 178)).toBe('NADIE')
    const largo = lineaArtista('El Mató a un Policía Motorizado', 2017, 178)
    expect(largo.endsWith("… '17")).toBe(true)
    expect(anchoArtista(largo)).toBeLessThanOrEqual(178)
  })

  it('como en el Figma: Artaud, In Rainbows y Clics Modernos', () => {
    expect(textoQueEntra('ART', 'ARTAUD', 'L.A. Spinetta', 1973)).toEqual({
      tamano: 20,
      lineas: [{ texto: 'ARTAUD', y: 31.64 }],
      artista: { texto: "L.A. SPINETTA '73", y: 52.64 },
    })
    expect(textoQueEntra('INR', 'IN RAINBOWS', 'Radiohead', 2007)?.lineas.map((l) => l.texto)).toEqual(['IN RAINBOWS'])
    expect(textoQueEntra('CLI', 'CLICS MODERNOS', 'C. García', 1983)).toMatchObject({
      tamano: 20,
      lineas: [{ texto: 'CLICS', y: 31.64 }, { texto: 'MODERNOS', y: 52.64 }],
      artista: { y: 73.64 },
    })
    // en Bocanada todo baja 8 por la barra de arriba
    expect(textoQueEntra('BOC', 'BOCANADA', 'G. Cerati', 1999)?.lineas[0].y).toBe(39.64)
  })

  it('el texto nunca se sale de su lugar ni pisa el dibujo', () => {
    const titulos = [...DISCOS.map((d) => d.titulo), 'A', 'WWWWWWWWWWWWWWWWWWWWWWWW', 'The Head Hurts but the Heart Knows the Truth', 'Igor', 'Hurry Up, We\'re Dreaming']
    titulos.forEach((titulo, i) => {
      for (let k = 0; k < 12; k++) {
        const t = tapaCabina({ deezerId: i * 100 + k, titulo, artista: 'The Smashing Pumpkins', anio: 1995 })
        const lugar = LUGAR[t.dibujo]
        for (const l of t.texto.lineas) expect(anchoTitulo(l.texto, t.texto.tamano)).toBeLessThanOrEqual(anchoEn(t.dibujo, l.y))
        expect(anchoArtista(t.texto.artista.texto)).toBeLessThanOrEqual(anchoEn(t.dibujo, t.texto.artista.y))
        expect(t.texto.artista.y).toBeLessThanOrEqual(lugar.fondo)
        expect(t.texto.lineas.length).toBeGreaterThan(0)
      }
    })
  })

  it('un título largo busca el dibujo donde entra entero', () => {
    const t = tapaCabina({ deezerId: 4, titulo: 'Mellon Collie and the Infinite Sadness', artista: 'The Smashing Pumpkins', anio: 1995 })
    expect(t.texto.lineas.map((l) => l.texto).join(' ')).toBe('MELLON COLLIE AND THE INFINITE SADNESS')
  })

  it('prefiere un dibujo donde el artista entra entero', () => {
    for (let i = 0; i < 30; i++) {
      const t = tapaCabina({ deezerId: i, titulo: 'Heaven or Las Vegas', artista: 'Cocteau Twins', anio: 1990 })
      expect(t.texto.artista.texto).toBe("COCTEAU TWINS '90")
    }
  })

  it('si no entra en ninguno, se corta con "…"', () => {
    const t = tapaCabina(DISCOS[4])
    expect(t.texto.lineas.at(-1)?.texto.endsWith('…')).toBe(true)
  })

  it('en ART el texto se achica a medida que baja, por el triángulo', () => {
    expect(anchoEn('ART', 31.64)).toBe(141)
    expect(anchoEn('ART', 52.64)).toBe(127)
    expect(anchoEn('ART', 90)).toBe(112)
    expect(anchoEn('CLI', 90)).toBe(178)
  })

  it('cada dibujo tiene tres paletas', () => {
    for (const d of DIBUJOS) expect(PALETAS[d]).toHaveLength(3)
  })
})
