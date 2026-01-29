// vite.config.ts - OPTIMIZED FOR PRODUCTION v3.0
// 🔥 Better code splitting for War Zone
// 🔥 Pre-bundling for faster dev
// 🔥 Compression for smaller bundles

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

  // 🔥 CRITICAL: Pre-bundle heavy dependencies for faster dev
  optimizeDeps: {
    include: [
      // Core React
      'react',
      'react-dom',
      'react-router-dom',
      
      // Data layer
      '@tanstack/react-query',
      '@supabase/supabase-js',
      
      // Date/time
      'dayjs',
      'date-fns',
      
      // UI Components
      'lucide-react',
      'framer-motion',
      'recharts',
      'sonner',
      
      // Radix UI
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      '@radix-ui/react-tooltip',
      '@radix-ui/react-popover',
      '@radix-ui/react-tabs',
      '@radix-ui/react-slot',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-switch',
      
      // Utils
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

  // 🔥 Build optimizations
  build: {
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: false,
    
    // 🔥 Better code splitting
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Core React
          if (id.includes('node_modules/react/') || 
              id.includes('node_modules/react-dom/') || 
              id.includes('node_modules/react-router-dom/')) {
            return 'vendor-react';
          }
          
          // Data layer
          if (id.includes('node_modules/@tanstack/react-query') || 
              id.includes('node_modules/@supabase/')) {
            return 'vendor-data';
          }
          
          // Animation
          if (id.includes('node_modules/framer-motion')) {
            return 'vendor-motion';
          }
          
          // Charts
          if (id.includes('node_modules/recharts') || 
              id.includes('node_modules/d3-')) {
            return 'vendor-charts';
          }
          
          // Radix UI
          if (id.includes('node_modules/@radix-ui/')) {
            return 'vendor-radix';
          }
          
          // Icons
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-icons';
          }
          
          // Utils
          if (id.includes('node_modules/dayjs') || 
              id.includes('node_modules/date-fns') ||
              id.includes('node_modules/clsx') ||
              id.includes('node_modules/tailwind-merge')) {
            return 'vendor-utils';
          }
          
          // 🔥 WAR ZONE - Separate chunk
          if (id.includes('/warzone/') || 
              id.includes('Warzone') || 
              id.includes('WarZone')) {
            return 'page-warzone';
          }
          
          // Journal pages
          if (id.includes('/journal/')) {
            return 'page-journal';
          }
          
          // Admin pages
          if (id.includes('/admin/')) {
            return 'page-admin';
          }
        },
      },
    },
    
    // 🔥 Chunk size warnings
    chunkSizeWarningLimit: 500,
  },

  // 🔥 CSS optimization
  css: {
    devSourcemap: false,
  },

  // Reduce console noise
  logLevel: 'info',
  
  // Cache for faster subsequent loads
  cacheDir: 'node_modules/.vite',
})