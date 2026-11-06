import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

type Auth = {
  /** undefined mientras se revisa si hay sesión guardada */
  session: Session | null | undefined
  /** Volvió de Google sin sesión: cancelaste, o el código no se pudo canjear (HU-01) */
  falloElIngreso: boolean
  entrarConGoogle: () => Promise<void>
  salir: () => Promise<void>
}

const AuthContext = createContext<Auth | null>(null)

/** Google (o Supabase) vuelve con ?error=... o #error=... si cancelaste o algo falló. */
function volvioConError() {
  const { search, hash } = window.location
  const query = new URLSearchParams(search)
  return query.has('error') || query.has('error_description') || hash.includes('error=')
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [falloElIngreso, setFalloElIngreso] = useState(volvioConError)

  useEffect(() => {
    // La sesión queda guardada en el celular: si ya entraste antes, no hace falta volver a hacerlo.
    // Si se vuelve de Google con ?code=..., getSession espera a que Supabase lo canjee (PKCE).
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (!data.session && new URLSearchParams(window.location.search).has('code')) setFalloElIngreso(true)
    })
    const { data } = supabase.auth.onAuthStateChange((_evento, nueva) => setSession(nueva))
    return () => data.subscription.unsubscribe()
  }, [])

  async function entrarConGoogle() {
    setFalloElIngreso(false)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      // Vuelve a la misma app (producción, vista previa o localhost) a la pantalla Entrar,
      // que termina el login y redirige.
      options: { redirectTo: `${window.location.origin}/entrar` },
    })
    if (error) throw error
  }

  async function salir() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ session, falloElIngreso, entrarConGoogle, salir }}>
      {children}
    </AuthContext.Provider>
  )
}

// oxlint-disable-next-line react/only-export-components -- el hook va junto a su Provider
export function useAuth() {
  const auth = useContext(AuthContext)
  if (!auth) throw new Error('useAuth tiene que usarse dentro de <AuthProvider>')
  return auth
}
