import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Mọi request /api được chuyển sang backend (cổng 5000) nên không cần cấu hình CORS khi dev
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { '/api': process.env.API_PROXY_TARGET || 'http://localhost:5000' } },
});
