import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/dra-mkt/',  // CRÍTICO: prefixo para o Nginx
  server: {
    proxy: {
      '/dra-mkt/api': {
        target: 'http://127.0.0.1:8020',  // Porta do backend
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/dra-mkt/, '')
      }
    }
  },
  build: {
    outDir: '../backend/static',  // Build vai para pasta servida pelo Nginx
    emptyOutDir: true,
  }
})
