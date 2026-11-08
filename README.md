# Cabina 86

App para pasarse discos con amigos, en rondas.

## Stack

- React + TypeScript + Vite
- PWA con `vite-plugin-pwa` (instalable en iPhone y Android)
- Supabase (base de datos, login y Edge Functions)

## Desarrollo

```bash
npm install
cp .env.example .env.local   # y completar con los datos de Supabase
npm run dev      # servidor local en http://localhost:5173
npm run build    # build de producción en dist/
npm run preview  # sirve el build para probar la PWA
npm run lint
```

## Deploy

Se publica en Vercel automáticamente: cada push a `main` va a producción y cada PR genera una URL de vista previa. La configuración está en `vercel.json`.

## Supabase local

Necesita Docker corriendo.

```bash
npm run db:start   # levanta Supabase local (Studio en http://localhost:54323)
npm run db:reset   # recrea la base aplicando supabase/migrations
npm run db:types   # genera los tipos de TypeScript de la base
npm run db:test    # corre las pruebas pgTAP de supabase/tests
npm run db:stop
```

Los cambios de la base van como archivos en `supabase/migrations/`. Al llegar a `main`, el workflow *Migraciones de Supabase* los aplica a producción (necesita los secrets `SUPABASE_ACCESS_TOKEN` y `SUPABASE_DB_PASSWORD`).

Cada PR que toca `supabase/` corre las pruebas pgTAP (workflow *Pruebas de la base*).

Para conectar el proyecto remoto a mano: `npx supabase login` y `npx supabase link --project-ref TU_REF`.

## Edge Functions

Viven en `supabase/functions/` (Deno). Lo compartido está en `_shared/`.

| Función | Para qué |
|---|---|
| `buscar_discos` | Busca álbumes en Deezer para Pasar y marca los que ya se pasaron en esa ronda (T-09, HU-07) |

```bash
cd supabase/functions && deno test --no-lock   # pruebas, con Deezer y la base simulados
npx supabase functions serve                    # local (necesita Docker y npm run db:start)
```

Al llegar a `main`, el workflow *Edge Functions de Supabase* las publica (necesita `SUPABASE_ACCESS_TOKEN`). A mano:

```bash
npx supabase login
npx supabase functions deploy buscar_discos --remote=xoxuewxwxkfgeiioileh --use-api
```

Cada PR que toca `supabase/functions/` corre sus pruebas (workflow *Pruebas de las Edge Functions*).

## Diseño

Las pantallas salen del Figma **[La Bandeja — Prototipo](https://www.figma.com/design/10Q6td2G6pVRUsEjCfa4VZ/La-Bandeja-%E2%80%94-Prototipo?node-id=12-1292)** (página *Cabina 86 · Prototipo*; los componentes están en *Cabina 86 · Componentes*). Cada pantalla nueva se arma leyendo su frame, no con un diseño propio.

Los tokens (colores, tipografía, espaciado, radios y sombras) salen de ese Figma y viven en `src/estilos/tokens.css`. Las fuentes se sirven desde la app con Fontsource, así funcionan sin conexión. En `/muestrario` se ven todos juntos.

## Tareas programadas (GitHub Actions)

| Workflow | Cuándo | Qué hace |
|---|---|---|
| *Latido de Supabase* | Cada 3 días | Llama a `latido()` para que el plan gratis no pause el proyecto (se pausa a los 7 días sin actividad) |
| *Backup semanal de la base* | Lunes 03:43 | Exporta roles, esquema y datos, los cifra con `BACKUP_PASSPHRASE` y los guarda 90 días como artifact |

Los dos se pueden correr a mano desde **Actions → Run workflow**.

Para abrir un backup: bajar el artifact, descomprimir el `.zip` y correr

```bash
gpg --decrypt cabina86-AAAA-MM-DD.tar.gz.gpg > backup.tar.gz   # pide BACKUP_PASSPHRASE
tar -xzf backup.tar.gz                                          # roles.sql, esquema.sql, datos.sql
```
