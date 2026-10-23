import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import analysisApiPlugin from './server/vitePlugin.js';

export default defineConfig({
  plugins: [react(), analysisApiPlugin()],
  server: {
    port: 5173,
    open: true,
  },
});
