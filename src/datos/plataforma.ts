import { useState } from 'react'

/** Dónde se abre el disco (HU-13). La app se acuerda de la última elegida en este teléfono. */
export type Plataforma = 'spotify' | 'youtube'

const CLAVE = 'cabina86.plataforma'

function leer(): Plataforma {
  try {
    return localStorage.getItem(CLAVE) === 'youtube' ? 'youtube' : 'spotify'
  } catch {
    return 'spotify'
  }
}

export function usePlataforma() {
  const [plataforma, setPlataforma] = useState<Plataforma>(leer)
  const elegir = (p: Plataforma) => {
    setPlataforma(p)
    try {
      localStorage.setItem(CLAVE, p)
    } catch {
      // Sin almacenamiento: vale para esta vez y la próxima arranca en Spotify
    }
  }
  return [plataforma, elegir] as const
}

/** RN-10: búsqueda del álbum por título y artista, igual que la que se guarda al pasarlo */
export function linksDeBusqueda(titulo: string, artista: string): Record<Plataforma, string> {
  const q = encodeURIComponent(`${titulo} ${artista}`.trim())
  return {
    spotify: `https://open.spotify.com/search/${q}/albums`,
    youtube: `https://music.youtube.com/search?q=${q}`,
  }
}
