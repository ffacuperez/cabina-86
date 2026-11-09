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

/** "HOY", "AYER", "HACE 2 DÍAS", "HACE 1 MES": días de calendario en la hora del teléfono */
export function haceCuanto(iso: string, ahora = new Date()) {
  const dia = (f: Date) => Date.UTC(f.getFullYear(), f.getMonth(), f.getDate()) / 86_400_000
  const dias = Math.max(0, dia(ahora) - dia(new Date(iso)))
  if (dias === 0) return 'HOY'
  if (dias === 1) return 'AYER'
  if (dias < 30) return `HACE ${dias} DÍAS`
  const meses = Math.floor(dias / 30)
  return meses === 1 ? 'HACE 1 MES' : `HACE ${meses} MESES`
}

/** Fecha de cámara de rollo: "'26 11 01" */
export function fechaDeCamara(iso: string) {
  const f = new Date(iso)
  return `'${String(f.getFullYear()).slice(2)} ${dosCifras(f.getMonth() + 1)} ${dosCifras(f.getDate())}`
}
