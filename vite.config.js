// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react')) return 'react-vendor';
            if (id.includes('chart')) return 'chart-vendor';
            if (id.includes('lodash')) return 'lodash-vendor';
            return 'vendor'; // All other node_modules
          }
        },
      },
    },
  },
});