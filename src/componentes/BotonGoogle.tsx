import logoGoogle from '../assets/google-g.svg'

/**
 * Botón oficial de Google (claro). Es lo único que no toma la estética de Cabina 86:
 * blanco, borde #747775, Roboto Medium y el logo oficial (pautas de marca de Google).
 * Medidas del Figma: 54 de alto, radio 6, logo de 22 y 12 de separación.
 */
export function BotonGoogle({ onClick, ocupado }: { onClick: () => void; ocupado: boolean }) {
  return (
    <button className="boton-google" type="button" onClick={onClick} disabled={ocupado} aria-busy={ocupado}>
      <img src={logoGoogle} alt="" width={22} height={22} />
      <span>Continuar con Google</span>
    </button>
  )
}
