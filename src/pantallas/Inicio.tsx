import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { supabase } from '../lib/supabase'

type Perfil = { nombre: string; foto_url: string | null }

/** Provisoria: confirma que el login y el perfil funcionan. HU-01 la reemplaza por "Armá la ronda" / "Mis rondas". */
export default function Inicio() {
  const { session, salir } = useAuth()
  const [perfil, setPerfil] = useState<Perfil | null>(null)

  useEffect(() => {
    if (!session) return
    supabase
      .from('usuarios')
      .select('nombre, foto_url')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => setPerfil(data))
  }, [session])

  return (
    <main className="app">
      {perfil?.foto_url && (
        <img className="avatar" src={perfil.foto_url} alt="" width={72} height={72} referrerPolicy="no-referrer" />
      )}
      <h1>Hola, {perfil?.nombre ?? '…'}</h1>
      <p>Ya entraste a Cabina 86.</p>
      <button type="button" onClick={salir}>Salir</button>
    </main>
  )
}
