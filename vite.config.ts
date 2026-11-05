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
        // MapLibre is large and changes rarely: give it its own cacheable chunk.
        manualChunks: { maplibre: ['maplibre-gl'] },
      },
    },
    chunkSizeWarningLimit: 1100,
  },
});
