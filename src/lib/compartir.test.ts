import { describe, expect, it } from 'vitest'
import { comoGuardar } from './compartir'

describe('Guardar imagen (#127)', () => {
  it('en el teléfono usa el menú, que guarda en la galería (y no abre el visor de archivos)', () => {
    expect(comoGuardar({ telefono: true, comparteArchivos: true })).toBe('menu')
  })
  it('en la compu, o si el navegador no comparte archivos, se baja', () => {
    expect(comoGuardar({ telefono: false, comparteArchivos: true })).toBe('bajar')
    expect(comoGuardar({ telefono: true, comparteArchivos: false })).toBe('bajar')
  })
})
