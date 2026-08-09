import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    // Mirrors the nginx header so Google Sign-In's popup can postMessage back
    // when running the dev server directly, without going through the proxy.
    headers: { 'Cross-Origin-Opener-Policy': 'same-origin-allow-popups' },
    watch: { usePolling: true },
    proxy: { '/api': { target: 'http://backend:8000', changeOrigin: true } },
  },
})
