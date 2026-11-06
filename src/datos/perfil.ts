import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { supabase } from '../lib/supabase'

/** Nombre y foto que el trigger crear_perfil copió de Google en el primer ingreso (HU-01). */
export type Perfil = { nombre: string; foto_url: string | null }

/** undefined mientras carga; null si no se pudo leer. */
export function usePerfil() {
  const { session } = useAuth()
  const uid = session?.user.id
  const [perfil, setPerfil] = useState<Perfil | null | undefined>(undefined)

  useEffect(() => {
    if (!uid) return
    let vigente = true
    supabase
      .from('usuarios')
      .select('nombre, foto_url')
      .eq('id', uid)
      .single()
      .then(({ data, error }) => {
        if (vigente) setPerfil(error ? null : (data as Perfil))
      })
    return () => {
      vigente = false
    }
  }, [uid])

  return perfil
}
