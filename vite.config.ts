import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import type { Plugin } from 'vite'

// Lokaler Mock für /.auth/me — nur im Dev-Server aktiv, nicht im Build
function mockAuthPlugin(): Plugin {
  return {
    name: 'mock-auth',
    configureServer(server) {
      server.middlewares.use('/.auth/me', (_req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          clientPrincipal: {
            identityProvider: 'aad',
            userId: 'dev-admin-001',
            userDetails: 'admin@demo.local',
            userRoles: ['authenticated', 'AIOS.Admin'],
          },
        }));
      });
      // Login-Redirect im lokalen Dev ignorieren
      server.middlewares.use('/.auth/login/aad', (_req, res) => {
        res.writeHead(302, { Location: '/' });
        res.end();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), mockAuthPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:7071',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
