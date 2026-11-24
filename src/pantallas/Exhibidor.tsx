import { Fragment } from 'react'
import { Link } from 'react-router'
import { AvisoIphone } from '../componentes/AvisoIphone'
import { DiscoEnEstante } from '../componentes/DiscoEnEstante'
import { PlacaPasillo } from '../componentes/PlacaPasillo'
import { colorDe, type Informe, placaDelPasillo, useInforme } from '../datos/informe'
import { type Exhibidor as ExhibidorDatos, type Pasillo, rangoDeCatalogo, useExhibidor } from '../datos/exhibidor'
import { COLORES_LOMO } from '../lib/lomos'
import { useRondaActual } from '../datos/ronda'
import { dosCifras } from '../lib/texto'

/**
 * Figma 02 · Tu exhibidor (vigente, 111:1595) y 02c (15:1608): a donde se llega al entrar a una ronda (HU-05, HU-11).
 * Un pasillo por integrante que me pasó discos, con su estante que se desliza. Debajo de cada caja, título y artista.
 * Pendiente: sticker PENDIENTE; ya calificado: sigue en el estante con el talón de mi puntaje.
 * Debajo de cada estante, la placa del pasillo (HU-23, Figma 02i): cuánto le ponés a lo suyo y cuánto a todo.
 * Sale del informe de la ronda; si carga o falla, no se muestra.
 * El LCD muestra mi deuda en esta ronda.
 */
export default function Exhibidor() {
  const ronda = useRondaActual()
  const { estado, reintentar } = useExhibidor(ronda)
  const deuda = estado.tipo === 'listo' ? estado.exhibidor.deuda : ronda.deuda
  const { estado: delInforme } = useInforme(ronda.id)
  const informe = delInforme.tipo === 'listo' ? delInforme.informe : null

  return (
    <>
      <h1 className="cartel-xl exhibidor__titulo">Tu<br />exhibidor</h1>
      <p className="lcd exhibidor__deuda">LE DEBÉS {dosCifras(deuda)} {deuda === 1 ? 'DISCO' : 'DISCOS'}</p>
      <AvisoIphone />

      <section className="exhibidor" aria-label="Tu exhibidor" aria-busy={estado.tipo === 'cargando'}>
        {estado.tipo === 'error' && (
          <div className="exhibidor__aviso">
            <p role="alert" className="error">No pudimos cargar tu exhibidor.</p>
            <button className="boton boton--contorno" type="button" onClick={reintentar}>Probar de nuevo</button>
          </div>
        )}
        {estado.tipo === 'listo' && <Estantes exhibidor={estado.exhibidor} rondaId={ronda.id} informe={informe} yo={ronda.yo.sigla} />}
      </section>
    </>
  )
}

function Estantes({ exhibidor, rondaId, informe, yo }: { exhibidor: ExhibidorDatos; rondaId: string; informe: Informe | null; yo: string }) {
  const { pasillos } = exhibidor
  if (pasillos.length === 0) {
    return <p className="texto-m exhibidor__aviso">Nadie te pasó nada todavía. Qué ronda tranquila.</p>
  }
  return (
    <>
      {pasillos.map((p) => {
        const placa = informe && placaDelPasillo(informe, yo, p.de.sigla)
        return (
          <Fragment key={p.de.id}>
            <div className="pasillo">
              <h2 className="rotulo pasillo__rotulo">
                Pasillo de {p.de.nombre} <span className="lcd-s">{dosCifras(p.discos.length)}</span>
              </h2>
              <ul className="estante" aria-label={`Lo que te pasó ${p.de.nombre}`}>
                {p.discos.map((d) => <DiscoEnEstante key={d.paseId} disco={d} rondaId={rondaId} />)}
                {p.archivados.length > 0 && <TarjetaArchivo pasillo={p} rondaId={rondaId} />}
              </ul>
            </div>
            {placa && <PlacaPasillo placa={placa} color={colorDe(informe.integrantes, p.de.sigla)} rondaId={rondaId} yo={yo} />}
          </Fragment>
        )
      })}
      <p className="mono-s exhibidor__pista">DESLIZÁ CADA ESTANTE</p>
    </>
  )
}

/**
 * Figma 02e: al fondo del pasillo, si hay calificados archivados (T-11), una tarjeta del tamaño de una caja
 * con la pila de lomos y "+N EN EL ARCHIVO". Abre el pasillo entero (02f).
 */
function TarjetaArchivo({ pasillo: p, rondaId }: { pasillo: Pasillo; rondaId: string }) {
  return (
    <li className="disco-estante">
      <Link
        className="disco-estante__abrir archivo"
        to={`/ronda/${rondaId}/pasillo/${p.de.id}`}
        aria-label={`El pasillo entero de ${p.de.nombre}: ${p.archivados.length} más en el archivo`}
      >
        <span className="archivo__pila" aria-hidden="true">
          {COLORES_LOMO.slice(0, 4).map((c, i) => (
            <span key={i} className="archivo__lomo" style={{ background: c.fondo, width: `${Math.round(c.ancho / 2)}px` }} />
          ))}
          <span className="archivo__cuantos">
            <span className="lcd-l">+{p.archivados.length}</span>
            <span className="mono-s">EN EL<br />ARCHIVO</span>
          </span>
        </span>
        <span className="disco-estante__titulo" aria-hidden="true">El pasillo entero →</span>
        <span className="mono-s disco-estante__artista" aria-hidden="true">{rangoDeCatalogo(p.archivados)}</span>
      </Link>
    </li>
  )
}
