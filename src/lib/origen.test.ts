import { describe, expect, it } from 'vitest'
import { DIAS_QUE_VALE, limpiarOrigen, sigueValiendo } from './origen'

describe('De dónde llega la gente (#135)', () => {
  it('limpia el ?ref=', () => {
    expect(limpiarOrigen('TikTok')).toBe('tiktok')
    expect(limpiarOrigen(' ig ')).toBe('ig')
    expect(limpiarOrigen('video-1_b')).toBe('video-1_b')
    expect(limpiarOrigen('<script>')).toBeNull()
    expect(limpiarOrigen('')).toBeNull()
    expect(limpiarOrigen(null)).toBeNull()
    expect(limpiarOrigen('a'.repeat(41))).toBeNull()
  })

  it('el primero vale 30 días', () => {
    const ahora = 1_800_000_000_000
    const dia = 24 * 60 * 60 * 1000
    expect(sigueValiendo({ origen: 'tiktok', en: ahora - (DIAS_QUE_VALE - 1) * dia }, ahora)).toBe(true)
    expect(sigueValiendo({ origen: 'tiktok', en: ahora - DIAS_QUE_VALE * dia }, ahora)).toBe(false)
    expect(sigueValiendo(null, ahora)).toBe(false)
  })
})
