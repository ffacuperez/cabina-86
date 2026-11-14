import { useId, useState } from 'react'
import { Hoja } from './Hoja'
import { borrarRonda, coincideElNombre } from '../datos/rondas'

/**
 * Figma 06c / 06d · Hoja "¿Borrar <ronda>?" (#105): sube desde La Ronda al tocar "Borrar la ronda".
 * Solo la abre quien creó la ronda. "Borrar para siempre" se habilita recién cuando escribís el nombre
 * de la ronda (sin importar mayúsculas); la base vuelve a chequear las dos cosas (borrar_ronda).
 */
export function HojaBorrarRonda({ ronda, discos, onCerrar, onBorrada }: {
  ronda: { id: string; nombre: string }
  discos: number
  onCerrar: () => void
  onBorrada: () => void
}) {
  const idTitulo = useId()
  const idCampo = useId()
  const [escrito, setEscrito] = useState('')
  const [borrando, setBorrando] = useState(false)
  const [fallo, setFallo] = useState(false)
  const coincide = coincideElNombre(escrito, ronda.nombre)

  async function borrar(e: React.FormEvent) {
    e.preventDefault()
    if (!coincide || borrando) return
    setBorrando(true)
    setFallo(false)
    try {
      await borrarRonda(ronda.id, escrito)
      onBorrada()
    } catch {
      setFallo(true)
      setBorrando(false)
    }
  }

  const queSePierde = discos === 0
    ? 'Se borra para todos, con sus integrantes. No se puede deshacer.'
    : `Se borra para todos: ${discos === 1 ? 'el disco que se pasó' : `los ${discos} discos que se pasaron`}, las notas y los comentarios. No se puede deshacer.`

  return (
    <Hoja etiquetadaPor={idTitulo} onCerrar={onCerrar}>
      <h2 className="cartel-m hoja__titulo" id={idTitulo} tabIndex={-1}>¿Borrar {ronda.nombre}?</h2>
      <p className="texto-s">{queSePierde}</p>

      <form className="hoja-borrar__form" onSubmit={borrar}>
        <label className="mono-s" htmlFor={idCampo}>ESCRIBÍ EL NOMBRE DE LA RONDA PARA CONFIRMAR</label>
        <input
          id={idCampo}
          className="campo-texto"
          value={escrito}
          onChange={(e) => setEscrito(e.target.value)}
          placeholder={ronda.nombre.toUpperCase()}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
        />
        {fallo && <p role="alert" className="error">No pudimos borrarla. Probá de nuevo.</p>}
        <button className="boton boton--ancho" type="submit" disabled={!coincide || borrando}>
          {borrando ? 'Borrando…' : 'Borrar para siempre'}
        </button>
      </form>

      {/* Escape cierra la hoja con su animación de bajada (componentes/Hoja) */}
      <button
        className="mono-s hoja-borrar__cancelar"
        type="button"
        onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))}
      >
        CANCELAR
      </button>
    </Hoja>
  )
}
