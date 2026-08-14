'use client';

import * as React from 'react';

import { IMAGE_SIZES, SafeImage } from '@/components/SafeImage.client';
import { objectPositionForHeroSrc } from '@/lib/home-hero-images';

export type HeroMediaFrame = {
  src: string;
  alt?: string;
  objectPosition?: string;
};

type HeroMediaProps = {
  frames: HeroMediaFrame[];
  /** video loop when provided - skips image rotator */
  videoSrc?: string | null;
  intervalMs?: number;
  className?: string;
  /** Darker overlay for venues-style heroes */
  overlayClassName?: string;
};

/**
 * LCP-first hero media: next/image priority on active frame; optional rotator / video loop.
 * Missing objectPosition → pool lookup / face-safe default.
 * Same landscape src on all desktop widths (no ultrawide art-direction zoom).
 */
export function HeroMedia({
  frames,
  videoSrc,
  intervalMs = 7000,
  className = '',
  overlayClassName,
}: HeroMediaProps) {
  const valid = frames.filter((frame) => Boolean(frame.src?.trim()));
  const [index, setIndex] = React.useState(0);
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    if (videoSrc || valid.length <= 1) return;
    const id = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % valid.length);
      setLoaded(false);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [videoSrc, valid.length, intervalMs]);

  const active = valid[Math.min(index, Math.max(valid.length - 1, 0))];
  const objectPosition = active?.objectPosition?.trim() || objectPositionForHeroSrc(active?.src);

  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`.trim()} aria-hidden>
      {videoSrc ? (
        <video
          className={`absolute inset-0 h-full w-full object-cover ${objectPosition}`}
          src={videoSrc}
          autoPlay
          muted
          loop
          playsInline
          poster={active?.src}
        />
      ) : active ? (
        <SafeImage
          key={active.src}
          src={active.src}
          alt={active.alt || ''}
          fill
          priority
          sizes={IMAGE_SIZES.homeHero}
          onLoad={() => setLoaded(true)}
          className={`object-cover transition-opacity duration-700 ${objectPosition} ${
            loaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      ) : (
        <div className="absolute inset-0 bg-slate-900" />
      )}
      {/* Dark translucent wash so white titles stay readable on busy hero photos */}
      <div className="absolute inset-0 bg-slate-950/35" />
      <div
        className={
          overlayClassName ||
          'absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-900/50 to-slate-950/35'
        }
      />
    </div>
  );
}
