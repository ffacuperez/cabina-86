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
npm run db:stop
```

Para conectar el proyecto remoto: `npx supabase login` y `npx supabase link --project-ref TU_REF`.
