import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import viteCompression from "vite-plugin-compression";

export default defineConfig({
  plugins: [
    react(),
    // Brotli compression for smaller network transfers (70-80% reduction)
    viteCompression({
      algorithm: 'brotliCompress',
      ext: '.br',
      threshold: 1024, // Only compress files > 1KB
    }),
    // Gzip fallback for browsers without Brotli support
    viteCompression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 1024,
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname),
  publicDir: path.resolve(import.meta.dirname, "public"),
  build: {
    outDir: "dist",
    emptyOutDir: true,
    // Optimize build for performance
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.debug', 'console.info'],
      },
    },
    // Enable source maps only in development
    sourcemap: false,
    rollupOptions: {
      output: {
        // Enhanced code splitting for better caching and smaller initial bundle
        manualChunks: {
          // Core React - always needed
          'vendor-react': ['react', 'react-dom'],
          // Routing
          'vendor-router': ['wouter'],
          // React Query - data fetching
          'vendor-query': ['@tanstack/react-query'],
          // UI components - loaded with main app
          'vendor-ui': [
            '@radix-ui/react-dialog', 
            '@radix-ui/react-dropdown-menu', 
            '@radix-ui/react-toast',
            '@radix-ui/react-popover',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-tooltip',
          ],
          // Charts - only loaded on analytics/dashboard pages
          'vendor-charts': ['recharts'],
          // Editor - only loaded on notes pages
          'vendor-editor': ['@tiptap/react', '@tiptap/starter-kit', '@tiptap/extension-placeholder'],
          // DnD Kit - only loaded on todos/boards pages
          'vendor-dnd': ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
          // Utilities
          'vendor-utils': ['date-fns', 'clsx', 'tailwind-merge', 'zod'],
          // Firebase - auth and related
          'vendor-firebase': ['firebase/app', 'firebase/auth'],
          // Heavy visualization libraries - lazy loaded
          'vendor-mermaid': ['mermaid'],
          // Supabase client
          'vendor-supabase': ['@supabase/supabase-js'],
          // Animation
          'vendor-animation': ['framer-motion'],
        },
        // Optimize chunk names for caching
        chunkFileNames: (chunkInfo) => {
          // Use content hash for better caching
          return 'assets/[name]-[hash].js';
        },
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 500,
    // CSS code splitting
    cssCodeSplit: true,
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@tanstack/react-query',
      'lucide-react',
      'wouter',
      'clsx',
      'date-fns',
      // Fix dayjs ESM compatibility (used by mermaid)
      'dayjs',
    ],
    // Note: mermaid is heavy but needs to be bundled for dayjs compatibility
  },
  // Enable caching for faster rebuilds
  cacheDir: 'node_modules/.vite',
});
