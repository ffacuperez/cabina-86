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
