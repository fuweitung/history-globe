import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { normaliseChecklist, overallCompletion } from './src/lib/checklistSchema';

const DATA_DIR = resolve(__dirname, 'src/data');
const POLITY_DIR = join(DATA_DIR, 'polities');
const readJson = (path: string) => JSON.parse(readFileSync(path, 'utf8'));
const pick = (o: Record<string, unknown>, keys: string[]) => Object.fromEntries(keys.filter((k) => o[k] !== undefined).map((k) => [k, o[k]]));

/**
 * Small startup indexes, so the map, timeline, lists and search titles work
 * before the long texts arrive. The full files are loaded on demand
 * (loadPolity, loadEventDetails, loadPeopleDetails in src/lib/data.ts).
 *
 * - `virtual:polity-index`: every civilisation without its checklist, series,
 *   summary or known-for notes; plus peakYear and completion
 * - `virtual:event-index`: events without description and source
 * - `virtual:person-index`: people without description, wikiTitle, source, image
 */
const INDEXES: Record<string, { files: () => string[]; build: () => unknown }> = {
  'virtual:polity-index': {
    files: () => readdirSync(POLITY_DIR).filter((f) => f.endsWith('.json')).map((f) => join(POLITY_DIR, f)),
    build: () =>
      readdirSync(POLITY_DIR)
        .filter((f) => f.endsWith('.json'))
        .sort()
        .map((f) => {
          const { checklist, series, summary, knownFor, ...rest } = readJson(join(POLITY_DIR, f));
          const full = normaliseChecklist(checklist);
          const peak = full.riseFall.peakPeriod.year;
          return {
            ...rest,
            ...(knownFor ? { knownFor: knownFor.map((k: Record<string, unknown>) => pick(k, ['label', 'kind', 'year'])) } : {}),
            peakYear: typeof peak === 'number' ? peak : null,
            completion: overallCompletion(full),
          };
        }),
  },
  'virtual:event-index': {
    files: () => [join(DATA_DIR, 'events.json')],
    build: () =>
      readJson(join(DATA_DIR, 'events.json')).map((e: Record<string, unknown>) =>
        pick(e, ['id', 'year', 'endYear', 'yearApproximate', 'lat', 'lng', 'type', 'title', 'relatedPolityIds']),
      ),
  },
  'virtual:person-index': {
    files: () => [join(DATA_DIR, 'people.json')],
    build: () =>
      readJson(join(DATA_DIR, 'people.json')).map((p: Record<string, unknown>) =>
        pick(p, ['id', 'name', 'born', 'died', 'datesApproximate', 'role', 'polityIds', 'place']),
      ),
  },
};

function dataIndexes(): Plugin {
  const watched = (file: string) => file.startsWith(POLITY_DIR) || file.endsWith('/events.json') || file.endsWith('/people.json');
  return {
    name: 'data-indexes',
    resolveId: (id) => (id in INDEXES ? '\0' + id : null),
    load(id) {
      const index = id.startsWith('\0') ? INDEXES[id.slice(1)] : undefined;
      if (!index) return null;
      // Watch each file (not a folder: in dev, Vite treats watched paths as imports
      // and a folder cannot be resolved). New files are picked up by handleHotUpdate below.
      for (const f of index.files()) this.addWatchFile(f);
      return `export default ${JSON.stringify(index.build())};`;
    },
    // In dev, editing (or adding) a data file rebuilds the indexes.
    handleHotUpdate({ file, server }) {
      if (!watched(file)) return;
      for (const id of Object.keys(INDEXES)) {
        const mod = server.moduleGraph.getModuleById('\0' + id);
        if (mod) server.moduleGraph.invalidateModule(mod);
      }
      server.ws.send({ type: 'full-reload' });
      return [];
    },
  };
}

export default defineConfig({
  // Relative base so the built site works from any sub-folder (e.g. GitHub Pages).
  base: './',
  plugins: [dataIndexes(), react(), tailwindcss()],
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
