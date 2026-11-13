import { useState } from 'react';
import type { WikiImage } from '../types';

/** A freely licensed Commons picture with its required credit line. */
export default function WikiPicture({ image, alt, className = '', height = 'h-40' }: { image: WikiImage; alt: string; className?: string; height?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <NoPicture className={className} />;
  return (
    <figure className={className}>
      <div className={`${height} overflow-hidden rounded-xl bg-ink-800 ring-1 ring-white/10`}>
        <img
          src={image.src}
          alt={alt}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      </div>
      <figcaption className="mt-1 truncate text-[10px] text-parchment-400">
        <a href={image.page} target="_blank" rel="noopener" className="hover:text-parchment-200 hover:underline" title={image.caption ?? image.file}>
          Picture: {image.artist} · {image.license} · Wikimedia Commons
        </a>
      </figcaption>
    </figure>
  );
}

/** Shown in place of a picture when no freely licensed one has been found yet. */
export function NoPicture({ className = '' }: { className?: string }) {
  return (
    <div className={`flex h-14 items-center justify-center rounded-xl border border-dashed border-white/15 bg-ink-800/60 px-3 text-center text-[11px] text-parchment-400 ${className}`}>
      No picture available yet
    </div>
  );
}
