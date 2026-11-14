import type { ReactNode } from 'react'

/**
 * Cartel marino de la disquería (Figma: "Cartel" en 00a · Entrar y 01 · Bienvenida):
 * filete mostaza adentro y el sticker naranja en la esquina inferior derecha
 * (ABIERTO; en 00c · Privacidad, la fecha de la última actualización).
 */
export function Cartel({ children, className = '', sticker = 'ABIERTO' }: { children: ReactNode; className?: string; sticker?: string }) {
  return (
    <section className={`cartel ${className}`}>
      {children}
      <span className="cartel__abierto" aria-hidden="true">{sticker}</span>
    </section>
  )
}
