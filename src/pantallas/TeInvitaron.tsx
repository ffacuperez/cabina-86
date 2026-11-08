import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useAuth } from '../auth/AuthProvider'
import { BotonGoogle } from '../componentes/BotonGoogle'
import { CajaCD } from '../componentes/CajaCD'
import { Cartel } from '../componentes/Cartel'
import {
  borrarInvitacionPendiente,
  guardarInvitacionPendiente,
  LinkInvalido,
  sumarseARonda,
  verInvitacion,
  type Invitacion,
} from '../datos/invitacion'

const MENSAJE_LINK_INVALIDO = 'Este link no lleva a ninguna ronda. Pedile uno nuevo a quien te invitó.'
const dosCifras = (n: number) => String(n).padStart(2, '0')
const nombreDePila = (nombre: string) => nombre.trim().split(/\s+/)[0]

/** "Maxi", "Maxi y Manu", "Maxi, Manu y Nico" */
function enLista(nombres: string[]) {
  return nombres.length <= 1 ? (nombres[0] ?? '') : `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`
}

/**
 * /r/<codigo>: el link de invitación (HU-02).
 * - Sin sesión: Figma 00b · Te invitaron, con el botón de Google.
 * - Con sesión: te suma a la ronda (o, si ya estabas, solo registra la entrada) y te lleva a la ronda.
 *   Mis rondas lo dice: "¿Te pasaron un link? Abrilo y te suma solo."
 */
export default function TeInvitaron() {
  const { codigo = '' } = useParams()
  const { session } = useAuth()

  if (session === undefined) return <p className="cargando">Cargando…</p>
  return session ? <Sumarse key={codigo} codigo={codigo} /> : <VerInvitacion key={codigo} codigo={codigo} />
}

function PantallaLinkInvalido() {
  return (
    <main className="app">
      <p role="alert" className="error">{MENSAJE_LINK_INVALIDO}</p>
      <Link className="boton boton--contorno" to="/">Ir a Cabina 86</Link>
    </main>
  )
}

/** Ya con sesión: me sumo (o, si ya estaba, solo entro) y voy al exhibidor de esa ronda. */
function Sumarse({ codigo }: { codigo: string }) {
  const navigate = useNavigate()
  const [estado, setEstado] = useState<'sumando' | 'invalido' | 'error'>('sumando')
  const [intento, setIntento] = useState(0)

  useEffect(() => {
    let vigente = true
    sumarseARonda(codigo)
      .then((ronda) => {
        borrarInvitacionPendiente()
        if (vigente) navigate(`/ronda/${ronda}`, { replace: true })
      })
      .catch((e) => {
        if (e instanceof LinkInvalido) borrarInvitacionPendiente()
        if (vigente) setEstado(e instanceof LinkInvalido ? 'invalido' : 'error')
      })
    return () => {
      vigente = false
    }
  }, [codigo, intento, navigate])

  if (estado === 'invalido') return <PantallaLinkInvalido />
  if (estado === 'error') {
    return (
      <main className="app">
        <p role="alert" className="error">No pudimos sumarte a la ronda.</p>
        <button className="boton" type="button" onClick={() => { setEstado('sumando'); setIntento((n) => n + 1) }}>
          Probar de nuevo
        </button>
      </main>
    )
  }
  return <p className="cargando">Sumándote a la ronda…</p>
}

/** Figma 00b · Te invitaron: la ronda, quién invita, quiénes están y el botón de Google. */
function VerInvitacion({ codigo }: { codigo: string }) {
  const { falloElIngreso, entrarConGoogle } = useAuth()
  const [estado, setEstado] = useState<
    { tipo: 'cargando' } | { tipo: 'invalido' } | { tipo: 'error' } | { tipo: 'listo'; invitacion: Invitacion }
  >({ tipo: 'cargando' })
  const [intento, setIntento] = useState(0)
  const [enviando, setEnviando] = useState(false)
  const [falloAlAbrir, setFalloAlAbrir] = useState(false)

  useEffect(() => {
    let vigente = true
    verInvitacion(codigo)
      .then((invitacion) => vigente && setEstado(invitacion ? { tipo: 'listo', invitacion } : { tipo: 'invalido' }))
      .catch(() => vigente && setEstado({ tipo: 'error' }))
    return () => {
      vigente = false
    }
  }, [codigo, intento])

  const reintentar = useCallback(() => {
    setEstado({ tipo: 'cargando' })
    setIntento((n) => n + 1)
  }, [])

  if (estado.tipo === 'cargando') return <p className="cargando">Cargando…</p>
  if (estado.tipo === 'invalido') return <PantallaLinkInvalido />
  if (estado.tipo === 'error') {
    return (
      <main className="app">
        <p role="alert" className="error">No pudimos abrir la invitación.</p>
        <button className="boton" type="button" onClick={reintentar}>Probar de nuevo</button>
      </main>
    )
  }

  const { invitacion } = estado
  const quienInvita = invitacion.invito ? nombreDePila(invitacion.invito) : 'Te'
  const integrantes = invitacion.integrantes.map((i) => nombreDePila(i.nombre))
  const otros = invitacion.integrantes.filter((i) => !i.es_quien_invito).map((i) => nombreDePila(i.nombre))
  const veranQueTeSumaste = otros.length > 0 ? otros : integrantes
  const tapas = invitacion.ultimos_discos.filter((d) => d.tapa_url)

  async function continuar() {
    setFalloAlAbrir(false)
    setEnviando(true)
    guardarInvitacionPendiente(codigo)
    try {
      await entrarConGoogle()
    } catch {
      setFalloAlAbrir(true)
      setEnviando(false)
    }
  }

  const error = !enviando && (falloElIngreso || falloAlAbrir)

  return (
    <main className="pantalla invitado">
      <p className="mono-s suave">TE INVITARON</p>
      <h1 className="cartel-l invitado__titulo">
        {invitacion.invito ? <>{quienInvita} te<br />invitó a</> : <>Te invitaron a</>}
      </h1>

      <Cartel className="cartel--ronda invitado__cartel">
        <p className="mono-s cartel__rotulo">DISQUERÍA DE LA RONDA</p>
        <p className="cartel-l cartel__titulo">{invitacion.nombre}</p>
        <p className="mono-s cartel__integrantes">{integrantes.join(' · ').toUpperCase()}</p>
      </Cartel>

      {invitacion.discos_pasados > 0 && (
        <>
          <p className="lcd invitado__discos">
            {dosCifras(invitacion.discos_pasados)} {invitacion.discos_pasados === 1 ? 'DISCO PASADO' : 'DISCOS PASADOS'}
          </p>
          {tapas.length > 0 && (
            <div className="invitado__vista">
              {tapas.map((d) => <CajaCD key={`${d.titulo}-${d.artista}`} tapa={d.tapa_url!} titulo={`${d.titulo} · ${d.artista}`} />)}
            </div>
          )}
        </>
      )}

      <p className="invitado__texto">Cuando entres, los discos que se pasen desde hoy te van a llegar a vos también.</p>

      <div className="invitado__acciones">
        <BotonGoogle onClick={continuar} ocupado={enviando} />
        {error && <p role="alert" className="error">No pudimos entrar. Probá de nuevo.</p>}
        <p className="texto-s invitado__aclaracion">
          Al entrar, {enLista(veranQueTeSumaste)} {veranQueTeSumaste.length === 1 ? 've' : 'ven'} que te sumaste.
        </p>
      </div>
    </main>
  )
}
