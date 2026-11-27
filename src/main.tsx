import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { marcarSiEntraPorLink } from './lib/iphone'
import { guardarOrigenDeLaUrl } from './lib/origen'

// #59: si arrancó en Safari de iPhone por un link de la ronda o de un disco, el exhibidor lo avisa
marcarSiEntraPorLink(window.location.pathname)
// #135: de dónde llegó (?ref=tiktok, ?ref=tarjeta…), antes de que el login cambie la URL
guardarOrigenDeLaUrl()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
