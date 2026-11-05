import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { AuthProvider } from './auth/AuthProvider'
import { RequiereSesion } from './auth/RequiereSesion'
import Entrar from './pantallas/Entrar'
import Inicio from './pantallas/Inicio'
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
          <Route element={<RequiereSesion />}>
            <Route path="/" element={<Inicio />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
