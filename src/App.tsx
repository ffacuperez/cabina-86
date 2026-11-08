import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { AuthProvider } from './auth/AuthProvider'
import { RequiereSesion } from './auth/RequiereSesion'
import ArmaLaRonda from './pantallas/ArmaLaRonda'
import Entrar from './pantallas/Entrar'
import Exhibidor from './pantallas/Exhibidor'
import Inicio from './pantallas/Inicio'
import Muestrario from './pantallas/Muestrario'
import Ronda from './pantallas/Ronda'
import TeInvitaron from './pantallas/TeInvitaron'
import { faltaConfiguracion } from './lib/supabase'

export default function App() {
  if (faltaConfiguracion.length > 0) {
    return (
      <main className="app">
        <h1>Falta configurar Supabase</h1>
        <p>Faltan estas variables de entorno: {faltaConfiguracion.join(', ')}.</p>
        <p>En Vercel: Settings → Environment Variables, marcadas para este entorno, y volvé a desplegar.</p>
      </main>
    )
  }

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/entrar" element={<Entrar />} />
          <Route path="/r/:codigo" element={<TeInvitaron />} />
          <Route path="/muestrario" element={<Muestrario />} />
          <Route element={<RequiereSesion />}>
            <Route path="/" element={<Inicio />} />
            <Route path="/armar" element={<ArmaLaRonda />} />
            <Route path="/ronda/:id" element={<Ronda />}>
              <Route index element={<Exhibidor />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
