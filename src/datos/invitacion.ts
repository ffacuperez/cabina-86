/** El link de invitación de la ronda (HU-02 lo abre en /r/<codigo>). */
export function linkDeInvitacion(codigo: string) {
  return `${window.location.origin}/r/${codigo}`
}

/** Mensaje de WhatsApp: el nombre de la ronda y el link (HU-04, "Invito por WhatsApp"). */
export function mensajeDeInvitacion(nombre: string, link: string) {
  return `Sumate a ${nombre} en Cabina 86: ${link}`
}
