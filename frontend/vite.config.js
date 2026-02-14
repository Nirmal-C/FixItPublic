import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // This allows the server to be accessible outside the container
    port: 5173,
    watch: {
      usePolling: true, // Helps with Hot Module Replacement (HMR) on Windows/Docker
    },
  },
})