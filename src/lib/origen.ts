/**
 * #135 · De dónde llega la gente. Los links llevan ?ref= (las tarjetas, ?ref=tarjeta; el video, ?ref=tiktok…).
 * Al llegar se guarda en el teléfono (vale el primero, por 30 días) y, cuando hay sesión, se anota en la base
 * con anotar_origen, que solo lo guarda si la cuenta es nueva. Quien llega por /r/<codigo> sin ref, "invitacion".
 */
import { supabase } from './supabase'

const CLAVE = 'cabina86:origen'
export const DIAS_QUE_VALE = 30

type Guardado = { origen: string; en: number; anotado?: boolean }

/** "TikTok" → "tiktok"; null si no es un origen válido (letras, números, - y _, hasta 40) */
export function limpiarOrigen(crudo: string | null | undefined): string | null {
  const o = (crudo ?? '').trim().toLowerCase()
  return /^[a-z0-9_-]{1,40}$/.test(o) ? o : null
}

/** El guardado sigue valiendo si tiene menos de 30 días */
export function sigueValiendo(g: Guardado | null, ahora: number) {
  return !!g && ahora - g.en < DIAS_QUE_VALE * 24 * 60 * 60 * 1000
}

function leer(): Guardado | null {
  try {
    const g = JSON.parse(localStorage.getItem(CLAVE) ?? 'null') as Guardado | null
    return g && typeof g.origen === 'string' && typeof g.en === 'number' ? g : null
  } catch {
    return null
  }
}

function escribir(g: Guardado) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(g))
  } catch {
    // Sin almacenamiento (modo privado viejo): no se mide, nada más
  }
}

/** Guarda el origen si no hay uno vigente (vale el primero) */
export function guardarOrigen(crudo: string | null | undefined, ahora = Date.now()) {
  const origen = limpiarOrigen(crudo)
  if (!origen || sigueValiendo(leer(), ahora)) return
  escribir({ origen, en: ahora })
}

/** Al arrancar: si la URL trae ?ref=, lo guarda y lo saca de la barra (así no viaja si comparten el link) */
export function guardarOrigenDeLaUrl() {
  if (typeof window === 'undefined') return
  const url = new URL(window.location.href)
  const ref = url.searchParams.get('ref')
  // Por un link de invitación sin ref: "invitacion" (si ya había uno, vale el primero)
  if (ref === null) {
    if (url.pathname.startsWith('/r/')) guardarOrigen('invitacion')
    return
  }
  guardarOrigen(ref)
  url.searchParams.delete('ref')
  window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash)
}

/** Con sesión: lo anota en la base una sola vez (la base decide si la cuenta es nueva) */
export async function anotarOrigen() {
  const g = leer()
  if (!g || g.anotado || !sigueValiendo(g, Date.now())) return
  const { error } = await supabase.rpc('anotar_origen', { p_origen: g.origen })
  if (!error) escribir({ ...g, anotado: true })
}
