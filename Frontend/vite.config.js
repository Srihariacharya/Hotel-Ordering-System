import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/menu': 'http://localhost:5000',
      '/auth': 'http://localhost:5000',
       '/order': 'http://localhost:5000',
    },
  },
});
