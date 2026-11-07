import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { GeoJSONSource, MapGeoJSONFeature, StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
// MapLibre 6 runs its tile work in a separate worker file; tell it where the bundler put that file.
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import type { FeatureCollection } from 'geojson';
import type { BorderProps, Snapshot } from '../lib/borders';
import { EVENT_TYPES, PERSON_ROLES, ROUTE_KINDS, formatYear } from '../lib/data';
import type { HistoryEvent, HistoryRoute, Person, PolitySummary, RouteKind } from '../types';

maplibregl.setWorkerUrl(new URL(workerUrl, window.location.href).href);

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
  routes: HistoryRoute[];
  selectedRouteId: string | null;
  onSelectBorder: (props: BorderProps | null) => void;
  onSelectEvent: (id: string) => void;
  onSelectRoute: (id: string) => void;
  people: Person[];
  selectedPersonId: string | null;
  onSelectPerson: (id: string) => void;
  /** Small countries drawn as dots (see Polity.mapDot). */
  dots: PolitySummary[];
}

const routeLayers = (Object.keys(ROUTE_KINDS) as RouteKind[]).map(
  (k) =>
    ({
      id: `routes-${k}`,
      type: 'line',
      source: 'routes',
      filter: ['==', ['get', 'kind'], k],
      layout: { 'line-cap': k === 'migration' ? 'round' : 'butt', 'line-join': 'round' },
      paint: {
        'line-color': ROUTE_KINDS[k].color,
        'line-width': ['interpolate', ['linear'], ['zoom'], 1, ['case', ['get', 'selected'], 3.5, 2.2], 6, ['case', ['get', 'selected'], 5, 3]],
        'line-opacity': ['case', ['get', 'dim'], 0.35, 0.95],
        ...(ROUTE_KINDS[k].dash ? { 'line-dasharray': ROUTE_KINDS[k].dash } : {}),
      },
    }) as maplibregl.LayerSpecification,
);

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
  // Label font served from public/fonts (downloaded by `npm run fetch-glyphs`).
  // MapLibre needs an absolute URL; build it by hand so {fontstack}/{range} stay unescaped.
  glyphs: `${window.location.origin}${new URL(BASE, window.location.href).pathname}fonts/{fontstack}/{range}.pbf`,
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
    routes: { type: 'geojson', data: EMPTY },
    dots: { type: 'geojson', data: EMPTY },
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
    // Countries too small for the border maps (entries with mapDot): a dot at the capital.
    {
      id: 'dots',
      type: 'circle',
      source: 'dots',
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 1, 3.5, 6, 6],
        'circle-color': ['get', 'color'],
        'circle-stroke-color': ['case', ['get', 'selected'], '#ffd166', '#f8f0dc'],
        'circle-stroke-width': ['case', ['get', 'selected'], 2.5, 1.4],
        'circle-pitch-alignment': 'map',
      },
    },
    {
      id: 'dots-label',
      type: 'symbol',
      source: 'dots',
      minzoom: 3,
      layout: {
        'text-field': ['get', 'name'],
        'text-font': ['Open Sans Semibold'],
        'text-size': 11,
        'text-offset': [0, 1.1],
        'text-anchor': 'top',
        'text-max-width': 8,
        'text-optional': true,
      },
      paint: { 'text-color': '#2a1d0e', 'text-halo-color': 'rgba(248,240,220,0.85)', 'text-halo-width': 1.4 },
    },
    {
      id: 'dots-hit',
      type: 'circle',
      source: 'dots',
      paint: { 'circle-radius': 12, 'circle-color': '#000', 'circle-opacity': 0, 'circle-pitch-alignment': 'map' },
    },
    {
      id: 'routes-casing',
      type: 'line',
      source: 'routes',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': '#0d1526', 'line-width': ['interpolate', ['linear'], ['zoom'], 1, 4, 6, 6], 'line-opacity': ['case', ['get', 'dim'], 0.2, 0.55] },
    },
    ...routeLayers,
    {
      id: 'routes-hit',
      type: 'line',
      source: 'routes',
      paint: { 'line-color': '#000', 'line-width': 16, 'line-opacity': 0 },
    },
    {
      id: 'routes-label',
      type: 'symbol',
      source: 'routes',
      minzoom: 1.2,
      layout: {
        'symbol-placement': 'line',
        'text-field': ['get', 'name'],
        'text-font': ['Open Sans Semibold'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 1, 10, 6, 13],
        'symbol-spacing': 500,
        'text-max-angle': 30,
        'text-offset': [0, -0.9],
      },
      paint: { 'text-color': '#f4ecd8', 'text-halo-color': 'rgba(13,21,38,0.9)', 'text-halo-width': 1.6, 'text-opacity': ['case', ['get', 'dim'], 0.5, 1] },
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

// ── Declutter helpers ─────────────────────────────────────
type Rect = { x: number; y: number; w: number; h: number };
const overlaps = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

type MarkerEntry = { marker: maplibregl.Marker; el: HTMLButtonElement };

function declutter(
  map: maplibregl.Map,
  personMarkers: Map<string, MarkerEntry & { fullW?: number; narrow?: boolean }>,
  people: Person[],
  sel: { selectedPersonId: string | null; selectedPolityId: string | null },
) {
  const covered = (el: HTMLElement) => el.classList.contains('maplibregl-marker-covered');
  const placed: Rect[] = []; // people already shown
  const narrow = window.matchMedia('(max-width: 640px)').matches; // phones show icons only (index.css)

  // People: selected first, then those linked to the selected civilisation; a name shows only where it fits.
  const rank = (p: Person) => (p.id === sel.selectedPersonId ? 2 : sel.selectedPolityId && p.polityIds.includes(sel.selectedPolityId) ? 1 : 0);
  for (const p of [...people].sort((a, b) => rank(b) - rank(a))) {
    const entry = personMarkers.get(p.id);
    if (!entry || covered(entry.el)) continue;
    if (entry.fullW === undefined || entry.narrow !== narrow) {
      entry.el.classList.remove('name-hidden', 'no-room');
      entry.fullW = entry.el.offsetWidth || 24;
      entry.narrow = narrow;
    }
    const { x, y } = map.project(p.place as [number, number]);
    const full: Rect = { x: x + 6, y: y - 12, w: entry.fullW, h: 24 };
    const icon: Rect = { x: x + 6, y: y - 12, w: 24, h: 24 };
    const must = rank(p) === 2;
    if (must || !placed.some((r) => overlaps(r, full))) {
      entry.el.classList.remove('name-hidden', 'no-room');
      placed.push(full);
    } else if (!placed.some((r) => overlaps(r, icon))) {
      entry.el.classList.add('name-hidden');
      entry.el.classList.remove('no-room');
      placed.push(icon);
    } else {
      entry.el.classList.add('no-room');
    }
  }
}

export default function MapView({
  snapshot,
  selectedPolityId,
  events,
  selectedEventId,
  camera,
  onSelectBorder,
  onSelectEvent,
  routes,
  selectedRouteId,
  onSelectRoute,
  people,
  selectedPersonId,
  onSelectPerson,
  dots,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [ready, setReady] = useState(false);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string; sub?: string } | null>(null);
  const markersRef = useRef(new Map<string, { marker: maplibregl.Marker; el: HTMLButtonElement }>());
  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;
  const handlersRef = useRef({ onSelectBorder, onSelectEvent, onSelectRoute, onSelectPerson });
  handlersRef.current = { onSelectBorder, onSelectEvent, onSelectRoute, onSelectPerson };
  const peopleMarkersRef = useRef(new Map<string, { marker: maplibregl.Marker; el: HTMLButtonElement }>());
  const routesRef = useRef(routes);
  routesRef.current = routes;
  // Declutter state: what is on the map and what to prioritise.
  const peopleRef = useRef(people);
  peopleRef.current = people;
  const selectionRef = useRef({ selectedPersonId, selectedPolityId });
  selectionRef.current = { selectedPersonId, selectedPolityId };
  const declutterRef = useRef<() => void>(() => {});

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

    let overRoute = false;
    map.on('mousemove', 'routes-hit', (e) => {
      const f = e.features?.[0];
      const r = f && routesRef.current.find((x) => x.id === f.properties?.id);
      if (!r) return;
      overRoute = true;
      map.getCanvas().style.cursor = 'pointer';
      clearHover();
      setTooltip({ x: e.point.x, y: e.point.y, text: r.name, sub: `${ROUTE_KINDS[r.kind].label} · ${formatYear(r.from)} – ${formatYear(r.to)} · click for details` });
    });
    map.on('mouseleave', 'routes-hit', () => {
      overRoute = false;
      map.getCanvas().style.cursor = '';
      setTooltip(null);
    });
    let overDot = false;
    map.on('mousemove', 'dots-hit', (e) => {
      const f = e.features?.[0];
      if (!f || overRoute) return;
      overDot = true;
      map.getCanvas().style.cursor = 'pointer';
      clearHover();
      setTooltip({ x: e.point.x, y: e.point.y, text: String(f.properties?.name ?? ''), sub: 'click for checklist' });
    });
    map.on('mouseleave', 'dots-hit', () => {
      overDot = false;
      map.getCanvas().style.cursor = '';
      setTooltip(null);
    });
    map.on('mousemove', 'borders-fill', (e) => {
      const f = e.features?.[0] as MapGeoJSONFeature | undefined;
      if (!f || overRoute || overDot) return;
      map.getCanvas().style.cursor = 'pointer';
      if (hoverId !== f.id) {
        clearHover();
        hoverId = f.id as number;
        map.setFeatureState({ source: 'borders', id: hoverId }, { hover: true });
      }
      const p = snapshotRef.current?.byFid.get(f.id as number) ?? (f.properties as unknown as BorderProps);
      const sub = p.SUBJECTO && p.SUBJECTO !== p.NAME ? `under ${p.SUBJECTO}` : undefined;
      setTooltip({ x: e.point.x, y: e.point.y, text: p.NAME ?? 'Unnamed', sub: p._linked ? `${sub ? sub + ' · ' : ''}click for checklist` : sub });
    });
    map.on('mouseleave', 'borders-fill', () => {
      map.getCanvas().style.cursor = '';
      clearHover();
      setTooltip(null);
    });
    map.on('click', (e) => {
      const route = map.queryRenderedFeatures(e.point, { layers: ['routes-hit'] })[0];
      if (route?.properties?.id) {
        handlersRef.current.onSelectRoute(String(route.properties.id));
        return;
      }
      const dot = map.queryRenderedFeatures(e.point, { layers: ['dots-hit'] })[0];
      if (dot?.properties?.id) {
        const id = String(dot.properties.id);
        handlersRef.current.onSelectBorder({ NAME: String(dot.properties.name), _pids: `|${id}|`, _color: String(dot.properties.color), _linked: 1, _fid: -1 });
        return;
      }
      const f = map.queryRenderedFeatures(e.point, { layers: ['borders-fill'] })[0];
      const props = f ? (snapshotRef.current?.byFid.get(f.id as number) ?? (f.properties as unknown as BorderProps)) : null;
      handlersRef.current.onSelectBorder(props);
    });
    map.on('movestart', () => setTooltip(null));
    map.on('moveend', () => declutterRef.current());
    map.on('resize', () => declutterRef.current());

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

  // ── Routes ───────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const fc: FeatureCollection = {
      type: 'FeatureCollection',
      features: routes.map((r) => ({
        type: 'Feature',
        properties: { id: r.id, name: r.name, kind: r.kind, selected: r.id === selectedRouteId, dim: !!selectedRouteId && r.id !== selectedRouteId },
        geometry: { type: 'MultiLineString', coordinates: r.paths },
      })),
    };
    (map.getSource('routes') as GeoJSONSource | undefined)?.setData(fc);
  }, [routes, selectedRouteId, ready]);

  // ── Small-country dots ───────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const fc: FeatureCollection = {
      type: 'FeatureCollection',
      features: dots
        .filter((p) => p.capitalCoords)
        .map((p) => ({
          type: 'Feature',
          properties: { id: p.id, name: p.name, color: p.color, selected: p.id === selectedPolityId },
          geometry: { type: 'Point', coordinates: p.capitalCoords as [number, number] },
        })),
    };
    (map.getSource('dots') as GeoJSONSource | undefined)?.setData(fc);
  }, [dots, selectedPolityId, ready]);

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
        const when = formatYear(event.year, event.yearApproximate);
        el.setAttribute('aria-label', `${when}: ${event.title}`);
        el.title = `${when} · ${event.title}`;
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
    declutterRef.current();
  }, [events, selectedEventId, ready]);

  // ── People markers ───────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const current = peopleMarkersRef.current;
    const wanted = new Set(people.map((p) => p.id));
    for (const [id, { marker }] of current) {
      if (!wanted.has(id)) {
        marker.remove();
        current.delete(id);
      }
    }
    for (const person of people) {
      let entry = current.get(person.id);
      if (!entry) {
        const el = document.createElement('button');
        el.type = 'button';
        el.className = 'person-marker';
        const icon = document.createElement('span');
        icon.setAttribute('aria-hidden', 'true');
        icon.textContent = PERSON_ROLES[person.role].icon;
        const label = document.createElement('span');
        label.className = 'person-name';
        label.textContent = person.name; // textContent: names are data, never HTML
        el.append(icon, label);
        el.setAttribute('aria-label', `${person.name}, ${PERSON_ROLES[person.role].label}`);
        el.addEventListener('click', (ev) => {
          ev.stopPropagation();
          handlersRef.current.onSelectPerson(person.id);
        });
        const marker = new maplibregl.Marker({ element: el, anchor: 'left', opacityWhenCovered: '0', offset: [6, 0] }).setLngLat(person.place).addTo(map);
        entry = { marker, el };
        current.set(person.id, entry);
      }
      entry.el.classList.toggle('is-selected', person.id === selectedPersonId);
    }
    declutterRef.current();
  }, [people, selectedPersonId, selectedPolityId, ready]);

  // ── Declutter: give people names only where they fit ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    let frame = 0;
    const run = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() =>
        declutter(map, peopleMarkersRef.current, peopleRef.current, selectionRef.current),
      );
    };
    declutterRef.current = run;
    run();
    return () => cancelAnimationFrame(frame);
  }, [ready]);

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
