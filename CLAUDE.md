# Cabina 86

App para pasarse discos con amigos, en rondas. Stack y comandos en el README.

## Diseño: siempre desde el Figma

- Figma: [La Bandeja — Prototipo](https://www.figma.com/design/10Q6td2G6pVRUsEjCfa4VZ/La-Bandeja-%E2%80%94-Prototipo?node-id=12-1292) (fileKey `10Q6td2G6pVRUsEjCfa4VZ`)
- Página *Cabina 86 · Prototipo* (`12:1292`): las pantallas. Página *Cabina 86 · Componentes* (`12:1293`): Caja CD, Tapa, Botón, Chip, LCD, etc.
- Cada pantalla se implementa leyendo su frame del Figma. No inventar diseños propios; si el Figma no cubre un estado, preguntar.
- Frames ya implementados: `00a · Entrar` (20:2582), `00b · Te invitaron` (20:2752), `01 · Bienvenida — Crear ronda` (15:1292), `09 · Mis rondas` (20:2894), `09c · Mis rondas — hoja Invitá a la banda` (95:1747, sección "Invitar a la ronda"), `02 · Tu exhibidor` (15:1336) y `02c` (15:1608): pasillos, estantes, PENDIENTE / talón y la tarjetita del último pendiente (tocar una caja es HU-12), `05a · Pasar — elegir disco` (16:2112), `05b · Pasar — tarjetita y pista` (16:2204), `05c · Pasado` (16:2292) sin los botones de HU-09 y HU-10.
- Adentro de una ronda: `/ronda/:id` (layout `Ronda`, con "← MIS RONDAS" y la botonera C86/Teclas). Las teclas de secciones que todavía no existen van apagadas (variante `faltan=Pasar Ronda Perfil`); cada HU prende la suya en `componentes/Botonera.tsx`. Una pantalla que cambia el marco (05b trae su encabezado, 05c no tiene botonera) usa `useMarco`.
- Invitar: solo quien creó la ronda (#52). El link vive solo en la hoja 09c, que se abre con el chip INVITAR (en Mis rondas y, con HU-17, en La Ronda); en las rondas que no creaste no hay chip. Los integrantes no leen `codigo_invitacion`: el creador lo obtiene con `mis_codigos_de_invitacion()`. Después de "Armar la ronda" se vuelve a Mis rondas.
- Link de invitación: `/r/<codigo>`. Sin sesión muestra 00b; con sesión te suma solo ("abrilo y te suma solo"). Si el login arranca ahí, el código se guarda y /entrar lo retoma al volver de Google.
- Estilos con los tokens de `src/estilos/tokens.css` y los componentes de `src/estilos/base.css` (sin Tailwind).
- El botón de Google es el oficial (blanco, Roboto, logo oficial): es lo único que no toma la estética de la app.
- Grano de película y luz de rollo van en E-01 (semana 3).

## Trabajo

- Historias de usuario y criterios (Dado / Cuando / Entonces): doc "Cabina 86 — Historias de usuario".
- Una rama por issue y un PR que diga `Closes #N`.
- Cambios de base en `supabase/migrations/` con su prueba pgTAP en `supabase/tests/`.
- Edge Functions en `supabase/functions/` (Deno, `_shared/` para lo común), con pruebas `deno test` al lado (`index.test.ts`). Deezer y la base se inyectan para poder simularlos. Cada función nueva va en `config.toml` con `verify_jwt = false` (el token se valida adentro).
- `rondas` se lee con permisos por columna: una columna nueva hay que sumarla al `grant select (...)` para que la app la vea.
