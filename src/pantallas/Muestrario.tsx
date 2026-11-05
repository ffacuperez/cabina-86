import { useState } from 'react'
import './muestrario.css'

const COLORES = [
  ['acrilico', 'Fondo'],
  ['acrilico-claro', 'Texto sobre oscuro'],
  ['acrilico-oscuro', 'Repisas y bordes'],
  ['acrilico-luz', 'Luz del exhibidor'],
  ['negro', 'Texto, rótulos'],
  ['negro-2', 'Teclas, caja de CD'],
  ['marino', 'Cartel, secundario'],
  ['magenta', 'Primario'],
  ['mostaza', 'Tecla activa'],
  ['naranja', 'Pendiente, deuda'],
  ['lcd', 'Pantalla LCD'],
  ['lcd-tinta', 'Dígitos LCD'],
  ['cartulina', 'Papel, ticket'],
  ['cinta', 'Cinta'],
] as const

const TEXTOS = [
  ['cartel-xl', 'Tu exhibidor'],
  ['cartel-m', 'Cabina de escucha'],
  ['cartel-s', 'Pasillo de Maxi'],
  ['texto-m', 'Pasale un disco a tus amigos. Escuchalo afuera.'],
  ['texto-m-fuerte', 'Temazo'],
  ['texto-s', 'Usamos tu cuenta de Google solo para saber quién sos.'],
  ['mono-m', '← MIS RONDAS'],
  ['mono-s', 'DISCOS · CDs · RONDAS'],
  ['lcd-m', 'Le debés 05 discos'],
  ['lcd-s', 'Puntaje'],
  ['mano', 'De noche y entero. Si saltás temas, no vale.'],
] as const

/** Muestra los tokens de T-07 para compararlos con el Figma. Ruta: /muestrario */
export default function Muestrario() {
  const [chip, setChip] = useState(true)

  return (
    <main className="muestrario">
      <p className="mono-s suave">CABINA 86 · TOKENS DE DISEÑO</p>
      <h1 className="cartel-xl">Muestrario</h1>

      <section>
        <h2 className="rotulo">Colores <span className="lcd-s">{String(COLORES.length).padStart(2, '0')}</span></h2>
        <ul className="muestrario__colores">
          {COLORES.map(([nombre, uso]) => (
            <li key={nombre}>
              <span className="muestrario__muestra" style={{ background: `var(--${nombre})` }} />
              <span className="texto-m-fuerte">--{nombre}</span>
              <span className="texto-s suave">{uso}</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="rotulo">Texto <span className="lcd-s">{String(TEXTOS.length).padStart(2, '0')}</span></h2>
        <ul className="muestrario__textos">
          {TEXTOS.map(([clase, ejemplo]) => (
            <li key={clase}>
              <span className="mono-s suave">{clase}</span>
              <span className={clase}>{ejemplo}</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="rotulo">Componentes</h2>
        <div className="muestrario__fila">
          <button className="boton boton--ancho" type="button">Ponete los auriculares <span className="flecha">→</span></button>
          <button className="boton boton--secundario boton--ancho" type="button">Pasárselo a la ronda <span className="flecha">→</span></button>
          <button className="boton boton--contorno boton--ancho" type="button">Editar puntaje</button>
          <button className="boton boton--mostaza boton--ancho" type="button">Imprimir el ticket <span className="flecha">→</span></button>
          <button className="boton boton--ancho" type="button" disabled>Deshabilitado</button>
        </div>
        <div className="muestrario__fila muestrario__fila--horizontal">
          <button className="chip" type="button" aria-pressed={chip} onClick={() => setChip(!chip)}>Spotify</button>
          <button className="chip" type="button" aria-pressed={!chip} onClick={() => setChip(!chip)}>YouTube</button>
        </div>
        <div className="muestrario__fila">
          <span className="lcd">Le debés 05 discos</span>
        </div>
      </section>
    </main>
  )
}
