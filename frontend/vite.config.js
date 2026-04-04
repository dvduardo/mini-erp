import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const host = process.env.HOST || '127.0.0.1'
const backendOrigin = process.env.VITE_PROXY_TARGET || 'http://127.0.0.1:5001'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host,
    proxy: {
      '/api': {
        target: backendOrigin,
        changeOrigin: true,
      }
    }
  }
})
