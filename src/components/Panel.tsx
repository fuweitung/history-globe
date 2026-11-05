import { useEffect, useRef, useState, type ReactNode } from 'react';

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

type Snap = 'peek' | 'half' | 'full';
const SNAP_VH: Record<Snap, number> = { peek: 42, half: 66, full: 94 };

interface Props {
  open: boolean;
  onClose: () => void;
  /** Changes whenever new content is shown, so the panel can scroll to top / re-open. */
  contentKey: string;
  title: string;
  children: ReactNode;
}

/**
 * Side panel on desktop, draggable bottom sheet on mobile.
 */
export default function Panel({ open, onClose, contentKey, title, children }: Props) {
  const isDesktop = useIsDesktop();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [snap, setSnap] = useState<Snap>('peek');
  const [dragPx, setDragPx] = useState<number | null>(null);
  const dragStart = useRef<{ y: number; h: number } | null>(null);
  const rootRef = useRef<HTMLElement>(null);

  // A closed panel is moved off-screen; make it inert so nothing inside can take focus.
  useEffect(() => {
    if (rootRef.current) rootRef.current.inert = !open;
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
    // New content opens at "peek" so the map stays visible; drag or tap the handle to expand.
    if (snap === 'full') setSnap('peek');
  }, [contentKey]);

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
        className={`pointer-events-auto absolute top-3 right-3 bottom-[calc(var(--tl-h,140px)+4px)] z-20 flex w-[440px] max-w-[calc(100vw-24px)] flex-col overflow-hidden rounded-2xl bg-ink-900/92 shadow-2xl ring-1 ring-white/10 backdrop-blur-md transition-all duration-300 ${
          open ? 'translate-x-0 opacity-100' : 'pointer-events-none translate-x-[110%] opacity-0'
        }`}
      >
        <CloseButton onClose={onClose} />
        <div ref={scrollRef} className="scroll-thin flex-1 overflow-y-auto overscroll-contain">
          {children}
        </div>
      </aside>
    );
  }

  // ── Mobile bottom sheet ──
  // The sheet sits above the timeline (its height is published as --tl-h by App).
  const tl = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tl-h')) || 0;
  const avail = window.innerHeight - tl;
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
      <div ref={scrollRef} className="scroll-thin min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {children}
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
