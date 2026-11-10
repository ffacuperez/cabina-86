/*
 * A dónde volver después de entrar: si abriste un link de adentro de la app sin sesión
 * (por ejemplo, el disco que avisaron por WhatsApp, HU-09), Google vuelve a /entrar
 * y de ahí se sigue a ese link. Vence a la hora, como la invitación pendiente.
 */
const CLAVE = 'cabina86.volver'
const VENCE_EN_MS = 60 * 60 * 1000

/** Solo rutas de adentro de la app (nada de otros sitios ni de /entrar) */
const esRutaPropia = (ruta: unknown): ruta is string =>
  typeof ruta === 'string' && ruta.startsWith('/') && !ruta.startsWith('//') && !ruta.startsWith('/entrar')

/** Al tocar "Continuar con Google": guarda a dónde ibas, o borra lo viejo si no ibas a ningún lado */
export function guardarAdondeIba(ruta: unknown) {
  try {
    if (esRutaPropia(ruta) && ruta !== '/') localStorage.setItem(CLAVE, JSON.stringify({ ruta, guardada: Date.now() }))
    else localStorage.removeItem(CLAVE)
  } catch {
    // Sin almacenamiento: después de entrar se cae en Mis rondas
  }
}

export function adondeIba(): string | null {
  try {
    const g = JSON.parse(localStorage.getItem(CLAVE) ?? 'null') as { ruta?: unknown; guardada?: number } | null
    if (!g || !esRutaPropia(g.ruta) || !g.guardada || Date.now() - g.guardada > VENCE_EN_MS) return null
    return g.ruta
  } catch {
    return null
  }
}
