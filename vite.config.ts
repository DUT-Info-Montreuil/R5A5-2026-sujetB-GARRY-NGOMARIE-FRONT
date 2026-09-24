import path from 'path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 80,
    strictPort: true,
    watch: {
      usePolling: true,
    },
    proxy: {
      // WebSocket routes live under /api/v1/... alongside the REST ones
      // (see BACK docs/api-realtime.md), so /api itself must upgrade too.
      '/api': {
        target: 'http://back:8000',
        changeOrigin: true,
        ws: true,
      },
      '/health': {
        target: 'http://back:8000',
        changeOrigin: true,
      },
    },
  },
})
