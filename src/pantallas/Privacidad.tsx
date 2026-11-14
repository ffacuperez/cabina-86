import type { ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { Cartel } from '../componentes/Cartel'

const CONTACTO = 'hola@cabina86.com'
const Mail = () => <a href={`mailto:${CONTACTO}`}>{CONTACTO}</a>

/** Los 8 bloques de Figma 00c · Privacidad (160:3098). Si cambia algo, actualizar también ACTUALIZADA y el sticker. */
const BLOQUES: { titulo: string; parrafos: ReactNode[] }[] = [
  {
    titulo: '01 · QUÉ DATOS USAMOS',
    parrafos: [
      'De tu cuenta de Google: tu nombre, tu foto y tu mail. Nada más: no leemos tus contactos, tus mails ni tus archivos.',
      'De lo que hacés acá: las rondas que armás o a las que te sumás, los discos que pasás con su tarjetita, y tus puntajes, temas favoritos, reacciones y comentarios.',
    ],
  },
  {
    titulo: '02 · PARA QUÉ',
    parrafos: [
      'Para que tu ronda sepa quién pasó cada disco y quién lo calificó, y para mostrarte tu exhibidor, lo que debés y lo que dijo la ronda. Tus notas las ve solo la gente de tu ronda, y cada uno recién después de calificar ese disco.',
    ],
  },
  {
    titulo: '03 · CON QUIÉN LOS COMPARTIMOS',
    parrafos: [
      'Con nadie. No vendemos tus datos, no hay publicidad y no los usamos para nada más que lo de arriba.',
      <>
        El uso que hace Cabina 86 de la información recibida de las API de Google cumple con la{' '}
        <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noreferrer">
          Política de Datos del Usuario de los Servicios de API de Google
        </a>
        , incluidos los requisitos de Uso Limitado.
      </>,
    ],
  },
  {
    titulo: '04 · DÓNDE SE GUARDAN',
    parrafos: [
      'En Supabase (la base de datos y el ingreso con Google) y en Cloudflare (la página). Una copia de seguridad semanal, cifrada, se guarda 90 días.',
      'En tu teléfono quedan la sesión y alguna preferencia, como si abrís los discos en Spotify o en YouTube.',
    ],
  },
  {
    titulo: '05 · LOS DATOS DE LOS DISCOS',
    parrafos: ['La búsqueda de discos usa Deezer y las tapas se cargan desde Deezer. Deezer no recibe tu nombre ni tu mail.'],
  },
  {
    titulo: '06 · TUS DERECHOS',
    parrafos: [
      <>
        Podés pedirnos ver, corregir o borrar tus datos (y tu cuenta) escribiendo a <Mail />. Respondemos dentro de los plazos
        de la Ley 25.326 de Protección de Datos Personales.
      </>,
      'La Agencia de Acceso a la Información Pública (AAIP) es la autoridad de control de esa ley y recibe los reclamos de quienes consideren que no se respetaron sus derechos.',
    ],
  },
  {
    titulo: '07 · QUIÉN ES RESPONSABLE',
    parrafos: [<>Cabina 86 es un proyecto independiente de Facundo Pérez, desde Córdoba, Argentina. Contacto: <Mail />.</>],
  },
  {
    titulo: '08 · SI ALGO CAMBIA',
    parrafos: ['Si cambia algo importante de esta página, lo avisamos en la app antes de que rija.'],
  },
]

/**
 * Figma 00c · Privacidad (#106): la política de privacidad, pública y sin sesión.
 * Google la pide en el mismo dominio y linkeada desde la home para verificar la marca del login.
 * "← VOLVER" vuelve atrás si llegaste desde la app (Entrar); si la abriste directo, va a /entrar.
 */
export default function Privacidad() {
  const navigate = useNavigate()
  const { key } = useLocation()
  const volver = () => (key === 'default' ? navigate('/entrar') : navigate(-1))

  return (
    <main className="pantalla privacidad">
      <button className="mono-s privacidad__volver" type="button" onClick={volver}>← VOLVER</button>

      <Cartel className="privacidad__cartel" sticker="14·11·26">
        <p className="mono-s cartel__rotulo">LA LETRA CHICA</p>
        <h1 className="cartel-xl cartel__titulo">Privacidad</h1>
        <p className="cartel__texto">Qué datos usa Cabina 86, para qué, y qué podés hacer con ellos. Corto y sin vueltas.</p>
        <p className="mono-s cartel__rotulo entrar__lema">SIN PUBLICIDAD · SIN RASTREO</p>
      </Cartel>

      {BLOQUES.map((b) => (
        <section key={b.titulo} className="privacidad__bloque">
          <h2 className="mono-s">{b.titulo}</h2>
          {b.parrafos.map((p, i) => <p key={i} className="texto-m">{p}</p>)}
        </section>
      ))}

      <p className="mono-s">ACTUALIZADA EL 14 DE NOVIEMBRE DE 2026 · CABINA86.COM</p>
    </main>
  )
}
