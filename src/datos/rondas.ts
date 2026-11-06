import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { supabase } from '../lib/supabase'

/** Lo que muestra cada tarjeta de "Mis rondas" (Figma 09). */
export type RondaMia = {
  id: string
  nombre: string
  /** Nombres de pila, en el orden en que se sumaron */
  integrantes: string[]
  /** Mis pendientes en esta ronda (RN-05) */
  deuda: number
  /** Cuándo entré a esta ronda por última vez (la registra entrar_a_ronda, HU-05) */
  ultimaEntrada: string
}

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
    miembros_ronda: { se_unio_en: string; usuarios: { nombre: string } | null }[]
  }
}

const porFecha = (a: { se_unio_en: string }, b: { se_unio_en: string }) => a.se_unio_en.localeCompare(b.se_unio_en)
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
        .select('se_unio_en, ultima_entrada, rondas!inner(id, nombre, miembros_ronda(se_unio_en, usuarios(nombre)))')
        .eq('usuario_id', uid),
      supabase.from('deuda').select('ronda_id, pendientes').eq('usuario_id', uid),
      supabase.from('deuda_total').select('pendientes').eq('usuario_id', uid).maybeSingle(),
    ]).then(([miembros, deudas, total]) => {
      if (!vigente) return
      if (miembros.error || deudas.error || total.error) return setEstado({ tipo: 'error' })

      const deudaPorRonda = new Map(
        (deudas.data as { ronda_id: string; pendientes: number }[]).map((d) => [d.ronda_id, d.pendientes]),
      )
      const rondas = (miembros.data as unknown as FilaMiembro[])
        .sort(porFecha)
        .map(({ ultima_entrada, rondas: r }) => ({
          ultimaEntrada: ultima_entrada,
          id: r.id,
          nombre: r.nombre,
          integrantes: [...r.miembros_ronda].sort(porFecha).map((m) => nombreDePila(m.usuarios?.nombre ?? '?')),
          deuda: deudaPorRonda.get(r.id) ?? 0,
        }))

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
