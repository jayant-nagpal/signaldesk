import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('parquet-wasm')) return 'parquet-wasm';
          if (id.includes('recharts') || id.includes('d3-') || id.includes('victory-')) return 'recharts';
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) return 'react';
        },
      },
    },
  },
});
