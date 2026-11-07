import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react(), tailwindcss()],
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
