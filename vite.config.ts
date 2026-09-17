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
      '/api': {
        target: 'http://back:8000',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://back:8000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://back:8000',
        ws: true,
      },
    },
  },
})
