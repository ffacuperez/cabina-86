/** "A", "A y B", "A, B y C" */
export function enLista(nombres: string[]) {
  return nombres.length <= 1 ? (nombres[0] ?? '') : `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`
}

export const nombreDePila = (nombre: string) => nombre.trim().split(/\s+/)[0] ?? ''

export const dosCifras = (n: number) => String(n).padStart(2, '0')

/** "2026-08-12T21:30:00Z" → "12/08", en la hora del teléfono */
export function diaYMes(iso: string) {
  const f = new Date(iso)
  return `${dosCifras(f.getDate())}/${dosCifras(f.getMonth() + 1)}`
}

/** Fecha de cámara de rollo: "'26 11 01" */
export function fechaDeCamara(iso: string) {
  const f = new Date(iso)
  return `'${String(f.getFullYear()).slice(2)} ${dosCifras(f.getMonth() + 1)} ${dosCifras(f.getDate())}`
}
