import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load environment variables
  const env = loadEnv(mode, process.cwd(), '');
  const BACKEND_URL = env.VITE_API_BASE_URL || env.VITE_API_URL || 'http://localhost:5000';

  return {
    plugins: [react()],
    server: {
      host: true, // allow access from other devices on the network (optional)
      port: 5173,
      strictPort: true,
      proxy: {
        '/auth': {
          target: BACKEND_URL,
          changeOrigin: true,
          secure: false,
        },
        '/menu': {
          target: BACKEND_URL,
          changeOrigin: true,
          secure: false,
        },
        '/order': {
          target: BACKEND_URL,
          changeOrigin: true,
          secure: false,
        },
      },
      fs: { allow: ['..'] }, // prevent outside access errors
    },
    preview: {
      host: true,
      port: 4173,
      strictPort: true,
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    },
    appType: 'spa', // ensures SPA fallback for React Router
  };
});
