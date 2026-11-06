import { useState } from 'react';
import { CHECKLIST_SCHEMA, getItem, isFilled, overallCompletion, type CategoryDef } from '../lib/checklistSchema';
import { ERAS, LINKS, MAX_YEAR, POLITIES, POLITY_BY_ID, formatSpan, formatYear } from '../lib/data';
import type { ChecklistItem, LinkRelation, Polity } from '../types';
import { CertaintyBadge } from './ChecklistCategory';
import { KIND_META } from './PolityDetail';
import TerritoryChart, { SERIES_COLORS, TERRITORY, axisPeople, formatPeople, populationOf } from './TerritoryChart';

interface Props {
  a: string | null;
  b: string | null;
  onChange: (a: string | null, b: string | null) => void;
  onOpenPolity: (id: string) => void;
  onJumpToYear: (y: number) => void;
}

const RELATION: Record<LinkRelation, string> = {
  succeeded: 'was succeeded by',
  conquered: 'conquered',
  colonised: 'colonised',
  traded_with: 'traded with',
  allied_with: 'was allied with',
};

const SORTED = POLITIES.slice().sort((x, y) => x.startYear - y.startYear);

/** Pick a sensible partner for a first comparison: a linked civilisation, else a contemporary in the same region. */
export function suggestPartner(id: string): string | null {
  const p = POLITY_BY_ID.get(id);
  if (!p) return null;
  const link = LINKS.find((l) => l.fromPolityId === id || l.toPolityId === id);
  if (link) return link.fromPolityId === id ? link.toPolityId : link.fromPolityId;
  const end = (q: Polity) => q.endYear ?? MAX_YEAR;
  const rival = POLITIES.find((q) => q.id !== id && q.region === p.region && q.startYear < end(p) && end(q) > p.startYear);
  return rival?.id ?? null;
}

export default function CompareView({ a, b, onChange, onOpenPolity, onJumpToYear }: Props) {
  // Compare uses two fixed, colour-blind-checked colours instead of each civilisation's map colour.
  const pa = a ? POLITY_BY_ID.get(a) : undefined;
  const pb = b ? POLITY_BY_ID.get(b) : undefined;
  const A = pa ? { ...pa, color: SERIES_COLORS[0] } : null;
  const B = pb ? { ...pb, color: SERIES_COLORS[1] } : null;

  return (
    <div className="pb-8">
      <div className="px-5 pt-4 md:pt-5">
        <h2 className="font-display pr-10 text-2xl font-bold text-parchment-50">Compare</h2>
        <p className="mt-1 text-xs text-parchment-400">Put two civilisations side by side on the same 41-element template.</p>
        <div className="mt-3 flex items-center gap-2">
          <Picker value={a} other={b} color={SERIES_COLORS[0]} onChange={(v) => onChange(v, b)} label="First civilisation" />
          <button
            type="button"
            onClick={() => onChange(b, a)}
            aria-label="Swap the two civilisations"
            className="grid size-9 shrink-0 place-items-center rounded-xl bg-ink-800 text-parchment-200 ring-1 ring-white/10 transition hover:bg-ink-700"
          >
            ⇄
          </button>
          <Picker value={b} other={a} color={SERIES_COLORS[1]} onChange={(v) => onChange(a, v)} label="Second civilisation" />
        </div>
      </div>

      {!A || !B ? (
        <p className="px-5 pt-6 text-sm text-parchment-400">Choose two civilisations above to compare them.</p>
      ) : (
        <>
          <Overview A={A} B={B} onOpenPolity={onOpenPolity} onJumpToYear={onJumpToYear} />
          <section className="mt-5 px-3">
            <div className="rounded-2xl bg-ink-800/60 ring-1 ring-white/[0.06]">
              {[...CHECKLIST_SCHEMA.filter((d) => d.key === 'riseFall'), ...CHECKLIST_SCHEMA.filter((d) => d.key !== 'riseFall')].map((def) => (
                <CompareCategory key={def.key} def={def} A={A} B={B} defaultOpen={def.key === 'riseFall'} onJumpToYear={onJumpToYear} />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function Picker({ value, other, color, onChange, label }: { value: string | null; other: string | null; color: string; onChange: (v: string | null) => void; label: string }) {
  return (
    <label className="relative min-w-0 flex-1">
      <span className="sr-only">{label}</span>
      <span className="pointer-events-none absolute top-1/2 left-3 size-2.5 -translate-y-1/2 rounded-full" style={{ background: value ? color : '#555' }} aria-hidden="true" />
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
        className="w-full appearance-none truncate rounded-xl bg-ink-800 py-2 pr-7 pl-7 text-sm text-parchment-50 ring-1 ring-white/10 focus:ring-gold-400 focus:outline-none"
      >
        <option value="">Choose…</option>
        {ERAS.map((era) => (
          <optgroup key={era.id} label={era.label}>
            {SORTED.filter((q) => q.era === era.id).map((q) => (
              <option key={q.id} value={q.id} disabled={q.id === other}>
                {q.name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <svg viewBox="0 0 24 24" className="pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 text-parchment-300" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
        <path d="M6 9l6 6 6-6" />
      </svg>
    </label>
  );
}

function Overview({ A, B, onOpenPolity, onJumpToYear }: { A: Polity; B: Polity; onOpenPolity: (id: string) => void; onJumpToYear: (y: number) => void }) {
  const endA = A.endYear ?? MAX_YEAR;
  const endB = B.endYear ?? MAX_YEAR;
  const from = Math.max(A.startYear, B.startYear);
  const to = Math.min(endA, endB);
  const overlap = to - from;
  const gap = overlap < 0 ? -overlap : 0;
  const links = LINKS.filter((l) => (l.fromPolityId === A.id && l.toPolityId === B.id) || (l.fromPolityId === B.id && l.toPolityId === A.id));

  // Shared lifespan bar
  const lo = Math.min(A.startYear, B.startYear);
  const hi = Math.max(endA, endB);
  const pct = (y: number) => ((y - lo) / Math.max(1, hi - lo)) * 100;

  return (
    <section className="mt-4 px-5">
      <div className="grid grid-cols-2 gap-2">
        {[A, B].map((p) => {
          const c = overallCompletion(p.checklist);
          const peak = p.checklist.riseFall.peakPeriod.year;
          const life = (p.endYear ?? MAX_YEAR) - p.startYear;
          return (
            <div key={p.id} className="rounded-xl bg-white/[0.04] p-3 ring-1 ring-white/[0.08]" style={{ boxShadow: `inset 3px 0 0 ${p.color ?? '#c9844f'}` }}>
              <button type="button" onClick={() => onOpenPolity(p.id)} className="text-left text-sm leading-tight font-semibold text-parchment-50 underline-offset-2 hover:underline">
                {p.name}
              </button>
              <dl className="mt-2 space-y-1 text-[11px] text-parchment-300">
                <Row k="Dates" v={formatSpan(p)} />
                <Row k="Lasted" v={`${life.toLocaleString()} years${p.endYear === null ? ' (so far)' : ''}`} />
                <Row k="Region" v={p.region} />
                <Row k="Capital" v={p.capital} />
                {typeof peak === 'number' && (
                  <Row
                    k="Peak"
                    v={
                      <button type="button" onClick={() => onJumpToYear(peak)} className="text-gold-300 hover:underline">
                        {formatYear(peak, true)}
                      </button>
                    }
                  />
                )}
                <Row k="Profile" v={`${c.filled}/${c.total} elements`} />
              </dl>
            </div>
          );
        })}
      </div>

      {/* Lifespans on one scale */}
      <div className="mt-3 rounded-xl bg-white/[0.03] px-3 py-2.5 ring-1 ring-white/[0.06]">
        {[A, B].map((p) => (
          <div key={p.id} className="relative my-1 h-2.5 rounded-full bg-white/5">
            <div
              className="absolute inset-y-0 rounded-full"
              style={{ left: `${pct(p.startYear)}%`, width: `${Math.max(1.5, pct(p.endYear ?? MAX_YEAR) - pct(p.startYear))}%`, background: p.color ?? '#c9844f' }}
              title={`${p.name}: ${formatSpan(p)}`}
            />
          </div>
        ))}
        <div className="mt-1 flex justify-between text-[10px] text-parchment-400 tabular-nums">
          <span>{formatYear(lo)}</span>
          <span>{A.endYear === null || B.endYear === null ? 'today' : formatYear(hi)}</span>
        </div>
        <p className="mt-1.5 text-xs text-parchment-200">
          {overlap >= 0 ? (
            <>
              Existed at the same time for about <strong className="text-parchment-50">{overlap.toLocaleString()} years</strong> ({formatYear(from)} – {to >= MAX_YEAR ? 'today' : formatYear(to)}).{' '}
              <button type="button" onClick={() => onJumpToYear(Math.round((from + Math.min(to, MAX_YEAR)) / 2))} className="font-semibold text-gold-300 hover:underline">
                See both on the map →
              </button>
            </>
          ) : (
            <>
              Never existed at the same time: about <strong className="text-parchment-50">{gap.toLocaleString()} years</strong> apart.
            </>
          )}
        </p>
        {links.map((l, i) => {
          const f = POLITY_BY_ID.get(l.fromPolityId)!;
          const t = POLITY_BY_ID.get(l.toPolityId)!;
          return (
            <p key={i} className="mt-1 text-xs text-parchment-200">
              🔗 {f.name} {RELATION[l.relation]} {t.name}
              {l.year !== undefined && ` (${formatYear(l.year)})`}.
            </p>
          );
        })}
      </div>

      {/* Territory */}
      <h3 className="mt-5 text-[11px] font-semibold tracking-wider text-parchment-300 uppercase">Territory on the map</h3>
      <TerritoryCompare A={A} B={B} lo={lo} hi={hi} onJumpToYear={onJumpToYear} />

      {/* Population */}
      <h3 className="mt-5 text-[11px] font-semibold tracking-wider text-parchment-300 uppercase">Population</h3>
      <PopulationCompare A={A} B={B} lo={lo} hi={hi} onJumpToYear={onJumpToYear} />

      {/* Known for */}
      <h3 className="mt-5 text-[11px] font-semibold tracking-wider text-parchment-300 uppercase">Known for</h3>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {[A, B].map((p) => (
          <ul key={p.id} className="space-y-1">
            {(p.knownFor ?? []).map((k, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs text-parchment-100" title={k.note}>
                <span aria-label={KIND_META[k.kind].label}>{KIND_META[k.kind].icon}</span>
                <span>{k.label}</span>
              </li>
            ))}
            {!p.knownFor?.length && <li className="text-xs text-parchment-400 italic">Not yet added</li>}
          </ul>
        ))}
      </div>
    </section>
  );
}

function TerritoryCompare({ A, B, lo, hi, onJumpToYear }: { A: Polity; B: Polity; lo: number; hi: number; onJumpToYear: (y: number) => void }) {
  const sA = TERRITORY[A.id] ?? [];
  const sB = TERRITORY[B.id] ?? [];
  const missing = [A, B].filter((p) => (TERRITORY[p.id] ?? []).length === 0);
  if (missing.length === 2) return <p className="mt-1.5 text-xs text-parchment-400">Neither has a shape in the border maps, so territory can’t be compared.</p>;
  const pad = Math.max(5, (hi - lo) * 0.03);
  return (
    <div className="mt-1.5">
      <TerritoryChart
        series={[
          { id: A.id, name: A.name, color: A.color!, points: sA },
          { id: B.id, name: B.name, color: B.color!, points: sB },
        ]}
        domain={[lo - pad, Math.min(hi, MAX_YEAR) + pad]}
        year={NaN}
        onJumpToYear={onJumpToYear}
        height={190}
        label={`Territory of ${A.name} and ${B.name} on the border maps`}
      />
      {missing.length === 1 && <p className="mt-1 text-[11px] text-parchment-400">{missing[0].name} has no shape in the border maps, so only {missing[0].id === A.id ? B.name : A.name} is drawn.</p>}
      <p className="mt-1 text-[10px] text-parchment-400">Measured from the historical-basemaps snapshots; approximate. Very different time periods share one axis, so a long span compresses each curve.</p>
    </div>
  );
}

function PopulationCompare({ A, B, lo, hi, onJumpToYear }: { A: Polity; B: Polity; lo: number; hi: number; onJumpToYear: (y: number) => void }) {
  const a = populationOf(A);
  const b = populationOf(B);
  if (!a.pts.length && !b.pts.length) return <p className="mt-1.5 text-xs text-parchment-400">Neither has a dated population figure in the sources checked.</p>;
  const pad = Math.max(5, (hi - lo) * 0.03);
  return (
    <div className="mt-1.5">
      <TerritoryChart
        series={[
          { id: A.id, name: A.name, color: A.color!, points: a.pts, ranges: a.ranges },
          { id: B.id, name: B.name, color: B.color!, points: b.pts, ranges: b.ranges },
        ]}
        domain={[lo - pad, Math.min(hi, MAX_YEAR) + pad]}
        year={NaN}
        onJumpToYear={onJumpToYear}
        height={170}
        label={`Population of ${A.name} and ${B.name}`}
        formatValue={formatPeople}
        formatAxis={axisPeople}
      />
      <p className="mt-1 text-[10px] text-parchment-400">Dated estimates from Wikipedia infoboxes; whiskers show ranges. A single figure appears as one dot.</p>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex gap-1.5">
      <dt className="w-12 shrink-0 text-parchment-400">{k}</dt>
      <dd className="min-w-0 text-parchment-100">{v}</dd>
    </div>
  );
}

function CompareCategory({ def, A, B, defaultOpen, onJumpToYear }: { def: CategoryDef; A: Polity; B: Polity; defaultOpen: boolean; onJumpToYear: (y: number) => void }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-white/5 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-white/[0.03] focus-visible:bg-white/[0.05] focus-visible:outline-none"
      >
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-ink-700/70 text-base" aria-hidden="true">
          {def.icon}
        </span>
        <span className="flex-1 text-sm font-semibold text-parchment-50">{def.label}</span>
        <svg viewBox="0 0 24 24" className={`size-4 shrink-0 text-parchment-300 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="space-y-3 px-4 pb-4">
          <p className="rounded-lg bg-gold-400/[0.07] px-3 py-2 text-xs text-gold-300 italic ring-1 ring-gold-400/15">{def.question}</p>
          {def.fields.map((f) => (
            <div key={f.key}>
              <h4 className="text-[11px] font-semibold tracking-wide text-parchment-300 uppercase">{f.label}</h4>
              <div className="mt-1 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                <Cell p={A} item={getItem(A.checklist, def.key, f.key)} onJumpToYear={onJumpToYear} />
                <Cell p={B} item={getItem(B.checklist, def.key, f.key)} onJumpToYear={onJumpToYear} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Cell({ p, item, onJumpToYear }: { p: Polity; item: ChecklistItem; onJumpToYear: (y: number) => void }) {
  const filled = isFilled(item);
  return (
    <div className="rounded-lg bg-white/[0.03] px-2.5 py-2 ring-1 ring-white/[0.06]" style={{ boxShadow: `inset 3px 0 0 ${p.color ?? '#c9844f'}` }}>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] font-semibold text-parchment-400">{p.name}</span>
        {filled && typeof item.year === 'number' && (
          <button
            type="button"
            onClick={() => onJumpToYear(item.year as number)}
            className="rounded-full bg-ink-600/70 px-1.5 py-px text-[10px] font-semibold text-parchment-100 tabular-nums transition hover:bg-gold-400 hover:text-ink-900"
            title="Move the timeline to this year"
          >
            {formatYear(item.year as number, item.certainty === 'estimated')}
          </button>
        )}
        {filled && <CertaintyBadge certainty={item.certainty} />}
      </div>
      <p className={`mt-1 text-[12.5px] leading-relaxed ${filled ? 'text-parchment-100' : 'text-parchment-400 italic'}`}>{filled ? String(item.value) : 'Not yet filled in'}</p>
    </div>
  );
}
