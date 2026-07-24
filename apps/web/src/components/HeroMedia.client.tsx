'use client';

import { getImageProps } from 'next/image';
import * as React from 'react';

import { IMAGE_SIZES } from '@/components/SafeImage.client';
import {
  HERO_ULTRAWIDE_MEDIA,
  objectPositionForHeroSrc,
  ultrawideSrcForHeroSrc,
} from '@/lib/home-hero-images';

export type HeroMediaFrame = {
  src: string;
  alt?: string;
  objectPosition?: string;
  /** 21:9 кадр для ultrawide; иначе lookup по пулу. */
  ultrawideSrc?: string;
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
 * Ultrawide: <picture> source на широкий кадр (без раздувания высоты секции).
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
  const ultrawideSrc =
    active?.ultrawideSrc?.trim() || ultrawideSrcForHeroSrc(active?.src) || undefined;

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
        <HeroPicture
          key={active.src}
          src={active.src}
          ultrawideSrc={ultrawideSrc}
          alt={active.alt || ''}
          objectPosition={objectPosition}
          loaded={loaded}
          onLoad={() => setLoaded(true)}
        />
      ) : (
        <div className="absolute inset-0 bg-slate-900" />
      )}
      <div
        className={
          overlayClassName ||
          'absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-900/40 to-slate-900/20'
        }
      />
    </div>
  );
}

function HeroPicture({
  src,
  ultrawideSrc,
  alt,
  objectPosition,
  loaded,
  onLoad,
}: {
  src: string;
  ultrawideSrc?: string;
  alt: string;
  objectPosition: string;
  loaded: boolean;
  onLoad: () => void;
}) {
  const common = {
    alt,
    sizes: IMAGE_SIZES.homeHero,
    fill: true as const,
    priority: true as const,
  };

  const {
    props: { srcSet: defaultSrcSet, ...defaultRest },
  } = getImageProps({ ...common, src });

  const uwSrcSet = ultrawideSrc
    ? getImageProps({ ...common, src: ultrawideSrc }).props.srcSet
    : undefined;

  return (
    <picture>
      {uwSrcSet ? (
        <source media={HERO_ULTRAWIDE_MEDIA} srcSet={uwSrcSet} sizes={IMAGE_SIZES.homeHero} />
      ) : null}
      {/* eslint-disable-next-line jsx-a11y/alt-text -- alt comes from getImageProps */}
      <img
        {...defaultRest}
        alt={alt}
        srcSet={defaultSrcSet}
        onLoad={onLoad}
        className={`object-cover transition-opacity duration-700 ${objectPosition} ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </picture>
  );
}
