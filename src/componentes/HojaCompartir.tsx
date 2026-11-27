import { useEffect, useId, useState } from 'react'
import { aArchivo, compartirOGuardar, type Modo, modoAca } from '../lib/compartir'
import { Hoja } from './Hoja'

/**
 * Figma 08d / 08e (#127, #129): la hoja para compartir una tarjeta en historias. Arma la imagen apenas se abre
 * (en iPhone el menú de compartir tiene que abrirse con el toque, sin esperar) y la muestra en chiquito.
 * Un solo botón: en el teléfono "Compartir o guardar" abre el menú del teléfono, que tiene "Guardar imagen";
 * en la compu "Guardar imagen" la baja. Ver lib/compartir.ts.
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
  const [imagen, setImagen] = useState<{ blob: Blob; url: string; modo: Modo } | 'error' | null>(null)
  const [aviso, setAviso] = useState('')

  useEffect(() => {
    let vigente = true
    let url = ''
    generar()
      .then((blob) => {
        url = URL.createObjectURL(blob)
        if (vigente) setImagen({ blob, url, modo: modoAca(aArchivo(blob, nombreArchivo)) })
      })
      .catch(() => vigente && setImagen('error'))
    return () => {
      vigente = false
      if (url) URL.revokeObjectURL(url)
    }
  }, [generar, nombreArchivo])

  const lista = imagen && imagen !== 'error' ? imagen : null
  // Mientras se arma, el botón ya dice lo que va a hacer
  const modo = lista?.modo ?? modoAca()

  async function alTocar() {
    if (!lista) return
    const r = await compartirOGuardar(lista.blob, nombreArchivo)
    if (r === 'bajado' && modo === 'menu') setAviso('Tu navegador no comparte imágenes: la bajamos.')
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
      <button className="boton boton--ancho" type="button" onClick={alTocar} disabled={!lista}>
        {modo === 'menu' ? (
          <>
            Compartir o guardar <span className="flecha" aria-hidden="true">↗</span>
          </>
        ) : (
          'Guardar imagen'
        )}
      </button>
      <p className="mono-s hoja-compartir__nota">
        {modo === 'menu' && 'EN EL MENÚ ESTÁ GUARDAR IMAGEN, PARA TU GALERÍA. '}
        {nota}
      </p>
      <span className="sr-only" aria-live="polite">{aviso}</span>
      {aviso && <p className="texto-s">{aviso}</p>}
    </Hoja>
  )
}
