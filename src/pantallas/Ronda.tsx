import { useMemo, useState } from 'react'
import { Link, Navigate, Outlet, useParams } from 'react-router'
import { Botonera } from '../componentes/Botonera'
import { MARCO_COMPLETO, type Marco, useRonda } from '../datos/ronda'

/**
 * /ronda/:id: adentro de una ronda (HU-05). Arriba "← MIS RONDAS" y el nombre de la ronda (HU-06),
 * abajo la botonera. Las pantallas de cada sección van en el medio y reciben la ronda por contexto.
 * Figma 02 · Tu exhibidor (15:1336): encabezado "Encabezado ronda" y C86/Teclas.
 * Algunas pantallas cambian el marco (useMarco): 05b lleva su propio encabezado y 05c no tiene botonera.
 */
export default function Ronda() {
  const { id = '' } = useParams()
  return <RondaCargada key={id} id={id} />
}

function RondaCargada({ id }: { id: string }) {
  const { estado, reintentar } = useRonda(id)
  const [marco, setMarco] = useState<Marco>(MARCO_COMPLETO)
  const ronda = estado.tipo === 'lista' ? estado.ronda : null
  const contexto = useMemo(() => (ronda ? { ronda, setMarco } : null), [ronda])

  if (estado.tipo === 'cargando') return <p className="cargando">Cargando…</p>
  // Una ronda donde no estás (o un link roto): de vuelta a Mis rondas
  if (estado.tipo === 'no-esta') return <Navigate to="/" replace />
  if (estado.tipo === 'error' || !ronda) {
    return (
      <main className="app">
        <p role="alert" className="error">No pudimos abrir la ronda.</p>
        <button className="boton" type="button" onClick={reintentar}>Probar de nuevo</button>
        <Link className="mono-m" to="/">← MIS RONDAS</Link>
      </main>
    )
  }

  return (
    <>
      <main className={`pantalla en-ronda${marco.botonera ? ' en-ronda--con-botonera' : ''}`}>
        {marco.encabezado && (
          <header className="encabezado-ronda">
            <Link className="mono-m encabezado-ronda__volver" to="/">← MIS RONDAS</Link>
            <p className="mono-s encabezado-ronda__nombre">{ronda.nombre.toUpperCase()}</p>
          </header>
        )}
        <Outlet context={contexto} />
      </main>
      {marco.botonera && <Botonera rondaId={ronda.id} />}
    </>
  )
}
