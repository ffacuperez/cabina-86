import { fraseArmada, pieDelCartel, type Tanda } from '../datos/cartel'
import type { Pasillo } from '../datos/exhibidor'

/**
 * Figma 02h · variante B (173:3244): "La cabina dice", el display debajo de cada estante (HU-19).
 * El resumen de la IA si está al día con la última tanda; si no, la frase armada. Ocupa su lugar: no pisa nada.
 */
export function CartelPasillo({ pasillo, tanda, resumen }: { pasillo: Pasillo; tanda: Tanda; resumen: string | undefined }) {
  return (
    <aside className="cartel-pasillo" aria-label={`La cabina dice, sobre el pasillo de ${pasillo.de.nombre}`}>
      <p className="mono-s cartel-pasillo__rotulo">LA CABINA DICE</p>
      <p className="cartel-pasillo__pantalla">{resumen ?? fraseArmada(pasillo, tanda)}</p>
      <p className="mono-s cartel-pasillo__pie">{pieDelCartel(tanda)}</p>
    </aside>
  )
}
