import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

/** Si falta alguna variable, la app lo muestra en pantalla en vez de quedar en negro. */
export const faltaConfiguracion = [
  !url && 'VITE_SUPABASE_URL',
  !key && 'VITE_SUPABASE_PUBLISHABLE_KEY',
].filter(Boolean) as string[]

// PKCE: el login vuelve con un código de un solo uso en vez del token en la URL
export const supabase = createClient(
  url || 'https://falta-configurar.supabase.co',
  key || 'falta-configurar',
  { auth: { flowType: 'pkce' } },
)
