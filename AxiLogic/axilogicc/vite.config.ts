import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: { port: 5173, host: true },
  build: {
    // The Firestore SDK is ~158 kB gzipped and is needed before first paint
    // for the auth profile read, so it cannot be deferred. Rollup measures
    // uncompressed size, so the default 500 kB limit fires on a chunk that
    // is already split deliberately.
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        // Floor tablets often sit on weak connections, so the shell should
        // paint without waiting for the whole Firebase SDK. These split on
        // change frequency too — app code churns, vendor code does not, so
        // a redeploy only invalidates the small chunk.
        manualChunks: {
          'firebase-app': ['firebase/app', 'firebase/auth'],
          'firebase-firestore': ['firebase/firestore'],
          react: ['react', 'react-dom', 'react-router-dom'],
          // Only loaded when someone opens the print preview, so it stays
          // out of the path to first paint on a scanning terminal.
          barcode: ['jsbarcode'],
        },
      },
    },
  },
});
