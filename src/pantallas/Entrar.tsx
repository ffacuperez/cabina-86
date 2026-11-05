import { useEffect, useState } from 'react'
import { Navigate, useSearchParams } from 'react-router'
import { useAuth } from '../auth/AuthProvider'

const MENSAJE_ERROR = 'No pudimos entrar. Probá de nuevo.'

export default function Entrar() {
  const { session, entrarConGoogle } = useAuth()
  const [params, setParams] = useSearchParams()
  const [enviando, setEnviando] = useState(false)
  // Google vuelve con ?error=... si cancelaste o algo falló (HU-01, "Cancelo el inicio de sesión")
  const [error, setError] = useState(params.has('error') || params.has('error_description'))

  useEffect(() => {
    if (params.has('error')) setParams({}, { replace: true })
  }, [params, setParams])

  if (session) return <Navigate to="/" replace />

  async function continuar() {
    setError(false)
    setEnviando(true)
    try {
      await entrarConGoogle()
    } catch {
      setError(true)
      setEnviando(false)
    }
  }

  return (
    <main className="app">
      <h1>Cabina 86</h1>
      <p>Pasate discos con tus amigos, en rondas.</p>
      <button type="button" onClick={continuar} disabled={enviando || session === undefined}>
        {enviando ? 'Abriendo Google…' : 'Continuar con Google'}
      </button>
      {error && <p role="alert" className="error">{MENSAJE_ERROR}</p>}
    </main>
  )
}
