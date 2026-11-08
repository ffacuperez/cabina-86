import { useEffect, useState } from 'react'
import { Navigate, useSearchParams } from 'react-router'
import { useAuth } from '../auth/AuthProvider'
import tapaArtaud from '../assets/tapas/artaud.svg'
import tapaBocanada from '../assets/tapas/bocanada.svg'
import tapaInRainbows from '../assets/tapas/in-rainbows.svg'
import tapaTpab from '../assets/tapas/to-pimp-a-butterfly.svg'
import { BotonGoogle } from '../componentes/BotonGoogle'
import { CajaCD } from '../componentes/CajaCD'
import { Cartel } from '../componentes/Cartel'
import { borrarInvitacionPendiente, leerInvitacionPendiente } from '../datos/invitacion'

const MENSAJE_ERROR = 'No pudimos entrar. Probá de nuevo.'

/** Discos de muestra del exhibidor (tapas del componente C86/Tapa del Figma) */
const MUESTRA = [
  { tapa: tapaBocanada, titulo: 'Bocanada' },
  { tapa: tapaArtaud, titulo: 'Artaud' },
  { tapa: tapaInRainbows, titulo: 'In Rainbows' },
  { tapa: tapaTpab, titulo: 'To Pimp a Butterfly' },
]

/** Figma 00a · Entrar: para quien abre la app sin link. Google → Armá la ronda (HU-01). */
export default function Entrar() {
  // falloElIngreso: cancelaste en Google o el código no se pudo canjear (HU-01, "Cancelo el inicio de sesión")
  const { session, falloElIngreso, entrarConGoogle } = useAuth()
  const [params, setParams] = useSearchParams()
  const [enviando, setEnviando] = useState(false)
  const [falloAlAbrir, setFalloAlAbrir] = useState(false)

  // Si el login empezó en un link de invitación (HU-02), se vuelve a /r/<codigo>:
  // con sesión para sumarse, o con el error de Google para mostrarlo en Te invitaron.
  const invitacion = leerInvitacionPendiente()
  const volverAInvitacion = invitacion !== null && (Boolean(session) || falloElIngreso)

  // Una vez resuelta la sesión, saca ?error= / ?code= de la URL (antes no: Supabase todavía puede estar canjeando el código).
  // No mientras se vuelve a la invitación: limpiar la URL de /entrar pisaría esa navegación.
  const urlSucia = params.size > 0 || window.location.hash.includes('error=')
  useEffect(() => {
    if (!volverAInvitacion && session === null && urlSucia) setParams({}, { replace: true })
  }, [volverAInvitacion, session, urlSucia, setParams])

  if (volverAInvitacion) return <Navigate to={`/r/${invitacion}`} replace />
  if (session) return <Navigate to="/" replace />

  async function continuar() {
    borrarInvitacionPendiente()
    setFalloAlAbrir(false)
    setEnviando(true)
    try {
      await entrarConGoogle()
    } catch {
      setFalloAlAbrir(true)
      setEnviando(false)
    }
  }

  const error = !enviando && (falloElIngreso || falloAlAbrir)

  return (
    <main className="pantalla entrar">
      <p className="mono-s suave">DISCOS · CDs · RONDAS</p>

      <Cartel className="entrar__cartel">
        <p className="mono-s cartel__rotulo">LA DISQUERÍA DE TU RONDA</p>
        <h1 className="cartel-xl cartel__titulo">Cabina<br />86</h1>
        <p className="cartel__texto">Pasale un disco a tus amigos. Escuchalo afuera. Acá se banca o se bardea.</p>
        <p className="mono-s cartel__rotulo entrar__lema">SIN REPRODUCTOR · SIN ALGORITMO</p>
      </Cartel>

      <div className="exhibidor-muestra" aria-hidden="true">
        <div className="exhibidor-muestra__cajas">
          {MUESTRA.map((d) => <CajaCD key={d.titulo} tapa={d.tapa} titulo={d.titulo} />)}
        </div>
      </div>

      <div className="entrar__acciones">
        <BotonGoogle onClick={continuar} ocupado={enviando || session === undefined} />
        {error && <p role="alert" className="error">{MENSAJE_ERROR}</p>}
        <p className="texto-s entrar__aclaracion">Usamos tu cuenta de Google solo para saber quién sos en cada ronda.</p>
        <p className="mono-s suave entrar__link">¿TE PASARON UN LINK? ABRILO Y ENTRÁS DIRECTO A ESA RONDA.</p>
      </div>
    </main>
  )
}
