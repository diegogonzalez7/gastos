import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: 'script-defer',
      manifest: {
        id: './',
        name: 'Mi Dinero',
        short_name: 'Mi Dinero',
        description: 'Ingresos, gastos y balance mensual en tu dispositivo.',
        lang: 'es',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#f6f8f6',
        theme_color: '#176452',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{html,js,css,png,webp,woff2,webmanifest}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
})
