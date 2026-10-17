'use client';

import * as React from 'react';

import { homeHeroObjectPositionClass, type HomeHeroImageSet } from '@/lib/home-hero-images';

type HomeHeroBackgroundProps = {
  image: HomeHeroImageSet;
};

/**
 * One LCP fetch: native picture picks mobile or desktop. Do not priority both.
 * Filenames come from HOME_HERO_IMAGES (existing /images/home/hero-emotion-*.jpg).
 */
export function HomeHeroBackground({ image }: HomeHeroBackgroundProps) {
  const [loaded, setLoaded] = React.useState(false);
  const position = homeHeroObjectPositionClass(image);
  const mobile = image.portrait;
  const desktop = image.landscape;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <picture>
        <source media="(max-width: 768px)" srcSet={mobile} />
        <img
          src={desktop}
          alt={image.alt}
          fetchPriority="high"
          decoding="async"
          onLoad={() => setLoaded(true)}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${position} ${
            loaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      </picture>
      <div className="absolute inset-0 bg-slate-950/40" />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-900/45 to-slate-950/25" />
      <div className="absolute inset-0 bg-gradient-to-br from-sky-900/20 via-transparent to-primary-900/15" />
    </div>
  );
}
