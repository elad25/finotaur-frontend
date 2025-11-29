// vite.config.ts - OPTIMIZED FOR FAST DEV MODE
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
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      }
    },
    // ✅ Faster file watching
    watch: {
      usePolling: false,
    },
  },

  // ✅ CRITICAL: Pre-bundle heavy dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      '@supabase/supabase-js',
      'dayjs',
      'lucide-react',
      'recharts',
      'sonner',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      '@radix-ui/react-tooltip',
      '@radix-ui/react-popover',
      '@radix-ui/react-tabs',
      '@radix-ui/react-slot',
      'class-variance-authority',
      'clsx',
      'tailwind-merge',
    ],
    // ✅ Force pre-bundling even in dev
    force: false,
    // ✅ Increase memory for large projects
    esbuildOptions: {
      target: 'esnext',
    },
  },

  // ✅ Build optimizations (also helps dev)
  build: {
    target: 'esnext',
    // ✅ Better code splitting
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Data layer
          'vendor-data': ['@tanstack/react-query', '@supabase/supabase-js'],
          // UI Components
          'vendor-ui': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-tooltip',
            '@radix-ui/react-popover',
            '@radix-ui/react-tabs',
            'lucide-react',
          ],
          // Charts
          'vendor-charts': ['recharts'],
          // Utils
          'vendor-utils': ['dayjs', 'clsx', 'tailwind-merge', 'class-variance-authority'],
        },
      },
    },
    // ✅ Faster builds
    minify: 'esbuild',
    sourcemap: false,
  },

  // ✅ Reduce console noise
  logLevel: 'info',
  
  // ✅ Cache for faster subsequent loads
  cacheDir: 'node_modules/.vite',
})