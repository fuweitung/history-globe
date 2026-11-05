import { CHECKLIST_SCHEMA, isFilled, overallCompletion } from '../lib/checklistSchema';
import { ERA_LABEL, EVENT_TYPES, POLITY_BY_ID, eventsForPolity, formatSpan, formatYear, isActive, linksForPolity } from '../lib/data';
import type { LinkRelation, Polity } from '../types';
import ChecklistCategory, { CertaintyBadge } from './ChecklistCategory';

interface Props {
  polity: Polity;
  year: number;
  onJumpToYear: (y: number) => void;
  onFlyTo: () => void;
  onOpenPolity: (id: string) => void;
  onOpenEvent: (id: string) => void;
}


const RELATION_TEXT: Record<LinkRelation, [string, string]> = {
  // [from → to wording, to ← from wording]
  succeeded: ['Succeeded by', 'Successor of'],
  conquered: ['Conquered', 'Conquered by'],
  colonised: ['Colonised', 'Colonised by'],
  traded_with: ['Traded with', 'Traded with'],
  allied_with: ['Allied with', 'Allied with'],
};

export default function PolityDetail({ polity, year, onJumpToYear, onFlyTo, onOpenPolity, onOpenEvent }: Props) {
  const overall = overallCompletion(polity.checklist);
  const active = isActive(polity, year);
  const events = eventsForPolity(polity.id);
  const links = linksForPolity(polity.id);
  const rf = polity.checklist.riseFall;
  const peakYear = typeof rf.peakPeriod.year === 'number' ? rf.peakPeriod.year : null;

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

        {polity.summary && <p className="relative mt-3 text-[13px] leading-relaxed text-parchment-100">{polity.summary}</p>}

        <div className="relative mt-4 flex flex-wrap gap-2">
          <ActionButton onClick={onFlyTo}>
            <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></svg>
            Show on map
          </ActionButton>
          <ActionButton onClick={() => onJumpToYear(polity.startYear)}>⏮ Rise · {formatYear(polity.startYear)}</ActionButton>
          {peakYear !== null && <ActionButton onClick={() => onJumpToYear(peakYear)}>★ Peak · {formatYear(peakYear, true)}</ActionButton>}
          {polity.endYear !== null && <ActionButton onClick={() => onJumpToYear(polity.endYear as number)}>⏭ End · {formatYear(polity.endYear)}</ActionButton>}
        </div>
      </header>

      {/* ── Rise & fall at a glance ── */}
      {(isFilled(rf.riseSignals) || isFilled(rf.declineSignals)) && (
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
          {CHECKLIST_SCHEMA.map((def) => (
            <ChecklistCategory key={`${polity.id}-${def.key}`} def={def} checklist={polity.checklist} onJumpToYear={onJumpToYear} />
          ))}
        </div>
        <div className="mx-5 mt-2 flex flex-wrap items-center gap-2 text-[10px] text-parchment-400">
          Legend: <CertaintyBadge certainty="confirmed" /> <CertaintyBadge certainty="estimated" /> <CertaintyBadge certainty="disputed" />
        </div>
      </section>

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

