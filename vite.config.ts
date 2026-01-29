// vite.config.ts - FIXED v3.1
// 🔥 Fixed circular dependency issue in vendor-charts

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react()],
  
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },

  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      }
    },
    watch: {
      usePolling: false,
    },
  },

  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      '@supabase/supabase-js',
      'dayjs',
      'date-fns',
      'lucide-react',
      'framer-motion',
      'recharts',
      'sonner',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      '@radix-ui/react-tooltip',
      '@radix-ui/react-popover',
      '@radix-ui/react-tabs',
      '@radix-ui/react-slot',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-switch',
      'class-variance-authority',
      'clsx',
      'tailwind-merge',
      'immer',
      'zustand',
    ],
    force: false,
    esbuildOptions: {
      target: 'esnext',
    },
  },

  build: {
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: false,
    
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // 🔥 FIX: Don't split d3 separately - keep with recharts
          if (id.includes('node_modules/recharts') || 
              id.includes('node_modules/d3-') ||
              id.includes('node_modules/victory-') ||
              id.includes('node_modules/internmap') ||
              id.includes('node_modules/delaunator')) {
            return 'vendor-charts';
          }
          
          // Core React - MUST be first to avoid circular deps
          if (id.includes('node_modules/react/') || 
              id.includes('node_modules/react-dom/') ||
              id.includes('node_modules/scheduler/')) {
            return 'vendor-react';
          }
          
          // React Router (depends on react)
          if (id.includes('node_modules/react-router') ||
              id.includes('node_modules/@remix-run/router')) {
            return 'vendor-router';
          }
          
          // Data layer
          if (id.includes('node_modules/@tanstack/react-query') || 
              id.includes('node_modules/@supabase/')) {
            return 'vendor-data';
          }
          
          // Animation (separate due to size)
          if (id.includes('node_modules/framer-motion') ||
              id.includes('node_modules/motion')) {
            return 'vendor-motion';
          }
          
          // Radix UI
          if (id.includes('node_modules/@radix-ui/')) {
            return 'vendor-radix';
          }
          
          // Icons
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-icons';
          }
          
          // Utils - small, can be in one chunk
          if (id.includes('node_modules/dayjs') || 
              id.includes('node_modules/date-fns') ||
              id.includes('node_modules/clsx') ||
              id.includes('node_modules/tailwind-merge') ||
              id.includes('node_modules/class-variance-authority')) {
            return 'vendor-utils';
          }
          
          // 🔥 App pages - only if not importing from node_modules
          if (!id.includes('node_modules')) {
            if (id.includes('/warzone/') || 
                id.includes('Warzone') || 
                id.includes('WarZone')) {
              return 'page-warzone';
            }
            
            if (id.includes('/journal/')) {
              return 'page-journal';
            }
            
            if (id.includes('/admin/')) {
              return 'page-admin';
            }
          }
          
          // Let Vite handle the rest automatically
          return undefined;
        },
      },
    },
    
    chunkSizeWarningLimit: 500,
  },

  css: {
    devSourcemap: false,
  },

  logLevel: 'info',
  cacheDir: 'node_modules/.vite',
})