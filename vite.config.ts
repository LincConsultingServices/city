import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// One config for build AND test (vitest reads vite.config.ts).
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // Expose both our canonical VITE_* vars and the main WarRoom frontend's
  // NEXT_PUBLIC_* vars to the client (PRD §10: drop that .env in verbatim).
  // NEXT_PUBLIC_ vars are already public by convention in the main app.
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
  server: {
    port: 5173,
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    chunkSizeWarningLimit: 700, // the pixi renderer is one intentional vendor chunk
    rollupOptions: {
      output: {
        // Split heavy vendors so the app shell stays small and caches well
        // (PRD §12.3 — code-split discipline; per-district/building splits come
        // with the lazy interiors in F1+).
        manualChunks: {
          firebase: ['firebase/app', 'firebase/auth'],
          pixi: ['pixi.js'],
          vendor: [
            'react',
            'react-dom',
            'zustand',
            '@tanstack/react-query',
            'zod',
            'framer-motion',
          ],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./tests/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'tests/unit/**/*.test.{ts,tsx}'],
    css: false,
  },
});
