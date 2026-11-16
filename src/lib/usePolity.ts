import { useEffect, useState } from 'react';
import type { FullPolity } from '../types';
import { eventDetailsLoaded, getLoadedPolity, imagesLoaded, loadEventDetails, loadImages, loadPeopleDetails, loadPolity, peopleDetailsLoaded } from './data';

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

/** True once `isLoaded()`; calls `load()` on first use and re-renders when it finishes. */
function useLoaded(isLoaded: () => boolean, load: () => Promise<unknown>): boolean {
  const [ready, setReady] = useState(isLoaded);
  useEffect(() => {
    if (ready) return;
    let cancelled = false;
    load()
      .then(() => !cancelled && setReady(true))
      .catch(() => {}); // the panel shows "couldn't load" text instead
    return () => {
      cancelled = true;
    };
  }, [ready, load]);
  return ready;
}

/** Event descriptions and sources (one shared file, loaded on first use). */
export const useEventDetails = () => useLoaded(eventDetailsLoaded, loadEventDetails);
/** People's descriptions, Wikipedia titles, sources and pictures (loaded on first use). */
export const usePeopleDetails = () => useLoaded(peopleDetailsLoaded, loadPeopleDetails);
