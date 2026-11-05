import { useEffect, useMemo, useRef } from 'react';
import { ERA_BANDS, EVENTS, EVENT_TYPES, MAX_YEAR, MIN_YEAR, formatSpan } from '../lib/data';
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

const SPAN = MAX_YEAR - MIN_YEAR;
const pct = (y: number) => `${((Math.min(MAX_YEAR, Math.max(MIN_YEAR, y)) - MIN_YEAR) / SPAN) * 100}%`;
const TICKS = [1500, 1600, 1700, 1800, 1900, 2000];
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

  // Keyboard shortcuts: ←/→ ±1 year, Shift ±10, Space play/pause (when not typing).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('input, textarea, select, [contenteditable]') && t !== inputRef.current) return;
      if (t === inputRef.current && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) return; // native handling
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        const step = (e.shiftKey ? 10 : 1) * (e.key === 'ArrowLeft' ? -1 : 1);
        onChange(Math.min(MAX_YEAR, Math.max(MIN_YEAR, year + step)));
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

  return (
    <div className="pointer-events-auto mx-auto w-full max-w-5xl rounded-2xl bg-ink-900/85 px-3 pb-2 pt-2.5 shadow-2xl ring-1 ring-white/10 backdrop-blur-md sm:px-5">
      {/* Header row: year, snapshot info, controls */}
      <div className="flex items-center gap-3">
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

        <div className="flex items-center gap-1">
          <StepButton label="Back 10 years" onClick={() => onChange(Math.max(MIN_YEAR, year - 10))}>«</StepButton>
          <StepButton label="Back 1 year" onClick={() => onChange(Math.max(MIN_YEAR, year - 1))}>‹</StepButton>
        </div>

        <div className="min-w-0 flex-1 text-center">
          <div className="font-display text-3xl leading-none font-bold tracking-tight text-parchment-50 tabular-nums sm:text-4xl">
            {year}
          </div>
          <div className="mt-1 truncate text-[11px] text-parchment-300">
            {loading ? (
              <span className="animate-pulse">Loading borders…</span>
            ) : snapshotYear !== null ? (
              <>
                Borders shown: <span className="font-semibold text-parchment-100">{snapshotYear}</span>
                {gap > 0 && <span className="text-parchment-400"> (nearest map, {gap} yr{gap === 1 ? '' : 's'} away)</span>}
              </>
            ) : (
              'Border data not loaded'
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <StepButton label="Forward 1 year" onClick={() => onChange(Math.min(MAX_YEAR, year + 1))}>›</StepButton>
          <StepButton label="Forward 10 years" onClick={() => onChange(Math.min(MAX_YEAR, year + 10))}>»</StepButton>
        </div>

        <label className="hidden shrink-0 items-center gap-1.5 text-[11px] text-parchment-300 sm:flex">
          Events ±
          <select
            value={eventWindow}
            onChange={(e) => onEventWindowChange(Number(e.target.value))}
            className="rounded-md bg-ink-700 px-1.5 py-1 text-xs text-parchment-50 ring-1 ring-white/10 focus:outline-none focus-visible:ring-gold-400"
            aria-label="Show events within this many years"
          >
            {WINDOWS.map((w) => (
              <option key={w} value={w}>{w} yrs</option>
            ))}
          </select>
        </label>
      </div>

      {/* Track */}
      <div className="relative mt-1 select-none">
        {/* Era bands */}
        <div className="pointer-events-none absolute inset-x-0 top-[17px] h-1.5 overflow-hidden rounded-full bg-ink-700">
          {ERA_BANDS.map((b, i) => (
            <div
              key={b.id}
              className={i === 0 ? 'absolute inset-y-0 bg-[#8a6a3d]/70' : 'absolute inset-y-0 bg-[#4c6a9a]/70'}
              style={{ left: pct(b.from), width: `calc(${pct(b.to)} - ${pct(b.from)})` }}
            />
          ))}
        </div>

        {/* Selected polity lifespan */}
        {highlight && (
          <div
            className="pointer-events-none absolute top-[14px] h-3 rounded-full bg-gold-400/45 ring-1 ring-gold-400/80"
            style={{ left: pct(highlight.startYear), width: `calc(${pct(highlight.endYear ?? MAX_YEAR)} - ${pct(highlight.startYear)})` }}
            title={`${highlight.name}: ${formatSpan(highlight)}`}
          />
        )}

        {/* Event density ticks */}
        <div className="pointer-events-none absolute inset-x-0 top-[26px] h-2">
          {eventTicks.map((t) => (
            <span key={t.id} className="absolute h-2 w-px opacity-70" style={{ left: pct(t.year), background: t.color }} />
          ))}
        </div>

        {/* Snapshot markers: where real border data exists */}
        <div className="pointer-events-none absolute inset-x-0 top-[8px] h-2">
          {snapshotYears.map((y) => (
            <span
              key={y}
              className={`absolute size-1.5 -translate-x-1/2 rounded-full ${y === snapshotYear ? 'bg-gold-400' : 'bg-parchment-300/60'}`}
              style={{ left: pct(y) }}
            />
          ))}
        </div>

        <input
          ref={inputRef}
          type="range"
          min={MIN_YEAR}
          max={MAX_YEAR}
          step={1}
          value={year}
          onChange={(e) => onChange(Number(e.target.value))}
          className="timeline-range relative"
          aria-label="Year"
          aria-valuetext={`Year ${year}`}
        />
      </div>

      {/* Scale */}
      <div className="relative h-4 text-[10px] text-parchment-400">
        {TICKS.map((t) => (
          <span key={t} className="absolute -translate-x-1/2 tabular-nums" style={{ left: pct(t) }}>
            {t}
          </span>
        ))}
      </div>
      <div className="flex justify-between text-[10px] tracking-wide uppercase">
        <span className="text-[#c9a56f]">Early Modern · 1500–1800</span>
        <span className="text-[#8fa9d4]">Modern · 1800–today</span>
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
