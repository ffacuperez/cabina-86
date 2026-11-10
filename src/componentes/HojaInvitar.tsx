import { useEffect, useId, useRef, useState } from 'react'
import { linkDeInvitacion, mensajeDeInvitacion } from '../datos/invitacion'
import type { RondaQueInvito } from '../datos/rondas'

/**
 * Figma 09c · Hoja "Invitá a la banda": sube sobre Mis rondas al tocar INVITAR (y desde La Ronda, HU-17).
 * Solo la abre quien creó la ronda (#52). Link con COPIAR, Invitar por WhatsApp y quiénes ya se sumaron (HU-04).
 */
export function HojaInvitar({ ronda, onCerrar }: { ronda: Pick<RondaQueInvito, 'nombre' | 'codigo' | 'sumados'>; onCerrar: () => void }) {
  const idTitulo = useId()
  const titulo = useRef<HTMLHeadingElement>(null)
  const textoLink = useRef<HTMLSpanElement>(null)
  const [copiado, setCopiado] = useState(false)
  const link = linkDeInvitacion(ronda.codigo)
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(mensajeDeInvitacion(ronda.nombre, link))}`

  // Al abrir: foco en el título, Escape cierra y el fondo no scrollea
  useEffect(() => {
    titulo.current?.focus()
    const alTeclear = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar()
    const overflowPrevio = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', alTeclear)
    return () => {
      document.body.style.overflow = overflowPrevio
      document.removeEventListener('keydown', alTeclear)
    }
  }, [onCerrar])

  useEffect(() => {
    if (!copiado) return
    const t = setTimeout(() => setCopiado(false), 2000)
    return () => clearTimeout(t)
  }, [copiado])

  async function copiar() {
    try {
      await navigator.clipboard.writeText(link)
      setCopiado(true)
    } catch {
      // Sin permiso para el portapapeles: deja el link seleccionado para copiarlo a mano
      const rango = document.createRange()
      if (textoLink.current) rango.selectNodeContents(textoLink.current)
      window.getSelection()?.removeAllRanges()
      window.getSelection()?.addRange(rango)
    }
  }

  return (
    <div className="hoja-velo" onClick={onCerrar}>
      <section
        className="hoja"
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        onClick={(e) => e.stopPropagation()}
      >
        <span className="hoja__asa" aria-hidden="true" />
        <h2 className="cartel-m hoja__titulo" id={idTitulo} ref={titulo} tabIndex={-1}>Invitá a la banda</h2>
        <p className="texto-s">Quien abra este link se suma a {ronda.nombre}.</p>

        <p className="campo-link">
          <span className="campo-link__texto" ref={textoLink}>{link.replace(/^https?:\/\//, '')}</span>
          <button className="chip-accion" type="button" onClick={copiar}>{copiado ? 'COPIADO' : 'COPIAR'}</button>
        </p>
        <span className="sr-only" aria-live="polite">{copiado ? 'Copiado' : ''}</span>

        <a className="boton boton--secundario boton--ancho" href={whatsapp} target="_blank" rel="noopener noreferrer">
          Invitar por WhatsApp <span className="flecha" aria-hidden="true">→</span>
        </a>

        <p className="mono-s rotulo-campo">YA SE SUMARON</p>
        {ronda.sumados.length > 0 ? (
          <>
            <ul className="hoja__sumados">
              {ronda.sumados.map((nombre, i) => <li key={`${nombre}-${i}`} className="chip chip--activo">{nombre}</li>)}
            </ul>
            <p className="texto-s">Ya pueden empezar a bardear.</p>
          </>
        ) : (
          <p className="texto-s">Todavía nadie. Pasales el link.</p>
        )}
      </section>
    </div>
  )
}
