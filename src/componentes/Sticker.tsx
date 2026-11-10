/**
 * C86/Sticker pendiente (Figma 13:1391): estrella naranja de 20 puntas con filete y texto.
 * Se usa con otros textos: ESTE (05a), PEN-DIENTE (exhibidor), NUE-VO (05c), ÚL-TIMO (estante de Perfil).
 * El tamaño va con --sticker (74px de base); el texto escala con él. Un "\n" corta la línea.
 */
export function Sticker({ texto, className = '' }: { texto: string; className?: string }) {
  return (
    <span className={`sticker ${className}`} aria-hidden="true">
      <svg viewBox="0 0 74 74" className="sticker__estrella">
        <path d="M37 0L41.9777 5.57176L48.4336 1.81091L51.446 8.64817L58.7481 7.06637L59.5001 14.4999L66.9336 15.2519L65.3518 22.554L72.1891 25.5664L68.4282 32.0223L74 37L68.4282 41.9777L72.1891 48.4336L65.3518 51.446L66.9336 58.7481L59.5001 59.5001L58.7481 66.9336L51.446 65.3518L48.4336 72.1891L41.9777 68.4282L37 74L32.0223 68.4282L25.5664 72.1891L22.554 65.3518L15.2519 66.9336L14.4999 59.5001L7.06637 58.7481L8.64817 51.446L1.81091 48.4336L5.57176 41.9777L0 37L5.57176 32.0223L1.81091 25.5664L8.64817 22.554L7.06637 15.2519L14.4999 14.4999L15.2519 7.06637L22.554 8.64817L25.5664 1.81091L32.0223 5.57176L37 0Z" />
        <circle cx="37" cy="37" r="28" />
      </svg>
      <span className="sticker__texto">{texto}</span>
    </span>
  )
}
