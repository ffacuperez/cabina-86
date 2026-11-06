# Cabina 86

App para pasarse discos con amigos, en rondas. Stack y comandos en el README.

## Diseño: siempre desde el Figma

- Figma: [La Bandeja — Prototipo](https://www.figma.com/design/10Q6td2G6pVRUsEjCfa4VZ/La-Bandeja-%E2%80%94-Prototipo?node-id=12-1292) (fileKey `10Q6td2G6pVRUsEjCfa4VZ`)
- Página *Cabina 86 · Prototipo* (`12:1292`): las pantallas. Página *Cabina 86 · Componentes* (`12:1293`): Caja CD, Tapa, Botón, Chip, LCD, etc.
- Cada pantalla se implementa leyendo su frame del Figma. No inventar diseños propios; si el Figma no cubre un estado, preguntar.
- Frames ya implementados: `00a · Entrar` (20:2582), `01 · Bienvenida — Crear ronda` (15:1292), `09 · Mis rondas` (20:2894).
- Estilos con los tokens de `src/estilos/tokens.css` y los componentes de `src/estilos/base.css` (sin Tailwind).
- El botón de Google es el oficial (blanco, Roboto, logo oficial): es lo único que no toma la estética de la app.
- Grano de película y luz de rollo van en E-01 (semana 3).

## Trabajo

- Historias de usuario y criterios (Dado / Cuando / Entonces): doc "Cabina 86 — Historias de usuario".
- Una rama por issue y un PR que diga `Closes #N`.
- Cambios de base en `supabase/migrations/` con su prueba pgTAP en `supabase/tests/`.
