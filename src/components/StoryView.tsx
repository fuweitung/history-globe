import { useEffect } from 'react';
import { EVENT_BY_ID, PERSON_BY_ID, POLITY_BY_ID, ROUTE_BY_ID, STORIES, formatYear } from '../lib/data';
import type { Story } from '../types';

export function StoryList({ onStart }: { onStart: (id: string) => void }) {
  return (
    <div className="pb-8">
      <div className="px-5 pt-4 md:pt-5">
        <h2 className="font-display pr-10 text-2xl font-bold text-parchment-50">Stories</h2>
        <p className="mt-1 text-xs text-parchment-400">Short guided tours: the map and timeline move with each step.</p>
      </div>
      <ul className="mt-3 space-y-2 px-3">
        {STORIES.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => onStart(s.id)}
              className="flex w-full items-start gap-3 rounded-xl bg-white/[0.03] px-3 py-3 text-left ring-1 ring-white/[0.06] transition hover:bg-white/[0.07] focus-visible:outline-2 focus-visible:outline-gold-400"
            >
              <span className="text-2xl leading-none" aria-hidden="true">
                {s.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-parchment-50">{s.title}</span>
                <span className="mt-0.5 block text-xs text-parchment-300">{s.summary}</span>
                <span className="mt-1 block text-[11px] text-parchment-400">{s.steps.length} steps</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function StoryPlayer({
  story,
  step,
  onStep,
  onExit,
  onOpenPolity,
  onOpenEvent,
  onOpenRoute,
  onOpenPerson,
}: {
  story: Story;
  step: number;
  onStep: (n: number) => void;
  onExit: () => void;
  onOpenPolity: (id: string) => void;
  onOpenEvent: (id: string) => void;
  onOpenRoute: (id: string) => void;
  onOpenPerson: (id: string) => void;
}) {
  const s = story.steps[step];
  const last = step === story.steps.length - 1;

  // ← / → move through the story (the timeline's own arrow keys are paused meanwhile).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, textarea, select')) return;
      if (e.key === 'ArrowRight' && !last) {
        e.preventDefault();
        e.stopImmediatePropagation();
        onStep(step + 1);
      } else if (e.key === 'ArrowLeft' && step > 0) {
        e.preventDefault();
        e.stopImmediatePropagation();
        onStep(step - 1);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [step, last, onStep]);

  const links: { label: string; onClick: () => void }[] = [];
  if (s.polity && POLITY_BY_ID.get(s.polity)) links.push({ label: POLITY_BY_ID.get(s.polity)!.name, onClick: () => onOpenPolity(s.polity!) });
  if (s.event && EVENT_BY_ID.get(s.event)) links.push({ label: EVENT_BY_ID.get(s.event)!.title, onClick: () => onOpenEvent(s.event!) });
  if (s.route && ROUTE_BY_ID.get(s.route)) links.push({ label: ROUTE_BY_ID.get(s.route)!.name, onClick: () => onOpenRoute(s.route!) });
  if (s.person && PERSON_BY_ID.get(s.person)) links.push({ label: PERSON_BY_ID.get(s.person)!.name, onClick: () => onOpenPerson(s.person!) });

  return (
    <div className="px-5 pt-4 pb-8 md:pt-5">
      <div className="flex items-center gap-2 pr-10 text-[11px] font-semibold tracking-wider text-parchment-300 uppercase">
        <span aria-hidden="true">{story.icon}</span>
        {story.title}
      </div>
      <div className="mt-3 flex gap-1" aria-hidden="true">
        {story.steps.map((_, i) => (
          <button
            key={i}
            type="button"
            tabIndex={-1}
            onClick={() => onStep(i)}
            className={`h-1.5 flex-1 rounded-full transition ${i <= step ? 'bg-gold-400' : 'bg-white/10 hover:bg-white/20'}`}
          />
        ))}
      </div>
      <p className="mt-3 text-xs font-semibold text-gold-300 tabular-nums" aria-live="polite">
        Step {step + 1} of {story.steps.length} · {formatYear(s.year, s.year < 0)}
      </p>
      <h2 className="font-display mt-1 text-2xl leading-tight font-bold text-parchment-50">{s.title}</h2>
      <p className="mt-2 text-[14px] leading-relaxed text-parchment-100">{s.text}</p>
      {links.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {links.map((l) => (
            <button key={l.label} type="button" onClick={l.onClick} className="rounded-full bg-white/[0.06] px-2.5 py-1 text-xs text-parchment-100 ring-1 ring-white/10 hover:bg-white/10">
              Open: {l.label}
            </button>
          ))}
        </div>
      )}
      <div className="mt-5 flex items-center gap-2">
        <button
          type="button"
          onClick={() => onStep(step - 1)}
          disabled={step === 0}
          className="rounded-xl bg-ink-800 px-4 py-2 text-sm font-semibold text-parchment-100 ring-1 ring-white/10 transition hover:bg-ink-700 disabled:opacity-40"
        >
          ← Back
        </button>
        {last ? (
          <button type="button" onClick={onExit} className="flex-1 rounded-xl bg-gold-400 px-4 py-2 text-sm font-bold text-ink-900 transition hover:bg-gold-300">
            Finish ✓
          </button>
        ) : (
          <button type="button" onClick={() => onStep(step + 1)} className="flex-1 rounded-xl bg-gold-400 px-4 py-2 text-sm font-bold text-ink-900 transition hover:bg-gold-300">
            Next →
          </button>
        )}
      </div>
      <p className="mt-3 text-[11px] text-parchment-400">Tip: use ← and → to move through the story.</p>
    </div>
  );
}
