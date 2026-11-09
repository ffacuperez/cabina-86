/**
 * C86/Caja CD (Figma, nodo 13:1364): caja de CD con bisagra, nervios y reflejo de plástico.
 * El tamaño se controla con --caja-ancho; todas las medidas salen de la caja base de 110 × 102.
 * Sin tapa (Deezer no tiene imagen): S/T, como el "Sin tapa" de Figma 05a.
 */
export function CajaCD({ tapa, titulo }: { tapa: string | null; titulo: string }) {
  return (
    <div className="caja-cd">
      {tapa ? (
        <img className="caja-cd__tapa" src={tapa} alt={titulo} draggable={false} loading="lazy" />
      ) : (
        <span className="caja-cd__tapa caja-cd__sin-tapa" role="img" aria-label={titulo}>
          <span aria-hidden="true">S/T</span>
        </span>
      )}
      <span className="caja-cd__bisagra" aria-hidden="true" />
      <span className="caja-cd__reflejo" aria-hidden="true" />
    </div>
  )
}
