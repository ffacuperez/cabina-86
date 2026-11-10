/** Colores de los lomos del Figma (07 Perfil y 02f Pasillo entero): fondo, tinta y ancho sobre 342 */
export const COLORES_LOMO = [
  { fondo: 'var(--negro-2)', tinta: 'var(--mostaza)', ancho: 28 },
  { fondo: 'var(--acrilico-claro)', tinta: 'var(--negro)', ancho: 24 },
  { fondo: 'var(--naranja)', tinta: 'var(--negro)', ancho: 26 },
  { fondo: 'var(--magenta)', tinta: 'var(--acrilico-claro)', ancho: 30 },
  { fondo: 'var(--acrilico-oscuro)', tinta: 'var(--negro)', ancho: 28 },
]

/** Cada disco tiene su color por número de catálogo (FAC-03 → el tercero) */
export function colorDeLomo(catalogo: string) {
  const n = Number(catalogo.split('-').pop()) || 1
  return COLORES_LOMO[(n - 1) % COLORES_LOMO.length]
}
