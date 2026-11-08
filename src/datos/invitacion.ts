import { supabase } from '../lib/supabase'

/** El link de invitación de la ronda (HU-02 lo abre en /r/<codigo>). */
export function linkDeInvitacion(codigo: string) {
  return `${window.location.origin}/r/${codigo}`
}

/** Mensaje de WhatsApp: el nombre de la ronda y el link (HU-04, "Invito por WhatsApp"). */
export function mensajeDeInvitacion(nombre: string, link: string) {
  return `Sumate a ${nombre} en Cabina 86: ${link}`
}

/** Lo que muestra "Te invitaron" (Figma 00b) antes de iniciar sesión. */
export type Invitacion = {
  nombre: string
  /** Quien creó la ronda: el link es de la ronda, no de una persona */
  invito: string | null
  integrantes: { nombre: string; es_quien_invito: boolean }[]
  discos_pasados: number
  ultimos_discos: { titulo: string; artista: string; tapa_url: string | null }[]
}

/** null si el código no lleva a ninguna ronda. */
export async function verInvitacion(codigo: string): Promise<Invitacion | null> {
  const { data, error } = await supabase.rpc('ver_invitacion', { p_codigo: codigo })
  if (error) throw error
  return (data as Invitacion | null) ?? null
}

/** Error que devuelve la base cuando el código no existe (sumarse_a_ronda). */
export class LinkInvalido extends Error {}

/** HU-02: me suma a la ronda del link (o solo registra la entrada si ya estaba). Devuelve el id de la ronda. */
export async function sumarseARonda(codigo: string): Promise<string> {
  const { data, error } = await supabase.rpc('sumarse_a_ronda', { p_codigo: codigo })
  if (error?.code === 'P0002') throw new LinkInvalido(error.message)
  if (error || !data) throw error ?? new Error('sumarse_a_ronda no devolvió la ronda')
  return data as string
}

/*
 * Invitación pendiente: al tocar "Continuar con Google" en Te invitaron se guarda el código,
 * porque Google vuelve a /entrar. Desde ahí se retoma /r/<codigo> para sumarse.
 * Vence a la hora, así un login normal más tarde no te mete en una ronda vieja.
 */
const CLAVE_PENDIENTE = 'cabina86.invitacion'
const VENCE_EN_MS = 60 * 60 * 1000

export function guardarInvitacionPendiente(codigo: string) {
  try {
    localStorage.setItem(CLAVE_PENDIENTE, JSON.stringify({ codigo, guardada: Date.now() }))
  } catch {
    // Sin almacenamiento: después del login se cae en Mis rondas y se puede volver a abrir el link
  }
}

export function leerInvitacionPendiente(): string | null {
  try {
    const guardada = JSON.parse(localStorage.getItem(CLAVE_PENDIENTE) ?? 'null') as { codigo?: string; guardada?: number } | null
    if (!guardada?.codigo || !guardada.guardada || Date.now() - guardada.guardada > VENCE_EN_MS) return null
    return guardada.codigo
  } catch {
    return null
  }
}

export function borrarInvitacionPendiente() {
  try {
    localStorage.removeItem(CLAVE_PENDIENTE)
  } catch {
    // nada que borrar
  }
}
