import { useState } from 'react';
import { CHECKLIST_SCHEMA, isFilled } from '../lib/checklistSchema';
import { ERA_LABEL, EVENT_TYPES, PERSON_ROLES, POLITY_BY_ID, eventsForPolity, formatSpan, formatYear, isActive, knownImage, linksForPolity, peopleForPolity, polityImage, wikiUrl } from '../lib/data';
import WikiPicture from './WikiPicture';
import type { FullPolity, KnownForKind, LinkRelation, PolitySummary } from '../types';
import { useImages, usePolity } from '../lib/usePolity';
import ChecklistCategory, { CertaintyBadge } from './ChecklistCategory';
import TerritoryChart, { SERIES_COLORS, TERRITORY, axisPeople, domainFor, formatArea, formatPeople, populationOf } from './TerritoryChart';

interface Props {
  polity: PolitySummary;
  year: number;
  onJumpToYear: (y: number) => void;
  onFlyTo: () => void;
  onOpenPolity: (id: string) => void;
  onOpenEvent: (id: string) => void;
  onCompare?: () => void;
  onOpenPerson?: (id: string) => void;
  /** Checklist category to open and scroll to. */
  focusCategory?: string;
}


export const KIND_META: Record<KnownForKind, { icon: string; label: string }> = {
  textile: { icon: '🧵', label: 'Cloth & dress' },
  troops: { icon: '🛡️', label: 'Troops' },
  weapon: { icon: '⚔️', label: 'Weapons' },
  tool: { icon: '🛠️', label: 'Tools & inventions' },
  monument: { icon: '🏛️', label: 'Monuments' },
  art: { icon: '🎨', label: 'Art & crafts' },
  idea: { icon: '📜', label: 'Ideas, laws & writing' },
  food: { icon: '🌾', label: 'Food & crops' },
  person: { icon: '👤', label: 'People' },
};

function KnownFor({ polity, onJumpToYear }: { polity: PolitySummary; onJumpToYear: (y: number) => void }) {
  const [open, setOpen] = useState<number | null>(null);
  const items = polity.knownFor ?? [];
  const sel = open !== null ? items[open] : undefined;
  return (
    <section className="mx-5 mb-4" aria-labelledby="knownfor-h">
      <h3 id="knownfor-h" className="text-[11px] font-semibold tracking-wider text-parchment-300 uppercase">
        Known for <span className="font-normal normal-case tracking-normal text-parchment-400">· signature cloth, troops, tools &amp; more</span>
      </h3>
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {items.map((k, i) => {
          const meta = KIND_META[k.kind];
          const on = open === i;
          return (
            <li key={`${polity.id}-${i}`}>
              <button
                type="button"
                aria-expanded={on}
                onClick={() => setOpen(on ? null : i)}
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ring-1 transition-colors ${
                  on ? 'bg-gold-400/20 text-parchment-50 ring-gold-400/50' : 'bg-white/[0.06] text-parchment-100 ring-white/10 hover:bg-white/10'
                }`}
              >
                <span aria-hidden="true">{meta.icon}</span>
                <span className="sr-only">{meta.label}: </span>
                {k.label}
              </button>
            </li>
          );
        })}
      </ul>
      {sel && (
        <div className="mt-2 rounded-xl bg-white/[0.04] px-3 py-2 text-xs text-parchment-200 ring-1 ring-white/10">
          {knownImage(polity.id, sel.label) && <WikiPicture image={knownImage(polity.id, sel.label)!} alt={sel.label} height="h-32" className="mb-2" />}
          <span className="font-semibold text-parchment-50">{KIND_META[sel.kind].label}</span>
          {sel.note && <> · {sel.note}</>}
          {sel.year !== undefined && (
            <button type="button" onClick={() => onJumpToYear(sel.year as number)} className="ml-1.5 font-semibold text-gold-300 underline-offset-2 hover:underline">
              Go to {formatYear(sel.year, true)} →
            </button>
          )}
        </div>
      )}
    </section>
  );
}

function TerritorySection({ polity, year, peak, onJumpToYear }: { polity: PolitySummary; year: number; peak: number | null; onJumpToYear: (y: number) => void }) {
  const pts = TERRITORY[polity.id] ?? [];
  const max = pts.reduce((m, p) => (p[1] > m[1] ? p : m), [0, 0] as [number, number]);
  return (
    <section className="mx-5 mb-4" aria-labelledby="territory-h">
      <h3 id="territory-h" className="text-[11px] font-semibold tracking-wider text-parchment-300 uppercase">
        Territory on the map
      </h3>
      {pts.length === 0 ? (
        <p className="mt-1.5 text-xs text-parchment-400">The border maps have no shape for this civilisation, so its territory can’t be measured here.</p>
      ) : pts.length === 1 ? (
        <p className="mt-1.5 text-xs text-parchment-200">
          Measured once: <strong className="text-parchment-50">{formatArea(pts[0][1])}</strong> on the {formatYear(pts[0][0])} map. More border snapshots are needed to draw a curve.
        </p>
      ) : (
        <>
          <p className="mt-1 mb-2 text-xs text-parchment-400">
            Largest on the maps: <strong className="text-parchment-100">{formatArea(max[1])}</strong> ({formatYear(max[0])}) · hover or tap a point for the year.
          </p>
          <TerritoryChart
            series={[{ id: polity.id, name: polity.name, color: SERIES_COLORS[0], points: pts }]}
            domain={domainFor(polity.startYear, polity.endYear, pts)}
            year={year}
            peak={peak}
            onJumpToYear={onJumpToYear}
            label={`Territory of ${polity.name} measured on ${pts.length} border maps, largest ${formatArea(max[1])} in ${formatYear(max[0])}`}
          />
        </>
      )}
      <p className="mt-1 text-[10px] leading-snug text-parchment-400">
        Measured from the historical-basemaps border snapshots (colonies and vassals included). Snapshots are years apart and frontiers are approximate, so treat this as a rough
        shape of rise and fall, not exact figures.
      </p>
    </section>
  );
}

function PopulationSection({ polity, year, peak, onJumpToYear }: { polity: FullPolity; year: number; peak: number | null; onJumpToYear: (y: number) => void }) {
  const { pts, ranges } = populationOf(polity);
  const src = polity.series?.sources?.[0];
  const notes = polity.series?.notes ?? [];
  const approxYears = (polity.series?.population ?? []).some((x) => x.approxYear);
  return (
    <section className="mx-5 mb-4" aria-labelledby="population-h">
      <h3 id="population-h" className="text-[11px] font-semibold tracking-wider text-parchment-300 uppercase">
        Population
      </h3>
      {pts.length === 0 ? (
        <p className="mt-1.5 text-xs text-parchment-400">No dated population figure in the sources checked. See “Population & health” in the checklist below for estimates.</p>
      ) : pts.length === 1 ? (
        <p className="mt-1.5 text-xs text-parchment-200">
          About <strong className="text-parchment-50">{ranges[pts[0][0]] ? `${formatPeople(ranges[pts[0][0]][0])}–${formatPeople(ranges[pts[0][0]][1])}` : formatPeople(pts[0][1])}</strong> in{' '}
          <button type="button" onClick={() => onJumpToYear(pts[0][0])} className="font-semibold text-gold-300 hover:underline">
            {formatYear(pts[0][0], approxYears)}
          </button>
          {approxYears && ' (the source gives a century)'}. Only one dated figure, so no curve.
        </p>
      ) : (
        <div className="mt-2">
          <TerritoryChart
            series={[{ id: polity.id, name: polity.name, color: SERIES_COLORS[1], points: pts, ranges }]}
            domain={domainFor(polity.startYear, polity.endYear, pts)}
            year={year}
            peak={peak}
            onJumpToYear={onJumpToYear}
            label={`Population of ${polity.name} at ${pts.length} dates`}
            formatValue={formatPeople}
            formatAxis={axisPeople}
            valueLabel="Population"
            height={150}
          />
        </div>
      )}
      {pts.length > 0 && (
        <p className="mt-1 text-[10px] leading-snug text-parchment-400">
          {src}. Estimates, often with wide ranges (shown as whiskers){approxYears ? '; century-only figures are placed mid-century' : ''}.{notes.length ? ` ${notes.join(' ')}` : ''}
        </p>
      )}
    </section>
  );
}

const RELATION_TEXT: Record<LinkRelation, [string, string]> = {
  // [from → to wording, to ← from wording]
  succeeded: ['Succeeded by', 'Successor of'],
  conquered: ['Conquered', 'Conquered by'],
  colonised: ['Colonised', 'Colonised by'],
  traded_with: ['Traded with', 'Traded with'],
  allied_with: ['Allied with', 'Allied with'],
};

export default function PolityDetail({ polity, year, onJumpToYear, onFlyTo, onOpenPolity, onOpenEvent, onCompare, onOpenPerson, focusCategory }: Props) {
  // The header, known-for and territory come from the startup index; the checklist
  // and population figures arrive with the full civilisation file.
  const { polity: full, error, retry } = usePolity(polity.id);
  useImages();
  const overall = polity.completion;
  const active = isActive(polity, year);
  const events = eventsForPolity(polity.id);
  const links = linksForPolity(polity.id);
  const rf = full?.checklist.riseFall;
  const peakYear = polity.peakYear;

  return (
    <div>
      {/* ── Header ── */}
      <header className="relative px-5 pt-4 pb-4 md:pt-5">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-28 opacity-40"
          style={{ background: `linear-gradient(180deg, ${polity.color ?? '#c9844f'}55, transparent)` }}
          aria-hidden="true"
        />
        <div className="relative pr-10">
          <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-semibold tracking-wider uppercase">
            <span className="rounded-full bg-ink-700 px-2 py-0.5 text-parchment-200">{ERA_LABEL[polity.era]}</span>
            <span className="rounded-full bg-ink-700 px-2 py-0.5 text-parchment-200">{polity.region}</span>
            {active ? (
              <span className="rounded-full bg-ok/15 px-2 py-0.5 text-ok">Exists in {formatYear(year)}</span>
            ) : (
              <span className="rounded-full bg-white/5 px-2 py-0.5 text-parchment-400">Not in {formatYear(year)}</span>
            )}
          </div>
          <h2 className="font-display mt-2 text-2xl leading-tight font-bold text-parchment-50 sm:text-[28px]">{polity.name}</h2>
          <p className="mt-1 text-sm text-parchment-300">
            <span className="tabular-nums">{formatSpan(polity)}</span>
            <span className="mx-1.5 text-parchment-400">·</span>
            Capital: {polity.capital || '—'}
          </p>
          {polity.datesApproximate && (
            <p className="mt-1 text-[11px] text-warn">≈ Start/end dates are conventional or debated.</p>
          )}
        </div>

        {polityImage(polity.id) && <WikiPicture image={polityImage(polity.id)!} alt={polity.name} className="relative mt-3" />}

        {polity.summary && <p className="relative mt-3 text-[13px] leading-relaxed text-parchment-100">{polity.summary}</p>}
        {polity.wikiTitle && (
          <a href={wikiUrl(polity.wikiTitle)} target="_blank" rel="noopener" className="relative mt-1.5 inline-block text-xs font-semibold text-gold-300 hover:underline">
            Read more on Wikipedia ↗
          </a>
        )}

        <div className="relative mt-4 flex flex-wrap gap-2">
          <ActionButton onClick={onFlyTo}>
            <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></svg>
            Show on map
          </ActionButton>
          <ActionButton onClick={() => onJumpToYear(polity.startYear)}>⏮ Rise · {formatYear(polity.startYear)}</ActionButton>
          {peakYear !== null && <ActionButton onClick={() => onJumpToYear(peakYear)}>★ Peak · {formatYear(peakYear, true)}</ActionButton>}
          {polity.endYear !== null && <ActionButton onClick={() => onJumpToYear(polity.endYear as number)}>⏭ End · {formatYear(polity.endYear)}</ActionButton>}
          {onCompare && <ActionButton onClick={onCompare}>⇄ Compare</ActionButton>}
        </div>
      </header>

      {/* ── Known for ── */}
      {polity.knownFor && polity.knownFor.length > 0 && <KnownFor polity={polity} onJumpToYear={onJumpToYear} />}

      {/* ── Rise & fall at a glance ── */}
      {rf && (isFilled(rf.riseSignals) || isFilled(rf.declineSignals)) && (
        <section className="mx-5 mb-4 overflow-hidden rounded-2xl ring-1 ring-white/10">
          <h3 className="bg-white/[0.04] px-4 py-2 text-[11px] font-semibold tracking-wider text-parchment-300 uppercase">Why it rose · why it fell</h3>
          <div className="grid grid-cols-1 divide-y divide-white/5 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
            <GlanceCell tone="up" title="Rise" text={rf.riseSignals.value} />
            <GlanceCell tone="down" title="Decline" text={rf.declineSignals.value} />
          </div>
          {isFilled(rf.outcome) && (
            <div className="border-t border-white/5 px-4 py-2.5 text-xs text-parchment-200">
              <span className="font-semibold text-parchment-50">Outcome: </span>
              {String(rf.outcome.value)}
            </div>
          )}
        </section>
      )}

      {/* ── Territory over time ── */}
      <TerritorySection polity={polity} year={year} peak={peakYear} onJumpToYear={onJumpToYear} />
      {full && <PopulationSection polity={full} year={year} peak={peakYear} onJumpToYear={onJumpToYear} />}

      {/* ── Checklist ── */}
      <section aria-labelledby="checklist-h">
        <div className="flex items-end justify-between gap-4 px-5 pb-2">
          <div>
            <h3 id="checklist-h" className="text-[11px] font-semibold tracking-wider text-parchment-300 uppercase">Element checklist</h3>
            <p className="mt-0.5 text-xs text-parchment-400">
              {overall.filled} of {overall.total} elements documented
            </p>
          </div>
          <CompletionRing ratio={overall.ratio} />
        </div>
        <div className="mx-3 rounded-2xl bg-ink-800/60 ring-1 ring-white/[0.06]">
          {full ? (
            CHECKLIST_SCHEMA.map((def) => (
              <ChecklistCategory key={`${polity.id}-${def.key}-${focusCategory === def.key}`} def={def} checklist={full.checklist} focus={focusCategory === def.key} onJumpToYear={onJumpToYear} />
            ))
          ) : (
            <LoadingChecklist error={error} onRetry={retry} />
          )}
        </div>
        <div className="mx-5 mt-2 flex flex-wrap items-center gap-2 text-[10px] text-parchment-400">
          Legend: <CertaintyBadge certainty="confirmed" /> <CertaintyBadge certainty="estimated" /> <CertaintyBadge certainty="disputed" />
        </div>
      </section>

      {/* ── Famous people ── */}
      {peopleForPolity(polity.id).length > 0 && (
        <section className="mt-6 px-5">
          <h3 className="text-[11px] font-semibold tracking-wider text-parchment-300 uppercase">Famous people</h3>
          <ul className="mt-2 space-y-1">
            {peopleForPolity(polity.id).map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => onOpenPerson?.(p.id)} className="flex w-full items-center gap-2 rounded-lg px-1 py-1 text-left text-[13px] hover:bg-white/5">
                  <span aria-hidden="true">{PERSON_ROLES[p.role].icon}</span>
                  <span className="font-semibold text-parchment-50">{p.name}</span>
                  <span className="text-xs text-parchment-400 tabular-nums">
                    {formatYear(p.born, p.datesApproximate)} – {formatYear(p.died, p.datesApproximate)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── Connections ── */}
      {links.length > 0 && (
        <section className="mt-6 px-5">
          <h3 className="text-[11px] font-semibold tracking-wider text-parchment-300 uppercase">Connections</h3>
          <ul className="mt-2 space-y-1.5">
            {links.map((l, i) => {
              const outgoing = l.fromPolityId === polity.id;
              const otherId = outgoing ? l.toPolityId : l.fromPolityId;
              const other = POLITY_BY_ID.get(otherId);
              const verb = RELATION_TEXT[l.relation][outgoing ? 0 : 1];
              return (
                <li key={i} className="flex flex-wrap items-baseline gap-x-1.5 text-[13px]">
                  <span className="text-parchment-300">{verb}</span>
                  {other ? (
                    <button type="button" onClick={() => onOpenPolity(other.id)} className="font-semibold text-gold-300 underline-offset-2 hover:underline">
                      {other.name}
                    </button>
                  ) : (
                    <span className="font-semibold text-parchment-100">{otherId}</span>
                  )}
                  {l.year !== undefined && <span className="text-xs text-parchment-400 tabular-nums">({formatYear(l.year)})</span>}
                  {l.note && <span className="w-full text-xs text-parchment-400">{l.note}</span>}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* ── Events ── */}
      {events.length > 0 && (
        <section className="mt-6 px-5 pb-8">
          <h3 className="text-[11px] font-semibold tracking-wider text-parchment-300 uppercase">Key events</h3>
          <ol className="relative mt-3 space-y-1 border-l border-white/10 pl-4">
            {events.map((e) => (
              <li key={e.id} className="relative">
                <span
                  className="absolute top-2.5 -left-[21px] size-2.5 rounded-full ring-2 ring-ink-900"
                  style={{ background: EVENT_TYPES[e.type].color }}
                  aria-hidden="true"
                />
                <button
                  type="button"
                  onClick={() => onOpenEvent(e.id)}
                  className="w-full rounded-lg px-2 py-1.5 text-left transition hover:bg-white/5"
                >
                  <span className="text-xs font-semibold text-parchment-300 tabular-nums">{formatYear(e.year, e.yearApproximate)}</span>
                  <span className="ml-2 text-[13px] text-parchment-50">{e.title}</span>
                </button>
              </li>
            ))}
          </ol>
        </section>
      )}
      {events.length === 0 && <div className="pb-8" />}
    </div>
  );
}

function ActionButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full bg-ink-700/80 px-3 py-1.5 text-xs font-semibold text-parchment-100 ring-1 ring-white/10 transition hover:bg-gold-400 hover:text-ink-900 focus-visible:outline-2 focus-visible:outline-gold-400"
    >
      {children}
    </button>
  );
}

function GlanceCell({ tone, title, text }: { tone: 'up' | 'down'; title: string; text: unknown }) {
  const filled = text !== null && text !== undefined && String(text).trim() !== '';
  return (
    <div className="px-4 py-3">
      <div className={`text-xs font-bold ${tone === 'up' ? 'text-ok' : 'text-dispute'}`}>
        {tone === 'up' ? '▲' : '▼'} {title}
      </div>
      <p className="mt-1 text-xs leading-relaxed text-parchment-200">{filled ? String(text) : '—'}</p>
    </div>
  );
}

function CompletionRing({ ratio }: { ratio: number }) {
  const r = 18;
  const c = 2 * Math.PI * r;
  const pctText = Math.round(ratio * 100);
  return (
    <div className="relative size-12 shrink-0" role="img" aria-label={`${pctText}% complete`}>
      <svg viewBox="0 0 44 44" className="size-12 -rotate-90">
        <circle cx="22" cy="22" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
        <circle
          cx="22"
          cy="22"
          r={r}
          fill="none"
          stroke={ratio >= 1 ? 'var(--color-ok)' : 'var(--color-gold-400)'}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - ratio)}
          className="transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-[11px] font-bold text-parchment-50 tabular-nums">{pctText}%</span>
    </div>
  );
}


function LoadingChecklist({ error, onRetry }: { error: Error | null; onRetry: () => void }) {
  if (error)
    return (
      <div role="alert" className="px-5 py-4 text-xs text-parchment-200">
        Couldn’t load the checklist. Check your connection and{' '}
        <button type="button" onClick={onRetry} className="font-semibold text-gold-300 underline">
          try again
        </button>
        .
      </div>
    );
  return (
    <div className="space-y-2 px-5 py-4" aria-busy="true" aria-label="Loading the checklist">
      {CHECKLIST_SCHEMA.map((def) => (
        <div key={def.key} className="h-9 animate-pulse rounded-lg bg-white/[0.04]" />
      ))}
    </div>
  );
}
