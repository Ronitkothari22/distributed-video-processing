import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    cors: true,
    proxy: {
      // Direct proxying for non-api paths
      '/upload': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/internal': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/processed_videos': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/metadata': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:8000',
        ws: true,
        changeOrigin: true,
      }
    }
  }
})
