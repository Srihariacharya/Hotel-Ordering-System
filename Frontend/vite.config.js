// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000, // default port for Vite
    proxy: {
      // forward these prefixes to the Express backend
      '/auth':  'http://localhost:5000',
      '/menu':  'http://localhost:5000',
      '/order': 'http://localhost:5000',
    },
  },
});
