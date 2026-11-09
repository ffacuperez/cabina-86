import bordeDentado from '../assets/ticket/borde-dentado.svg'
import { textoDeReaccion } from '../datos/calificar'
import type { NotaDeLaRonda } from '../datos/notas'
import { dosCifras } from '../lib/texto'

const CORTE = '- - - - - - - - - - - - - - - - - - - - -'

/**
 * Figma 03c (126:1911), HU-18: lo que dijo la ronda, una nota por mini ticket
 * (papel del ticket, línea de corte y borde dentado). Quien todavía no lo escuchó va más tenue.
 * Figma 03d (HU-15): la mía va primero, como "VOS"; una nota editada dice "(EDITADO)" (RN-02).
 */
export function NotasDeLaRonda({ notas }: { notas: NotaDeLaRonda[] }) {
  return (
    <ul className="mini-tickets">
      {notas.map(({ de, nota }) => {
        const reaccion = nota ? textoDeReaccion(nota.reaccion) : null
        return (
          <li key={de.id} className={`mini-ticket${nota ? '' : ' mini-ticket--pendiente'}`}>
            <div className="mini-ticket__papel">
              <p className="mono-s ticket__fila">
                <span>{de.nombre.toUpperCase()}</span>
                <b>{nota ? `${dosCifras(nota.puntaje)}/10${nota.editadaEn ? ' (EDITADO)' : ''}` : '––/10'}</b>
              </p>
              {reaccion && (
                <p className="mono-s ticket__fila">
                  <span>REACCIÓN</span>
                  <b>{reaccion.toUpperCase()}</b>
                </p>
              )}
              {(!nota || nota.comentario) && (
                <>
                  <p className="mono-s ticket__corte" aria-hidden="true">{CORTE}</p>
                  <p className="mono-s">{nota ? `“${nota.comentario}”` : 'TODAVÍA NO LO ESCUCHÓ.'}</p>
                </>
              )}
            </div>
            <img className="mini-ticket__dentado" src={bordeDentado} alt="" width={266} height={8} />
          </li>
        )
      })}
    </ul>
  )
}
