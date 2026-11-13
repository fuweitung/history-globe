import { useEffect, useRef, useState, type ReactNode } from 'react';
import ErrorBoundary from './ErrorBoundary';

export function useIsDesktop(): boolean {
  const query = '(min-width: 768px)';
  const [match, setMatch] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatch(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return match;
}

/** Window height, kept up to date on resize and rotation (and 0 → real value when a hidden tab becomes visible). */
function useWindowHeight(): number {
  const [h, setH] = useState(() => window.innerHeight);
  useEffect(() => {
    const on = () => setH(window.innerHeight);
    window.addEventListener('resize', on);
    window.visualViewport?.addEventListener('resize', on);
    document.addEventListener('visibilitychange', on);
    return () => {
      window.removeEventListener('resize', on);
      window.visualViewport?.removeEventListener('resize', on);
      document.removeEventListener('visibilitychange', on);
    };
  }, []);
  return h;
}

export type Snap = 'peek' | 'half' | 'full';
const SNAP_VH: Record<Snap, number> = { peek: 42, half: 66, full: 94 };

interface Props {
  open: boolean;
  onClose: () => void;
  /** Changes whenever new content is shown, so the panel can scroll to top / re-open. */
  contentKey: string;
  title: string;
  /** Wider desktop panel (used by the compare view). */
  wide?: boolean;
  /** Mobile sheet height when new content opens. */
  snapOnOpen?: Snap;
  children: ReactNode;
}

/**
 * Side panel on desktop, draggable bottom sheet on mobile.
 */
export default function Panel({ open, onClose, contentKey, title, wide = false, snapOnOpen = 'peek', children }: Props) {
  const isDesktop = useIsDesktop();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [snap, setSnap] = useState<Snap>('peek');
  const [dragPx, setDragPx] = useState<number | null>(null);
  const dragStart = useRef<{ y: number; h: number } | null>(null);
  const rootRef = useRef<HTMLElement>(null);
  const windowHeight = useWindowHeight();
  const returnFocus = useRef<HTMLElement | null>(null);

  // A closed panel is moved off-screen; make it inert so nothing inside can take focus.
  useEffect(() => {
    if (rootRef.current) rootRef.current.inert = !open;
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
    // New content opens at "peek" so the map stays visible (stories open taller so Next is reachable).
    setSnap(snapOnOpen);
  }, [contentKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard and screen-reader users: move focus into the panel when new content
  // opens (unless something inside already took it, e.g. the search box), and give
  // it back to where it was when the panel closes.
  useEffect(() => {
    const root = rootRef.current;
    if (!open || !root) return;
    const active = document.activeElement as HTMLElement | null;
    if (active && !root.contains(active) && active !== document.body) returnFocus.current ??= active;
    if (!root.contains(document.activeElement)) scrollRef.current?.focus({ preventScroll: true });
  }, [open, contentKey]);
  useEffect(() => {
    if (open) return;
    const el = returnFocus.current;
    returnFocus.current = null;
    if (el?.isConnected && rootRef.current?.contains(document.activeElement)) el.focus({ preventScroll: true });
    else if (el?.isConnected && document.activeElement === document.body) el.focus({ preventScroll: true });
  }, [open]);

  // Escape closes
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (isDesktop) {
    return (
      <aside
        ref={rootRef}
        aria-label={title}
        aria-hidden={!open}
        className={`pointer-events-auto absolute top-[calc(0.75rem+var(--banner-h,0px))] right-3 bottom-[calc(var(--tl-h,140px)+4px)] z-20 flex ${wide ? 'w-[min(760px,calc(100vw-24px))]' : 'w-[440px]'} max-w-[calc(100vw-24px)] flex-col overflow-hidden rounded-2xl bg-ink-900/92 shadow-2xl ring-1 ring-white/10 backdrop-blur-md transition-all duration-300 ${
          open ? 'translate-x-0 opacity-100' : 'pointer-events-none translate-x-[110%] opacity-0'
        }`}
      >
        <CloseButton onClose={onClose} />
        <div ref={scrollRef} tabIndex={-1} aria-label={title} className="scroll-thin flex-1 overflow-y-auto overscroll-contain focus:outline-none">
          <PanelContent contentKey={contentKey}>{children}</PanelContent>
        </div>
      </aside>
    );
  }

  // ── Mobile bottom sheet ──
  // The sheet sits above the timeline (its height is published as --tl-h by App).
  const tl = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tl-h')) || 0;
  const avail = Math.max(0, windowHeight - tl);
  const vh = avail / 100;
  const height = dragPx ?? SNAP_VH[snap] * vh;

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragStart.current = { y: e.clientY, h: height };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragStart.current) return;
    const h = dragStart.current.h + (dragStart.current.y - e.clientY);
    setDragPx(Math.max(60, Math.min(avail * 0.95, h)));
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (!dragStart.current) return;
    const moved = Math.abs(e.clientY - dragStart.current.y);
    const h = dragPx ?? height;
    dragStart.current = null;
    setDragPx(null);
    if (moved < 6) {
      // Tap on handle cycles size
      setSnap((s) => (s === 'peek' ? 'half' : s === 'half' ? 'full' : 'peek'));
      return;
    }
    const v = h / vh;
    if (v < 18) {
      onClose();
      setSnap('peek');
    } else {
      const nearest = (Object.keys(SNAP_VH) as Snap[]).reduce((a, b) => (Math.abs(SNAP_VH[b] - v) < Math.abs(SNAP_VH[a] - v) ? b : a));
      setSnap(nearest);
    }
  };

  return (
    <section
      ref={rootRef}
      aria-label={title}
      aria-hidden={!open}
      className={`pointer-events-auto absolute inset-x-0 bottom-[var(--tl-h,0px)] z-30 flex flex-col rounded-t-3xl bg-ink-900/96 shadow-[0_-12px_40px_rgba(0,0,0,0.5)] ring-1 ring-white/10 backdrop-blur-md ${
        dragPx === null ? 'transition-[height,transform] duration-300 ease-out' : ''
      } ${open ? 'translate-y-0' : 'pointer-events-none translate-y-[calc(100%+var(--tl-h,0px))]'}`}
      style={{ height }}
    >
      <div
        className="flex shrink-0 cursor-grab touch-none flex-col items-center pt-2.5 pb-1 active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        role="button"
        aria-label="Drag to resize panel, tap to expand"
      >
        <div className="h-1.5 w-12 rounded-full bg-parchment-300/50" />
      </div>
      <CloseButton onClose={onClose} />
      <div ref={scrollRef} tabIndex={-1} aria-label={title} className="scroll-thin min-h-0 flex-1 overflow-y-auto overscroll-contain focus:outline-none">
        <PanelContent contentKey={contentKey}>{children}</PanelContent>
      </div>
    </section>
  );
}

function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label="Close panel"
      className="absolute top-3 right-3 z-10 grid size-8 place-items-center rounded-full bg-ink-700/80 text-parchment-200 ring-1 ring-white/10 transition hover:bg-ink-600 hover:text-parchment-50 focus-visible:outline-2 focus-visible:outline-gold-400"
    >
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <path d="M6 6l12 12M18 6L6 18" />
      </svg>
    </button>
  );
}

/** A crash inside one panel shows a message there and leaves the map and timeline working. */
function PanelContent({ contentKey, children }: { contentKey: string; children: ReactNode }) {
  return (
    <ErrorBoundary
      resetKey={contentKey}
      fallback={(reset) => (
        <div role="alert" className="px-5 pt-14 pb-8 text-sm text-parchment-200">
          <p className="font-semibold text-parchment-50">This panel couldn’t be shown.</p>
          <p className="mt-1 text-parchment-300">Something in its data went wrong. The map and timeline still work.</p>
          <button type="button" onClick={reset} className="mt-4 rounded-xl bg-gold-400 px-4 py-2 text-sm font-bold text-ink-900 hover:bg-gold-300">
            Try again
          </button>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}
