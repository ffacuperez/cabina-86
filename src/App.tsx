import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { AuthProvider } from './auth/AuthProvider'
import { RequiereSesion } from './auth/RequiereSesion'
import { Pelicula } from './componentes/Pelicula'
import ArmaLaRonda from './pantallas/ArmaLaRonda'
import Calificar from './pantallas/Calificar'
import DetalleDisco from './pantallas/DetalleDisco'
import Entrar from './pantallas/Entrar'
import Exhibidor from './pantallas/Exhibidor'
import Inicio from './pantallas/Inicio'
import LaRonda from './pantallas/LaRonda'
import Muestrario from './pantallas/Muestrario'
import Pasar from './pantallas/Pasar'
import Pasillo from './pantallas/Pasillo'
import Perfil from './pantallas/Perfil'
import Ronda from './pantallas/Ronda'
import TeInvitaron from './pantallas/TeInvitaron'
import Ticket from './pantallas/Ticket'
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
        <Pelicula />
        <Routes>
          <Route path="/entrar" element={<Entrar />} />
          <Route path="/r/:codigo" element={<TeInvitaron />} />
          <Route path="/muestrario" element={<Muestrario />} />
          <Route element={<RequiereSesion />}>
            <Route path="/" element={<Inicio />} />
            <Route path="/armar" element={<ArmaLaRonda />} />
            <Route path="/ronda/:id" element={<Ronda />}>
              <Route index element={<Exhibidor />} />
              <Route path="pasar" element={<Pasar />} />
              <Route path="ronda" element={<LaRonda />} />
              <Route path="pasillo/:de" element={<Pasillo />} />
              <Route path="perfil" element={<Perfil />} />
              <Route path="disco/:pase" element={<DetalleDisco />} />
              <Route path="disco/:pase/calificar" element={<Calificar />} />
              <Route path="disco/:pase/ticket" element={<Ticket />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
