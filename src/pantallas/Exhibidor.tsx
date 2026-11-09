import { CajaCD } from '../componentes/CajaCD'
import { Sticker } from '../componentes/Sticker'
import { TarjetaRecomendado } from '../componentes/TarjetaRecomendado'
import { type DiscoEnEstante, type Exhibidor as ExhibidorDatos, useExhibidor } from '../datos/exhibidor'
import { useRondaActual } from '../datos/ronda'
import { dosCifras } from '../lib/texto'

/**
 * Figma 02 · Tu exhibidor (vigente, 111:1595) y 02c (15:1608): a donde se llega al entrar a una ronda (HU-05, HU-11).
 * Un pasillo por integrante que me pasó discos, con su estante que se desliza. Debajo de cada caja, título y artista.
 * Pendiente: sticker PENDIENTE; ya calificado: sigue en el estante con el talón de mi puntaje.
 * Cada pasillo con pendientes lleva pegada la tarjetita del último. El LCD muestra mi deuda en esta ronda.
 */
export default function Exhibidor() {
  const ronda = useRondaActual()
  const { estado, reintentar } = useExhibidor(ronda)
  const deuda = estado.tipo === 'listo' ? estado.exhibidor.deuda : ronda.deuda

  return (
    <>
      <h1 className="cartel-xl exhibidor__titulo">Tu<br />exhibidor</h1>
      <p className="lcd exhibidor__deuda">LE DEBÉS {dosCifras(deuda)} {deuda === 1 ? 'DISCO' : 'DISCOS'}</p>

      <section className="exhibidor" aria-label="Tu exhibidor" aria-busy={estado.tipo === 'cargando'}>
        {estado.tipo === 'error' && (
          <div className="exhibidor__aviso">
            <p role="alert" className="error">No pudimos cargar tu exhibidor.</p>
            <button className="boton boton--contorno" type="button" onClick={reintentar}>Probar de nuevo</button>
          </div>
        )}
        {estado.tipo === 'listo' && <Estantes exhibidor={estado.exhibidor} />}
      </section>
    </>
  )
}

function Estantes({ exhibidor }: { exhibidor: ExhibidorDatos }) {
  const { pasillos } = exhibidor
  if (pasillos.length === 0) {
    return <p className="texto-m exhibidor__aviso">Nadie te pasó nada todavía. Qué ronda tranquila.</p>
  }
  return (
    <>
      {pasillos.map((p) => (
        <div key={p.de.id} className={`pasillo${p.tarjetita !== null ? ' pasillo--con-tarjetita' : ''}`}>
          <h2 className="rotulo pasillo__rotulo">
            Pasillo de {p.de.nombre} <span className="lcd-s">{dosCifras(p.discos.length)}</span>
          </h2>
          <ul className="estante" aria-label={`Lo que te pasó ${p.de.nombre}`}>
            {p.discos.map((d) => <DiscoEnEstante key={d.paseId} disco={d} />)}
          </ul>
          {p.tarjetita !== null && (
            <TarjetaRecomendado por={p.de.nombre} nota={p.tarjetita} className="tarjeta-recomendado--estante" />
          )}
        </div>
      ))}
      <p className="mono-s exhibidor__pista">DESLIZÁ CADA ESTANTE</p>
    </>
  )
}

function DiscoEnEstante({ disco }: { disco: DiscoEnEstante }) {
  const datos = [disco.titulo, disco.artista, disco.anio].filter(Boolean).join(', ')
  const estado = disco.puntaje === null ? 'Pendiente' : `Calificado con ${disco.puntaje}`
  return (
    <li className="disco-estante" aria-label={`${datos}. ${estado}.`}>
      <CajaCD tapa={disco.tapa} titulo="" />
      {/* Las tapas reales muchas veces no traen texto: título y artista abajo, como etiqueta de batea */}
      <p className="disco-estante__titulo" aria-hidden="true">{disco.titulo}</p>
      <p className="mono-s disco-estante__artista" aria-hidden="true">{disco.artista.toUpperCase()}</p>
      {disco.puntaje === null ? (
        <Sticker texto={'PEN-\nDIENTE'} className="disco-estante__sticker" />
      ) : (
        <span className="disco-estante__talon" aria-hidden="true">{dosCifras(disco.puntaje)}/10</span>
      )}
    </li>
  )
}
