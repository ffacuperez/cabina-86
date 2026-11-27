import { useEffect, useId, useState } from 'react'
import { compartirImagen, guardarImagen } from '../lib/compartir'
import { Hoja } from './Hoja'

/**
 * Figma 08d / 08e (#127): la hoja para compartir una tarjeta en historias. Arma la imagen apenas se abre
 * (en iPhone el menú de compartir tiene que abrirse con el toque, sin esperar), la muestra en chiquito y
 * ofrece "Compartir" (el menú del teléfono) y "Guardar imagen" (en el teléfono, el mismo menú sin el texto,
 * donde está "Guardar imagen" para la galería; en la compu, se baja). Ver lib/compartir.ts.
 */
export function HojaCompartir({
  titulo,
  bajada,
  nota,
  nombreArchivo,
  generar,
  onCerrar,
}: {
  titulo: string
  bajada: string
  nota: string
  nombreArchivo: string
  generar: () => Promise<Blob>
  onCerrar: () => void
}) {
  const idTitulo = useId()
  const [imagen, setImagen] = useState<{ blob: Blob; url: string } | 'error' | null>(null)
  const [aviso, setAviso] = useState('')

  useEffect(() => {
    let vigente = true
    let url = ''
    generar()
      .then((blob) => {
        url = URL.createObjectURL(blob)
        if (vigente) setImagen({ blob, url })
      })
      .catch(() => vigente && setImagen('error'))
    return () => {
      vigente = false
      if (url) URL.revokeObjectURL(url)
    }
  }, [generar])

  const lista = imagen && imagen !== 'error' ? imagen : null

  async function compartir() {
    if (!lista) return
    const r = await compartirImagen(lista.blob, nombreArchivo)
    if (r === 'bajado') setAviso('Tu navegador no comparte imágenes: la bajamos.')
  }

  return (
    <Hoja etiquetadaPor={idTitulo} onCerrar={onCerrar}>
      <h2 className="cartel-m hoja__titulo" id={idTitulo} tabIndex={-1}>{titulo}</h2>
      <p className="texto-s">{bajada}</p>
      <div className="hoja-compartir__vista" aria-busy={!imagen}>
        {lista ? (
          <img className="hoja-compartir__imagen" src={lista.url} alt="La tarjeta para historias" />
        ) : imagen === 'error' ? (
          <p role="alert" className="error">No pudimos armar la imagen.</p>
        ) : (
          <p className="cargando">Armando la tarjeta…</p>
        )}
      </div>
      <button className="boton boton--ancho" type="button" onClick={compartir} disabled={!lista}>
        Compartir <span className="flecha" aria-hidden="true">↗</span>
      </button>
      <button className="boton boton--contorno boton--ancho" type="button" onClick={() => lista && guardarImagen(lista.blob, nombreArchivo)} disabled={!lista}>
        Guardar imagen
      </button>
      <p className="mono-s hoja-compartir__nota">{nota}</p>
      <span className="sr-only" aria-live="polite">{aviso}</span>
      {aviso && <p className="texto-s">{aviso}</p>}
    </Hoja>
  )
}
