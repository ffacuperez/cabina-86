import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { supabase } from '../lib/supabase'
import type { YaPasado } from './pasar'

/** Una de mis otras rondas, para pasarle el mismo disco (HU-10) */
export type OtraRonda = {
  id: string
  nombre: string
  /** Nombres de pila, en el orden en que se sumaron (yo incluido): "FACU · AGUS · CARO" */
  integrantes: string[]
  /** RN-11: si ese disco ya se pasó ahí (por quien sea), queda bloqueada */
  yaPasado: YaPasado | null
}

type FilaMiembro = {
  se_unio_en: string
  rondas: { id: string; nombre: string; miembros_ronda: { se_unio_en: string; usuario_id: string; usuarios: { nombre: string } | null }[] }
}

const nombreDePila = (nombre: string) => nombre.trim().split(/\s+/)[0]

/**
 * HU-10: mis otras rondas (sin la actual), en el orden en que me sumé, cada una con si ese disco ya se pasó ahí.
 * null mientras carga o si falla (en ese caso no se ofrece nada: pasarlo a otra ronda es un extra).
 */
export function useOtrasRondas(rondaActual: string, discoId: string) {
  const { session } = useAuth()
  const yo = session?.user.id
  const [otras, setOtras] = useState<OtraRonda[] | null>(null)

  useEffect(() => {
    if (!yo) return
    let vigente = true
    Promise.all([
      supabase
        .from('miembros_ronda')
        .select('se_unio_en, rondas!inner(id, nombre, miembros_ronda(se_unio_en, usuario_id, usuarios(nombre)))')
        .eq('usuario_id', yo),
      // Las RLS dejan ver solo los pases de mis rondas
      supabase.from('pases').select('ronda_id, pasado_por, creado_en').eq('disco_id', discoId),
    ]).then(([miembros, pases]) => {
      if (!vigente || miembros.error || pases.error) return
      setOtras(armarOtras(miembros.data as unknown as FilaMiembro[], pases.data as Pase[], rondaActual, yo))
    })
    return () => {
      vigente = false
    }
  }, [yo, rondaActual, discoId])

  return otras
}

type Pase = { ronda_id: string; pasado_por: string; creado_en: string }

export function armarOtras(filas: FilaMiembro[], pases: Pase[], rondaActual: string, yo: string): OtraRonda[] {
  const porRonda = new Map(pases.map((p) => [p.ronda_id, p]))
  return [...filas]
    .sort((a, b) => a.se_unio_en.localeCompare(b.se_unio_en))
    .map((f) => f.rondas)
    .filter((r) => r.id !== rondaActual)
    .map((r) => {
      const miembros = [...r.miembros_ronda].sort((a, b) => a.se_unio_en.localeCompare(b.se_unio_en))
      const pase = porRonda.get(r.id)
      const quien = miembros.find((m) => m.usuario_id === pase?.pasado_por)
      return {
        id: r.id,
        nombre: r.nombre,
        integrantes: miembros.map((m) => nombreDePila(m.usuarios?.nombre ?? '?')),
        yaPasado: pase ? { por: nombreDePila(quien?.usuarios?.nombre ?? '?'), por_mi: pase.pasado_por === yo, el: pase.creado_en } : null,
      }
    })
}
