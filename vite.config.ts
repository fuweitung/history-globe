import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { normaliseChecklist, overallCompletion } from './src/lib/checklistSchema';

const POLITY_DIR = resolve(__dirname, 'src/data/polities');
const INDEX_ID = 'virtual:polity-index';
const RESOLVED_INDEX_ID = '\0' + INDEX_ID;

/**
 * `virtual:polity-index`: the small part of every civilisation file that the map,
 * timeline, lists and search need at startup. The full checklist of a civilisation
 * is only downloaded when its panel opens (see loadPolity in src/lib/data.ts).
 */
function polityIndex(): Plugin {
  const build = () =>
    readdirSync(POLITY_DIR)
      .filter((f) => f.endsWith('.json'))
      .sort()
      .map((f) => {
        const { checklist, series, ...rest } = JSON.parse(readFileSync(join(POLITY_DIR, f), 'utf8'));
        const full = normaliseChecklist(checklist);
        const peak = full.riseFall.peakPeriod.year;
        return { ...rest, peakYear: typeof peak === 'number' ? peak : null, completion: overallCompletion(full) };
      });
  return {
    name: 'polity-index',
    resolveId: (id) => (id === INDEX_ID ? RESOLVED_INDEX_ID : null),
    load(id) {
      if (id !== RESOLVED_INDEX_ID) return null;
      this.addWatchFile(POLITY_DIR);
      for (const f of readdirSync(POLITY_DIR)) this.addWatchFile(join(POLITY_DIR, f));
      return `export default ${JSON.stringify(build())};`;
    },
    // In dev, editing (or adding) a civilisation file rebuilds the index.
    handleHotUpdate({ file, server }) {
      if (!file.startsWith(POLITY_DIR)) return;
      const mod = server.moduleGraph.getModuleById(RESOLVED_INDEX_ID);
      if (mod) server.moduleGraph.invalidateModule(mod);
      server.ws.send({ type: 'full-reload' });
      return [];
    },
  };
}

export default defineConfig({
  // Relative base so the built site works from any sub-folder (e.g. GitHub Pages).
  base: './',
  plugins: [polityIndex(), react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        // MapLibre is large and changes rarely; keep it in its own cacheable chunk.
        // Each civilisation file becomes its own small chunk, loaded on demand.
        manualChunks(id) {
          if (id.includes('node_modules/maplibre-gl')) return 'maplibre';
        },
      },
    },
    // MapLibre alone is ~1 MB minified (~280 kB gzipped); everything else is well below this.
    chunkSizeWarningLimit: 1100,
  },
});
