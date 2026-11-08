import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router'
import { useAuth } from '../auth/AuthProvider'
import { supabase } from '../lib/supabase'

/** La ronda en la que estoy: todo lo de adentro (Exhibidor, Pasar, Ronda, Perfil) es de esta ronda (RN-05). */
export type RondaActual = {
  id: string
  nombre: string
  /** Mis pendientes en esta ronda */
  deuda: number
}

type Estado =
  | { tipo: 'cargando' }
  | { tipo: 'error' }
  /** No existe o no soy integrante: RLS no la devuelve */
  | { tipo: 'no-esta' }
  | { tipo: 'lista'; ronda: RondaActual }

/** Un id que no es uuid hace fallar la consulta (22P02): para la app es una ronda que no está. */
const ID_INVALIDO = '22P02'

/**
 * Carga la ronda y registra que entré (HU-05): así Mis rondas la destaca como la última.
 * Solo devuelve rondas donde soy integrante.
 */
export function useRonda(id: string) {
  const { session } = useAuth()
  const uid = session?.user.id
  const [estado, setEstado] = useState<Estado>({ tipo: 'cargando' })
  const [intento, setIntento] = useState(0)

  useEffect(() => {
    if (!uid) return
    let vigente = true

    Promise.all([
      supabase.from('rondas').select('id, nombre').eq('id', id).maybeSingle(),
      supabase.from('deuda').select('pendientes').eq('ronda_id', id).eq('usuario_id', uid).maybeSingle(),
    ]).then(([ronda, deuda]) => {
      if (!vigente) return
      if (ronda.error?.code === ID_INVALIDO || (!ronda.error && !ronda.data)) return setEstado({ tipo: 'no-esta' })
      if (ronda.error || deuda.error || !ronda.data) return setEstado({ tipo: 'error' })

      const { id: rondaId, nombre } = ronda.data as { id: string; nombre: string }
      setEstado({ tipo: 'lista', ronda: { id: rondaId, nombre, deuda: (deuda.data as { pendientes: number } | null)?.pendientes ?? 0 } })
      // Registrar la entrada no frena nada: si falla, la ronda se ve igual.
      // Ojo: la consulta de supabase-js solo sale cuando se la espera, por eso el then.
      supabase.rpc('entrar_a_ronda', { p_ronda: rondaId }).then(
        () => {},
        () => {},
      )
    })

    return () => {
      vigente = false
    }
  }, [id, uid, intento])

  const reintentar = () => {
    setEstado({ tipo: 'cargando' })
    setIntento((n) => n + 1)
  }

  return { estado, reintentar }
}

/** Para las pantallas de adentro de la ronda (rutas hijas de /ronda/:id) */
export function useRondaActual() {
  return useOutletContext<RondaActual>()
}
