import { describe, expect, it } from 'vitest'
import { type Informe, faltan, fraseReparto, fraseTermometro, fraseTibiometro, lucesPrendidas, notasEnLinea, porcentajeTibio, puestos } from './informe'

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
