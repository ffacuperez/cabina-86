import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router'
import { useAuth } from '../auth/AuthProvider'
import { supabase } from '../lib/supabase'
import { nombreDePila } from '../lib/texto'

export type Integrante = {
  id: string
  /** Nombre de pila */
  nombre: string
  /** FAC de FAC-05 */
  sigla: string
}

/** La ronda en la que estoy: todo lo de adentro (Exhibidor, Pasar, Ronda, Perfil) es de esta ronda (RN-05). */
export type RondaActual = {
  id: string
  nombre: string
  /** Mis pendientes en esta ronda */
  deuda: number
  /** Yo */
  yo: Integrante
  /** Cuándo me sumé: lo pasado antes no es mío (RN-06) */
  unidoEn: string
  /** Los demás integrantes, en el orden en que se sumaron */
  otros: Integrante[]
}

/** Qué muestra el marco de la ronda alrededor de cada pantalla */
export type Marco = { encabezado: boolean; botonera: boolean }
export const MARCO_COMPLETO: Marco = { encabezado: true, botonera: true }

type Estado =
  | { tipo: 'cargando' }
  | { tipo: 'error' }
  /** No existe o no soy integrante: RLS no la devuelve */
  | { tipo: 'no-esta' }
  | { tipo: 'lista'; ronda: RondaActual }

type FilaRonda = {
  id: string
  nombre: string
  miembros_ronda: { usuario_id: string; sigla: string; se_unio_en: string; usuarios: { nombre: string } | null }[]
}

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
      supabase
        .from('rondas')
        .select('id, nombre, miembros_ronda(usuario_id, sigla, se_unio_en, usuarios(nombre))')
        .eq('id', id)
        .maybeSingle(),
      supabase.from('deuda').select('pendientes').eq('ronda_id', id).eq('usuario_id', uid).maybeSingle(),
    ]).then(([ronda, deuda]) => {
      if (!vigente) return
      if (ronda.error?.code === ID_INVALIDO || (!ronda.error && !ronda.data)) return setEstado({ tipo: 'no-esta' })
      if (ronda.error || deuda.error || !ronda.data) return setEstado({ tipo: 'error' })

      const fila = ronda.data as unknown as FilaRonda
      const integrantes = [...fila.miembros_ronda]
        .sort((a, b) => a.se_unio_en.localeCompare(b.se_unio_en))
        .map((m) => ({ id: m.usuario_id, nombre: nombreDePila(m.usuarios?.nombre ?? '') || '?', sigla: m.sigla }))
      const yo = integrantes.find((i) => i.id === uid)
      const miFila = fila.miembros_ronda.find((m) => m.usuario_id === uid)
      if (!yo || !miFila) return setEstado({ tipo: 'no-esta' })

      setEstado({
        tipo: 'lista',
        ronda: {
          id: fila.id,
          nombre: fila.nombre,
          deuda: (deuda.data as { pendientes: number } | null)?.pendientes ?? 0,
          yo,
          unidoEn: miFila.se_unio_en,
          otros: integrantes.filter((i) => i.id !== uid),
        },
      })
      // Registrar la entrada no frena nada: si falla, la ronda se ve igual.
      // Ojo: la consulta de supabase-js solo sale cuando se la espera, por eso el then.
      supabase.rpc('entrar_a_ronda', { p_ronda: fila.id }).then(
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

type ContextoRonda = { ronda: RondaActual; setMarco: (marco: Marco) => void }

/** Para las pantallas de adentro de la ronda (rutas hijas de /ronda/:id) */
export function useRondaActual() {
  return useOutletContext<ContextoRonda>().ronda
}

/**
 * Una pantalla de la ronda que no lleva el marco completo (por ejemplo, Pasado no tiene botonera).
 * Al salir de la pantalla vuelve el marco completo.
 */
export function useMarco(marco: Marco) {
  const { setMarco } = useOutletContext<ContextoRonda>()
  const { encabezado, botonera } = marco
  useEffect(() => {
    setMarco({ encabezado, botonera })
    return () => setMarco(MARCO_COMPLETO)
  }, [encabezado, botonera, setMarco])
}
