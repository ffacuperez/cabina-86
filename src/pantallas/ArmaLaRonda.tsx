import { useState, type FormEvent } from 'react'
import { Cartel } from '../componentes/Cartel'
import { usePerfil } from '../datos/perfil'

const NOMBRE_DE_EJEMPLO = 'BIRRINHAS DO SABADO'

/**
 * Figma 01 · Bienvenida — Crear ronda. A donde llega quien entra por primera vez sin link (HU-01)
 * y quien toca "Armar otra ronda" en Mis rondas.
 * El cartel muestra el nombre a medida que se escribe y quién está (por ahora, solo vos).
 * Crear la ronda y el link de invitación (bloques "Invitá a la banda" y "Ya se sumaron") son HU-03 y HU-04.
 */
export default function ArmaLaRonda() {
  const perfil = usePerfil()
  const [nombre, setNombre] = useState('')
  const yo = perfil?.nombre.trim().split(/\s+/)[0].toUpperCase() ?? ''

  function armar(e: FormEvent) {
    e.preventDefault()
    // HU-03: crear la ronda con este nombre y generar su link de invitación.
  }

  return (
    <main className="pantalla arma">
      <p className="mono-s suave">CABINA 86 · DISCOS &amp; CDs</p>

      <Cartel className="arma__cartel">
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

        {/* Se habilita con HU-03, que crea la ronda en la base */}
        <button className="boton boton--ancho arma__boton" type="submit" disabled>
          Armar la ronda <span className="flecha" aria-hidden="true">→</span>
        </button>
      </form>
    </main>
  )
}
