import { useLocation } from 'react-router'
import { useMisRondas } from '../datos/rondas'
import ArmaLaRonda from './ArmaLaRonda'
import MisRondas from './MisRondas'

/**
 * La primera pantalla con sesión (HU-01):
 * - sin rondas → "Armá la ronda"
 * - con al menos una → "Mis rondas"
 * La sesión queda guardada en el celular, así que al volver a abrir la app se llega acá directo.
 *
 * Cada navegación a "/" vuelve a cargar las rondas, aunque ya estés en "/"
 * (por ejemplo, "Abrir el exhibidor" después de armar la primera ronda, HU-03).
 */
export default function Inicio() {
  const { key } = useLocation()
  return <InicioCargado key={key} />
}

function InicioCargado() {
  const { estado, reintentar } = useMisRondas()

  if (estado.tipo === 'cargando') return <p className="cargando">Cargando…</p>

  if (estado.tipo === 'error') {
    return (
      <main className="app">
        <p role="alert" className="error">No pudimos cargar tus rondas.</p>
        <button className="boton" type="button" onClick={reintentar}>Probar de nuevo</button>
      </main>
    )
  }

  return estado.rondas.length === 0
    ? <ArmaLaRonda />
    : <MisRondas rondas={estado.rondas} deudaTotal={estado.deudaTotal} />
}
