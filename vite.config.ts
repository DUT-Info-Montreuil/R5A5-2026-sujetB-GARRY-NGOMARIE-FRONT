import path from 'path'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Defaults target the docker setup (port 80, service `back`); override in
  // .env.local for a plain local run: DEV_PORT=5173, API_TARGET=http://localhost:8000
  const env = loadEnv(mode, process.cwd(), '')
  const port = Number(env.DEV_PORT ?? 80)
  const target = env.API_TARGET ?? 'http://back:8000'
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
      },
    },
    server: {
      host: '0.0.0.0',
      port,
      strictPort: true,
      watch: {
        usePolling: true,
      },
      proxy: {
        // WebSocket routes live under /api/v1/... alongside the REST ones
        // (see BACK docs/api-realtime.md), so /api itself must upgrade too.
        '/api': {
          target,
          changeOrigin: true,
          ws: true,
        },
        '/health': {
          target,
          changeOrigin: true,
        },
      },
    },
  }
})
