import { describe, expect, it } from 'vitest'
import { modoDeCompartir } from './compartir'

describe('Compartir o guardar (#129)', () => {
  it('en el teléfono, un solo botón que abre el menú (ahí está Guardar imagen, para la galería)', () => {
    expect(modoDeCompartir({ telefono: true, comparteArchivos: true })).toBe('menu')
  })
  it('en la compu, o si el navegador no comparte archivos, Guardar imagen la baja', () => {
    expect(modoDeCompartir({ telefono: false, comparteArchivos: true })).toBe('bajar')
    expect(modoDeCompartir({ telefono: true, comparteArchivos: false })).toBe('bajar')
  })
})
