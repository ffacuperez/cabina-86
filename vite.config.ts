import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Incluye las fuentes en el precache para que la PWA se vea igual sin conexión
      workbox: { globPatterns: ['**/*.{js,css,html,woff2,png,svg}'] },
      includeAssets: ['favicon-32.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'Cabina 86',
        short_name: 'Cabina 86',
        description: 'Pasate discos con tus amigos, en rondas.',
        lang: 'es-AR',
        theme_color: '#e0e8c2',
        background_color: '#c9d6a3',
        display: 'standalone',
        // #59: toda la app es su alcance, así Android abre en la app instalada los links de cabina-86
        // (la ronda /r/<codigo> y el disco del aviso de WhatsApp) en vez de Chrome
        id: '/',
        scope: '/',
        start_url: '/',
        // Si la app ya está abierta, el link la reusa y navega ahí (en vez de abrir otra ventana)
        launch_handler: { client_mode: ['navigate-existing', 'auto'] },
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
