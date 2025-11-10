/**
 * If your frontend runs on Vite (e.g. :5173) and backend on another port (e.g. :3001),
 * add this proxy to avoid CORS and to route /api requests to the server during dev.
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
