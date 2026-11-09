import { useId } from 'react'
import { MAX_TARJETITA } from '../datos/pasar'

/**
 * C86/Tarjeta recomendado (Figma 13:1395): cartulina con cinta, RECOMENDADO, POR <quién> y la nota a mano.
 * En Pasar (05b) la nota se escribe directo sobre la tarjeta: así la van a ver pegada en el estante.
 */
export function TarjetaRecomendado({
  por,
  nota,
  onNota,
  className = '',
}: {
  por: string
  nota: string
  /** Si está, la nota se puede escribir */
  onNota?: (nota: string) => void
  className?: string
}) {
  const id = useId()
  return (
    <div className={`tarjeta-recomendado ${className}`}>
      <span className="tarjeta-recomendado__cinta" aria-hidden="true" />
      <p className="cartel-s tarjeta-recomendado__encabezado">Recomendado</p>
      <p className="mono-s">POR {por.toUpperCase()}</p>
      {onNota ? (
        <>
          <label className="sr-only" htmlFor={id}>Tu tarjetita: por qué se lo pasás</label>
          <textarea
            id={id}
            className="tarjeta-recomendado__nota"
            value={nota}
            onChange={(e) => onNota(e.target.value)}
            maxLength={MAX_TARJETITA}
            rows={4}
            placeholder="Por qué se lo pasás…"
          />
        </>
      ) : (
        <p className="tarjeta-recomendado__nota">{nota}</p>
      )}
    </div>
  )
}
