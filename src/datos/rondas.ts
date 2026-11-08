import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { supabase } from '../lib/supabase'

/** Lo que muestra cada tarjeta de "Mis rondas" (Figma 09). */
export type RondaMia = {
  id: string
  nombre: string
  /** Nombres de pila, en el orden en que se sumaron */
  integrantes: string[]
  /** Los demás integrantes (sin mí): "Ya se sumaron" en la hoja de invitar (HU-04) */
  sumados: string[]
  /** Código del link de invitación (/r/<codigo>): solo en las rondas que creé; si no, null y no hay INVITAR (#52) */
  codigo: string | null
  /** Mis pendientes en esta ronda (RN-05) */
  deuda: number
  /** Cuándo entré a esta ronda por última vez (la registra entrar_a_ronda, HU-05) */
  ultimaEntrada: string
}

/** Una ronda que creé: tiene link para invitar */
export type RondaQueInvito = RondaMia & { codigo: string }

type Estado =
  | { tipo: 'cargando' }
  | { tipo: 'error' }
  | { tipo: 'listo'; rondas: RondaMia[]; deudaTotal: number }

type FilaMiembro = {
  se_unio_en: string
  ultima_entrada: string
  rondas: {
    id: string
    nombre: string
    miembros_ronda: { se_unio_en: string; usuario_id: string; usuarios: { nombre: string } | null }[]
  }
}

/** La ronda recién creada (HU-03) */
export type RondaCreada = { id: string; nombre: string; codigo_invitacion: string }

/** HU-03: crea la ronda conmigo como único integrante y su código de invitación (en la base, todo junto). */
export async function crearRonda(nombre: string): Promise<RondaCreada> {
  const { data, error } = await supabase.rpc('crear_ronda', { p_nombre: nombre })
  if (error || !data) throw error ?? new Error('crear_ronda no devolvió la ronda')
  return data as RondaCreada
}

const porFecha =(a: { se_unio_en: string }, b: { se_unio_en: string }) => a.se_unio_en.localeCompare(b.se_unio_en)
const nombreDePila = (nombre: string) => nombre.trim().split(/\s+/)[0]

/**
 * Mis rondas, en el orden en que me sumé, con integrantes y deuda.
 * Con esto Inicio decide si muestra "Armá la ronda" o "Mis rondas" (HU-01).
 */
export function useMisRondas() {
  const { session } = useAuth()
  const uid = session?.user.id
  const [estado, setEstado] = useState<Estado>({ tipo: 'cargando' })
  const [intento, setIntento] = useState(0)

  useEffect(() => {
    if (!uid) return
    let vigente = true

    Promise.all([
      supabase
        .from('miembros_ronda')
        .select('se_unio_en, ultima_entrada, rondas!inner(id, nombre, miembros_ronda(se_unio_en, usuario_id, usuarios(nombre)))')
        .eq('usuario_id', uid),
      supabase.from('deuda').select('ronda_id, pendientes').eq('usuario_id', uid),
      supabase.from('deuda_total').select('pendientes').eq('usuario_id', uid).maybeSingle(),
      // Los integrantes no leen el código: solo quien creó la ronda lo obtiene (#52)
      supabase.rpc('mis_codigos_de_invitacion'),
    ]).then(([miembros, deudas, total, codigos]) => {
      if (!vigente) return
      if (miembros.error || deudas.error || total.error || codigos.error) return setEstado({ tipo: 'error' })

      const deudaPorRonda = new Map(
        (deudas.data as { ronda_id: string; pendientes: number }[]).map((d) => [d.ronda_id, d.pendientes]),
      )
      const codigoPorRonda = new Map(
        (codigos.data as { ronda_id: string; codigo: string }[]).map((c) => [c.ronda_id, c.codigo]),
      )
      const rondas = (miembros.data as unknown as FilaMiembro[])
        .sort(porFecha)
        .map(({ ultima_entrada, rondas: r }) => {
          const miembros = [...r.miembros_ronda].sort(porFecha)
          const pila = (m: (typeof miembros)[number]) => nombreDePila(m.usuarios?.nombre ?? '?')
          return {
            id: r.id,
            nombre: r.nombre,
            codigo: codigoPorRonda.get(r.id) ?? null,
            integrantes: miembros.map(pila),
            sumados: miembros.filter((m) => m.usuario_id !== uid).map(pila),
            deuda: deudaPorRonda.get(r.id) ?? 0,
            ultimaEntrada: ultima_entrada,
          }
        })

      setEstado({ tipo: 'listo', rondas, deudaTotal: (total.data as { pendientes: number } | null)?.pendientes ?? 0 })
    })

    return () => {
      vigente = false
    }
  }, [uid, intento])

  const reintentar = useCallback(() => {
    setEstado({ tipo: 'cargando' })
    setIntento((n) => n + 1)
  }, [])

  return { estado, reintentar }
}
