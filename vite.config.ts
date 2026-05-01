import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    // SWA CLI proxies /api/** → Azure Functions
    // Kein separater proxy hier nötig wenn `swa start` verwendet wird
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
