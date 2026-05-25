import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
// Adam Mobile Interface — Sprint C, 2026-05-23.
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      includeAssets: ['favicon.svg', 'icon.svg'],
      injectManifest: {
        // html НЕ кэшируем — index.html всегда из сети, чтобы новый
        // bundle подхватывался немедленно после deploy без SW-deadlock
        globPatterns: ['**/*.{js,css,svg,png,ico}'],
        rollupFormat: 'iife',
      },
      manifest: {
        name: 'Adam Grozonv',
        short_name: 'Adam',
        description: 'Адам Грознов — голос Рода. Только для приглашённых.',
        theme_color: '#1F3A2E',
        background_color: '#F5EBDD',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: 'icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    host: true,
  },
  build: {
    target: 'es2020',
    sourcemap: false,
  },
})
