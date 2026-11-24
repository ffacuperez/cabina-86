import { Link } from 'react-router'
import { type Placa, dosDecimales, posicionPlaca } from '../datos/informe'

/**
 * Figma 02i · C86/Placa del pasillo (245:3935, HU-23): debajo de cada estante, en vez de "La cabina dice".
 * Cuánto le ponés a lo de esa persona y cuánto a todo, con dos decimales (PAREJO / TE PEGA / NO TE PEGA, 5 discos para medirlo).
 * En rondas de dos, mano a mano: lo tuyo a lo de él y lo de él a lo tuyo, sin etiqueta. La mini diana tiene
 * un dardo con su color, donde cae el promedio de sus discos. Toda la placa lleva a la puntería del informe.
 */
export function PlacaPasillo({ placa, color, rondaId, yo }: { placa: Placa; color: 'uno' | 'dos' | 'tres'; rondaId: string; yo: string }) {
  const p = placa
  const dardo = p.tipo === 'faltan' ? null : posicionPlaca(p.z)
  return (
    <Link className="placa-pasillo" to={`/ronda/${rondaId}/informe`} state={{ blanco: yo, aLaPunteria: true }}>
      <svg className="placa-pasillo__diana" viewBox="0 0 240 240" aria-hidden="true">
        <circle className="diana__oscuro" cx="120" cy="120" r="120" />
        <circle className="diana__claro" cx="120" cy="120" r="98" />
        <circle className="diana__oscuro" cx="120" cy="120" r="76" />
        <circle className="diana__claro" cx="120" cy="120" r="54" />
        <circle className="diana__mostaza" cx="120" cy="120" r="32" />
        <circle className="diana__centro" cx="120" cy="120" r="12" />
        <path className="placa-pasillo__mira" d="M0 120H240M120 0V240" />
        <circle className="placa-pasillo__promedio" cx="120" cy="120" r="60" />
        <circle className="placa-pasillo__filete" cx="120" cy="120" r="117" />
        {dardo && <circle className={`placa-pasillo__dardo dardo--${color}`} cx={dardo.x} cy={dardo.y} r="22" />}
      </svg>
      <span className="placa-pasillo__texto">
        {p.tipo === 'faltan' ? (
          <>
            <span className="mono-s">CON 5 DISCOS DE {p.de.toUpperCase()} TE DIGO SI TE PEGA</span>
            <span className="mono-s placa-pasillo__suave">VAS {Math.min(p.vas, 5)} DE 5</span>
          </>
        ) : (
          <>
            <span className="placa-pasillo__fila">
              <span className="mono-s">A LO DE {p.de.toUpperCase()} LE PONÉS</span>
              <span className="placa-pasillo__numero">{dosDecimales(p.lePones)}</span>
              {p.tipo === 'medido' ? (
                <>
                  <span className="mono-s">· A TODO,</span>
                  <span className="placa-pasillo__numero">{dosDecimales(p.aTodo)}</span>
                  <span className="placa-pasillo__etiqueta">{p.etiqueta}</span>
                </>
              ) : (
                <>
                  <span className="mono-s">· {p.de.toUpperCase()} A LO TUYO,</span>
                  <span className="placa-pasillo__numero">{p.teDevuelve === null ? '--' : dosDecimales(p.teDevuelve)}</span>
                </>
              )}
            </span>
            {p.favorito && (
              <span className="mono-s placa-pasillo__suave">
                TU FAVORITO DE {p.de.toUpperCase()}: {p.favorito.titulo.toUpperCase()} ({p.favorito.puntaje})
              </span>
            )}
          </>
        )}
      </span>
    </Link>
  )
}
