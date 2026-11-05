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
        theme_color: '#c9d6a3',
        background_color: '#c9d6a3',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
