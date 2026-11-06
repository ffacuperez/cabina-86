import type { ReactNode } from 'react'

/**
 * Cartel marino de la disquería (Figma: "Cartel" en 00a · Entrar y 01 · Bienvenida):
 * filete mostaza adentro y el sticker naranja ABIERTO en la esquina inferior derecha.
 */
export function Cartel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section className={`cartel ${className}`}>
      {children}
      <span className="cartel__abierto" aria-hidden="true">ABIERTO</span>
    </section>
  )
}
