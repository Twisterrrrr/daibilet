'use client';

import * as React from 'react';

const HERO_IMAGES = {
  landscape: '/images/hero/home-hero-friends-selfie.jpg',
  portrait: '/images/hero/home-hero-friends-selfie-mobile.jpg',
} as const;

export function HomeHeroBackground() {
  const [loaded, setLoaded] = React.useState(false);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <picture>
        <source media="(min-width: 768px)" srcSet={HERO_IMAGES.landscape} />
        <img
          src={HERO_IMAGES.portrait}
          alt=""
          width={1200}
          height={900}
          decoding="async"
          fetchPriority="high"
          onLoad={() => setLoaded(true)}
          className={`h-full w-full object-cover transition-opacity duration-700 md:object-[58%_42%] lg:object-[52%_40%] 2xl:object-[48%_38%] ${
            loaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      </picture>
      <div className="absolute inset-0 bg-slate-900/15" />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-900/30 to-slate-900/5" />
      <div className="absolute inset-0 bg-gradient-to-br from-sky-900/25 via-transparent to-primary-900/20" />
    </div>
  );
}
