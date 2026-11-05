import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react(), tailwindcss()],
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
