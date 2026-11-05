import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import MapView, { type CameraRequest, type VisibleEvent } from './components/MapView';
import TimelineSlider from './components/TimelineSlider';
import Panel from './components/Panel';
import PolityDetail from './components/PolityDetail';
import { EventDetail, PolityBrowser, RegionDetail } from './components/OtherViews';
import { boundsForPolity, loadManifest, loadSnapshot, nearestSnapshot, resolvePolity, type BorderProps, type Snapshot } from './lib/borders';
import { EVENTS, EVENT_BY_ID, EVENT_TYPES, MAX_YEAR, MIN_YEAR, POLITY_BY_ID, isActive } from './lib/data';
import type { EventType, Polity } from './types';

type View =
  | { kind: 'none' }
  | { kind: 'browser' }
  | { kind: 'about' }
  | { kind: 'polity'; id: string }
  | { kind: 'event'; id: string }
  | { kind: 'region'; props: BorderProps };

const clampYear = (y: number) => Math.min(MAX_YEAR, Math.max(MIN_YEAR, Math.round(y)));

function readUrl(): { year: number; polity: string | null; event: string | null } {
  const sp = new URLSearchParams(window.location.search);
  const y = Number(sp.get('year'));
  return {
    year: Number.isFinite(y) && y ? clampYear(y) : 1600,
    polity: sp.get('polity'),
    event: sp.get('event'),
  };
}

export default function App() {
  const initial = useMemo(readUrl, []);
  const [year, setYear] = useState(initial.year);
  const [snapshotYears, setSnapshotYears] = useState<number[]>([]);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [view, setView] = useState<View>(() =>
    initial.polity && POLITY_BY_ID.has(initial.polity)
      ? { kind: 'polity', id: initial.polity }
      : initial.event && EVENT_BY_ID.has(initial.event)
        ? { kind: 'event', id: initial.event }
        : { kind: 'none' },
  );
  const [playing, setPlaying] = useState(false);
  const [eventWindow, setEventWindow] = useState(25);
  const [hiddenTypes, setHiddenTypes] = useState<Set<EventType>>(new Set());
  const [camera, setCamera] = useState<CameraRequest | null>(null);
  const pendingFly = useRef<string | null>(initial.polity);
  const nonce = useRef(0);

  // ── Border manifest & snapshots ─────────────────────────
  useEffect(() => {
    loadManifest()
      .then(setSnapshotYears)
      .catch((e: Error) => {
        setLoadError(`${e.message}. Run "npm run fetch-borders" to download the border data.`);
        setLoading(false);
      });
  }, []);

  const snapYear = snapshotYears.length ? nearestSnapshot(year, snapshotYears) : null;

  useEffect(() => {
    if (snapYear === null) return;
    let cancelled = false;
    setLoading(true);
    loadSnapshot(snapYear)
      .then((s) => {
        if (cancelled) return;
        setSnapshot(s);
        setLoadError(null);
        // Warm the cache for the neighbouring snapshots so scrubbing feels instant.
        const i = snapshotYears.indexOf(snapYear);
        [snapshotYears[i - 1], snapshotYears[i + 1]].forEach((y) => y !== undefined && loadSnapshot(y).catch(() => {}));
      })
      .catch((e: Error) => !cancelled && setLoadError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [snapYear, snapshotYears]);

  // ── Camera: fly to a polity once the right snapshot is on screen ──
  const flyToPolity = useCallback((p: Polity, snap: Snapshot | null) => {
    const b = snap ? boundsForPolity(snap, p.id) : null;
    nonce.current += 1;
    if (b && b[2] - b[0] < 150) setCamera({ kind: 'bounds', bounds: b, nonce: nonce.current });
    else if (p.capitalCoords) setCamera({ kind: 'point', center: p.capitalCoords, zoom: 3, nonce: nonce.current });
    else if (b) setCamera({ kind: 'bounds', bounds: b, nonce: nonce.current });
  }, []);

  useEffect(() => {
    if (!pendingFly.current || !snapshot || snapshot.year !== snapYear) return;
    const p = POLITY_BY_ID.get(pendingFly.current);
    pendingFly.current = null;
    if (p) flyToPolity(p, snapshot);
  }, [snapshot, snapYear, flyToPolity]);

  // ── Play / pause ────────────────────────────────────────
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      setYear((y) => {
        if (y >= MAX_YEAR) {
          setPlaying(false);
          return y;
        }
        return y + 1;
      });
    }, 110);
    return () => window.clearInterval(id);
  }, [playing]);

  const togglePlay = useCallback(() => {
    setPlaying((p) => {
      if (!p && year >= MAX_YEAR) setYear(MIN_YEAR);
      return !p;
    });
  }, [year]);

  const changeYear = useCallback((y: number) => {
    setPlaying(false);
    setYear(clampYear(y));
  }, []);

  // ── Shareable URL (?year=…&polity=…) ─────────────────────
  useEffect(() => {
    const t = window.setTimeout(() => {
      const sp = new URLSearchParams();
      sp.set('year', String(year));
      if (view.kind === 'polity') sp.set('polity', view.id);
      if (view.kind === 'event') sp.set('event', view.id);
      window.history.replaceState(null, '', `${window.location.pathname}?${sp}`);
    }, 250);
    return () => window.clearTimeout(t);
  }, [year, view]);

  // ── Events visible around the selected year ─────────────
  const visibleEvents: VisibleEvent[] = useMemo(() => {
    const out: VisibleEvent[] = [];
    for (const e of EVENTS) {
      if (hiddenTypes.has(e.type)) continue;
      const end = e.endYear ?? e.year;
      const dist = year < e.year ? e.year - year : year > end ? year - end : 0;
      if (dist <= eventWindow) out.push({ event: e, weight: 1 - dist / (eventWindow + 1) });
    }
    return out;
  }, [year, eventWindow, hiddenTypes]);

  // ── Selection handlers ─────────────────────────────────
  const openPolity = useCallback(
    (id: string, opts: { fly?: boolean } = { fly: true }) => {
      const p = POLITY_BY_ID.get(id);
      if (!p) return;
      setView({ kind: 'polity', id });
      if (!opts.fly) return;
      if (!isActive(p, year)) {
        // Move the timeline into the polity's lifetime (its peak if we know it).
        const peak = p.checklist.riseFall.peakPeriod.year;
        const target = typeof peak === 'number' ? peak : Math.round((p.startYear + (p.endYear ?? MAX_YEAR)) / 2);
        pendingFly.current = id;
        changeYear(target);
      } else {
        flyToPolity(p, snapshot);
      }
    },
    [year, snapshot, changeYear, flyToPolity],
  );

  const onSelectBorder = useCallback(
    (props: BorderProps | null) => {
      if (!props) {
        setView((v) => (v.kind === 'region' || v.kind === 'polity' ? { kind: 'none' } : v));
        return;
      }
      const p = props._pids ? resolvePolity(props._pids, year) : null;
      if (p) setView({ kind: 'polity', id: p.id });
      else setView({ kind: 'region', props });
    },
    [year],
  );

  const openEvent = useCallback(
    (id: string) => {
      const e = EVENT_BY_ID.get(id);
      if (!e) return;
      setView({ kind: 'event', id });
      nonce.current += 1;
      setCamera({ kind: 'point', center: [e.lng, e.lat], zoom: 4, nonce: nonce.current });
    },
    [],
  );

  const jumpToYear = useCallback((y: number) => changeYear(y), [changeYear]);
  const closePanel = useCallback(() => setView({ kind: 'none' }), []);

  const selectedPolity = view.kind === 'polity' ? (POLITY_BY_ID.get(view.id) ?? null) : null;

  // ── Publish timeline height for the mobile bottom sheet ─
  const timelineRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = timelineRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => document.documentElement.style.setProperty('--tl-h', `${el.offsetHeight}px`));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── Panel content ───────────────────────────────────────
  let panelTitle = '';
  let panelKey = view.kind;
  let panelBody: React.ReactNode = null;
  if (view.kind === 'polity' && selectedPolity) {
    panelTitle = selectedPolity.name;
    panelKey = `polity-${selectedPolity.id}` as typeof panelKey;
    panelBody = (
      <PolityDetail
        polity={selectedPolity}
        year={year}
        onJumpToYear={jumpToYear}
        onFlyTo={() => (isActive(selectedPolity, year) ? flyToPolity(selectedPolity, snapshot) : openPolity(selectedPolity.id))}
        onOpenPolity={openPolity}
        onOpenEvent={openEvent}
      />
    );
  } else if (view.kind === 'event') {
    const e = EVENT_BY_ID.get(view.id);
    if (e) {
      panelTitle = e.title;
      panelKey = `event-${e.id}` as typeof panelKey;
      panelBody = <EventDetail event={e} onOpenPolity={openPolity} onJumpToYear={jumpToYear} />;
    }
  } else if (view.kind === 'region') {
    panelTitle = view.props.NAME ?? 'Region';
    panelKey = `region-${view.props._fid}` as typeof panelKey;
    panelBody = <RegionDetail props={view.props} snapshotYear={snapshot?.year ?? null} />;
  } else if (view.kind === 'browser') {
    panelTitle = 'Civilisations';
    panelBody = <PolityBrowser year={year} onOpenPolity={openPolity} />;
  } else if (view.kind === 'about') {
    panelTitle = 'About';
    panelBody = <About />;
  }

  return (
    <div className="relative h-full w-full overflow-clip">
      <MapView
        snapshot={snapshot}
        selectedPolityId={selectedPolity?.id ?? null}
        events={visibleEvents}
        selectedEventId={view.kind === 'event' ? view.id : null}
        camera={camera}
        onSelectBorder={onSelectBorder}
        onSelectEvent={openEvent}
      />

      {/* ── Top bar ── */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start gap-2 p-3">
        <div className="pointer-events-auto flex items-center gap-2 rounded-2xl bg-ink-900/85 py-1.5 pr-1.5 pl-3 shadow-xl ring-1 ring-white/10 backdrop-blur-md">
          <span className="text-xl" aria-hidden="true">🌍</span>
          <h1 className="font-display text-lg font-bold tracking-tight text-parchment-50">History Globe</h1>
          <button
            type="button"
            onClick={() => setView((v) => (v.kind === 'browser' ? { kind: 'none' } : { kind: 'browser' }))}
            aria-pressed={view.kind === 'browser'}
            className="ml-1 rounded-xl bg-gold-400 px-3 py-1.5 text-xs font-bold text-ink-900 transition hover:bg-gold-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-400"
          >
            Civilisations
          </button>
          <button
            type="button"
            onClick={() => setView((v) => (v.kind === 'about' ? { kind: 'none' } : { kind: 'about' }))}
            aria-label="About History Globe"
            className="grid size-8 place-items-center rounded-xl text-parchment-200 transition hover:bg-white/10"
          >
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" strokeLinecap="round" /></svg>
          </button>
        </div>
      </div>

      {/* ── Event-type legend / filter ── */}
      <EventLegend
        hidden={hiddenTypes}
        count={visibleEvents.length}
        onToggle={(t) =>
          setHiddenTypes((s) => {
            const n = new Set(s);
            if (n.has(t)) n.delete(t);
            else n.add(t);
            return n;
          })
        }
      />

      {loadError && (
        <div role="alert" className="absolute top-20 left-1/2 z-40 max-w-md -translate-x-1/2 rounded-xl bg-dispute/90 px-4 py-3 text-sm text-white shadow-xl">
          Couldn't load border data: {loadError}
        </div>
      )}

      <Panel open={view.kind !== 'none' && panelBody !== null} onClose={closePanel} contentKey={panelKey} title={panelTitle}>
        {panelBody}
      </Panel>

      {/* ── Timeline ── */}
      <div ref={timelineRef} className="pointer-events-none absolute inset-x-0 bottom-0 z-20 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-4 sm:pb-4">
        <TimelineSlider
          year={year}
          onChange={changeYear}
          snapshotYears={snapshotYears}
          snapshotYear={snapshot?.year ?? null}
          loading={loading}
          playing={playing}
          onTogglePlay={togglePlay}
          highlight={selectedPolity}
          eventWindow={eventWindow}
          onEventWindowChange={setEventWindow}
        />
      </div>
    </div>
  );
}

function EventLegend({ hidden, count, onToggle }: { hidden: Set<EventType>; count: number; onToggle: (t: EventType) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="pointer-events-none absolute top-[64px] left-3 z-10 md:top-[68px]">
      <div className="pointer-events-auto w-max rounded-2xl bg-ink-900/85 text-xs shadow-xl ring-1 ring-white/10 backdrop-blur-md">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex items-center gap-2 px-3 py-2 font-semibold text-parchment-100"
        >
          <span className="flex -space-x-1" aria-hidden="true">
            {(Object.keys(EVENT_TYPES) as EventType[]).map((t) => (
              <span key={t} className="size-2.5 rounded-full ring-1 ring-ink-900" style={{ background: EVENT_TYPES[t].color }} />
            ))}
          </span>
          Events <span className="text-parchment-400 tabular-nums">({count})</span>
          <svg viewBox="0 0 24 24" className={`size-3 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
        {open && (
          <ul className="space-y-0.5 px-1.5 pb-1.5">
            {(Object.keys(EVENT_TYPES) as EventType[]).map((t) => {
              const on = !hidden.has(t);
              return (
                <li key={t}>
                  <button
                    type="button"
                    onClick={() => onToggle(t)}
                    aria-pressed={on}
                    className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition hover:bg-white/5 ${on ? 'text-parchment-50' : 'text-parchment-400 line-through'}`}
                  >
                    <span
                      className="grid size-5 place-items-center rounded-full text-[10px] text-white ring-1 ring-white/70"
                      style={{ background: on ? EVENT_TYPES[t].color : 'transparent' }}
                      aria-hidden="true"
                    >
                      {EVENT_TYPES[t].glyph}
                    </span>
                    {EVENT_TYPES[t].label}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function About() {
  return (
    <div className="space-y-4 px-5 pt-4 pb-8 text-[13px] leading-relaxed text-parchment-200 md:pt-5">
      <h2 className="font-display pr-10 text-2xl font-bold text-parchment-50">About History Globe</h2>
      <p>
        Drag the timeline to watch borders change from 1500 to today. Click a coloured territory to open its <strong className="text-parchment-50">element checklist</strong>:
        ten categories, from geography to rise-and-fall markers, that help explain <em>why</em> civilisations rise, peak and decline.
      </p>
      <ul className="list-disc space-y-1 pl-5">
        <li><strong className="text-parchment-50">← / →</strong> move one year · <strong className="text-parchment-50">Shift</strong> + arrow moves ten · <strong className="text-parchment-50">Space</strong> plays</li>
        <li>Gold dots on the timeline mark years with real border maps; between them the nearest map is shown.</li>
        <li>Colonies and vassals take their overlord's colour, so empires read as a single block.</li>
        <li>Items marked <span className="text-warn">≈ Estimated</span> or <span className="text-dispute">Disputed</span> are approximate or debated.</li>
      </ul>
      <h3 className="pt-2 text-[11px] font-semibold tracking-wider text-parchment-300 uppercase">Data & credits</h3>
      <p>
        Historical borders: <a className="text-gold-300 underline" href="https://github.com/aourednik/historical-basemaps" target="_blank" rel="noopener">historical-basemaps</a> by
        A. Ourednik and contributors (GPL-3.0). Borders before modern times are approximations, and many pre-modern frontiers were zones rather than lines.
      </p>
      <p>Land outlines: <a className="text-gold-300 underline" href="https://www.naturalearthdata.com/" target="_blank" rel="noopener">Natural Earth</a> (public domain). Map engine: MapLibre GL JS.</p>
      <p>Figures such as populations and GDP are scholarly estimates and are labelled with their certainty and source.</p>
    </div>
  );
}
