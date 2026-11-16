/**
 * Decides which map markers to show so they don't pile on top of each other.
 * Pure (no DOM or map access), so it can be unit-tested: MapView projects the
 * markers to screen positions and applies the result.
 */

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PlaceItem {
  id: string;
  /** Full-size box on screen (event dot, or person icon + name). */
  box: Box;
  /** Smaller fallback box (person icon without its name), if there is one. */
  small?: Box;
  /** Higher goes first. */
  priority: number;
  /** Always shown (the selected marker), even if it overlaps. */
  must?: boolean;
  /** False when the point is on the far side of the globe. */
  visible: boolean;
}

/** 'hidden': off screen or behind the globe; 'crowded': on screen but no room (shows when zoomed in). */
export type Placement = 'full' | 'small' | 'hidden' | 'crowded';

/** Space kept between markers, in pixels. */
const GAP = 2;

const overlaps = (a: Box, b: Box) =>
  a.x < b.x + b.w + GAP && b.x < a.x + a.w + GAP && a.y < b.y + b.h + GAP && b.y < a.y + a.h + GAP;

const onScreen = (b: Box, view: { w: number; h: number }) => b.x + b.w > 0 && b.y + b.h > 0 && b.x < view.w && b.y < view.h;

/** Places markers in priority order; anything that would overlap an already placed marker is hidden. */
export function placeMarkers(items: PlaceItem[], view: { w: number; h: number }): Map<string, Placement> {
  const out = new Map<string, Placement>();
  const placed: Box[] = [];
  const order = [...items].sort((a, b) => Number(!!b.must) - Number(!!a.must) || b.priority - a.priority || a.id.localeCompare(b.id));
  for (const it of order) {
    if (!it.visible || !onScreen(it.box, view)) {
      out.set(it.id, 'hidden');
      continue;
    }
    if (it.must || !placed.some((p) => overlaps(p, it.box))) {
      placed.push(it.box);
      out.set(it.id, 'full');
    } else if (it.small && !placed.some((p) => overlaps(p, it.small!))) {
      placed.push(it.small);
      out.set(it.id, 'small');
    } else {
      out.set(it.id, 'crowded');
    }
  }
  return out;
}

/**
 * Whether a point faces the viewer on the globe: true when it is less than
 * about 80° of arc from the map centre (the rest is behind the horizon).
 */
export function facesViewer(point: [number, number], center: [number, number]): boolean {
  const rad = Math.PI / 180;
  const [l1, p1] = [point[0] * rad, point[1] * rad];
  const [l2, p2] = [center[0] * rad, center[1] * rad];
  const cos = Math.sin(p1) * Math.sin(p2) + Math.cos(p1) * Math.cos(p2) * Math.cos(l1 - l2);
  return cos > 0.17; // cos 80°
}
