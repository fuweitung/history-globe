import { useEffect, useMemo, useRef, useState } from 'react';
import { EVENT_TYPES, EVENT_BY_ID, POLITY_BY_ID } from '../lib/data';
import { search, type SearchHit } from '../lib/search';
import { KIND_META } from './PolityDetail';

interface Props {
  initialQuery?: string;
  onOpenPolity: (id: string) => void;
  onOpenEvent: (id: string) => void;
  onOpenKnown: (polityId: string, year?: number) => void;
  onQueryChange?: (q: string) => void;
}

const SUGGESTIONS = ['silk', 'samurai', 'elephants', 'printing', 'Vikings', 'gold', 'plague', 'cavalry', 'alphabet', 'canoes'];
const LIMITS = { polities: 8, known: 10, events: 10 };

export default function SearchView({ initialQuery = '', onOpenPolity, onOpenEvent, onOpenKnown, onQueryChange }: Props) {
  const [q, setQ] = useState(initialQuery);
  const [showAll, setShowAll] = useState<Record<string, boolean>>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const results = useMemo(() => search(q), [q]);
  const total = results.polities.length + results.known.length + results.events.length;

  useEffect(() => {
    // Focus without scrolling the page (the mobile sheet slides in).
    inputRef.current?.focus({ preventScroll: true });
  }, []);
  useEffect(() => {
    setShowAll({});
    onQueryChange?.(q);
  }, [q, onQueryChange]);

  const open = (h: SearchHit) => {
    if (h.kind === 'polity') onOpenPolity(h.id);
    else if (h.kind === 'event') onOpenEvent(h.id);
    else onOpenKnown(h.polityId, h.year);
  };

  const first = results.polities[0] ?? results.known[0] ?? results.events[0];

  return (
    <div className="pb-8">
      <div className="px-5 pt-4 md:pt-5">
        <h2 className="font-display pr-10 text-2xl font-bold text-parchment-50">Search</h2>
        <p className="mt-1 text-xs text-parchment-400">Civilisations, what they’re known for (cloth, troops, tools…), and events.</p>
        <form
          className="mt-3"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            if (first) open(first);
          }}
        >
          <input
            ref={inputRef}
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Try “silk”, “Vikings” or “printing”…"
            enterKeyHint="search"
            className="w-full rounded-xl bg-ink-800 px-3 py-2.5 text-sm text-parchment-50 ring-1 ring-white/10 placeholder:text-parchment-400 focus:ring-gold-400 focus:outline-none"
            aria-label="Search history"
          />
        </form>
        {q.trim() && (
          <p className="mt-2 text-[11px] text-parchment-400" aria-live="polite">
            {total ? `${total} result${total === 1 ? '' : 's'} · press Enter to open the top one` : 'No matches. Try a shorter or different word.'}
          </p>
        )}
      </div>

      {!q.trim() && (
        <div className="px-5 pt-4">
          <h3 className="text-[11px] font-semibold tracking-wider text-parchment-300 uppercase">Ideas to explore</h3>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setQ(s)}
                className="rounded-full bg-white/[0.06] px-3 py-1 text-xs text-parchment-100 ring-1 ring-white/10 transition hover:bg-white/10"
              >
                {s}
              </button>
            ))}
          </div>
          <p className="mt-4 text-[11px] text-parchment-400">Tip: press <kbd className="rounded bg-ink-700 px-1 font-mono">/</kbd> anywhere to search.</p>
        </div>
      )}

      <Group title="Civilisations" hits={results.polities} limit={LIMITS.polities} all={showAll.p} onMore={() => setShowAll((s) => ({ ...s, p: true }))} onOpen={open} />
      <Group title="Known for" hits={results.known} limit={LIMITS.known} all={showAll.k} onMore={() => setShowAll((s) => ({ ...s, k: true }))} onOpen={open} />
      <Group title="Events" hits={results.events} limit={LIMITS.events} all={showAll.e} onMore={() => setShowAll((s) => ({ ...s, e: true }))} onOpen={open} />
    </div>
  );
}

function Group({
  title,
  hits,
  limit,
  all,
  onMore,
  onOpen,
}: {
  title: string;
  hits: SearchHit[];
  limit: number;
  all?: boolean;
  onMore: () => void;
  onOpen: (h: SearchHit) => void;
}) {
  if (!hits.length) return null;
  const shown = all ? hits : hits.slice(0, limit);
  return (
    <section className="mt-5">
      <h3 className="px-5 text-[11px] font-semibold tracking-wider text-parchment-300 uppercase">
        {title} <span className="font-normal text-parchment-400">({hits.length})</span>
      </h3>
      <ul className="mt-1.5 px-2">
        {shown.map((h) => (
          <li key={`${h.kind}-${h.kind === 'known' ? `${h.polityId}-${h.title}` : h.id}`}>
            <button
              type="button"
              onClick={() => onOpen(h)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-white/5 focus-visible:bg-white/5 focus-visible:outline-none"
            >
              <Icon hit={h} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-parchment-50">{h.title}</span>
                <span className="block truncate text-[11px] text-parchment-400 tabular-nums">{h.sub}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      {!all && hits.length > limit && (
        <button type="button" onClick={onMore} className="ml-5 mt-1 text-xs font-semibold text-gold-300 hover:underline">
          Show all {hits.length}
        </button>
      )}
    </section>
  );
}

function Icon({ hit }: { hit: SearchHit }) {
  if (hit.kind === 'polity') {
    const p = POLITY_BY_ID.get(hit.id);
    return (
      <span className="grid size-6 shrink-0 place-items-center" aria-hidden="true">
        <span className="size-3 rounded-full" style={{ background: p?.color ?? '#c9844f' }} />
      </span>
    );
  }
  if (hit.kind === 'known') {
    return (
      <span className="grid size-6 shrink-0 place-items-center text-sm" title={KIND_META[hit.kfKind].label} aria-hidden="true">
        {KIND_META[hit.kfKind].icon}
      </span>
    );
  }
  const e = EVENT_BY_ID.get(hit.id);
  const t = e ? EVENT_TYPES[e.type] : null;
  return (
    <span className="grid size-6 shrink-0 place-items-center rounded-full text-[11px] text-white ring-1 ring-white/70" style={{ background: t?.color }} aria-hidden="true">
      {t?.glyph}
    </span>
  );
}
