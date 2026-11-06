import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import territoryJson from '../data/territory.json';
import { MAX_YEAR, formatYear } from '../lib/data';

/** km² per civilisation per border snapshot, measured by scripts/compute-territory.mjs. */
export const TERRITORY = territoryJson as unknown as Record<string, [number, number][]>;

/** Validated categorical slots (dataviz reference palette, dark steps). */
export const SERIES_COLORS = ['#3987e5', '#d95926'];

export interface Series {
  id: string;
  name: string;
  color: string;
  points: [number, number][];
  /** Optional low–high range per year, drawn as a whisker. */
  ranges?: Record<number, [number, number]>;
}

interface Props {
  series: Series[];
  domain: [number, number];
  year: number;
  peak?: number | null;
  onJumpToYear: (y: number) => void;
  height?: number;
  label: string;
  /** Tooltip/table value format (default: area). */
  formatValue?: (v: number) => string;
  /** Axis tick format (default: area). */
  formatAxis?: (v: number) => string;
  /** Data-table column heading for a single series. */
  valueLabel?: string;
}

export function formatArea(km2: number): string {
  if (km2 >= 1e6) return `${(km2 / 1e6).toFixed(km2 >= 1e7 ? 1 : 2)}M km²`;
  return `${Math.round(km2 / 1000).toLocaleString()}k km²`;
}
const axisArea = (v: number) => (v === 0 ? '0' : v >= 1e6 ? `${+(v / 1e6).toFixed(1)}M` : `${Math.round(v / 1000)}k`);

export function niceTicks(max: number): number[] {
  const raw = max / 3;
  const pow = 10 ** Math.floor(Math.log10(raw || 1));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? raw;
  const out: number[] = [];
  for (let v = 0; ; v += step) {
    out.push(v);
    if (v >= max) break; // the top tick always covers the data
  }
  return out;
}

const PAD = { l: 38, r: 14, t: 14, b: 22 };

export function formatPeople(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)} billion`;
  if (n >= 1e6) return `${+(n / 1e6).toFixed(n >= 1e8 ? 0 : 1)} million`;
  return n.toLocaleString();
}
export const axisPeople = (v: number) => (v === 0 ? '0' : v >= 1e9 ? `${+(v / 1e9).toFixed(1)}B` : v >= 1e6 ? `${+(v / 1e6).toFixed(0)}M` : `${Math.round(v / 1000)}k`);

export default function TerritoryChart({
  series,
  domain,
  year,
  peak,
  onJumpToYear,
  height = 170,
  label,
  formatValue = formatArea,
  formatAxis = axisArea,
  valueLabel = 'Territory',
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(360);
  const [hover, setHover] = useState<number | null>(null); // index into xs

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const xs = useMemo(() => [...new Set(series.flatMap((s) => s.points.map((p) => p[0])))].sort((a, b) => a - b), [series]);
  const maxV = Math.max(1, ...series.flatMap((s) => s.points.map((p) => Math.max(p[1], s.ranges?.[p[0]]?.[1] ?? 0))));
  const ticks = niceTicks(maxV * 1.08);
  const yMax = ticks[ticks.length - 1];
  const [x0, x1] = domain;
  const iw = Math.max(10, width - PAD.l - PAD.r);
  const ih = height - PAD.t - PAD.b;
  const sx = (y: number) => PAD.l + ((y - x0) / Math.max(1, x1 - x0)) * iw;
  const sy = (v: number) => PAD.t + ih - (v / yMax) * ih;

  const xTicks = useMemo(() => {
    const span = x1 - x0;
    const pow = 10 ** Math.floor(Math.log10(span / 4 || 1));
    const step = [1, 2, 5, 10].map((m) => m * pow).find((s) => span / s <= 5) ?? pow * 10;
    const out: number[] = [];
    for (let v = Math.ceil(x0 / step) * step; v <= x1; v += step) out.push(v);
    return out;
  }, [x0, x1]);

  const nearestIndex = (clientX: number) => {
    const rect = wrapRef.current!.getBoundingClientRect();
    const px = clientX - rect.left;
    let best = 0;
    xs.forEach((x, i) => {
      if (Math.abs(sx(x) - px) < Math.abs(sx(xs[best]) - px)) best = i;
    });
    return best;
  };

  const hx = hover !== null ? xs[hover] : null;
  const tipLeft = hx !== null ? Math.min(Math.max(sx(hx) - 85, 0), width - 170) : 0;
  const yearInDomain = year >= x0 && year <= x1;

  return (
    <div>
      {series.length > 1 && (
        <ul className="mb-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-parchment-200" aria-label="Legend">
          {series.map((s) => (
            <li key={s.id} className="flex items-center gap-1.5">
              <span className="h-0.5 w-4 rounded-full" style={{ background: s.color }} aria-hidden="true" />
              {s.name}
              {!s.points.length && <span className="text-parchment-400">(no data)</span>}
            </li>
          ))}
        </ul>
      )}
      <div
        ref={wrapRef}
        className="relative touch-pan-y select-none"
        onPointerMove={(e) => xs.length && setHover(nearestIndex(e.clientX))}
        onPointerLeave={() => setHover(null)}
        onClick={(e) => xs.length && onJumpToYear(xs[nearestIndex(e.clientX)])}
      >
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={label}
          tabIndex={0}
          className="block cursor-crosshair focus-visible:outline-2 focus-visible:outline-gold-400"
          onKeyDown={(e) => {
            if (!xs.length) return;
            if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
              e.preventDefault();
              e.stopPropagation();
              setHover((h) => Math.max(0, Math.min(xs.length - 1, (h ?? (e.key === 'ArrowRight' ? -1 : xs.length)) + (e.key === 'ArrowRight' ? 1 : -1))));
            } else if (e.key === 'Enter' && hover !== null) onJumpToYear(xs[hover]);
          }}
          onBlur={() => setHover(null)}
        >
          {/* grid + y axis */}
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.l} x2={width - PAD.r} y1={sy(t)} y2={sy(t)} stroke="rgba(255,255,255,0.07)" />
              <text x={PAD.l - 6} y={sy(t)} dy="0.32em" textAnchor="end" className="fill-parchment-400 text-[10px] tabular-nums">
                {formatAxis(t)}
              </text>
            </g>
          ))}
          {xTicks.map((t) => (
            <text key={t} x={sx(t)} y={height - 6} textAnchor="middle" className="fill-parchment-400 text-[10px] tabular-nums">
              {formatYear(t)}
            </text>
          ))}

          {/* peak and current-year guides */}
          {typeof peak === 'number' && peak >= x0 && peak <= x1 && (
            <g>
              <line x1={sx(peak)} x2={sx(peak)} y1={PAD.t} y2={PAD.t + ih} stroke="rgba(233,196,106,0.45)" strokeDasharray="3 3" />
              <text x={sx(peak) + 4} y={PAD.t + 9} className="fill-parchment-300 text-[10px]">
                ★ peak (checklist)
              </text>
            </g>
          )}
          {yearInDomain && <line x1={sx(year)} x2={sx(year)} y1={PAD.t} y2={PAD.t + ih} stroke="rgba(255,255,255,0.35)" strokeWidth={1} />}

          {/* series */}
          {series.map((s) => {
            if (!s.points.length) return null;
            const d = s.points.map(([y, v], i) => `${i ? 'L' : 'M'}${sx(y).toFixed(1)},${sy(v).toFixed(1)}`).join('');
            const area = `${d}L${sx(s.points[s.points.length - 1][0]).toFixed(1)},${sy(0)}L${sx(s.points[0][0]).toFixed(1)},${sy(0)}Z`;
            return (
              <g key={s.id}>
                {series.length === 1 && <path d={area} fill={s.color} opacity={0.16} />}
                <path d={d} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                {s.points.map(([y]) => {
                  const r = s.ranges?.[y];
                  return r ? <line key={`r${y}`} x1={sx(y)} x2={sx(y)} y1={sy(r[0])} y2={sy(r[1])} stroke={s.color} strokeWidth={1.5} opacity={0.7} /> : null;
                })}
                {s.points.map(([y, v]) => (
                  <circle key={y} cx={sx(y)} cy={sy(v)} r={hx === y ? 5 : 3.5} fill={s.color} stroke="#14161c" strokeWidth={2} />
                ))}
              </g>
            );
          })}

          {/* crosshair */}
          {hx !== null && <line x1={sx(hx)} x2={sx(hx)} y1={PAD.t} y2={PAD.t + ih} stroke="rgba(255,255,255,0.6)" strokeWidth={1} pointerEvents="none" />}
        </svg>

        {hx !== null && (
          <div className="pointer-events-none absolute top-1 z-10 w-[170px] rounded-lg bg-ink-700/95 px-2.5 py-1.5 text-[11px] shadow-lg ring-1 ring-white/15" style={{ left: tipLeft }}>
            <div className="font-semibold text-parchment-50 tabular-nums">{formatYear(hx)}</div>
            {series.map((s) => {
              const pt = s.points.find((p) => p[0] === hx);
              return (
                <div key={s.id} className="mt-0.5 flex items-center gap-1.5 text-parchment-200">
                  <span className="size-2 shrink-0 rounded-full" style={{ background: s.color }} />
                  {series.length > 1 && <span className="min-w-0 flex-1 truncate">{s.name}</span>}
                  <span className="ml-auto font-semibold text-parchment-50 tabular-nums">{pt ? fmtRange(s, pt, formatValue) : '—'}</span>
                </div>
              );
            })}
            <div className="mt-1 text-[10px] text-parchment-400">Click to go to this year</div>
          </div>
        )}
      </div>

      <details className="mt-1 text-[11px] text-parchment-400">
        <summary className="cursor-pointer select-none hover:text-parchment-200">Data table</summary>
        <table className="mt-1.5 w-full text-left tabular-nums">
          <thead>
            <tr className="text-parchment-300">
              <th className="py-0.5 font-semibold">Map year</th>
              {series.map((s) => (
                <th key={s.id} className="py-0.5 text-right font-semibold">
                  {series.length > 1 ? s.name : valueLabel}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {xs.map((x) => (
              <tr key={x} className="border-t border-white/5">
                <td className="py-0.5">
                  <button type="button" onClick={() => onJumpToYear(x)} className="inline-block min-h-6 min-w-6 text-gold-300 hover:underline">
                    {formatYear(x)}
                  </button>
                </td>
                {series.map((s) => {
                  const pt = s.points.find((p) => p[0] === x);
                  return (
                    <td key={s.id} className="py-0.5 text-right text-parchment-100">
                      {pt ? fmtRange(s, pt, formatValue) : '—'}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}

/** Population points and ranges for a civilisation (from its series.population). */
export function populationOf(p: { series?: { population?: { year: number; value: number; low?: number; high?: number }[] } }) {
  const pts = (p.series?.population ?? []).map((x) => [x.year, x.value] as [number, number]);
  const ranges: Record<number, [number, number]> = {};
  for (const x of p.series?.population ?? []) if (x.low !== undefined && x.high !== undefined) ranges[x.year] = [x.low, x.high];
  return { pts, ranges };
}

/** Domain for one civilisation: its lifetime, widened to include any measured points. */
export function domainFor(start: number, end: number | null, pts: [number, number][]): [number, number] {
  const e = end ?? MAX_YEAR;
  const lo = Math.min(start, ...pts.map((p) => p[0]));
  const hi = Math.max(e, ...pts.map((p) => p[0]));
  const padYears = Math.max(5, (hi - lo) * 0.03);
  return [lo - padYears, hi + padYears];
}

function fmtRange(s: Series, pt: [number, number], f: (v: number) => string): string {
  const r = s.ranges?.[pt[0]];
  return r ? `${f(r[0])}–${f(r[1])}` : f(pt[1]);
}
