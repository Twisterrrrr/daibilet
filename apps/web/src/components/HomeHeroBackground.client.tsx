'use client';

import { getImageProps } from 'next/image';
import * as React from 'react';

import { IMAGE_SIZES } from '@/components/SafeImage.client';
import {
  HERO_ULTRAWIDE_MEDIA,
  homeHeroObjectPositionClass,
  type HomeHeroImageSet,
} from '@/lib/home-hero-images';

type HomeHeroBackgroundProps = {
  image: HomeHeroImageSet;
};

export function HomeHeroBackground({ image }: HomeHeroBackgroundProps) {
  const [loaded, setLoaded] = React.useState(false);
  const position = homeHeroObjectPositionClass(image);

  const common = {
    alt: image.alt,
    sizes: IMAGE_SIZES.homeHero,
    fill: true as const,
    priority: true as const,
  };

  const {
    props: { srcSet: landscapeSrcSet, ...landscapeRest },
  } = getImageProps({ ...common, src: image.landscape });
  const {
    props: { srcSet: portraitSrcSet, ...portraitRest },
  } = getImageProps({ ...common, src: image.portrait });
  const uwSrcSet = image.ultrawide
    ? getImageProps({ ...common, src: image.ultrawide }).props.srcSet
    : undefined;

  const fade = `object-cover transition-opacity duration-700 ${position} ${
    loaded ? 'opacity-100' : 'opacity-0'
  }`;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Desktop / tablet: landscape + optional ultrawide alternate */}
      <picture className="absolute inset-0 hidden md:block">
        {uwSrcSet ? (
          <source media={HERO_ULTRAWIDE_MEDIA} srcSet={uwSrcSet} sizes={IMAGE_SIZES.homeHero} />
        ) : null}
        {/* eslint-disable-next-line jsx-a11y/alt-text -- alt from props */}
        <img
          {...landscapeRest}
          alt={image.alt}
          srcSet={landscapeSrcSet}
          onLoad={() => setLoaded(true)}
          className={`hidden md:block ${fade}`}
        />
      </picture>
      {/* Mobile portrait */}
      <picture className="absolute inset-0 md:hidden">
        {/* eslint-disable-next-line jsx-a11y/alt-text -- alt from props */}
        <img
          {...portraitRest}
          alt={image.alt}
          srcSet={portraitSrcSet}
          onLoad={() => setLoaded(true)}
          className={`md:hidden ${fade}`}
        />
      </picture>
      <div className="absolute inset-0 bg-slate-900/15" />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-900/30 to-slate-900/5" />
      <div className="absolute inset-0 bg-gradient-to-br from-sky-900/25 via-transparent to-primary-900/20" />
    </div>
  );
}
