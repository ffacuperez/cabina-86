import { useAvisoIphone } from '../lib/iphone'

/** Figma 02g (#59): en Safari de iPhone, después de entrar por un link, una sola vez. */
export function AvisoIphone() {
  const { mostrar, cerrar } = useAvisoIphone()
  if (!mostrar) return null
  return (
    <aside className="aviso-iphone" aria-labelledby="aviso-iphone">
      <p id="aviso-iphone" className="mono-s aviso-iphone__rotulo">¿TENÉS LA APP INSTALADA?</p>
      <p className="aviso-iphone__texto">
        Abrila desde tu pantalla de inicio: ya estás en la ronda. Este link se abrió en Safari, que no comparte la sesión con la app.
      </p>
      <button className="chip-accion chip-accion--mostaza" type="button" onClick={cerrar}>ENTENDIDO</button>
    </aside>
  )
}
