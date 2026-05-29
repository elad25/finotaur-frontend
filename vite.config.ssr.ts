/**
 * vite.config.ssr.ts — SSR-only build config for the prerender pipeline.
 *
 * Kept separate from vite.config.ts because:
 * - SSR mode externalises React/React-DOM by default, which conflicts with
 *   the manualChunks in the client config (Rollup errors if a manual chunk
 *   entry is also marked external).
 * - The client build's chunkSizeWarningLimit, sourcemap settings, and
 *   proxy config are irrelevant for an SSR bundle.
 *
 * Usage: npm run build:ssr
 *   → vite build --ssr src/entry-server.tsx --outDir dist-ssr -c vite.config.ssr.ts
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },

  build: {
    target: 'node18',
    minify: false,
    // SSR bundles leave node built-ins as-is
    ssr: true,
  },
});
