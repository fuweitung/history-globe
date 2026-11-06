/**
 * A piecewise-linear time scale for the timeline.
 *
 * 12,000 years don't fit on one linear slider: the modern era would be a sliver.
 * Each era gets a fixed share of the slider instead, so every period is usable.
 * Years are integers; negative = BCE (−1 = 1 BCE). There is no year 0.
 */

export interface EraDef {
  id: 'prehistory' | 'ancient' | 'medieval' | 'early_modern' | 'modern';
  label: string;
  short: string;
  from: number;
  to: number;
  /** Share of the slider width (all shares sum to 1). */
  share: number;
  /** Default step (years) for ‹ › buttons and playback in this era. */
  step: number;
  color: string;
  text: string;
}

export const ERAS: EraDef[] = [
  { id: 'prehistory', label: 'Prehistory', short: 'Prehist.', from: -10000, to: -3500, share: 0.1, step: 50, color: '#6b6a4a', text: '#c2c08f' },
  { id: 'ancient', label: 'Ancient', short: 'BC–500', from: -3500, to: 500, share: 0.28, step: 10, color: '#7a5c8f', text: '#c3a6d6' },
  { id: 'medieval', label: 'Medieval', short: '500–1500', from: 500, to: 1500, share: 0.2, step: 5, color: '#4f7f6a', text: '#8fc9ad' },
  { id: 'early_modern', label: 'Early Modern', short: '1500–1800', from: 1500, to: 1800, share: 0.2, step: 1, color: '#8a6a3d', text: '#c9a56f' },
  { id: 'modern', label: 'Modern', short: '1800+', from: 1800, to: 2025, share: 0.22, step: 1, color: '#4c6a9a', text: '#8fa9d4' },
];

export const MIN_YEAR = ERAS[0].from;
export const MAX_YEAR = ERAS[ERAS.length - 1].to;

/** Removes the non-existent year 0 (rounds towards the direction of travel). */
export function normaliseYear(y: number, direction: 1 | -1 = 1): number {
  const r = Math.round(Math.min(MAX_YEAR, Math.max(MIN_YEAR, y)));
  return r === 0 ? direction : r;
}

export function eraOf(year: number): EraDef {
  return ERAS.find((e) => year < e.to) ?? ERAS[ERAS.length - 1];
}

/** Year → position on the slider, 0..1. */
export function yearToFrac(year: number): number {
  const y = Math.min(MAX_YEAR, Math.max(MIN_YEAR, year));
  let acc = 0;
  for (const e of ERAS) {
    if (y <= e.to) return acc + ((y - e.from) / (e.to - e.from)) * e.share;
    acc += e.share;
  }
  return 1;
}

/** Position on the slider (0..1) → year. */
export function fracToYear(frac: number): number {
  const f = Math.min(1, Math.max(0, frac));
  let acc = 0;
  for (const e of ERAS) {
    if (f <= acc + e.share) return normaliseYear(e.from + ((f - acc) / e.share) * (e.to - e.from));
    acc += e.share;
  }
  return MAX_YEAR;
}

/** Step size in years for the current era (‹ › buttons, playback, arrow keys). */
export function stepFor(year: number): number {
  return eraOf(year).step;
}

/**
 * Ancient and medieval events are sparser, so the "events within ±N years"
 * window widens with the era's step: ±25 years in the modern era = ±250 in the ancient era.
 */
export function eventWindowFor(year: number, base: number): number {
  return base * stepFor(year);
}

/** Moves `year` by `steps` era-sized steps, skipping year 0. */
export function stepYear(year: number, steps: number): number {
  const dir = steps >= 0 ? 1 : -1;
  // Use the step size of the era we're moving into when stepping backwards across a boundary.
  const size = dir > 0 ? stepFor(year) : stepFor(year - 1);
  let next = year + steps * size;
  if (year < 0 && next >= 0) next += 1; // crossing from BCE to CE skips year 0
  if (year > 0 && next <= 0) next -= 1;
  return normaliseYear(next, dir);
}
