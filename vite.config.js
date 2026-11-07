import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Installable app with an offline shell (design review: mills lose connectivity). API calls are never cached;
    // purchases made offline are queued by the v4 outbox instead. The worker is registered from the v4 UI only.
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      manifest: {
        name: 'Mill System',
        short_name: 'Mill',
        description: 'Rice mill management: purchases, milling, stock and exports',
        start_url: '/v4/',
        scope: '/',
        display: 'standalone',
        theme_color: '#1f7a5a',
        background_color: '#f7f8f6',
        icons: [{ src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
      workbox: {
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/],
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
    }),
  ],
  // Pre-bundle the dependencies of every UI version at startup. Otherwise the dev server discovers Mantine/Radix/HeroUI
  // only when /v2, /v3 or /v4 is first opened, re-optimises mid-session and serves two copies of React (blank page).
  optimizeDeps: {
    entries: ['index.html', 'src/v1/V1App.jsx', 'src/v2/V2App.jsx', 'src/v3/V3App.jsx', 'src/v4/V4App.jsx'],
  },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3001'
    }
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/shared/test/setup.js',
    css: false,
    // The UI suites (Mantine, Radix, React Aria) are heavy in jsdom; the default 5 s is too tight when files run in parallel.
    testTimeout: 15000,
  },
})
