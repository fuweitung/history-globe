import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // Relative base so the built site works from any sub-folder (e.g. GitHub Pages).
  base: './',
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        // MapLibre is large and changes rarely; the history data changes often.
        // Separate chunks keep each one cacheable and under the size limit.
        manualChunks(id) {
          if (id.includes('node_modules/maplibre-gl')) return 'maplibre';
          if (id.includes('/src/data/')) return 'history-data';
        },
      },
    },
    // The history data chunk is ~1.5 MB raw (~370 kB gzipped).
    chunkSizeWarningLimit: 1600,
  },
});
