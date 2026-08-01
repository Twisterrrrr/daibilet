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
      <div className="absolute inset-0 bg-[#122868]/20" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a174b]/75 via-[#122868]/35 to-[#122868]/10" />
      <div className="absolute inset-0 bg-gradient-to-br from-sky-900/25 via-transparent to-primary-900/20" />
    </div>
  );
}
