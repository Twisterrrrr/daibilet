'use client';

import * as React from 'react';

import { IMAGE_SIZES, SafeImage } from '@/components/SafeImage.client';
import { homeHeroObjectPositionClass, type HomeHeroImageSet } from '@/lib/home-hero-images';

type HomeHeroBackgroundProps = {
  image: HomeHeroImageSet;
};

export function HomeHeroBackground({ image }: HomeHeroBackgroundProps) {
  const [loaded, setLoaded] = React.useState(false);
  const position = homeHeroObjectPositionClass(image);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <SafeImage
        src={image.landscape}
        alt={image.alt}
        fill
        priority
        sizes={IMAGE_SIZES.homeHero}
        onLoad={() => setLoaded(true)}
        className={`hidden object-cover transition-opacity duration-700 md:block ${position} ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <SafeImage
        src={image.portrait}
        alt={image.alt}
        fill
        priority
        sizes={IMAGE_SIZES.homeHero}
        onLoad={() => setLoaded(true)}
        className={`object-cover transition-opacity duration-700 md:hidden ${position} ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
      {/* Text contrast - stronger dark wash so white titles read on busy photos */}
      <div className="absolute inset-0 bg-slate-950/40" />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-900/45 to-slate-950/25" />
      <div className="absolute inset-0 bg-gradient-to-br from-sky-900/20 via-transparent to-primary-900/15" />
    </div>
  );
}
