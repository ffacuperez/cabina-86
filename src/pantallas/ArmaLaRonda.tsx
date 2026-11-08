import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { Cartel } from '../componentes/Cartel'
import { usePerfil } from '../datos/perfil'
import { crearRonda } from '../datos/rondas'

const NOMBRE_DE_EJEMPLO = 'BIRRINHAS DO SABADO'

/**
 * Figma 01 · Bienvenida — Crear ronda. A donde llega quien entra por primera vez sin link (HU-01)
 * y quien toca "Armar otra ronda" en Mis rondas.
 * HU-03: con un nombre, "Armar la ronda" la crea y te lleva a Mis rondas, con la ronda nueva destacada.
 * El link se saca desde ahí con INVITAR (Figma 09c, HU-04).
 */
export default function ArmaLaRonda() {
  const perfil = usePerfil()
  const navigate = useNavigate()
  const [nombre, setNombre] = useState('')
  const [armando, setArmando] = useState(false)
  const [error, setError] = useState(false)
  const yo = perfil?.nombre.trim().split(/\s+/)[0].toUpperCase() ?? ''
  const nombreValido = nombre.trim().length > 0

  async function armar(e: FormEvent) {
    e.preventDefault()
    if (!nombreValido || armando) return
    setError(false)
    setArmando(true)
    try {
      await crearRonda(nombre)
      // Siempre una navegación nueva a "/", aunque ya estés ahí: Inicio vuelve a cargar y muestra Mis rondas
      navigate('/', { replace: true })
    } catch {
      setError(true)
      setArmando(false)
    }
  }

  return (
    <main className="pantalla arma">
      <p className="mono-s suave">CABINA 86 · DISCOS &amp; CDs</p>

      <Cartel className="cartel--ronda arma__cartel">
        <p className="mono-s cartel__rotulo">DISQUERÍA DE LA RONDA</p>
        <p className={`cartel-l cartel__titulo arma__nombre${nombre.trim() ? '' : ' arma__nombre--vacio'}`} aria-hidden="true">
          {nombre.trim() || NOMBRE_DE_EJEMPLO}
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
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            maxLength={40}
            placeholder={NOMBRE_DE_EJEMPLO}
            autoComplete="off"
            enterKeyHint="done"
          />
        </label>

        {error && <p role="alert" className="error arma__error">No pudimos armar la ronda. Probá de nuevo.</p>}

        <div className="arma__espacio" aria-hidden="true" />

        <button className="boton boton--ancho arma__boton" type="submit" disabled={!nombreValido || armando} aria-busy={armando}>
          Armar la ronda
        </button>
      </form>
    </main>
  )
}
