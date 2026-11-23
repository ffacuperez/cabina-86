import { type ReactNode, useState } from 'react'
import { Link } from 'react-router'
import { CajaCD } from '../componentes/CajaCD'
import { Diana, type DardoEnDiana } from '../componentes/Diana'
import {
  type Cita,
  type DiscoDelInforme,
  type Informe as DatosInforme,
  colorDe,
  conSigno,
  etiquetaTiro,
  faltan,
  faltanTiro,
  frasePunteria,
  posicionDardo,
  fraseReparto,
  fraseTermometro,
  fraseTibiometro,
  lucesPrendidas,
  nombreCorto,
  notasEnLinea,
  porcentajeTibio,
  puestos,
  useInforme,
} from '../datos/informe'
import { conComa } from '../datos/loQuePasaste'
import { useMarco, useRondaActual } from '../datos/ronda'
import { dosCifras } from '../lib/texto'

const CON_BOTONERA = { encabezado: false, botonera: true }

/**
 * Figma 06f · El informe de la ronda (183:3680), HU-21 (#113); con pocos datos, 06g (184:3816).
 * Se llega desde "Ver el informe de la ronda" en La Ronda y vuelve con "← LA RONDA".
 * Los números salen de informe_ronda (solo discos cerrados que podés ver, RN-13 y RN-01);
 * cada bloque se muestra cuando alcanza su mínimo (RN-12) y, si no, dice cuánto falta.
 */
export default function Informe() {
  useMarco(CON_BOTONERA)
  const ronda = useRondaActual()
  const { estado, reintentar } = useInforme(ronda.id)

  return (
    <div className="informe">
      <header className="encabezado-ronda encabezado-ronda--propio">
        <Link className="mono-m encabezado-ronda__volver" to={`/ronda/${ronda.id}/ronda`}>← LA RONDA</Link>
        <p className="mono-s encabezado-ronda__nombre">{ronda.nombre.toUpperCase()}</p>
      </header>
      <h1 className="cartel-xl informe__titulo">El<br />informe</h1>

      {estado.tipo === 'cargando' && <p className="cargando">Cargando…</p>}
      {estado.tipo === 'error' && (
        <div className="detalle__aviso">
          <p role="alert" className="error">No pudimos armar el informe.</p>
          <button className="boton boton--contorno" type="button" onClick={reintentar}>Probar de nuevo</button>
        </div>
      )}
      {estado.tipo === 'listo' && <VistaInforme informe={estado.informe} />}
    </div>
  )
}

/** El contenido del informe, sin la carga (también sirve para mirarlo con datos de ejemplo). */
export function VistaInforme({ informe: i }: { informe: DatosInforme }) {
  const t = i.termometro
  const hayCerrados = i.faltan_cerrados === 0

  return (
    <>
      <p className="lcd informe__total">
        {dosCifras(i.discos)} {i.discos === 1 ? 'DISCO' : 'DISCOS'} · {dosCifras(i.notas)} {i.notas === 1 ? 'NOTA' : 'NOTAS'}
      </p>
      <p className="mono-s informe__aclaracion">SOLO CUENTAN LOS DISCOS QUE YA ESCUCHARON TODOS</p>

      <Bloque titulo="El termómetro">
        <dl className="numeros-lcd">
          <NumeroLcd rotulo="NOTAS" valor={dosCifras(t.notas)} />
          <NumeroLcd rotulo="PROM" valor={t.faltan ? '--' : conComa(t.promedio ?? 0)} apagado={t.faltan > 0} />
          <NumeroLcd rotulo="1 Y 2" valor={t.faltan ? '--' : dosCifras(t.uno_y_dos)} apagado={t.faltan > 0} />
          <NumeroLcd rotulo="9 Y 10" valor={t.faltan ? '--' : dosCifras(t.nueve_y_diez)} apagado={t.faltan > 0} />
        </dl>
        <p className="lcd informe__lcd-grande">{t.faltan ? faltan.notas(t.faltan) : `${porcentajeTibio(t)}% ENTRE 6 Y 8`}</p>
        <p className="texto-m-fuerte informe__frase">
          {t.faltan ? 'El termómetro arranca con 10 notas en discos que ya escucharon todos.' : fraseTermometro(t)}
        </p>
      </Bloque>

      <Bloque titulo="El tibiómetro" bajada="Cuántas de sus notas caen entre 6 y 8. Más alto, más tibio.">
        <ul className="vumetros">
          {i.tibiometro.map((f) => (
            <FilaVumetro key={f.sigla} nombre={nombreCorto(f.nombre)} pct={f.faltan ? null : f.entre_6_y_8_pct} />
          ))}
        </ul>
        <p className="texto-s">
          {i.tibiometro.some((f) => f.faltan === 0) ? fraseTibiometro(i.tibiometro) : 'Cada uno entra al tibiómetro cuando tenga 5 notas.'}
        </p>
      </Bloque>

      {t.faltan === 0 && (
        <Bloque titulo="Cómo se reparten las notas">
          <Reparto reparto={t.reparto} />
          <p className="texto-s">{fraseReparto(t)}</p>
        </Bloque>
      )}

      <Bloque titulo="El podio">
        {hayCerrados ? (
          <ol className="puestos">
            {puestos(i.podio).map(({ puesto, disco, empatados }) => (
              <Puesto
                key={puesto}
                posicion={String(puesto)}
                disco={disco}
                titulo={empatados > 1 ? `${disco.titulo} y ${empatados - 1} más` : disco.titulo}
                linea={empatados > 1 ? `${empatados} EMPATADOS` : disco.de_nombre ? `DE ${nombreCorto(disco.de_nombre).toUpperCase()}` : ''}
              />
            ))}
          </ol>
        ) : (
          <p className="mono-s">{faltan.podio(i.faltan_cerrados)}</p>
        )}
      </Bloque>

      {hayCerrados && i.fondo.length > 0 && (
        <Bloque titulo="El fondo de la bandeja">
          <ol className="puestos">
            <Puesto
              posicion={String(i.discos)}
              disco={i.fondo[0]}
              titulo={i.fondo.length > 1 ? `${i.fondo[0].titulo} y ${i.fondo.length - 1} más` : i.fondo[0].titulo}
              linea={i.fondo.length > 1 ? `${i.fondo.length} EMPATADOS` : notasEnLinea(i.fondo[0])}
            />
          </ol>
        </Bloque>
      )}

      {hayCerrados && i.discordia.length > 0 && (
        <Bloque titulo="Los discos de la discordia">
          <Discordia disco={i.discordia[0]} />
          {i.discordia.length > 1 && (
            <p className="mono-s">
              TAMBIÉN:{' '}
              {i.discordia.slice(1).map((d, n) => (
                <span key={d.pase_id}>
                  {n > 0 && <br />}
                  {d.titulo.toUpperCase()} · {d.alta.sigla} {d.alta.puntaje} · {d.baja.sigla} {d.baja.puntaje}
                </span>
              ))}
            </p>
          )}
        </Bloque>
      )}

      <Bloque titulo="La puntería" bajada="Cada disco que le pasaste a alguien es un dardo: más cerca del centro, más le gustó comparado con lo que suele poner.">
        <Punteria informe={i} />
      </Bloque>

      <Bloque titulo="Compatibilidad" bajada="Qué tanto ordenan los discos igual, de a dos.">
        <Compatibilidad pares={i.compatibilidad} />
      </Bloque>

      {hayCerrados && i.extremos.length > 0 && (
        <Bloque titulo="Lo más alto y lo más bajo">
          <ul className="extremos">
            {i.extremos.map((e) => (
              <li key={e.sigla} className="extremos__fila">
                <p className="texto-m-fuerte">{nombreCorto(e.nombre)}</p>
                <p className="mono-s">MÁS ALTA&nbsp; {e.alta.puntaje} · {e.alta.discos.join(', ')}</p>
                <p className="mono-s">MÁS BAJA&nbsp; {e.baja.puntaje} · {e.baja.discos.join(', ')}</p>
              </li>
            ))}
          </ul>
        </Bloque>
      )}

      {hayCerrados && i.oportunidad.promesas > 0 && (
        <Bloque titulo="Tengo que darle otra oportunidad" bajada="Comentarios que prometen volver a escucharlo. ¿Alguno lo hizo?">
          <p className="lcd informe__lcd-grande">
            {i.oportunidad.promesas} {i.oportunidad.promesas === 1 ? 'PROMESA' : 'PROMESAS'} DE VOLVER
          </p>
          {i.oportunidad.citas.map((c) => <TarjetaCita key={`${c.sigla}-${c.titulo}`} cita={c} />)}
        </Bloque>
      )}

      {hayCerrados && i.picante && (
        <Bloque titulo="La más picante">
          <TarjetaCita cita={i.picante} marino />
        </Bloque>
      )}

      {!hayCerrados && (
        <p className="mono-s informe__pie">
          EL FONDO DE LA BANDEJA, LA DISCORDIA, LAS NOTAS MÁS ALTAS Y MÁS BAJAS Y LAS CRÍTICAS APARECEN CUANDO LA RONDA TENGA 3 DISCOS QUE ESCUCHARON TODOS.
        </p>
      )}
      <p className="mono-s informe__pie">
        SE ACTUALIZA CADA VEZ QUE LA RONDA TERMINA DE ESCUCHAR UN DISCO. LAS NOTAS DE UN DISCO APARECEN CUANDO LO ESCUCHARON TODOS.
      </p>
    </>
  )
}

export function Bloque({ titulo, bajada, children }: { titulo: string; bajada?: string; children: ReactNode }) {
  return (
    <section className="informe__bloque" aria-label={titulo}>
      <h2 className="cartel-m">{titulo}</h2>
      {bajada && <p className="texto-s">{bajada}</p>}
      {children}
    </section>
  )
}

function NumeroLcd({ rotulo, valor, apagado = false }: { rotulo: string; valor: string; apagado?: boolean }) {
  return (
    <div className={`numero-lcd${apagado ? ' numero-lcd--apagado' : ''}`}>
      <dt className="lcd-s">{rotulo}</dt>
      <dd className="lcd-l">{valor}</dd>
    </div>
  )
}

/** Vúmetro de 10 luces (Figma 06f: tibiómetro y compatibilidad); sin datos, apagado y "--" */
function FilaVumetro({ nombre, pct }: { nombre: string; pct: number | null }) {
  const prendidas = lucesPrendidas(pct)
  return (
    <li className="vumetro">
      <span className="texto-m-fuerte vumetro__nombre">{nombre}</span>
      <span className="vumetro__luces" role="img" aria-label={pct === null ? 'Sin datos todavía' : `${pct} %`}>
        {Array.from({ length: 10 }, (_, n) => (
          <span key={n} className={`vumetro__luz${n < prendidas ? ' vumetro__luz--prendida' : ''}`} />
        ))}
      </span>
      <span className="lcd-l vumetro__pct" aria-hidden="true">{pct === null ? '--' : `${pct}%`}</span>
    </li>
  )
}

function Reparto({ reparto }: { reparto: number[] }) {
  const max = Math.max(1, ...reparto)
  return (
    <ul className="reparto" aria-label="Cuántas notas hay de cada valor, del 1 al 10">
      {reparto.map((cantidad, n) => (
        <li key={n} className={`reparto__nota${cantidad ? '' : ' reparto__nota--vacia'}`} aria-label={`${cantidad} de ${n + 1}`}>
          <span className="lcd-s reparto__cantidad" aria-hidden="true">{dosCifras(cantidad)}</span>
          <span className="reparto__barra" style={{ height: `${Math.max(2, Math.round((cantidad / max) * 96))}px` }} aria-hidden="true" />
          <span className="lcd-s reparto__valor" aria-hidden="true">{n + 1}</span>
        </li>
      ))}
    </ul>
  )
}

function Puesto({ posicion, disco, titulo, linea }: { posicion: string; disco: DiscoDelInforme; titulo: string; linea: string }) {
  return (
    <li className="puesto">
      <span className="puesto__posicion" aria-label={`Puesto ${posicion}`}>{posicion}</span>
      <span className="puesto__caja"><CajaCD tapa={disco.tapa_url} titulo={disco.titulo} /></span>
      <span className="puesto__datos">
        <span className="texto-m-fuerte puesto__titulo">{titulo}</span>
        <span className="lcd-s">{linea}</span>
      </span>
      <span className="lcd-l puesto__promedio">{conComa(disco.promedio)}</span>
    </li>
  )
}

function Discordia({ disco: d }: { disco: DatosInforme['discordia'][number] }) {
  return (
    <article className="discordia">
      <span className="discordia__tapa">
        {d.tapa_url ? <img src={d.tapa_url} alt="" loading="lazy" /> : <span className="cartel-s">{d.titulo}</span>}
      </span>
      <div className="discordia__datos">
        <p className="texto-s">
          <strong className="discordia__titulo">{d.titulo}</strong> · {d.artista}
          {d.de_nombre ? ` · lo pasó ${nombreCorto(d.de_nombre)}` : ''}
        </p>
        <dl className="numeros-lcd">
          <NumeroLcd rotulo={d.baja.sigla} valor={dosCifras(d.baja.puntaje)} />
          <NumeroLcd rotulo={d.alta.sigla} valor={dosCifras(d.alta.puntaje)} />
        </dl>
        <p className="texto-m-fuerte discordia__frase">
          {d.puntos} {d.puntos === 1 ? 'punto' : 'puntos'} de diferencia.{d.puntos <= 4 ? ' En una ronda de tibios, es un escándalo.' : ' Se armó.'}
        </p>
      </div>
    </article>
  )
}

/**
 * Figma 06e · El adelanto del informe en La Ronda (HU-22, #114): el podio, la compatibilidad (solo los vúmetros)
 * y la discordia (solo el primero). Cada bloque aparece si alcanza su mínimo (RN-12); si no, no está.
 */
export function AdelantoInforme({ informe: i }: { informe: DatosInforme }) {
  const hayCerrados = i.faltan_cerrados === 0
  const compatibles = i.compatibilidad.filter((p) => p.pct !== null)
  if (!hayCerrados && compatibles.length === 0) return null
  return (
    <div className="adelanto-informe">
      {hayCerrados && i.podio.length > 0 && (
        <Bloque titulo="El podio">
          <ol className="puestos">
            {puestos(i.podio).map(({ puesto, disco, empatados }) => (
              <Puesto
                key={puesto}
                posicion={String(puesto)}
                disco={disco}
                titulo={empatados > 1 ? `${disco.titulo} y ${empatados - 1} más` : disco.titulo}
                linea={empatados > 1 ? `${empatados} EMPATADOS` : disco.de_nombre ? `DE ${nombreCorto(disco.de_nombre).toUpperCase()}` : ''}
              />
            ))}
          </ol>
        </Bloque>
      )}
      {compatibles.length > 0 && (
        <Bloque titulo="Compatibilidad" bajada="Qué tanto ordenan los discos igual, de a dos.">
          <ul className="vumetros">
            {compatibles.map((p) => (
              <FilaVumetro key={`${p.a.sigla}-${p.b.sigla}`} nombre={`${nombreCorto(p.a.nombre)} × ${nombreCorto(p.b.nombre)}`} pct={p.pct} />
            ))}
          </ul>
        </Bloque>
      )}
      {hayCerrados && i.discordia.length > 0 && (
        <Bloque titulo="La discordia">
          <Discordia disco={i.discordia[0]} />
        </Bloque>
      )}
    </div>
  )
}

function Compatibilidad({ pares }: { pares: DatosInforme['compatibilidad'] }) {
  const conDatos = pares.filter((p) => p.pct !== null)
  const minFaltan = Math.min(...pares.map((p) => p.faltan))
  return (
    <>
      <ul className="vumetros">
        {pares.map((p) => (
          <FilaVumetro key={`${p.a.sigla}-${p.b.sigla}`} nombre={`${nombreCorto(p.a.nombre)} × ${nombreCorto(p.b.nombre)}`} pct={p.pct} />
        ))}
      </ul>
      {conDatos.length > 0 ? (
        <>
          <p className="mono-s">
            {conDatos.map((p, n) => (
              <span key={`${p.a.sigla}-${p.b.sigla}`}>
                {n > 0 && <br />}
                {p.a.sigla} × {p.b.sigla}
                {p.une && ` · LOS UNE ${p.une.titulo.toUpperCase()}`}
                {p.separa && ` · LOS SEPARA ${p.separa.titulo.toUpperCase()}`}
              </span>
            ))}
          </p>
          <p className="texto-s">Sale de pocos discos por par: es para reírse, no para decidir amistades.</p>
        </>
      ) : (
        pares.length > 0 && <p className="mono-s">{faltan.enComun(minFaltan)}</p>
      )}
    </>
  )
}

/** Figma 06f · La puntería: chips para elegir a quién mirar, la diana con sus dardos y una fila por quien le pasa */
function Punteria({ informe: i }: { informe: DatosInforme }) {
  const p = i.punteria
  const medidos = p.tiros.filter((t) => t.diferencia !== null)
  const [blanco, setBlanco] = useState(() => (medidos[0]?.a ?? i.integrantes[0]?.sigla ?? ''))
  const quien = i.integrantes.find((x) => x.sigla === blanco)
  // Los que le pasan a este blanco, en el orden de la ronda: cada uno tiene su porción de la diana y su color
  const tiros = p.tiros.filter((t) => t.a === blanco)
  const deQuien = i.integrantes.filter((x) => tiros.some((t) => t.de === x.sigla))
  const dardos: DardoEnDiana[] = deQuien.flatMap((x, porcion) => {
    const suyos = p.dardos.filter((d) => d.a === blanco && d.de === x.sigla)
    return suyos.map((d, n) => ({ ...d, ...posicionDardo(d.z, n, suyos.length, porcion, deQuien.length), color: colorDe(i.integrantes, x.sigla) }))
  })
  const frase = frasePunteria(p)

  return (
    <>
      <div className="punteria__blancos" role="group" aria-label="A quién mirar">
        {i.integrantes.map((x) => (
          <button key={x.sigla} type="button" className={`chip${x.sigla === blanco ? ' chip--activo' : ''}`} aria-pressed={x.sigla === blanco} onClick={() => setBlanco(x.sigla)}>
            A {nombreCorto(x.nombre)}
          </button>
        ))}
      </div>
      <div className="punteria__diana">
        <Diana
          key={blanco}
          dardos={dardos}
          apagada={medidos.length === 0}
          etiqueta={quien ? `La diana de ${nombreCorto(quien.nombre)}: ${dardos.length} discos` : 'La diana'}
        />
      </div>
      {medidos.length === 0 ? (
        <p className="mono-s">CADA TIRO SE MIDE CUANDO UNO LE PASÓ 5 DISCOS AL OTRO Y LOS ESCUCHÓ.</p>
      ) : (
        <>
          {deQuien.some((x) => dardos.some((d) => d.de === x.sigla)) && (
            <ul className="punteria__leyenda">
              {deQuien.filter((x) => dardos.some((d) => d.de === x.sigla)).map((x) => (
                <li key={x.sigla} className="mono-s">
                  <span className={`dardo-muestra dardo--${colorDe(i.integrantes, x.sigla)}`} aria-hidden="true" /> DE {nombreCorto(x.nombre).toUpperCase()}
                </li>
              ))}
            </ul>
          )}
          <p className="mono-s">CENTRO: MUY ARRIBA DE SU PROMEDIO · PUNTEADA: SU PROMEDIO · BORDE: MUY ABAJO</p>
          <ul className="punteria__tiros">
            {[...tiros].sort((a, b) => (b.diferencia ?? -99) - (a.diferencia ?? -99)).map((t) => (
              <li key={t.de} className="punteria__tiro">
                <p className="punteria__arriba">
                  <span className="texto-m-fuerte">De {nombreCorto(t.de_nombre)}</span>
                  {etiquetaTiro(t.diferencia) && <span className="mono-s punteria__etiqueta">{etiquetaTiro(t.diferencia)}</span>}
                  <span className="lcd-l punteria__valor">{t.diferencia === null ? '--' : conSigno(t.diferencia)}</span>
                </p>
                <p className="mono-s">
                  {t.diferencia === null || !t.mejor || !t.errado
                    ? faltanTiro(t.faltan, t.de_nombre)
                    : `MEJOR TIRO: ${t.mejor.titulo.toUpperCase()} (${t.mejor.puntaje}) · ERRADO: ${t.errado.titulo.toUpperCase()} (${t.errado.puntaje})`}
                </p>
              </li>
            ))}
          </ul>
          {frase && <p className="texto-s">{frase}</p>}
        </>
      )}
    </>
  )
}

function TarjetaCita({ cita: c, marino = false }: { cita: Cita; marino?: boolean }) {
  return (
    <figure className={`aviso informe__cita${marino ? ' informe__cita--marino' : ''}`}>
      <figcaption className="mono-s aviso__rotulo">
        {nombreCorto(c.nombre).toUpperCase()} · {c.puntaje} A {c.titulo.toUpperCase()}
      </figcaption>
      <blockquote className="aviso__texto">“{c.comentario}”</blockquote>
    </figure>
  )
}
