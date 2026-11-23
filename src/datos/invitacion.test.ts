import { describe, expect, it } from 'vitest'
import { avisoDeInvitacion } from './invitacion'

const ARMADA = '2026-11-23T12:00:00-03:00'
const despues = (horas: number) => Date.parse(ARMADA) + horas * 60 * 60 * 1000

describe('el aviso de la hoja Invitá a la banda (RN-06, #112)', () => {
  it('recién armada: quedan 23 horas (redondea para abajo, para no prometer de más)', () => {
    expect(avisoDeInvitacion(ARMADA, despues(0.5))).toEqual({
      rotulo: 'QUEDAN 23 HORAS PARA SUMARSE CON TODO',
      texto: 'Quien entre antes recibe todo lo que ya se pasó. Después, arranca de cero.',
    })
  })

  it('a las 6 horas: quedan 18', () => {
    expect(avisoDeInvitacion(ARMADA, despues(6)).rotulo).toBe('QUEDAN 18 HORAS PARA SUMARSE CON TODO')
  })

  it('con una hora y pico: en singular', () => {
    expect(avisoDeInvitacion(ARMADA, despues(22.5)).rotulo).toBe('QUEDA 1 HORA PARA SUMARSE CON TODO')
  })

  it('con menos de una hora', () => {
    expect(avisoDeInvitacion(ARMADA, despues(23.9)).rotulo).toBe('QUEDA MENOS DE UNA HORA PARA SUMARSE CON TODO')
  })

  it('a las 24 horas justas ya arrancó', () => {
    expect(avisoDeInvitacion(ARMADA, despues(24))).toEqual({
      rotulo: 'LA RONDA YA ARRANCÓ',
      texto: 'Quien se sume ahora arranca de cero: no ve lo que ya se pasó.',
    })
  })

  it('días después, igual', () => {
    expect(avisoDeInvitacion(ARMADA, despues(24 * 10)).rotulo).toBe('LA RONDA YA ARRANCÓ')
  })
})
