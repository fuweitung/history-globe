import { useEffect, useRef, useState } from 'react';
import maplibregl, { type GeoJSONSource, type MapGeoJSONFeature, type StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { FeatureCollection } from 'geojson';
import type { BorderProps, Snapshot } from '../lib/borders';
import { EVENT_TYPES } from '../lib/data';
import type { HistoryEvent } from '../types';

const BASE = import.meta.env.BASE_URL;
const EMPTY: FeatureCollection = { type: 'FeatureCollection', features: [] };

export type CameraRequest =
  | { kind: 'bounds'; bounds: [number, number, number, number]; nonce: number }
  | { kind: 'point'; center: [number, number]; zoom: number; nonce: number };

export interface VisibleEvent {
  event: HistoryEvent;
  /** 1 = happening in the selected year, fading towards 0 at the edge of the window. */
  weight: number;
}

interface Props {
  snapshot: Snapshot | null;
  selectedPolityId: string | null;
  events: VisibleEvent[];
  selectedEventId: string | null;
  camera: CameraRequest | null;
  onSelectBorder: (props: BorderProps | null) => void;
  onSelectEvent: (id: string) => void;
}

/** 30° graticule — gives the globe a sense of shape and scale. */
function graticule(): FeatureCollection {
  const features: FeatureCollection['features'] = [];
  for (let lng = -180; lng <= 180; lng += 30) {
    const coords = [];
    for (let lat = -80; lat <= 80; lat += 5) coords.push([lng, lat]);
    features.push({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords } });
  }
  for (let lat = -60; lat <= 60; lat += 30) {
    const coords = [];
    for (let lng = -180; lng <= 180; lng += 5) coords.push([lng, lat]);
    features.push({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords } });
  }
  return { type: 'FeatureCollection', features };
}

const STYLE: StyleSpecification = {
  version: 8,
  // Globe when zoomed out, smoothly morphing to a flat (Mercator) map when zoomed in.
  projection: {
    type: ['interpolate', ['linear'], ['zoom'], 3.5, 'vertical-perspective', 5, 'mercator'],
  } as unknown as StyleSpecification['projection'],
  // Free glyphs from the MapLibre demo server (no API key).
  glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  sky: {
    'sky-color': '#0a1024',
    'horizon-color': '#24345c',
    'fog-color': '#0a1024',
    'sky-horizon-blend': 0.6,
    'horizon-fog-blend': 0.5,
    'fog-ground-blend': 0.6,
    'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 4, 1, 6, 0],
  },
  sources: {
    land: { type: 'geojson', data: `${BASE}data/land.geojson` },
    graticule: { type: 'geojson', data: graticule() },
    borders: { type: 'geojson', data: EMPTY, promoteId: '_fid' },
    labels: { type: 'geojson', data: EMPTY },
  },
  layers: [
    { id: 'ocean', type: 'background', paint: { 'background-color': '#16294a' } },
    { id: 'graticule', type: 'line', source: 'graticule', paint: { 'line-color': '#2a4170', 'line-width': 0.6 } },
    { id: 'land', type: 'fill', source: 'land', paint: { 'fill-color': '#e8dcc0' } },
    {
      id: 'borders-fill',
      type: 'fill',
      source: 'borders',
      paint: {
        'fill-color': ['get', '_color'],
        'fill-opacity': 0.55,
        'fill-opacity-transition': { duration: 300 },
      },
    },
    {
      id: 'borders-line',
      type: 'line',
      source: 'borders',
      paint: {
        'line-color': '#5b4a33',
        'line-opacity': 0.55,
        'line-width': ['interpolate', ['linear'], ['zoom'], 1, 0.3, 5, 1],
      },
    },
    {
      id: 'borders-hover',
      type: 'line',
      source: 'borders',
      paint: {
        'line-color': '#fff7e0',
        'line-width': 2,
        'line-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.9, 0],
      },
    },
    {
      id: 'borders-selected-glow',
      type: 'line',
      source: 'borders',
      filter: ['==', ['get', '_fid'], -1],
      paint: { 'line-color': '#ffd166', 'line-width': 7, 'line-opacity': 0.35, 'line-blur': 3 },
    },
    {
      id: 'borders-selected',
      type: 'line',
      source: 'borders',
      filter: ['==', ['get', '_fid'], -1],
      paint: { 'line-color': '#ffd166', 'line-width': 2.2 },
    },
    {
      id: 'labels',
      type: 'symbol',
      source: 'labels',
      layout: {
        'text-field': ['get', 'name'],
        'text-font': ['Open Sans Semibold'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 1, ['case', ['==', ['get', 'linked'], 1], 11, 9], 6, ['case', ['==', ['get', 'linked'], 1], 16, 13]],
        'text-max-width': 8,
        'text-transform': 'uppercase',
        'text-letter-spacing': 0.06,
        'symbol-sort-key': ['-', 0, ['get', 'rank']],
        'text-padding': 4,
      },
      paint: {
        'text-color': ['case', ['==', ['get', 'linked'], 1], '#2a1d0e', '#5a4a36'],
        'text-halo-color': 'rgba(248,240,220,0.85)',
        'text-halo-width': 1.4,
      },
    },
  ],
};

export default function MapView({
  snapshot,
  selectedPolityId,
  events,
  selectedEventId,
  camera,
  onSelectBorder,
  onSelectEvent,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [ready, setReady] = useState(false);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string; sub?: string } | null>(null);
  const markersRef = useRef(new Map<string, { marker: maplibregl.Marker; el: HTMLButtonElement }>());
  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;
  const handlersRef = useRef({ onSelectBorder, onSelectEvent });
  handlersRef.current = { onSelectBorder, onSelectEvent };

  // ── Create the map once ──────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE,
      center: [60, 25],
      zoom: window.innerWidth < 640 ? 0.9 : 1.6,
      minZoom: 0.5,
      maxZoom: 9,
      attributionControl: false,
      renderWorldCopies: false,
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: false, showCompass: true }), 'top-right');
    map.addControl(
      new maplibregl.AttributionControl({
        compact: true,
        customAttribution:
          'Borders: <a href="https://github.com/aourednik/historical-basemaps" target="_blank" rel="noopener">historical-basemaps</a> (GPL-3.0) · Land: <a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener">Natural Earth</a>',
      }),
      'bottom-right',
    );

    let hoverId: number | null = null;
    const clearHover = () => {
      if (hoverId !== null) map.setFeatureState({ source: 'borders', id: hoverId }, { hover: false });
      hoverId = null;
    };

    map.on('load', () => {
      if (mapRef.current === map) setReady(true);
    });

    map.on('mousemove', 'borders-fill', (e) => {
      const f = e.features?.[0] as MapGeoJSONFeature | undefined;
      if (!f) return;
      map.getCanvas().style.cursor = 'pointer';
      if (hoverId !== f.id) {
        clearHover();
        hoverId = f.id as number;
        map.setFeatureState({ source: 'borders', id: hoverId }, { hover: true });
      }
      const p = snapshotRef.current?.byFid.get(f.id as number) ?? (f.properties as unknown as BorderProps);
      const sub = p.SUBJECTO && p.SUBJECTO !== p.NAME ? `under ${p.SUBJECTO}` : undefined;
      setTooltip({ x: e.point.x, y: e.point.y, text: p.NAME ?? 'Unnamed', sub });
    });
    map.on('mouseleave', 'borders-fill', () => {
      map.getCanvas().style.cursor = '';
      clearHover();
      setTooltip(null);
    });
    map.on('click', (e) => {
      const f = map.queryRenderedFeatures(e.point, { layers: ['borders-fill'] })[0];
      const props = f ? (snapshotRef.current?.byFid.get(f.id as number) ?? (f.properties as unknown as BorderProps)) : null;
      handlersRef.current.onSelectBorder(props);
    });
    map.on('movestart', () => setTooltip(null));

    return () => {
      setReady(false);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ── Swap border snapshot ─────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !snapshot) return;
    (map.getSource('borders') as GeoJSONSource | undefined)?.setData(snapshot.borders);
    (map.getSource('labels') as GeoJSONSource | undefined)?.setData(snapshot.labels);
  }, [snapshot, ready]);

  // ── Selection highlight ──────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !map.getLayer('borders-selected')) return;
    const filter = selectedPolityId
      ? (['in', `|${selectedPolityId}|`, ['get', '_pids']] as maplibregl.FilterSpecification)
      : (['==', ['get', '_fid'], -1] as maplibregl.FilterSpecification);
    map.setFilter('borders-selected', filter);
    map.setFilter('borders-selected-glow', filter);
    map.setPaintProperty(
      'borders-fill',
      'fill-opacity',
      selectedPolityId
        ? ['case', ['in', `|${selectedPolityId}|`, ['get', '_pids']], 0.85, 0.22]
        : ['case', ['==', ['get', '_linked'], 1], 0.62, 0.42],
    );
  }, [selectedPolityId, ready]);

  // ── Event markers (HTML, so they can carry icons & focus styles) ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const current = markersRef.current;
    const wanted = new Set(events.map((v) => v.event.id));

    for (const [id, { marker }] of current) {
      if (!wanted.has(id)) {
        marker.remove();
        current.delete(id);
      }
    }
    for (const { event, weight } of events) {
      let entry = current.get(event.id);
      if (!entry) {
        const el = document.createElement('button');
        el.type = 'button';
        el.className = 'event-marker';
        const t = EVENT_TYPES[event.type];
        el.style.setProperty('--c', t.color);
        el.innerHTML = `<span class="event-dot" aria-hidden="true">${t.glyph}</span>`;
        el.setAttribute('aria-label', `${event.year}: ${event.title}`);
        el.title = `${event.year} · ${event.title}`;
        el.addEventListener('click', (ev) => {
          ev.stopPropagation();
          handlersRef.current.onSelectEvent(event.id);
        });
        const marker = new maplibregl.Marker({ element: el, opacityWhenCovered: '0' })
          .setLngLat([event.lng, event.lat])
          .addTo(map);
        entry = { marker, el };
        current.set(event.id, entry);
      }
      entry.el.style.setProperty('--w', String(0.35 + 0.65 * weight));
      entry.el.classList.toggle('is-selected', event.id === selectedEventId);
      entry.el.classList.toggle('is-now', weight > 0.95);
    }
  }, [events, selectedEventId, ready]);

  // ── Camera requests ──────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !camera) return;
    const isMobile = window.innerWidth < 768;
    const tl = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tl-h')) || 140;
    // Keep the target in the strip of map left visible between the top bar and
    // the bottom sheet (mobile, opens at 42% of the space above the timeline) or the side panel (desktop).
    const sheet = (window.innerHeight - tl) * 0.42;
    const padding = isMobile
      ? { top: 110, bottom: Math.min(tl + sheet, window.innerHeight - 220), left: 24, right: 24 }
      : { top: 90, bottom: tl + 20, left: 60, right: 480 };
    if (camera.kind === 'bounds') {
      map.fitBounds(
        [
          [camera.bounds[0], camera.bounds[1]],
          [camera.bounds[2], camera.bounds[3]],
        ],
        { padding, maxZoom: 5.5, duration: 1600 },
      );
    } else {
      map.flyTo({ center: camera.center, zoom: camera.zoom, padding, duration: 1600 });
    }
  }, [camera, ready]);

  return (
    <div className="absolute inset-0">
      {/* maplibre's CSS forces position:relative on this element, so size it explicitly */}
      <div ref={containerRef} className="h-full w-full" />
      {tooltip && (
        <div
          className="pointer-events-none absolute z-10 hidden -translate-x-1/2 -translate-y-[130%] rounded-md bg-ink-900/90 px-2.5 py-1.5 text-xs text-parchment-50 shadow-lg ring-1 ring-white/10 backdrop-blur md:block"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <div className="font-semibold">{tooltip.text}</div>
          {tooltip.sub && <div className="text-parchment-300">{tooltip.sub}</div>}
        </div>
      )}
    </div>
  );
}
