import { describe, expect, it } from 'vitest'
import { type Informe, colorDe, etiquetaPlaca, placaDelPasillo, posicionPlaca, unDecimal, conSigno, etiquetaTiro, faltan, faltanTiro, frasePunteria, posicionDardo, fraseReparto, fraseTermometro, fraseTibiometro, lucesPrendidas, notasEnLinea, porcentajeTibio, puestos } from './informe'

type Termometro = Informe['termometro']
type Fila = Informe['tibiometro'][number]

const termo = (t: Partial<Termometro>): Termometro => ({
  faltan: 0, notas: 90, promedio: 6.8, uno_y_dos: 0, nueve_y_diez: 9, entre_6_y_8: 65, la_que_mas: 8,
  reparto: [0, 0, 3, 6, 7, 22, 19, 24, 7, 2], ...t,
})
const fila = (nombre: string, f: Partial<Fila>): Fila => ({
  sigla: nombre.slice(0, 3).toUpperCase(), nombre, notas: 30, faltan: 0, entre_6_y_8_pct: 70, nueve_y_diez: 2, dieces: 1, mas_alta: 10, mas_baja: 3, ...f,
})
const disco = (titulo: string, puesto: number) => ({
  pase_id: titulo, titulo, artista: 'x', tapa_url: null, de: 'MAN', de_nombre: 'Manu', promedio: 9, notas: [], puesto,
})

describe('el termómetro (con los números de la ronda del 22/11)', () => {
  it('72 % entre 6 y 8', () => expect(porcentajeTibio(termo({}))).toBe(72))
  it('7 de cada 10: ronda tibia', () => expect(fraseTermometro(termo({}))).toBe('7 de cada 10 notas caen entre 6 y 8. Ronda tibia.'))
  it('una ronda que se juega', () => expect(fraseTermometro(termo({ entre_6_y_8: 20 }))).toBe('Solo 2 de cada 10 notas caen entre 6 y 8. Acá se juegan.'))
  it('en el medio, solo el dato', () => expect(fraseTermometro(termo({ entre_6_y_8: 45 }))).toBe('5 de cada 10 notas caen entre 6 y 8.'))
})

describe('el tibiómetro', () => {
  it('el más tibio que nunca puso un 10 y el que más se juega', () => {
    const filas = [fila('Maxi R', { dieces: 0, nueve_y_diez: 1 }), fila('Manu', { nueve_y_diez: 2 }), fila('Facundo Pérez', { nueve_y_diez: 6 })]
    expect(fraseTibiometro(filas)).toBe('Maxi nunca puso un 10. Facundo es el que más se juega: 6 notas de 9 o 10.')
  })
  it('solo cuentan los que ya entran (5 notas)', () => {
    const filas = [fila('Maxi', { dieces: 0, faltan: 2 }), fila('Manu', { nueve_y_diez: 1, dieces: 1 })]
    expect(fraseTibiometro(filas)).toBe(null)
  })
  it('sin nadie que entre, no hay frase', () => expect(fraseTibiometro([fila('Maxi', { faltan: 5 })])).toBe(null))
  it('una sola nota de 9 o 10, en singular', () => {
    expect(fraseTibiometro([fila('Maxi', { dieces: 0, nueve_y_diez: 0 }), fila('Manu', { nueve_y_diez: 1 })])).toBe('Maxi nunca puso un 10. Manu es el que más se juega: 1 nota de 9 o 10.')
  })
})

describe('el reparto', () => {
  it('sin unos ni dos', () => expect(fraseReparto(termo({}))).toBe('Nadie puso un 1 ni un 2. La nota que más se pone: 8.'))
  it('con algún 1', () => expect(fraseReparto(termo({ uno_y_dos: 2, la_que_mas: 7 }))).toBe('La nota que más se pone: 7.'))
})

describe('el podio', () => {
  it('un renglón por puesto, con los empates contados', () => {
    const podio = [disco('Friends', 1), disco('The Black Parade', 2), disco('A Different Age', 3), disco('For Emma', 3), disco('Seychelles', 3), disco('Treinta Minutos', 3)]
    expect(puestos(podio).map(({ puesto, disco: d, empatados }) => [puesto, d.titulo, empatados])).toEqual([
      [1, 'Friends', 1],
      [2, 'The Black Parade', 1],
      [3, 'A Different Age', 4],
    ])
  })
})

describe('detalles', () => {
  it('el vúmetro prende de a 10 %', () => {
    expect([lucesPrendidas(80), lucesPrendidas(73), lucesPrendidas(27), lucesPrendidas(0), lucesPrendidas(null)]).toEqual([8, 7, 3, 0, 0])
  })
  it('el fondo: si las dos notas son iguales, "3 Y 3"', () => {
    const d = { ...disco('Heaven or Las Vegas', 1), de_nombre: 'Facundo Pérez', notas: [{ sigla: 'MAN', puntaje: 3 }, { sigla: 'MAX', puntaje: 3 }] }
    expect(notasEnLinea(d)).toBe('DE FACUNDO · 3 Y 3')
  })
  it('el fondo: si no, cada uno con su nota', () => {
    const d = { ...disco('Bad', 1), de_nombre: 'Maxi', notas: [{ sigla: 'FAC', puntaje: 4 }, { sigla: 'MAN', puntaje: 5 }] }
    expect(notasEnLinea(d)).toBe('DE MAXI · FAC 4 · MAN 5')
  })
  it('lo que falta, en singular y en plural', () => {
    expect(faltan.notas(6)).toBe('FALTAN 6 NOTAS')
    expect(faltan.notas(1)).toBe('FALTAN 1 NOTA')
    expect(faltan.podio(2)).toBe('FALTAN 2 DISCOS QUE ESCUCHEN TODOS PARA ARMAR EL PODIO.')
    expect(faltan.enComun(4)).toBe('FALTAN 4 DISCOS EN COMÚN PARA SABER SI SON COMPATIBLES.')
  })
})

describe('la puntería', () => {
  it('PAREJO entre −0,3 y +0,3, LE PEGA y LE ERRA afuera', () => {
    expect([etiquetaTiro(0.17), etiquetaTiro(-0.17), etiquetaTiro(0.3), etiquetaTiro(-0.45), etiquetaTiro(null)]).toEqual(['PAREJO', 'PAREJO', 'LE PEGA', 'LE ERRA', null])
  })
  it('el número con su signo', () => {
    expect([conSigno(0.17), conSigno(-0.17), conSigno(0), conSigno(-0.001)]).toEqual(['+0,17', '−0,17', '0,00', '0,00'])
  })
  it('los colores siguen el orden de la ronda', () => {
    const ronda = [{ sigla: 'FAC', nombre: 'Facu' }, { sigla: 'MAX', nombre: 'Maxi' }, { sigla: 'MAN', nombre: 'Manu' }, { sigla: 'JOA', nombre: 'Joa' }]
    expect(['FAC', 'MAX', 'MAN', 'JOA'].map((s) => colorDe(ronda, s))).toEqual(['uno', 'dos', 'tres', 'uno'])
  })
  it('un disco muy por arriba del promedio cae en el centro, su promedio a la mitad y muy por debajo en el borde', () => {
    const centro = posicionDardo(2.5, 0, 1, 0, 1)
    const mitad = posicionDardo(0, 0, 1, 0, 1)
    const borde = posicionDardo(-3, 0, 1, 0, 1)
    const distancia = (p: { x: number; y: number }) => Math.round(Math.hypot(p.x - 120, p.y - 120))
    expect([distancia(centro), distancia(mitad), distancia(borde)]).toEqual([3, 55, 110])
  })
  it('con dos que le pasan, el primero va a la izquierda y el segundo a la derecha', () => {
    expect(posicionDardo(0, 0, 1, 0, 2).x).toBeLessThan(120)
    expect(posicionDardo(0, 0, 1, 1, 2).x).toBeGreaterThan(120)
  })
  it('el mejor tiro y el más errado de la ronda', () => {
    const p: Informe['punteria'] = {
      tiros: [], dardos: [],
      mejor: { de: 'FAC', de_nombre: 'Facundo Pérez', a: 'MAN', a_nombre: 'Manu', titulo: 'The Black Parade', puntaje: 10, sobre: 3.3 },
      errado: { de: 'FAC', de_nombre: 'Facundo Pérez', a: 'MAX', a_nombre: 'Maxi', titulo: 'Heaven or Las Vegas', puntaje: 3, sobre: -3.7, oyentes: 2, fallo_con_todos: true },
    }
    expect(frasePunteria(p)).toBe('El mejor tiro de la ronda: Facundo a Manu con The Black Parade. Le puso 10, 3,3 más que su promedio. El más errado: Facundo con Heaven or Las Vegas, que falló con los dos.')
    expect(frasePunteria({ ...p, errado: { ...p.errado!, fallo_con_todos: false } })).toContain('El más errado: Facundo con Heaven or Las Vegas: Maxi le puso 3.')
    expect(frasePunteria({ ...p, mejor: null })).toBe(null)
  })
  it('lo que falta para medir un tiro', () => expect(faltanTiro(4, 'Facundo Pérez')).toBe('FALTAN 4 DISCOS DE FACUNDO PARA MEDIR EL TIRO.'))
})

describe('La placa del pasillo (02i)', () => {
  const persona = (sigla: string, nombre: string) => ({ sigla, nombre })
  type Tiro = Informe['punteria']['tiros'][number]
  const tiro = (de: string, a: string, t: Partial<Tiro>): Tiro => ({
    de, de_nombre: { FAC: 'Facu Pérez', MAX: 'Maxi', MAN: 'Manu' }[de]!, a, a_nombre: a, discos: 6, faltan: 0,
    diferencia: 0.1, le_pone: 6.9, a_todo: 6.8, mejor: { titulo: 'Facelift', puntaje: 9 }, errado: { titulo: 'Otro', puntaje: 4 }, ...t,
  })
  const informe = (integrantes: string[], tiros: Tiro[]) =>
    ({
      integrantes: integrantes.map((s) => persona(s, s)),
      punteria: {
        tiros,
        dardos: [
          { de: 'MAX', a: 'FAC', pase_id: '1', titulo: 'A', tapa_url: null, puntaje: 8, z: 1 },
          { de: 'MAX', a: 'FAC', pase_id: '2', titulo: 'B', tapa_url: null, puntaje: 6, z: 0 },
        ],
        mejor: null, errado: null,
      },
    }) as unknown as Informe

  it('mide con 5 discos: lo que le ponés a lo suyo, a todo y la etiqueta', () => {
    const i = informe(['FAC', 'MAX', 'MAN'], [tiro('MAX', 'FAC', { diferencia: 0.4, le_pone: 7.2, a_todo: 6.8 })])
    expect(placaDelPasillo(i, 'FAC', 'MAX')).toEqual({
      tipo: 'medido', de: 'Maxi', lePones: 7.2, aTodo: 6.8, etiqueta: 'TE PEGA', favorito: { titulo: 'Facelift', puntaje: 9 }, z: 0.5,
    })
  })

  it('con menos de 5 discos dice cuántos van', () => {
    const i = informe(['FAC', 'MAX', 'MAN'], [tiro('MAX', 'FAC', { discos: 2, faltan: 3, diferencia: null, le_pone: null, a_todo: null })])
    expect(placaDelPasillo(i, 'FAC', 'MAX')).toEqual({ tipo: 'faltan', de: 'Maxi', vas: 2 })
  })

  it('en rondas de dos es mano a mano: lo que te pone él a vos, sin etiqueta', () => {
    const i = informe(['FAC', 'MAX'], [tiro('MAX', 'FAC', { le_pone: 6.9 }), tiro('FAC', 'MAX', { le_pone: 7.2 })])
    expect(placaDelPasillo(i, 'FAC', 'MAX')).toMatchObject({ tipo: 'mano-a-mano', lePones: 6.9, teDevuelve: 7.2 })
    const sinVuelta = informe(['FAC', 'MAX'], [tiro('MAX', 'FAC', {}), tiro('FAC', 'MAX', { le_pone: null, a_todo: null, diferencia: null })])
    expect(placaDelPasillo(sinVuelta, 'FAC', 'MAX')).toMatchObject({ tipo: 'mano-a-mano', teDevuelve: null })
  })

  it('sin tiro no hay placa', () => {
    expect(placaDelPasillo(informe(['FAC', 'MAX', 'MAN'], []), 'FAC', 'MAX')).toBeNull()
  })

  it('la etiqueta se dice desde quien escucha', () => {
    expect([0.3, -0.3, 0.29, -0.29].map(etiquetaPlaca)).toEqual(['TE PEGA', 'NO TE PEGA', 'PAREJO', 'PAREJO'])
  })

  it('el dardo de la mini diana cae a la distancia de su z, arriba a la derecha', () => {
    expect(posicionPlaca(0)).toEqual({ x: 158.9, y: 81.1 }) // la punteada (r 55)
    expect(posicionPlaca(-5).x).toBeCloseTo(197.8, 0) // muy abajo de su promedio: el borde
    expect(posicionPlaca(5)).toEqual(posicionPlaca(2))
    expect(unDecimal(6.75)).toBe('6,8')
  })
})
