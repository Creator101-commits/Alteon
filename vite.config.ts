import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
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
          // Utilities
          'vendor-utils': ['date-fns', 'clsx', 'tailwind-merge', 'zod'],
          // Firebase - auth and related
          'vendor-firebase': ['firebase/app', 'firebase/auth'],
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
    ],
    esbuildOptions: { target: 'esnext' },
  },
  // Enable caching for faster rebuilds
  cacheDir: 'node_modules/.vite',
});
