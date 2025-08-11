import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,          // changed from 3000 to 5173
    proxy: {
      '/auth':  'http://localhost:5000',
      '/menu':  'http://localhost:5000',
      '/order': 'http://localhost:5000',
    },
    fs: {
      allow: ['..'],     // prevent outside access error
    },
    // 👇 SPA fallback: VERY IMPORTANT
    historyApiFallback: true,
  },
});
