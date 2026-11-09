import { dosCifras } from '../lib/texto'

/** Ángulo de la aguja desde la vertical: del 1 (−45°) al 10 (+45°), de a 10°.
 *  Antes de elegir, en la marca del medio (entre 5 y 6): el primer toque la corre apenas. */
function anguloAguja(valor: number | null) {
  return valor === null ? 0 : (valor - 5.5) * 10
}

/**
 * C86/Display puntaje (Figma, set 14:1591): vúmetro de aguja, display de 7 segmentos y teclas − y +.
 * Escala del vúmetro exportada del Figma; la aguja gira según el puntaje (las variantes valor=1…10).
 * Antes de elegir, la aguja espera en la marca del medio y el display queda apagado ("88" fantasma).
 */
export function DisplayPuntaje({
  valor,
  onBajar,
  onSubir,
}: {
  valor: number | null
  onBajar: () => void
  onSubir: () => void
}) {
  return (
    <div className="display-puntaje">
      <div className="display-puntaje__vumetro" aria-hidden="true">
        <svg viewBox="0 0 150 104" fill="none">
          <path d="M17 57.7999C27.7154 45.906 41.831 37.5971 57.4309 34.0013C73.0307 30.4054 89.3592 31.6968 104.2 37.6999" stroke="#1F231C" strokeWidth="1.5" />
          <path d="M104.2 37.7C115.203 42.1235 125.053 48.9977 133 57.7999" stroke="#C23F78" strokeWidth="4" />
          <path d="M17 57.8L10.3 51.8" stroke="#1F231C" strokeWidth="1.3" />
          <path d="M26.6 48.9L23.4 45" stroke="#1F231C" strokeWidth="1.3" />
          <path d="M37.4 41.6L35 37.3" stroke="#1F231C" strokeWidth="1.3" />
          <path d="M49.2999 36.3L47.7 31.6" stroke="#1F231C" strokeWidth="1.3" />
          <path d="M62 33.0999L61.2 28.2" stroke="#1F231C" strokeWidth="1.3" />
          <path d="M75 32V23" stroke="#1F231C" strokeWidth="1.3" />
          <path d="M88 33.0999L88.8 28.2" stroke="#1F231C" strokeWidth="1.3" />
          <path d="M100.7 36.3L102.3 31.6" stroke="#1F231C" strokeWidth="1.3" />
          <path d="M112.6 41.6L115 37.3" stroke="#C23F78" strokeWidth="1.3" />
          <path d="M123.4 48.9L126.6 45" stroke="#C23F78" strokeWidth="1.3" />
          <path d="M133 57.8L139.7 51.8" stroke="#C23F78" strokeWidth="1.3" />
          <line
            className="display-puntaje__aguja"
            x1="75"
            y1="110"
            x2="75"
            y2="28"
            stroke="#1F231C"
            strokeWidth="1.6"
            style={{ transform: `rotate(${anguloAguja(valor)}deg)` }}
          />
          <circle cx="75" cy="110" r="9" fill="#33392D" />
        </svg>
        <span className="mono-s display-puntaje__vu">VU</span>
      </div>

      <div className="display-puntaje__lcd" role="status" aria-label={valor === null ? 'Sin puntaje todavía' : `Puntaje: ${valor} de 10`}>
        <span className="display-puntaje__rotulo" aria-hidden="true">PUNTAJE</span>
        <span className="display-puntaje__fantasma" aria-hidden="true">88</span>
        {valor !== null && <span className="display-puntaje__valor" aria-hidden="true">{dosCifras(valor)}</span>}
        <span className="display-puntaje__sobre" aria-hidden="true">/10</span>
      </div>

      <button type="button" className="display-puntaje__tecla display-puntaje__tecla--menos" aria-label="Bajar puntaje" onClick={onBajar}>
        −
      </button>
      <button type="button" className="display-puntaje__tecla display-puntaje__tecla--mas" aria-label="Subir puntaje" onClick={onSubir}>
        +
      </button>
      <p className="mono-s display-puntaje__leyenda">
        SIN DECIMALES.
        <br />
        ESTO NO ES PITCHFORK.
      </p>
    </div>
  )
}
