import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../auth/AuthProvider'
import { CajaCD } from '../componentes/CajaCD'
import { Sticker } from '../componentes/Sticker'
import { TarjetaRecomendado } from '../componentes/TarjetaRecomendado'
import {
  buscarDiscos,
  type DiscoEncontrado,
  ErrorDeFuncion,
  type PaseHecho,
  pasarDisco,
  proximoCatalogo,
  type YaPasado,
  YaSePaso,
} from '../datos/pasar'
import { linkAlDisco, linkDeWhatsApp, mensajeDeAviso } from '../datos/aviso'
import { type RondaActual, useMarco, useRondaActual } from '../datos/ronda'
import { diaYMes, enLista, fechaDeCamara } from '../lib/texto'

/** Espera entre teclas antes de buscar: cada búsqueda son varios pedidos a Deezer */
const ESPERA_BUSQUEDA_MS = 400
const MINIMO_LETRAS = 2

type Busqueda =
  | { tipo: 'vacia' }
  | { tipo: 'buscando' }
  | { tipo: 'lista'; discos: DiscoEncontrado[] }
  | { tipo: 'error'; mensaje: string }

type Paso = 'buscar' | 'tarjetita' | 'pasado'

/**
 * /ronda/:id/pasar · Pasar un disco a toda la ronda (RN-03: sin destinatario).
 * HU-07 · Figma 05a: buscar en Deezer y elegir (los repetidos de esta ronda, bloqueados: RN-11).
 * HU-08 · Figma 05b: tarjetita y vista previa → "Pasárselo a la ronda"; Figma 05c: Pasado.
 */
export default function Pasar() {
  const ronda = useRondaActual()
  const [paso, setPaso] = useState<Paso>('buscar')
  const [texto, setTexto] = useState('')
  const [busqueda, setBusqueda] = useState<Busqueda>({ tipo: 'vacia' })
  const [elegido, setElegido] = useState<DiscoEncontrado | null>(null)
  const [hecho, setHecho] = useState<PaseHecho | null>(null)

  // 05b lleva su propio encabezado ("← BUSCAR" y el catálogo); 05c no tiene encabezado ni botonera
  useMarco({ encabezado: paso === 'buscar', botonera: paso !== 'pasado' })

  // Cada paso arranca arriba
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [paso])

  function pasarOtro() {
    setTexto('')
    setBusqueda({ tipo: 'vacia' })
    setElegido(null)
    setHecho(null)
    setPaso('buscar')
  }

  if (paso === 'pasado' && hecho) return <Pasado ronda={ronda} hecho={hecho} onPasarOtro={pasarOtro} />
  if (paso === 'tarjetita' && elegido) {
    return (
      <Tarjetita
        ronda={ronda}
        disco={elegido}
        onVolver={() => setPaso('buscar')}
        onPasado={(h) => {
          setHecho(h)
          setPaso('pasado')
        }}
        onYaSePaso={(yaPasado) => {
          // Lo pasó otro mientras escribía: queda bloqueado en la lista
          setBusqueda((b) =>
            b.tipo === 'lista'
              ? { tipo: 'lista', discos: b.discos.map((d) => (d.deezer_id === elegido.deezer_id ? { ...d, ya_pasado: yaPasado } : d)) }
              : b,
          )
          setElegido(null)
          setPaso('buscar')
        }}
      />
    )
  }
  return (
    <Buscar
      ronda={ronda}
      texto={texto}
      onTexto={setTexto}
      busqueda={busqueda}
      onBusqueda={setBusqueda}
      elegido={elegido}
      onElegir={setElegido}
      onSeguir={() => setPaso('tarjetita')}
    />
  )
}

/* ── 05a · Pasar — elegir disco (HU-07) ── */

function Buscar({
  ronda,
  texto,
  onTexto,
  busqueda,
  onBusqueda,
  elegido,
  onElegir,
  onSeguir,
}: {
  ronda: RondaActual
  texto: string
  onTexto: (t: string) => void
  busqueda: Busqueda
  onBusqueda: (b: Busqueda) => void
  elegido: DiscoEncontrado | null
  onElegir: (d: DiscoEncontrado | null) => void
  onSeguir: () => void
}) {
  const consulta = texto.trim()
  const ultimaBuscada = useRef(busqueda.tipo === 'lista' ? consulta : '')

  useEffect(() => {
    if (consulta.length < MINIMO_LETRAS) {
      ultimaBuscada.current = ''
      onBusqueda({ tipo: 'vacia' })
      return
    }
    // Volviendo de la tarjetita: la lista ya está
    if (consulta === ultimaBuscada.current) return
    const control = new AbortController()
    const espera = setTimeout(() => {
      onBusqueda({ tipo: 'buscando' })
      buscarDiscos(consulta, ronda.id, control.signal)
        .then((discos) => {
          ultimaBuscada.current = consulta
          onBusqueda({ tipo: 'lista', discos })
        })
        .catch((e) => {
          if (control.signal.aborted) return
          onBusqueda({ tipo: 'error', mensaje: e instanceof ErrorDeFuncion ? e.message : 'No pudimos buscar. Probá de nuevo.' })
        })
    }, ESPERA_BUSQUEDA_MS)
    return () => {
      clearTimeout(espera)
      control.abort()
    }
  }, [consulta, ronda.id, onBusqueda])

  const discos = busqueda.tipo === 'lista' ? busqueda.discos : []
  const nombres = ronda.otros.map((o) => o.nombre)
  const intro =
    nombres.length === 0
      ? 'Va para toda esta ronda. Por ahora estás solo, y quien se sume después no lo hereda.'
      : `Va para toda esta ronda: ${enLista(nombres)} lo ${nombres.length === 1 ? 'va' : 'van'} a tener en su exhibidor.`

  return (
    <>
      <h1 className="cartel-xl pasar__titulo">Pasá un<br />disco</h1>
      <p className="pasar__intro">{intro}</p>

      <label className="pasar__campo">
        <span className="mono-s rotulo-campo">BUSCAR DISCO</span>
        <input
          className="campo-texto"
          type="search"
          value={texto}
          onChange={(e) => {
            onTexto(e.target.value)
            onElegir(null)
          }}
          placeholder="Disco o artista"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="search"
          maxLength={100}
        />
      </label>

      <div className="pasar__resultados" aria-live="polite">
        {busqueda.tipo === 'buscando' && <p className="mono-s rotulo-campo pasar__rotulo">BUSCANDO…</p>}
        {busqueda.tipo === 'error' && <p role="alert" className="error pasar__aviso">{busqueda.mensaje}</p>}
        {busqueda.tipo === 'lista' && discos.length === 0 && (
          <p className="pasar__aviso">No encontramos ese disco. Probá con el nombre del artista.</p>
        )}
        {discos.length > 0 && (
          <>
            <p className="mono-s rotulo-campo pasar__rotulo">
              {discos.length} {discos.length === 1 ? 'RESULTADO' : 'RESULTADOS'} · DE DEEZER
            </p>
            <ul className="resultados">
              {discos.map((d) => {
                const esEste = elegido?.deezer_id === d.deezer_id
                return (
                  <li key={d.deezer_id}>
                    <button
                      type="button"
                      className={`resultado${esEste ? ' resultado--elegido' : ''}`}
                      aria-pressed={esEste}
                      disabled={d.ya_pasado !== null}
                      onClick={() => onElegir(esEste ? null : d)}
                    >
                      {d.tapa_url ? <CajaCD tapa={d.tapa_url} titulo={d.titulo} /> : <span className="sin-tapa">S/T</span>}
                      <span className="resultado__datos">
                        <span className="resultado__titulo">{d.titulo}</span>
                        <span className="texto-s">{[d.artista, d.anio].filter(Boolean).join(' · ')}</span>
                        {d.ya_pasado && <span className="resultado__repetido">{repetido(d.ya_pasado)}</span>}
                      </span>
                      {esEste && <Sticker texto="ESTE" className="resultado__este" />}
                    </button>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </div>

      <div className="pasar__accion">
        <button className="boton boton--ancho" type="button" disabled={!elegido} onClick={onSeguir}>
          Escribir la tarjetita <span className="flecha" aria-hidden="true">→</span>
        </button>
      </div>
    </>
  )
}

/** "YA LO PASÓ MANU EL 12/08 · NO SE REPITE" */
function repetido({ por, por_mi, el }: YaPasado) {
  return `${por_mi ? 'YA LO PASASTE VOS' : `YA LO PASÓ ${por.toUpperCase()}`} EL ${diaYMes(el)} · NO SE REPITE`
}

/* ── 05b · Pasar — tarjetita y pista (HU-08) ── */

function Tarjetita({
  ronda,
  disco,
  onVolver,
  onPasado,
  onYaSePaso,
}: {
  ronda: RondaActual
  disco: DiscoEncontrado
  onVolver: () => void
  onPasado: (hecho: PaseHecho) => void
  onYaSePaso: (yaPasado: YaPasado | null) => void
}) {
  const { session } = useAuth()
  const [nota, setNota] = useState('')
  const [catalogo, setCatalogo] = useState('')
  const [pasando, setPasando] = useState(false)
  const [error, setError] = useState('')
  const uid = session?.user.id ?? ''

  useEffect(() => {
    let vigente = true
    proximoCatalogo(ronda.id, uid, ronda.yo.sigla).then(
      (c) => vigente && setCatalogo(c),
      () => {},
    )
    return () => {
      vigente = false
    }
  }, [ronda.id, uid, ronda.yo.sigla])

  const nombres = ronda.otros.map((o) => o.nombre)
  const lista = enLista(nombres).toUpperCase()

  async function pasar() {
    if (!nota.trim() || pasando) return
    setError('')
    setPasando(true)
    try {
      onPasado(await pasarDisco(ronda.id, disco.deezer_id, nota))
    } catch (e) {
      setPasando(false)
      if (e instanceof YaSePaso) return onYaSePaso(e.yaPasado)
      setError(e instanceof ErrorDeFuncion && e.status === 502 ? e.message : 'No pudimos pasar el disco. Probá de nuevo.')
    }
  }

  return (
    <>
      <header className="encabezado-ronda">
        <button type="button" className="mono-m encabezado-ronda__volver" onClick={onVolver}>← BUSCAR</button>
        <p className="mono-m" aria-label={catalogo ? `Va a ser el ${catalogo}` : undefined}>{catalogo}</p>
      </header>

      <div className="elegido">
        <CajaCD tapa={disco.tapa_url} titulo={disco.titulo} />
        <div className="elegido__datos">
          <h1 className="cartel-s">{disco.titulo}</h1>
          <p className="texto-s">{[disco.artista, disco.anio].filter(Boolean).join(' · ')}</p>
          {disco.cantidad_temas ? <p className="lcd-chip">{disco.cantidad_temas} {disco.cantidad_temas === 1 ? 'TEMA' : 'TEMAS'}</p> : null}
        </div>
      </div>

      <p className="mono-s rotulo-campo tarjetita__rotulo">VA PARA</p>
      <p className="chip chip--activo tarjetita__destino">{ronda.nombre}</p>
      <p className="texto-s tarjetita__aclaracion">
        Esta ronda entera: {nombres.length ? `${enLista(nombres)}.` : 'por ahora, solo vos.'}
      </p>

      <p className="mono-s rotulo-campo tarjetita__rotulo">TU TARJETITA</p>
      <div className="tarjetita__nota">
        <TarjetaRecomendado por={ronda.yo.nombre} nota={nota} onNota={setNota} />
        <p className="texto-s">Así la van a ver pegada en el estante.</p>
      </div>

      <p className="mono-s rotulo-campo tarjetita__rotulo-vista">
        {nombres.length ? `ASÍ ${nombres.length === 1 ? 'LE' : 'LES'} LLEGA A ${lista}` : 'ASÍ SE VE EN EL EXHIBIDOR'}
      </p>
      <div className="vista-previa">
        <p className="rotulo vista-previa__rotulo">Pasillo de {ronda.yo.nombre} <span className="lcd-s">NUEVO</span></p>
        <div className="vista-previa__caja">
          <CajaCD tapa={disco.tapa_url} titulo="" />
          <Sticker texto={'PEN-\nDIENTE'} className="vista-previa__sticker" />
        </div>
        <p className="texto-s vista-previa__texto">
          Con el sticker PENDIENTE y tu tarjetita, hasta que lo escuchen y lo califiquen.
        </p>
      </div>

      {error && <p role="alert" className="error pasar__aviso">{error}</p>}

      <div className="pasar__accion">
        <button className="boton boton--ancho" type="button" disabled={!nota.trim() || pasando} aria-busy={pasando} onClick={pasar}>
          Pasárselo a la ronda <span className="flecha" aria-hidden="true">→</span>
        </button>
      </div>
    </>
  )
}

/* ── 05c · Pasado — en exhibición (HU-08), con "Avisar en el grupo" (HU-09) ── */

function Pasado({ ronda, hecho, onPasarOtro }: { ronda: RondaActual; hecho: PaseHecho; onPasarOtro: () => void }) {
  const titulo = useRef<HTMLHeadingElement>(null)
  useEffect(() => titulo.current?.focus(), [])
  const { pase, disco } = hecho
  const nombres = ronda.otros.map((o) => o.nombre)
  const texto =
    nombres.length === 0
      ? 'Ya está en exhibición. Por ahora estás solo en la ronda: nadie te lo debe.'
      : nombres.length === 1
        ? `Ya está en el exhibidor de ${nombres[0]}. Ahora te debe uno.`
        : `Ya está en el exhibidor de ${enLista(nombres.map((n) => `de ${n}`)).replace(/^de /, '')}. Ahora te deben uno cada uno.`
  // HU-09: el aviso para el grupo, con el link directo al disco
  const whatsapp = linkDeWhatsApp(mensajeDeAviso(ronda.yo.nombre, disco.titulo, ronda.nombre, linkAlDisco(ronda.id, pase.id)))

  return (
    <div className="pasado">
      <p className="mono-s suave">{pase.catalogo} · EN EXHIBICIÓN</p>
      <div className="pasado__vitrina">
        <CajaCD tapa={disco.tapa_url} titulo={disco.titulo} />
        <Sticker texto={'NUE-\nVO'} className="pasado__sticker" />
        <p className="pasado__fecha" aria-label={`Pasado el ${diaYMes(pase.creado_en)}`}>{fechaDeCamara(pase.creado_en)}</p>
      </div>

      <h1 className="cartel-xl pasado__titulo" ref={titulo} tabIndex={-1}>Pasado.</h1>
      <p className="texto-l pasado__texto">{texto}</p>
      <p className="lcd pasado__lcd">PASADO · {pase.catalogo}</p>

      <div className="pasado__acciones">
        <a className="boton boton--ancho" href={whatsapp} target="_blank" rel="noopener noreferrer">
          Avisar en el grupo <span className="flecha" aria-hidden="true">→</span>
        </a>
        <Link className="boton boton--secundario boton--ancho" to={`/ronda/${ronda.id}`}>Volver al exhibidor</Link>
        <button className="boton boton--contorno boton--ancho" type="button" onClick={onPasarOtro}>Pasar otro</button>
        <p className="texto-s pasado__ayuda">Abre WhatsApp con el mensaje escrito. Vos elegís el grupo.</p>
      </div>
    </div>
  )
}
