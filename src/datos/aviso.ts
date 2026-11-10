/** El link directo al disco: ahí está "Bancalo o bardealo" (HU-09). */
export function linkAlDisco(rondaId: string, paseId: string) {
  return `${window.location.origin}/ronda/${rondaId}/disco/${paseId}`
}

/** HU-09: "Facu pasó La Dinastía Scorpio a Birrinhas do Sabado. Bancalo o bardealo: <link>" */
export function mensajeDeAviso(quien: string, titulo: string, ronda: string, link: string) {
  return `${quien} pasó ${titulo} a ${ronda}. Bancalo o bardealo: ${link}`
}

/** WhatsApp con el mensaje escrito; quien pasa elige el grupo y lo manda. */
export function linkDeWhatsApp(mensaje: string) {
  return `https://wa.me/?text=${encodeURIComponent(mensaje)}`
}
