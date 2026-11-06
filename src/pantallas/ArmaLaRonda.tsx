import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { Cartel } from '../componentes/Cartel'
import { usePerfil } from '../datos/perfil'
import { crearRonda, type RondaCreada } from '../datos/rondas'

const NOMBRE_DE_EJEMPLO = 'BIRRINHAS DO SABADO'

/**
 * Figma 01 · Bienvenida — Crear ronda. A donde llega quien entra por primera vez sin link (HU-01)
 * y quien toca "Armar otra ronda" en Mis rondas.
 * HU-03: con un nombre, "Armar la ronda" la crea y la pantalla pasa al estado del Figma con el link.
 * Copiar, Invitar por WhatsApp y Ya se sumaron son HU-04.
 */
export default function ArmaLaRonda() {
  const perfil = usePerfil()
  const [nombre, setNombre] = useState('')
  const [armando, setArmando] = useState(false)
  const [error, setError] = useState(false)
  const [creada, setCreada] = useState<RondaCreada | null>(null)
  const yo = perfil?.nombre.trim().split(/\s+/)[0].toUpperCase() ?? ''
  const nombreValido = nombre.trim().length > 0

  async function armar(e: FormEvent) {
    e.preventDefault()
    if (!nombreValido || armando) return
    setError(false)
    setArmando(true)
    try {
      setCreada(await crearRonda(nombre))
    } catch {
      setError(true)
    } finally {
      setArmando(false)
    }
  }

  const nombreEnCartel = creada?.nombre ?? nombre.trim()
  const link = creada ? `${window.location.host}/r/${creada.codigo_invitacion}` : ''

  return (
    <main className="pantalla arma">
      <p className="mono-s suave">CABINA 86 · DISCOS &amp; CDs</p>

      <Cartel className="arma__cartel">
        <p className="mono-s cartel__rotulo">DISQUERÍA DE LA RONDA</p>
        <p className={`cartel-l cartel__titulo arma__nombre${nombreEnCartel ? '' : ' arma__nombre--vacio'}`} aria-hidden="true">
          {nombreEnCartel || NOMBRE_DE_EJEMPLO}
        </p>
        <p className="mono-s cartel__integrantes">{yo}</p>
      </Cartel>

      <h1 className="texto-l arma__intro">
        Una ronda es tu grupo: se pasan discos, los escuchan afuera y acá se bancan o se bardean.
      </h1>

      <form className="arma__form" onSubmit={armar}>
        <label className="arma__campo">
          <span className="mono-s rotulo-campo">NOMBRE DE LA RONDA</span>
          <input
            className="campo-texto"
            value={creada?.nombre ?? nombre}
            onChange={(e) => setNombre(e.target.value)}
            readOnly={creada !== null}
            maxLength={40}
            placeholder={NOMBRE_DE_EJEMPLO}
            autoComplete="off"
            enterKeyHint="done"
          />
        </label>

        {creada && (
          <div className="arma__invitar">
            <span className="mono-s rotulo-campo" id="rotulo-link">INVITÁ A LA BANDA</span>
            <p className="campo-link" aria-labelledby="rotulo-link">
              <span className="campo-link__texto">{link}</span>
            </p>
          </div>
        )}

        {error && <p role="alert" className="error arma__error">No pudimos armar la ronda. Probá de nuevo.</p>}

        <div className="arma__espacio" aria-hidden="true" />

        {creada ? (
          // El exhibidor llega con HU-05 / HU-11: mientras tanto lleva a Mis rondas, donde ya aparece la ronda
          <Link className="boton boton--ancho arma__boton" to="/">
            Abrir el exhibidor <span className="flecha" aria-hidden="true">→</span>
          </Link>
        ) : (
          <button className="boton boton--ancho arma__boton" type="submit" disabled={!nombreValido || armando} aria-busy={armando}>
            Armar la ronda
          </button>
        )}
      </form>
    </main>
  )
}
