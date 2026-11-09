import cd from '../assets/cd.svg'

/** C86/CD (Figma 13:1354): el CD que sale de la caja en el detalle (03b). Que gire es E-02. */
export function CD({ className = '' }: { className?: string }) {
  return <img className={`cd ${className}`} src={cd} alt="" width={180} height={180} draggable={false} />
}
