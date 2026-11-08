import { useRondaActual } from '../datos/ronda'

const dosCifras = (n: number) => String(n).padStart(2, '0')

/**
 * Figma 02 · Tu exhibidor (15:1336): a donde se llega al entrar a una ronda (HU-05).
 * Título y mi deuda en esta ronda. Los estantes con los pendientes de cada integrante llegan con HU-11.
 */
export default function Exhibidor() {
  const { deuda } = useRondaActual()
  return (
    <>
      <h1 className="cartel-xl exhibidor__titulo">Tu<br />exhibidor</h1>
      <p className="lcd exhibidor__deuda">LE DEBÉS {dosCifras(deuda)} {deuda === 1 ? 'DISCO' : 'DISCOS'}</p>
    </>
  )
}
