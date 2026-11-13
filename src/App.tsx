import { reportUrl } from './lib/report';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import MapView, { type CameraRequest, type VisibleEvent } from './components/MapView';
import TimelineSlider from './components/TimelineSlider';
import Panel from './components/Panel';
import PolityDetail from './components/PolityDetail';
import { EventDetail, PersonDetail, PolityBrowser, RegionDetail, RouteDetail } from './components/OtherViews';
import SearchView from './components/SearchView';
import { StoryList, StoryPlayer } from './components/StoryView';
import CompareView, { suggestPartner } from './components/CompareView';
import { boundsForPolity, loadManifest, loadSnapshot, nearestSnapshot, resolvePolity, type BorderProps, type Snapshot } from './lib/borders';
import { EVENTS, EVENT_BY_ID, POLITIES, EVENT_TYPES, MAX_YEAR, MIN_YEAR, PEOPLE, PERSON_BY_ID, POLITY_BY_ID, ROUTES, ROUTE_BY_ID, ROUTE_KINDS, STORY_BY_ID, formatYear, isActive } from './lib/data';
import type { EventType, HistoryRoute, PolitySummary as Polity, RouteKind } from './types';
import { eventWindowFor, normaliseYear, stepYear } from './lib/timeScale';

type View =
  | { kind: 'none' }
  | { kind: 'browser' }
  | { kind: 'search' }
  | { kind: 'compare'; a: string | null; b: string | null }
  | { kind: 'about' }
  | { kind: 'polity'; id: string; focus?: string }
  | { kind: 'event'; id: string }
  | { kind: 'route'; id: string }
  | { kind: 'person'; id: string }
  | { kind: 'stories' }
  | { kind: 'story'; id: string; step: number }
  | { kind: 'region'; props: BorderProps };

const clampYear = (y: number) => normaliseYear(y);
// Stories are hidden while the new storytelling design is agreed (docs/IMPROVEMENT-PLAN.md).
// The 11 existing stories stay in src/data/stories.json; set this to true to show them again.
const STORIES_ENABLED = false;

/** [west, south, east, north] around every point of a route. */
function routeBounds(r: HistoryRoute): [number, number, number, number] {
  const pts = r.paths.flat();
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}

function readUrl(): { year: number; polity: string | null; event: string | null; route: string | null; person: string | null; story: string | null; step: number; compare: [string | null, string | null] | null } {
  const sp = new URLSearchParams(window.location.search);
  const y = Number(sp.get('year'));
  const c = sp.get('compare');
  const valid = (id: string | undefined) => (id && POLITY_BY_ID.has(id) ? id : null);
  return {
    year: Number.isFinite(y) && y ? clampYear(y) : 1600,
    polity: sp.get('polity'),
    event: sp.get('event'),
    route: sp.get('route'),
    person: sp.get('person'),
    story: sp.get('story'),
    step: Math.max(0, Number(sp.get('step')) - 1 || 0),
    compare: c !== null ? [valid(c.split(',')[0]), valid(c.split(',')[1])] : null,
  };
}

export default function App() {
  const initial = useMemo(readUrl, []);
  const [year, setYear] = useState(initial.year);
  const [snapshotYears, setSnapshotYears] = useState<number[]>([]);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [view, setView] = useState<View>(() =>
    STORIES_ENABLED && initial.story && STORY_BY_ID.has(initial.story)
      ? { kind: 'story', id: initial.story, step: Math.min(initial.step, STORY_BY_ID.get(initial.story)!.steps.length - 1) }
      : initial.compare
      ? { kind: 'compare', a: initial.compare[0], b: initial.compare[1] }
      : initial.polity && POLITY_BY_ID.has(initial.polity)
      ? { kind: 'polity', id: initial.polity }
      : initial.event && EVENT_BY_ID.has(initial.event)
        ? { kind: 'event', id: initial.event }
        : initial.route && ROUTE_BY_ID.has(initial.route)
          ? { kind: 'route', id: initial.route }
          : initial.person && PERSON_BY_ID.has(initial.person)
            ? { kind: 'person', id: initial.person }
            : { kind: 'none' },
  );
  const [playing, setPlaying] = useState(false);
  const [eventWindow, setEventWindow] = useState(25);
  const [hiddenTypes, setHiddenTypes] = useState<Set<EventType>>(new Set());
  const [showRoutes, setShowRoutes] = useState(true);
  const [showPeople, setShowPeople] = useState(true);
  const [camera, setCamera] = useState<CameraRequest | null>(null);
  const pendingFly = useRef<string | null>(initial.polity);
  const nonce = useRef(0);

  // ── Border manifest & snapshots ─────────────────────────
  useEffect(() => {
    loadManifest()
      .then((ys) => {
        setSnapshotYears(ys);
        setLoadError(null);
      })
      .catch((e: Error) => {
        console.error(e);
        setLoadError('The border maps could not be loaded.');
        setLoading(false);
      });
  }, [retryKey]);

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
      .catch((e: Error) => {
        console.error(e);
        if (!cancelled) setLoadError(`The ${formatYear(snapYear)} border map could not be loaded.`);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [snapYear, snapshotYears, retryKey]);

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
        // Older eras move in bigger steps (10 yrs ancient, 5 medieval, 1 later).
        return stepYear(y, 1);
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
      if (view.kind === 'route') sp.set('route', view.id);
      if (view.kind === 'person') sp.set('person', view.id);
      if (view.kind === 'story') {
        sp.set('story', view.id);
        sp.set('step', String(view.step + 1));
      }
      if (view.kind === 'compare') sp.set('compare', `${view.a ?? ''},${view.b ?? ''}`);
      window.history.replaceState(null, '', `${window.location.pathname}?${sp}`);
    }, 250);
    return () => window.clearTimeout(t);
  }, [year, view]);

  // ── Events visible around the selected year ─────────────
  const visibleEvents: VisibleEvent[] = useMemo(() => {
    const out: VisibleEvent[] = [];
    const window = eventWindowFor(year, eventWindow);
    for (const e of EVENTS) {
      if (hiddenTypes.has(e.type)) continue;
      const end = e.endYear ?? e.year;
      const dist = year < e.year ? e.year - year : year > end ? year - end : 0;
      if (dist <= window) out.push({ event: e, weight: 1 - dist / (window + 1) });
    }
    return out;
  }, [year, eventWindow, hiddenTypes]);

  const visibleRoutes = useMemo(
    () => (showRoutes ? ROUTES.filter((r) => year >= r.from && year <= r.to) : []),
    [year, showRoutes],
  );

  const visibleDots = useMemo(() => POLITIES.filter((p) => p.mapDot && p.capitalCoords && isActive(p, year)), [year]);
  const visiblePeople = useMemo(() => (showPeople ? PEOPLE.filter((p) => year >= p.born && year <= p.died) : []), [year, showPeople]);

  // ── Selection handlers ─────────────────────────────────
  const openPolity = useCallback(
    (id: string, opts: { fly?: boolean } = { fly: true }) => {
      const p = POLITY_BY_ID.get(id);
      if (!p) return;
      setView({ kind: 'polity', id });
      if (!opts.fly) return;
      if (!isActive(p, year)) {
        // Move the timeline into the polity's lifetime (its peak if we know it).
        const target = p.peakYear ?? Math.round((p.startYear + (p.endYear ?? MAX_YEAR)) / 2);
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
  const openPerson = useCallback((id: string) => {
    const p = PERSON_BY_ID.get(id);
    if (!p) return;
    setView({ kind: 'person', id });
    nonce.current += 1;
    setCamera({ kind: 'point', center: p.place, zoom: 4, nonce: nonce.current });
  }, []);
  const openRoute = useCallback((id: string) => {
    const r = ROUTE_BY_ID.get(id);
    if (!r) return;
    setView({ kind: 'route', id });
    nonce.current += 1;
    setCamera({ kind: 'bounds', bounds: routeBounds(r), nonce: nonce.current });
  }, []);

  // Search results: events and dated Known-for items also move the timeline.
  const openEventAt = useCallback(
    (id: string) => {
      const e = EVENT_BY_ID.get(id);
      if (e) changeYear(e.year);
      openEvent(id);
    },
    [changeYear, openEvent],
  );
  const openKnown = useCallback(
    (polityId: string, y?: number) => {
      if (y === undefined) return openPolity(polityId);
      setView({ kind: 'polity', id: polityId });
      pendingFly.current = polityId;
      changeYear(y);
    },
    [openPolity, changeYear],
  );
  const openCompare = useCallback((a: string | null) => setView({ kind: 'compare', a, b: a ? suggestPartner(a) : null }), []);

  // A shared ?route= link flies to the route on load.
  useEffect(() => {
    if (initial.route) openRoute(initial.route);
    if (initial.person) openPerson(initial.person);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Story mode: each step sets the year and moves the camera ──
  const storyStep = view.kind === 'story' ? STORY_BY_ID.get(view.id)?.steps[view.step] : undefined;
  const storyKey = view.kind === 'story' ? `${view.id}:${view.step}` : null;
  useEffect(() => {
    if (!storyStep) return;
    setPlaying(false);
    setYear(clampYear(storyStep.year));
    nonce.current += 1;
    const r = storyStep.route ? ROUTE_BY_ID.get(storyStep.route) : undefined;
    const pr = storyStep.person ? PERSON_BY_ID.get(storyStep.person) : undefined;
    const ev = storyStep.event ? EVENT_BY_ID.get(storyStep.event) : undefined;
    if (r) setCamera({ kind: 'bounds', bounds: routeBounds(r), nonce: nonce.current });
    else if (pr) setCamera({ kind: 'point', center: pr.place, zoom: 4, nonce: nonce.current });
    else if (ev) setCamera({ kind: 'point', center: [ev.lng, ev.lat], zoom: 4, nonce: nonce.current });
    else if (storyStep.polity) pendingFly.current = storyStep.polity;
    else if (storyStep.center) setCamera({ kind: 'point', center: storyStep.center, zoom: storyStep.zoom ?? 4, nonce: nonce.current });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyKey]);

  // "/" or Ctrl/⌘+K opens search from anywhere (unless typing).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target;
      const typing = t instanceof Element && !!t.closest('input, textarea, select, [contenteditable]');
      if ((e.key === '/' && !typing) || (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey))) {
        e.preventDefault();
        setView({ kind: 'search' });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const closePanel = useCallback(() => setView({ kind: 'none' }), []);

  const selectedPolity =
    storyStep?.polity
      ? (POLITY_BY_ID.get(storyStep.polity) ?? null)
      : view.kind === 'polity'
      ? (POLITY_BY_ID.get(view.id) ?? null)
      : view.kind === 'compare' && view.a
        ? (POLITY_BY_ID.get(view.a) ?? null)
        : null;

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
    const pid = selectedPolity.id;
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
        onCompare={() => openCompare(pid)}
        onOpenPerson={openPerson}
        focusCategory={view.focus}
      />
    );
  } else if (view.kind === 'event') {
    const e = EVENT_BY_ID.get(view.id);
    if (e) {
      panelTitle = e.title;
      panelKey = `event-${e.id}` as typeof panelKey;
      panelBody = <EventDetail event={e} onOpenPolity={openPolity} onJumpToYear={jumpToYear} />;
    }
  } else if (view.kind === 'stories') {
    panelTitle = 'Stories';
    panelBody = <StoryList onStart={(id) => setView({ kind: 'story', id, step: 0 })} />;
  } else if (view.kind === 'story') {
    const st = STORY_BY_ID.get(view.id);
    if (st) {
      panelTitle = st.title;
      panelKey = `story-${st.id}` as typeof panelKey;
      panelBody = (
        <StoryPlayer
          story={st}
          step={view.step}
          onStep={(n) => setView({ kind: 'story', id: st.id, step: Math.max(0, Math.min(st.steps.length - 1, n)) })}
          onExit={() => setView({ kind: 'stories' })}
          onOpenPolity={openPolity}
          onOpenEvent={openEvent}
          onOpenRoute={openRoute}
          onOpenPerson={openPerson}
        />
      );
    }
  } else if (view.kind === 'person') {
    const pr = PERSON_BY_ID.get(view.id);
    if (pr) {
      panelTitle = pr.name;
      panelKey = `person-${pr.id}` as typeof panelKey;
      panelBody = <PersonDetail person={pr} year={year} onOpenPolity={openPolity} onJumpToYear={jumpToYear} />;
    }
  } else if (view.kind === 'route') {
    const r = ROUTE_BY_ID.get(view.id);
    if (r) {
      panelTitle = r.name;
      panelKey = `route-${r.id}` as typeof panelKey;
      panelBody = <RouteDetail route={r} year={year} onOpenPolity={openPolity} onJumpToYear={jumpToYear} />;
    }
  } else if (view.kind === 'region') {
    panelTitle = view.props.NAME ?? 'Region';
    panelKey = `region-${view.props._fid}` as typeof panelKey;
    panelBody = <RegionDetail props={view.props} snapshotYear={snapshot?.year ?? null} />;
  } else if (view.kind === 'browser') {
    panelTitle = 'Civilisations';
    panelBody = <PolityBrowser year={year} onOpenPolity={openPolity} onCompare={() => setView({ kind: 'compare', a: null, b: null })} />;
  } else if (view.kind === 'search') {
    panelTitle = 'Search';
    panelBody = (
      <SearchView
        onOpenPolity={openPolity}
        onOpenFact={(id, category) => {
          openPolity(id);
          setView({ kind: 'polity', id, focus: category });
        }}
        onOpenEvent={openEventAt}
        onOpenKnown={openKnown}
        onOpenPerson={(id) => {
          const pr = PERSON_BY_ID.get(id);
          if (pr && (year < pr.born || year > pr.died)) changeYear(Math.round((pr.born + pr.died) / 2));
          openPerson(id);
        }}
        onOpenRoute={(id) => {
          const r = ROUTE_BY_ID.get(id);
          if (r && (year < r.from || year > r.to)) changeYear(Math.round((r.from + r.to) / 2));
          openRoute(id);
        }}
      />
    );
  } else if (view.kind === 'compare') {
    panelTitle = 'Compare';
    panelKey = 'compare' as typeof panelKey;
    panelBody = (
      <CompareView
        a={view.a}
        b={view.b}
        onChange={(a, b) => setView({ kind: 'compare', a, b })}
        onOpenPolity={openPolity}
        onJumpToYear={jumpToYear}
      />
    );
  } else if (view.kind === 'about') {
    panelTitle = 'About';
    panelBody = <About />;
  }

  // Tab title follows what's open, so history entries and shared tabs make sense.
  useEffect(() => {
    document.title = panelTitle ? `${panelTitle} · History Globe` : 'History Globe';
  }, [panelTitle]);

  return (
    <div className="relative h-full w-full overflow-clip">
      <MapView
        snapshot={snapshot}
        selectedPolityId={selectedPolity?.id ?? null}
        events={visibleEvents}
        selectedEventId={view.kind === 'event' ? view.id : (storyStep?.event ?? null)}
        camera={camera}
        onSelectBorder={onSelectBorder}
        onSelectEvent={openEvent}
        routes={visibleRoutes}
        selectedRouteId={view.kind === 'route' ? view.id : (storyStep?.route ?? null)}
        onSelectRoute={openRoute}
        people={visiblePeople}
        dots={visibleDots}
        selectedPersonId={view.kind === 'person' ? view.id : (storyStep?.person ?? null)}
        onSelectPerson={openPerson}
      />

      {/* ── Top bar ── */}
      <div className="pointer-events-none absolute inset-x-0 top-[var(--banner-h,0px)] z-10 flex items-start gap-2 p-3">
        <div className="pointer-events-auto flex items-center gap-2 rounded-2xl bg-ink-900/85 py-1.5 pr-1.5 pl-3 shadow-xl ring-1 ring-white/10 backdrop-blur-md">
          <span className="text-xl" aria-hidden="true">🌍</span>
          <h1 className="font-display hidden text-base font-bold tracking-tight whitespace-nowrap text-parchment-50 min-[400px]:block sm:text-lg">History Globe</h1>
          <span className="sr-only min-[400px]:hidden">History Globe</span>
          <button
            type="button"
            onClick={() => setView((v) => (v.kind === 'browser' ? { kind: 'none' } : { kind: 'browser' }))}
            aria-pressed={view.kind === 'browser'}
            className="ml-1 rounded-xl bg-gold-400 px-2.5 py-1.5 text-xs font-bold sm:px-3 text-ink-900 transition hover:bg-gold-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-400"
          >
            Civilisations
          </button>
          {STORIES_ENABLED && (
          <button
            type="button"
            onClick={() => setView((v) => (v.kind === 'stories' || v.kind === 'story' ? { kind: 'none' } : { kind: 'stories' }))}
            aria-label="Stories (guided tours)"
            aria-pressed={view.kind === 'stories' || view.kind === 'story'}
            title="Stories"
            className="grid size-8 place-items-center rounded-xl text-parchment-200 transition hover:bg-white/10 aria-pressed:bg-white/10"
          >
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" aria-hidden="true"><path d="M4 5a2 2 0 0 1 2-2h5v17H6a2 2 0 0 0-2 2zM20 5a2 2 0 0 0-2-2h-5v17h5a2 2 0 0 1 2 2z" /></svg>
          </button>
          )}
          <button
            type="button"
            onClick={() => setView((v) => (v.kind === 'search' ? { kind: 'none' } : { kind: 'search' }))}
            aria-label="Search (press /)"
            aria-pressed={view.kind === 'search'}
            title="Search (/)"
            className="grid size-8 place-items-center rounded-xl text-parchment-200 transition hover:bg-white/10 aria-pressed:bg-white/10"
          >
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></svg>
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
        showRoutes={showRoutes}
        routeCount={visibleRoutes.length}
        onToggleRoutes={() => setShowRoutes((v) => !v)}
        showPeople={showPeople}
        peopleCount={visiblePeople.length}
        onTogglePeople={() => setShowPeople((v) => !v)}
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
        <div role="alert" className="absolute top-[calc(5rem+var(--banner-h,0px))] left-1/2 z-40 max-w-md -translate-x-1/2 rounded-xl bg-dispute/90 px-4 py-3 text-sm text-white shadow-xl">
          {loadError} Check your connection and{' '}
          <button type="button" onClick={() => { setLoadError(null); setLoading(true); setRetryKey((k) => k + 1); }} className="font-semibold underline">
            try again
          </button>
          .
        </div>
      )}

      <Panel open={view.kind !== 'none' && panelBody !== null} onClose={closePanel} contentKey={panelKey} title={panelTitle} wide={view.kind === 'compare'} snapOnOpen={view.kind === 'story' ? 'half' : 'peek'}>
        {panelBody}
        {panelBody && view.kind !== 'about' && panelTitle && (
          <p className="px-5 pb-8 text-[12px] text-parchment-300">
            Found a mistake?{' '}
            <a className="text-gold-300 underline" href={reportUrl(panelTitle)} target="_blank" rel="noopener noreferrer">
              Report it
            </a>
          </p>
        )}
      </Panel>
      <BetaBanner />

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

function EventLegend({
  hidden,
  count,
  onToggle,
  showRoutes,
  routeCount,
  onToggleRoutes,
  showPeople,
  peopleCount,
  onTogglePeople,
}: {
  hidden: Set<EventType>;
  count: number;
  onToggle: (t: EventType) => void;
  showRoutes: boolean;
  routeCount: number;
  onToggleRoutes: () => void;
  showPeople: boolean;
  peopleCount: number;
  onTogglePeople: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="pointer-events-none absolute top-[calc(64px+var(--banner-h,0px))] left-3 z-10 md:top-[calc(68px+var(--banner-h,0px))]">
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
            <li className="mt-1 border-t border-white/10 pt-1">
              <button
                type="button"
                onClick={onTogglePeople}
                aria-pressed={showPeople}
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition hover:bg-white/5 ${showPeople ? 'text-parchment-50' : 'text-parchment-400 line-through'}`}
              >
                <span className="grid size-5 place-items-center text-[11px]" aria-hidden="true">👤</span>
                People alive now <span className="text-parchment-400 tabular-nums">({peopleCount})</span>
              </button>
            </li>
            <li className="border-t border-white/10 pt-1">
              <button
                type="button"
                onClick={onToggleRoutes}
                aria-pressed={showRoutes}
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition hover:bg-white/5 ${showRoutes ? 'text-parchment-50' : 'text-parchment-400 line-through'}`}
              >
                <span className="grid size-5 place-items-center text-[11px]" aria-hidden="true">🧭</span>
                Routes &amp; migrations <span className="text-parchment-400 tabular-nums">({routeCount})</span>
              </button>
              {showRoutes && (
                <ul className="mt-0.5 space-y-0.5 pl-9 text-[11px] text-parchment-300">
                  {(Object.keys(ROUTE_KINDS) as RouteKind[]).map((k) => (
                    <li key={k} className="flex items-center gap-2">
                      <svg width="26" height="6" aria-hidden="true">
                        <line x1="1" y1="3" x2="25" y2="3" stroke={ROUTE_KINDS[k].color} strokeWidth="2.5" strokeDasharray={ROUTE_KINDS[k].dash ? ROUTE_KINDS[k].dash!.map((d) => d * 2.5).join(' ') : undefined} strokeLinecap={k === 'migration' ? 'round' : 'butt'} />
                      </svg>
                      {ROUTE_KINDS[k].label}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          </ul>
        )}
      </div>
    </div>
  );
}

const BETA_KEY = 'history-globe-beta-dismissed';

function BetaBanner() {
  const [shown, setShown] = useState(() => {
    try {
      return localStorage.getItem(BETA_KEY) !== '1';
    } catch {
      return true;
    }
  });
  const ref = useRef<HTMLDivElement>(null);
  // Tell the layout how tall the banner is, so the top bar, legend, zoom buttons and panel sit below it.
  useLayoutEffect(() => {
    const root = document.documentElement;
    const el = ref.current;
    if (!shown || !el) {
      root.style.setProperty('--banner-h', '0px');
      return;
    }
    const ro = new ResizeObserver(() => root.style.setProperty('--banner-h', `${el.offsetHeight}px`));
    ro.observe(el);
    return () => {
      ro.disconnect();
      root.style.setProperty('--banner-h', '0px');
    };
  }, [shown]);
  if (!shown) return null;
  const dismiss = () => {
    setShown(false);
    try {
      localStorage.setItem(BETA_KEY, '1');
    } catch {
      /* ignore */
    }
  };
  return (
    <div ref={ref} role="note" className="absolute inset-x-0 top-0 z-30 flex items-center justify-center gap-3 bg-gold-400 px-3 py-1.5 text-[12px] leading-snug text-ink-900 shadow-md">
      <span className="text-center">
        <strong>Beta:</strong> an early version, and some facts are still being checked.{' '}
        <a className="font-semibold underline" href={reportUrl()} target="_blank" rel="noopener noreferrer">
          Report a mistake
        </a>
      </span>
      <button type="button" onClick={dismiss} aria-label="Dismiss beta notice" className="shrink-0 rounded px-1.5 text-lg leading-none hover:bg-black/10">
        ×
      </button>
    </div>
  );
}

function About() {
  return (
    <div className="space-y-4 px-5 pt-4 pb-8 text-[13px] leading-relaxed text-parchment-200 md:pt-5">
      <h2 className="font-display pr-10 text-2xl font-bold text-parchment-50">About History Globe</h2>
      <p>
        Drag the timeline to watch borders change from 3500 BCE to today, across four eras: Ancient, Medieval, Early Modern and Modern. Click a coloured territory to open its <strong className="text-parchment-50">element checklist</strong>:
        ten categories, from geography to rise-and-fall markers, that help explain <em>why</em> civilisations rise, peak and decline.
      </p>
      <ul className="list-disc space-y-1 pl-5">
        <li><strong className="text-parchment-50">← / →</strong> step (10 years in the Ancient era, 5 in the Medieval, 1 after 1500) · <strong className="text-parchment-50">Shift</strong> + arrow steps ten times · <strong className="text-parchment-50">Space</strong> plays</li>
        <li>Each era gets its own share of the timeline, so 5,500 years fit without squeezing recent centuries. BCE years count down towards 1 CE (there is no year 0).</li>
        <li>Chinese dynasties follow the <em>dynastic cycle</em>: rise, peak, decline, loss of the Mandate of Heaven, and replacement. Compare their Rise &amp; fall markers.</li>
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
      <h3 className="pt-2 text-[11px] font-semibold tracking-wider text-parchment-300 uppercase">Beta, mistakes and licence</h3>
      <p>
        This is an early version and some facts are still being checked. Spotted something wrong?{' '}
        <a className="text-gold-300 underline" href={reportUrl()} target="_blank" rel="noopener noreferrer">Report a mistake</a>.
      </p>
      <p>
        The code is open source under the GPL-3.0 licence. Written content and pictures stay under the licences of their sources, shown beside each item and picture.
      </p>
    </div>
  );
}
