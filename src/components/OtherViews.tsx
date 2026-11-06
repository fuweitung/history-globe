import { useMemo, useState } from 'react';
import { overallCompletion } from '../lib/checklistSchema';
import { ERAS, EVENT_TYPES, POLITIES, POLITY_BY_ID, ROUTE_KINDS, formatSpan, formatYear, isActive } from '../lib/data';
import type { BorderProps } from '../lib/borders';
import type { HistoryEvent, HistoryRoute } from '../types';
import { ProgressBar } from './ChecklistCategory';
import { norm } from '../lib/search';

// ── Route detail ─────────────────────────────────────────────

export function RouteDetail({
  route,
  year,
  onOpenPolity,
  onJumpToYear,
}: {
  route: HistoryRoute;
  year: number;
  onOpenPolity: (id: string) => void;
  onJumpToYear: (y: number) => void;
}) {
  const k = ROUTE_KINDS[route.kind];
  const active = year >= route.from && year <= route.to;
  return (
    <div className="px-5 pt-4 pb-8 md:pt-5">
      <div className="flex items-center gap-2 pr-10">
        <svg width="34" height="8" aria-hidden="true">
          <line x1="1" y1="4" x2="33" y2="4" stroke={k.color} strokeWidth="3" strokeDasharray={k.dash ? k.dash.map((d) => d * 3).join(' ') : undefined} strokeLinecap={route.kind === 'migration' ? 'round' : 'butt'} />
        </svg>
        <span className="text-[11px] font-semibold tracking-wider text-parchment-200 uppercase">{k.label}</span>
      </div>
      <h2 className="font-display mt-3 text-2xl leading-tight font-bold text-parchment-50">{route.name}</h2>
      <p className="mt-1 text-sm text-parchment-300 tabular-nums">
        {route.datesApproximate ? 'c. ' : ''}
        {formatYear(route.from)} – {formatYear(route.to)}
        {!active && <span className="ml-2 text-xs text-parchment-400">(not in use in {formatYear(year)})</span>}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => onJumpToYear(route.from)} className="rounded-full bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-parchment-100 ring-1 ring-white/10 hover:bg-white/10">
          ⏮ Start · {formatYear(route.from)}
        </button>
        <button type="button" onClick={() => onJumpToYear(route.to)} className="rounded-full bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-parchment-100 ring-1 ring-white/10 hover:bg-white/10">
          ⏭ End · {formatYear(route.to)}
        </button>
      </div>
      <p className="mt-4 text-[13px] leading-relaxed text-parchment-100">{route.description}</p>
      {route.goods && (
        <p className="mt-3 text-[13px] text-parchment-200">
          <span className="font-semibold text-parchment-50">What moved: </span>
          {route.goods}
        </p>
      )}
      {route.relatedPolityIds.length > 0 && (
        <>
          <h3 className="mt-5 text-[11px] font-semibold tracking-wider text-parchment-300 uppercase">Civilisations involved</h3>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {route.relatedPolityIds.map((id) => {
              const p = POLITY_BY_ID.get(id);
              return p ? (
                <button key={id} type="button" onClick={() => onOpenPolity(id)} className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-2.5 py-1 text-xs text-parchment-100 ring-1 ring-white/10 hover:bg-white/10">
                  <span className="size-2 rounded-full" style={{ background: p.color ?? '#c9844f' }} aria-hidden="true" />
                  {p.name}
                </button>
              ) : null;
            })}
          </div>
        </>
      )}
      <p className="mt-5 text-[11px] text-parchment-400">Source: {route.source}. Lines show the general direction of travel through key places, not exact paths.</p>
    </div>
  );
}

// ── Event detail ─────────────────────────────────────────────

export function EventDetail({
  event,
  onOpenPolity,
  onJumpToYear,
}: {
  event: HistoryEvent;
  onOpenPolity: (id: string) => void;
  onJumpToYear: (y: number) => void;
}) {
  const t = EVENT_TYPES[event.type];
  return (
    <div className="px-5 pt-4 pb-8 md:pt-5">
      <div className="flex items-center gap-2 pr-10">
        <span className="grid size-7 place-items-center rounded-full text-sm text-white ring-2 ring-white/80" style={{ background: t.color }} aria-hidden="true">
          {t.glyph}
        </span>
        <span className="text-[11px] font-semibold tracking-wider uppercase" style={{ color: t.color }}>
          {t.label}
        </span>
      </div>
      <h2 className="font-display mt-3 text-2xl leading-tight font-bold text-parchment-50">{event.title}</h2>
      <button
        type="button"
        onClick={() => onJumpToYear(event.year)}
        className="mt-1 text-sm font-semibold text-gold-300 tabular-nums hover:underline"
        title="Move the timeline to this year"
      >
        {formatYear(event.year, event.yearApproximate)}
        {event.endYear ? ` – ${formatYear(event.endYear)}` : ''}
      </button>
      {event.yearApproximate && <p className="mt-1 text-[11px] text-warn">≈ Date is approximate.</p>}
      <p className="mt-4 text-[14px] leading-relaxed text-parchment-100">{event.description}</p>
      <p className="mt-3 text-[11px] text-parchment-400 tabular-nums">
        Location: {event.lat.toFixed(2)}°, {event.lng.toFixed(2)}°
      </p>
      {event.source && <p className="mt-1 text-[11px] leading-snug text-parchment-400">Source: {event.source}</p>}

      {event.relatedPolityIds.length > 0 && (
        <div className="mt-5">
          <h3 className="text-[11px] font-semibold tracking-wider text-parchment-300 uppercase">Civilisations involved</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {event.relatedPolityIds.map((id) => {
              const p = POLITY_BY_ID.get(id);
              if (!p) return null;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onOpenPolity(id)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-ink-700/80 px-3 py-1.5 text-xs font-semibold text-parchment-100 ring-1 ring-white/10 transition hover:bg-gold-400 hover:text-ink-900"
                >
                  <span className="size-2 rounded-full" style={{ background: p.color ?? '#c9844f' }} aria-hidden="true" />
                  {p.name}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Unlinked region ──────────────────────────────────────────

export function RegionDetail({ props, snapshotYear }: { props: BorderProps; snapshotYear: number | null }) {
  return (
    <div className="px-5 pt-4 pb-8 md:pt-5">
      <span className="text-[11px] font-semibold tracking-wider text-parchment-400 uppercase">Region on the {snapshotYear ?? ''} map</span>
      <h2 className="font-display mt-2 pr-10 text-2xl font-bold text-parchment-50">{props.NAME ?? 'Unnamed area'}</h2>
      {props.SUBJECTO && props.SUBJECTO !== props.NAME && (
        <p className="mt-1 text-sm text-parchment-300">Under the control of: {props.SUBJECTO}</p>
      )}
      {props.PARTOF && props.PARTOF !== props.NAME && props.PARTOF !== props.SUBJECTO && (
        <p className="mt-1 text-sm text-parchment-300">Part of: {props.PARTOF}</p>
      )}
      {props.BORDERPRECISION !== null && props.BORDERPRECISION !== undefined && (
        <p className="mt-3 text-xs text-parchment-400">
          Border precision: {props.BORDERPRECISION === 1 ? 'approximate' : props.BORDERPRECISION === 2 ? 'moderately precise' : 'precise'} (per the
          historical-basemaps dataset)
        </p>
      )}
      <div className="mt-5 rounded-xl bg-white/[0.03] p-4 text-[13px] leading-relaxed text-parchment-200 ring-1 ring-white/10">
        This area isn't one of the civilisations in the study set yet. Use the <strong className="text-parchment-50">Civilisations</strong> list to
        browse the ones with checklists.
      </div>
    </div>
  );
}

// ── Civilisation browser ─────────────────────────────────────

export function PolityBrowser({ year, onOpenPolity, onCompare }: { year: number; onOpenPolity: (id: string) => void; onCompare?: () => void }) {
  const [q, setQ] = useState('');
  const [onlyActive, setOnlyActive] = useState(false);
  const filtered = useMemo(() => {
    const s = norm(q.trim());
    return POLITIES.filter(
      (p) =>
        (!s || norm([p.name, p.region, ...(p.knownFor ?? []).map((k) => k.label)].join(' ')).includes(s)) && (!onlyActive || isActive(p, year)),
    );
  }, [q, onlyActive, year]);

  const groups = ERAS.map((e) => ({
    era: e.id,
    label: `${e.label} · ${formatYear(e.from)} – ${e.id === 'modern' ? 'today' : formatYear(e.to)}`,
  }));

  return (
    <div className="pb-8">
      <div className="px-5 pt-4 md:pt-5">
        <h2 className="font-display pr-10 text-2xl font-bold text-parchment-50">Civilisations</h2>
        <p className="mt-1 text-xs text-parchment-400">
          {POLITIES.length} in the study set · tap one to open its checklist
          {onCompare && (
            <>
              {' · '}
              <button type="button" onClick={onCompare} className="font-semibold text-gold-300 hover:underline">
                ⇄ Compare two
              </button>
            </>
          )}
        </p>
        <div className="mt-3 flex gap-2">
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter by name, region or known-for…"
            className="min-w-0 flex-1 rounded-xl bg-ink-800 px-3 py-2 text-sm text-parchment-50 ring-1 ring-white/10 placeholder:text-parchment-400 focus:ring-gold-400 focus:outline-none"
            aria-label="Search civilisations"
          />
          <button
            type="button"
            onClick={() => setOnlyActive((v) => !v)}
            aria-pressed={onlyActive}
            className={`shrink-0 rounded-xl px-3 text-xs font-semibold ring-1 transition ${
              onlyActive ? 'bg-gold-400 text-ink-900 ring-gold-400' : 'bg-ink-800 text-parchment-200 ring-white/10 hover:bg-ink-700'
            }`}
          >
            In {formatYear(year)}
          </button>
        </div>
      </div>

      {groups.map((g) => {
        const list = filtered.filter((p) => p.era === g.era);
        if (!list.length) return null;
        return (
          <section key={g.era} className="mt-5">
            <h3 className="px-5 text-[11px] font-semibold tracking-wider text-parchment-300 uppercase">{g.label}</h3>
            <ul className="mt-1.5 px-2">
              {list.map((p) => {
                const c = overallCompletion(p.checklist);
                const active = isActive(p, year);
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => onOpenPolity(p.id)}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-white/5 focus-visible:bg-white/5 focus-visible:outline-none"
                    >
                      <span
                        className={`size-2.5 shrink-0 rounded-full ${active ? '' : 'opacity-30'}`}
                        style={{ background: p.color ?? '#c9844f' }}
                        aria-hidden="true"
                      />
                      <span className="min-w-0 flex-1">
                        <span className={`block truncate text-sm font-medium ${active ? 'text-parchment-50' : 'text-parchment-300'}`}>{p.name}</span>
                        <span className="block truncate text-[11px] text-parchment-400 tabular-nums">
                          {formatSpan(p)} · {p.region}
                        </span>
                      </span>
                      <span className="w-14 shrink-0 text-right">
                        <span className="block text-[10px] font-semibold text-parchment-300 tabular-nums">
                          {c.filled}/{c.total}
                        </span>
                        <ProgressBar ratio={c.ratio} className="mt-1" />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
      {!filtered.length && <p className="px-5 pt-6 text-sm text-parchment-400">No civilisations match.</p>}
    </div>
  );
}
