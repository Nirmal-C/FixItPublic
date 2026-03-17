import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    watch: {
      usePolling: true,
    },
    proxy: {
      '/api': {
        target: import.meta.env.VITE_API_URL || 'http://backend:8000',
        changeOrigin: true,
      },
      '/health': {
        target: import.meta.env.VITE_API_URL || 'http://backend:8000',
        changeOrigin: true,
      },
    },
  },
})