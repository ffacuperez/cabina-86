/**
 * C86/Caja CD (Figma, nodo 13:1364): caja de CD con bisagra, nervios y reflejo de plástico.
 * El tamaño se controla con --caja-ancho; todas las medidas salen de la caja base de 110 × 102.
 */
export function CajaCD({ tapa, titulo }: { tapa: string; titulo: string }) {
  return (
    <div className="caja-cd">
      <img className="caja-cd__tapa" src={tapa} alt={titulo} draggable={false} />
      <span className="caja-cd__bisagra" aria-hidden="true" />
      <span className="caja-cd__reflejo" aria-hidden="true" />
    </div>
  )
}
