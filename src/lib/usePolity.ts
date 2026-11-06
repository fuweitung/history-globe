import { useEffect, useState } from 'react';
import type { FullPolity } from '../types';
import { getLoadedPolity, imagesLoaded, loadImages, loadPolity } from './data';

/** The full civilisation for `id`, loading it if needed. `polity` is null while loading. */
export function usePolity(id: string | null): { polity: FullPolity | null; error: Error | null; retry: () => void } {
  const [, setTick] = useState(0);
  const [error, setError] = useState<{ id: string; error: Error } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const polity = id ? (getLoadedPolity(id) ?? null) : null;

  useEffect(() => {
    if (!id || getLoadedPolity(id)) return;
    let cancelled = false;
    loadPolity(id)
      .then(() => !cancelled && setTick((t) => t + 1))
      .catch((e: Error) => !cancelled && setError({ id, error: e }));
    return () => {
      cancelled = true;
    };
  }, [id, attempt]);

  return {
    polity,
    error: !polity && error && error.id === id ? error.error : null,
    retry: () => {
      setError(null);
      setAttempt((a) => a + 1);
    },
  };
}

/** True once the picture index has loaded; starts loading it on first use. */
export function useImages(): boolean {
  const [ready, setReady] = useState(imagesLoaded);
  useEffect(() => {
    if (ready) return;
    let cancelled = false;
    loadImages()
      .then(() => !cancelled && setReady(true))
      .catch(() => {}); // pictures are optional; the panel works without them
    return () => {
      cancelled = true;
    };
  }, [ready]);
  return ready;
}
