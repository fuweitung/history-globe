import { useEffect, useMemo, useRef } from 'react';
import { EVENTS, EVENT_TYPES, formatSpan, formatYear } from '../lib/data';
import { ERAS, MAX_YEAR, eraOf, eventWindowFor, fracToYear, stepFor, stepYear, yearToFrac } from '../lib/timeScale';
import type { Polity } from '../types';

interface Props {
  year: number;
  onChange: (year: number) => void;
  snapshotYears: number[];
  snapshotYear: number | null;
  loading: boolean;
  playing: boolean;
  onTogglePlay: () => void;
  highlight: Polity | null;
  eventWindow: number;
  onEventWindowChange: (w: number) => void;
}

const RESOLUTION = 2000; // slider positions
const pct = (y: number) => `${yearToFrac(y) * 100}%`;
// Scale labels; `minor` ones are hidden on phones.
const TICKS: { y: number; label: string; minor?: boolean }[] = [
  { y: -8000, label: '8000 BC' },
  { y: -3000, label: '3000 BC' },
  { y: -1000, label: '1000 BC' },
  { y: 1, label: '1 AD', minor: true },
  { y: 500, label: '500' },
  { y: 1000, label: '1000', minor: true },
  { y: 1500, label: '1500' },
  { y: 1650, label: '1650', minor: true },
  { y: 1800, label: '1800' },
  { y: 1900, label: '1900', minor: true },
  { y: 2000, label: '2000' },
];
const WINDOWS = [10, 25, 50];

export default function TimelineSlider({
  year,
  onChange,
  snapshotYears,
  snapshotYear,
  loading,
  playing,
  onTogglePlay,
  highlight,
  eventWindow,
  onEventWindowChange,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const era = eraOf(year);
  const step = stepFor(year);

  // Keyboard: ←/→ one step, Shift ×10, Space play/pause (when not typing).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('input, textarea, select, [contenteditable]') && t !== inputRef.current) return;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        onChange(stepYear(year, (e.shiftKey ? 10 : 1) * (e.key === 'ArrowLeft' ? -1 : 1)));
      } else if (e.key === ' ' && t.tagName !== 'BUTTON') {
        e.preventDefault();
        onTogglePlay();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [year, onChange, onTogglePlay]);

  const eventTicks = useMemo(() => EVENTS.map((e) => ({ id: e.id, year: e.year, color: EVENT_TYPES[e.type].color })), []);
  const gap = snapshotYear !== null ? Math.abs(snapshotYear - year) : 0;
  const unit = (n: number) => `${n} yr${n === 1 ? '' : 's'}`;

  return (
    <div className="pointer-events-auto mx-auto w-full max-w-5xl rounded-2xl bg-ink-900/85 px-3 pt-2.5 pb-2 shadow-2xl ring-1 ring-white/10 backdrop-blur-md sm:px-5">
      {/* Header row */}
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={onTogglePlay}
          className="grid size-10 shrink-0 place-items-center rounded-full bg-gold-400 text-ink-900 shadow-md transition hover:bg-gold-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-400"
          aria-label={playing ? 'Pause timeline' : 'Play timeline'}
          title={playing ? 'Pause (Space)' : 'Play (Space)'}
        >
          {playing ? (
            <svg viewBox="0 0 24 24" className="size-4" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
          ) : (
            <svg viewBox="0 0 24 24" className="ml-0.5 size-4" fill="currentColor"><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5Z" /></svg>
          )}
        </button>

        <div className="flex items-center">
          <StepButton label={`Back ${unit(step * 10)}`} onClick={() => onChange(stepYear(year, -10))}>«</StepButton>
          <StepButton label={`Back ${unit(step)}`} onClick={() => onChange(stepYear(year, -1))}>‹</StepButton>
        </div>

        <div className="min-w-0 flex-1 text-center">
          <div className="flex items-baseline justify-center gap-1.5">
            <span className="font-display text-3xl leading-none font-bold tracking-tight text-parchment-50 tabular-nums sm:text-4xl">
              {Math.abs(year)}
            </span>
            {year < 1000 && (
              <span className="font-display text-base font-bold text-parchment-300 sm:text-lg">{year < 0 ? 'BCE' : 'CE'}</span>
            )}
          </div>
          <div className="mt-1 truncate text-[11px] text-parchment-300">
            <span className="font-semibold" style={{ color: era.text }}>{era.label}</span>
            <span className="mx-1.5 text-parchment-400">·</span>
            {loading ? (
              <span className="animate-pulse">Loading borders…</span>
            ) : snapshotYear !== null ? (
              <>
                Map: <span className="font-semibold text-parchment-100">{formatYear(snapshotYear)}</span>
                {gap > 0 && <span className="hidden text-parchment-400 sm:inline"> (nearest, {unit(gap)} away)</span>}
              </>
            ) : (
              'No border data'
            )}
          </div>
        </div>

        <div className="flex items-center">
          <StepButton label={`Forward ${unit(step)}`} onClick={() => onChange(stepYear(year, 1))}>›</StepButton>
          <StepButton label={`Forward ${unit(step * 10)}`} onClick={() => onChange(stepYear(year, 10))}>»</StepButton>
        </div>

        <label className="hidden shrink-0 items-center gap-1.5 text-[11px] text-parchment-300 sm:flex" title="Show events this close to the selected year (wider in older eras)">
          Events ±
          <select
            value={eventWindow}
            onChange={(e) => onEventWindowChange(Number(e.target.value))}
            className="rounded-md bg-ink-700 px-1.5 py-1 text-xs text-parchment-50 ring-1 ring-white/10 focus:outline-none focus-visible:ring-gold-400"
            aria-label="Show events within this many years"
          >
            {WINDOWS.map((w) => (
              <option key={w} value={w}>{unit(eventWindowFor(year, w))}</option>
            ))}
          </select>
        </label>
      </div>

      {/* Era chips: jump to the start of an era */}
      <div className="mt-2 flex gap-1" role="group" aria-label="Jump to era">
        {ERAS.map((e) => {
          const active = e.id === era.id;
          return (
            <button
              key={e.id}
              type="button"
              onClick={() => onChange(e.from)}
              aria-pressed={active}
              className={`min-w-0 truncate rounded-md px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase transition ${
                active ? 'text-ink-900' : 'text-parchment-300 hover:bg-white/5'
              }`}
              style={{ width: `${e.share * 100}%`, background: active ? e.text : undefined }}
            >
              <span className="sm:hidden" aria-label={e.label}>{e.short}</span>
              <span className="hidden sm:inline xl:hidden">{e.label}</span>
              <span className="hidden xl:inline">
                {e.label} · {formatYear(e.from).replace(' BCE', ' BC')}–{e.to === MAX_YEAR ? 'today' : formatYear(e.to)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Track */}
      <div className="relative select-none">
        <div className="pointer-events-none absolute inset-x-0 top-[17px] h-1.5 overflow-hidden rounded-full bg-ink-700">
          {ERAS.map((e) => (
            <div key={e.id} className="absolute inset-y-0" style={{ left: pct(e.from), width: `${e.share * 100}%`, background: e.color, opacity: 0.8 }} />
          ))}
        </div>

        {highlight && (
          <div
            className="pointer-events-none absolute top-[14px] h-3 min-w-1.5 rounded-full bg-gold-400/45 ring-1 ring-gold-400/80"
            style={{ left: pct(highlight.startYear), width: `calc(${pct(highlight.endYear ?? MAX_YEAR)} - ${pct(highlight.startYear)})` }}
            title={`${highlight.name}: ${formatSpan(highlight)}`}
          />
        )}

        <div className="pointer-events-none absolute inset-x-0 top-[26px] h-2">
          {eventTicks.map((t) => (
            <span key={t.id} className="absolute h-2 w-px opacity-70" style={{ left: pct(t.year), background: t.color }} />
          ))}
        </div>

        <div className="pointer-events-none absolute inset-x-0 top-[8px] h-2">
          {snapshotYears.map((y) => (
            <span
              key={y}
              className={`absolute size-1.5 -translate-x-1/2 rounded-full ${y === snapshotYear ? 'bg-gold-400' : 'bg-parchment-300/50'}`}
              style={{ left: pct(y) }}
            />
          ))}
        </div>

        <input
          ref={inputRef}
          type="range"
          min={0}
          max={RESOLUTION}
          step={1}
          value={Math.round(yearToFrac(year) * RESOLUTION)}
          onChange={(e) => onChange(fracToYear(Number(e.target.value) / RESOLUTION))}
          onKeyDown={(e) => {
            // Let the global handler do era-aware stepping instead of the native one.
            if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) e.preventDefault();
          }}
          className="timeline-range relative"
          aria-label="Year"
          aria-valuetext={formatYear(year)}
        />
      </div>

      {/* Scale */}
      <div className="relative h-4 text-[10px] text-parchment-400">
        {TICKS.map((t) => (
          <span
            key={t.y}
            className={`absolute -translate-x-1/2 whitespace-nowrap tabular-nums last:-translate-x-full ${t.minor ? 'hidden lg:inline' : ''}`}
            style={{ left: pct(t.y) }}
          >
            {t.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function StepButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="grid size-8 place-items-center rounded-full text-lg text-parchment-200 transition hover:bg-white/10 hover:text-parchment-50 focus-visible:outline-2 focus-visible:outline-gold-400"
    >
      {children}
    </button>
  );
}
