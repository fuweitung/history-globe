import { useId, useState } from 'react';
import { categoryCompletion, getItem, isFilled, type CategoryDef } from '../lib/checklistSchema';
import type { Certainty, Checklist, ChecklistItem } from '../types';
import { formatYear } from '../lib/data';

const CERTAINTY: Record<Certainty, { label: string; cls: string; tip: string }> = {
  confirmed: { label: 'Confirmed', cls: 'bg-ok/15 text-ok ring-ok/30', tip: 'Well documented in reliable sources' },
  estimated: { label: '≈ Estimated', cls: 'bg-warn/15 text-warn ring-warn/30', tip: 'Approximate figure or date; scholars give a range' },
  disputed: { label: 'Disputed', cls: 'bg-dispute/15 text-dispute ring-dispute/30', tip: 'Historians disagree; treat with care' },
};

export function CertaintyBadge({ certainty }: { certainty?: Certainty }) {
  if (!certainty) return null;
  const c = CERTAINTY[certainty];
  return (
    <span title={c.tip} className={`inline-flex items-center rounded-full px-1.5 py-px text-[10px] font-semibold ring-1 ${c.cls}`}>
      {c.label}
    </span>
  );
}

export function ProgressBar({ ratio, className = '' }: { ratio: number; className?: string }) {
  const color = ratio >= 1 ? 'bg-ok' : ratio > 0 ? 'bg-gold-400' : 'bg-transparent';
  return (
    <div className={`h-1.5 overflow-hidden rounded-full bg-white/10 ${className}`}>
      <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${Math.round(ratio * 100)}%` }} />
    </div>
  );
}

interface Props {
  def: CategoryDef;
  checklist: Checklist;
  defaultOpen?: boolean;
  onJumpToYear?: (year: number) => void;
}

export default function ChecklistCategory({ def, checklist, defaultOpen = false, onJumpToYear }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  const c = categoryCompletion(checklist, def);
  const complete = c.filled === c.total;

  return (
    <div className="border-b border-white/5 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={id}
        className="flex w-full items-center gap-3 px-5 py-3 text-left transition hover:bg-white/[0.03] focus-visible:bg-white/[0.05] focus-visible:outline-none"
      >
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-ink-700/70 text-base" aria-hidden="true">
          {def.icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-2">
            <span className="truncate text-sm font-semibold text-parchment-50">{def.label}</span>
            <span
              className={`shrink-0 text-[11px] font-semibold tabular-nums ${complete ? 'text-ok' : c.filled ? 'text-gold-400' : 'text-parchment-400'}`}
              aria-label={`${c.filled} of ${c.total} items filled`}
            >
              {complete ? '✓ ' : ''}
              {c.filled}/{c.total}
            </span>
          </span>
          <ProgressBar ratio={c.ratio} className="mt-1.5" />
        </span>
        <svg
          viewBox="0 0 24 24"
          className={`size-4 shrink-0 text-parchment-300 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div id={id} className="px-5 pb-4">
          <p className="mb-3 rounded-lg bg-gold-400/[0.07] px-3 py-2 text-xs text-gold-300 italic ring-1 ring-gold-400/15">
            {def.question}
          </p>
          <dl className="space-y-3">
            {def.fields.map((f) => (
              <Item key={f.key} label={f.label} hint={f.hint} item={getItem(checklist, def.key, f.key)} onJumpToYear={onJumpToYear} />
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}

function Item({
  label,
  hint,
  item,
  onJumpToYear,
}: {
  label: string;
  hint: string;
  item: ChecklistItem;
  onJumpToYear?: (y: number) => void;
}) {
  const filled = isFilled(item);
  return (
    <div className={`rounded-xl px-3 py-2.5 ${filled ? 'bg-white/[0.03] ring-1 ring-white/[0.06]' : 'border border-dashed border-white/10'}`}>
      <dt className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className={`text-[11px] font-semibold tracking-wide uppercase ${filled ? 'text-parchment-300' : 'text-parchment-400'}`}>{label}</span>
        {filled && typeof item.year === 'number' && (
          <button
            type="button"
            onClick={() => onJumpToYear?.(item.year as number)}
            className="rounded-full bg-ink-600/70 px-1.5 py-px text-[10px] font-semibold text-parchment-100 tabular-nums transition hover:bg-gold-400 hover:text-ink-900"
            title="Move the timeline to this year"
          >
            {formatYear(item.year as number, item.certainty === 'estimated')}
          </button>
        )}
        {filled && <CertaintyBadge certainty={item.certainty} />}
      </dt>
      <dd className="mt-1">
        {filled ? (
          <>
            <p className="text-[13px] leading-relaxed text-parchment-100">{String(item.value)}</p>
            {item.source && <p className="mt-1.5 text-[11px] leading-snug text-parchment-400">Source: {item.source}</p>}
          </>
        ) : (
          <p className="text-xs text-parchment-400/80 italic">Not yet filled in · {hint}</p>
        )}
      </dd>
    </div>
  );
}
