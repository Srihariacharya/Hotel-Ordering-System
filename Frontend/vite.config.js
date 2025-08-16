import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173, // Default dev server port
    proxy: {
      '/auth': 'http://localhost:5000',
      '/menu': 'http://localhost:5000',
      '/order': 'http://localhost:5000',
    },
    fs: {
      allow: ['..'], // prevent outside access error
    },
  },
  // 👇 Important for React Router (SPA Fallback)
  preview: {
    port: 4173,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  // 👇 This ensures SPA fallback in Vite preview & Netlify/Vercel
  appType: 'spa',
});
