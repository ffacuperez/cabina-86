import { type KeyboardEvent, useEffect, useRef, useState } from 'react'
import type { Dardo } from '../datos/informe'
import { dosCifras } from '../lib/texto'

export type DardoEnDiana = Dardo & { x: number; y: number; color: 'uno' | 'dos' | 'tres' }

/**
 * C86/Diana (Figma, Componentes 225:3834) con sus C86/Dardo (225:3851): La puntería del informe (HU-21).
 * Anillos negro y acrílico, centro mostaza y magenta, filete mostaza, la mira y la punteada del promedio.
 * Cada dardo es un disco: más cerca del centro, más le gustó a quien lo escuchó comparado con su promedio.
 *
 * Tocar un dardo (celular), pasarle el mouse (compu) o llegar con Tab y flechas abre la vista previa
 * (C86/Vista previa del dardo, 230:3892): la tapa, el nombre y el puntaje. Del lado que entra en la diana.
 * Cada dardo tiene una zona de toque invisible más grande que el punto. Se cierra tocando afuera,
 * sacando el mouse de la diana o con Escape. El que la usa le pone una key para que al cambiar de
 * blanco arranque cerrada.
 */
export function Diana({ dardos, apagada = false, etiqueta }: { dardos: DardoEnDiana[]; apagada?: boolean; etiqueta: string }) {
  const [activo, setActivo] = useState<number | null>(null)
  const raiz = useRef<HTMLDivElement>(null)
  const zonas = useRef<(SVGCircleElement | null)[]>([])
  const elegido = activo === null ? null : dardos[activo]

  // Tocar afuera de la diana la cierra
  useEffect(() => {
    if (activo === null) return
    const afuera = (e: PointerEvent) => {
      if (!raiz.current?.contains(e.target as Node)) setActivo(null)
    }
    document.addEventListener('pointerdown', afuera)
    return () => document.removeEventListener('pointerdown', afuera)
  }, [activo])

  function teclas(e: KeyboardEvent, n: number) {
    const mover = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]
    if (mover) {
      e.preventDefault()
      zonas.current[(n + mover + dardos.length) % dardos.length]?.focus()
    } else if (e.key === 'Escape') {
      setActivo(null)
      zonas.current[n]?.blur()
    }
  }

  return (
    <div className="diana-caja" ref={raiz} onPointerLeave={(e) => e.pointerType === 'mouse' && setActivo(null)}>
      <svg className={`diana${apagada ? ' diana--apagada' : ''}`} viewBox="0 0 240 240" role="group" aria-label={etiqueta}>
        <circle className="diana__oscuro" cx="120" cy="120" r="120" />
        <circle className="diana__claro" cx="120" cy="120" r="98" />
        <circle className="diana__oscuro" cx="120" cy="120" r="76" />
        <circle className="diana__claro" cx="120" cy="120" r="54" />
        <circle className="diana__mostaza" cx="120" cy="120" r="32" />
        <circle className="diana__centro" cx="120" cy="120" r="12" />
        <path className="diana__mira" d="M0 120H240M120 0V240" />
        <circle className="diana__promedio" cx="120" cy="120" r="60" />
        <circle className="diana__filete" cx="120" cy="120" r="119" />
        {dardos.map((d) => (
          <circle key={`p-${d.pase_id}-${d.a}`} className={`dardo dardo--${d.color}`} cx={d.x} cy={d.y} r="5" aria-hidden="true" />
        ))}
        {elegido && <circle className="dardo__aro" cx={elegido.x} cy={elegido.y} r="9" aria-hidden="true" />}
        {dardos.map((d, n) => (
          <circle
            key={`z-${d.pase_id}-${d.a}`}
            ref={(el) => { zonas.current[n] = el }}
            className="dardo__zona"
            cx={d.x}
            cy={d.y}
            r="11"
            role="button"
            tabIndex={(activo ?? 0) === n ? 0 : -1}
            aria-label={`${d.titulo}: ${d.puntaje}`}
            aria-expanded={activo === n}
            onPointerEnter={(e) => e.pointerType === 'mouse' && setActivo(n)}
            onClick={() => setActivo(n)}
            onFocus={() => setActivo(n)}
            onKeyDown={(e) => teclas(e, n)}
          />
        ))}
      </svg>
      {elegido && <VistaPrevia dardo={elegido} />}
    </div>
  )
}

/** C86/Vista previa del dardo: del lado de la diana donde hay lugar, a la altura del dardo */
function VistaPrevia({ dardo: d }: { dardo: DardoEnDiana }) {
  const aLaIzquierda = d.x > 120
  const alto = Math.min(210, Math.max(30, d.y))
  const lado = aLaIzquierda ? { right: `${((240 - d.x + 14) / 240) * 100}%` } : { left: `${((d.x + 14) / 240) * 100}%` }
  return (
    <div className="vista-dardo" style={{ ...lado, top: `${(alto / 240) * 100}%` }} aria-hidden="true">
      <span className="vista-dardo__tapa">
        {d.tapa_url ? <img src={d.tapa_url} alt="" loading="lazy" /> : <span className="cartel-s">{d.titulo}</span>}
      </span>
      <span className="vista-dardo__disco">{d.titulo}</span>
      <span className="lcd-m vista-dardo__puntaje">{dosCifras(d.puntaje)}</span>
    </div>
  )
}
