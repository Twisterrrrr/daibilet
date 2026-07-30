'use client';

import Image, { type ImageProps } from 'next/image';
import * as React from 'react';

export const IMAGE_SIZES = {
  /** Catalog / home event cards in grids */
  eventCard: '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
  /** Horizontal list thumb (sm:w-80) */
  eventCardHorizontal: '(max-width: 640px) 100vw, 20rem',
  /** Editorial city hub poster 4:5 */
  affichePoster: '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw',
  cityCard: '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw',
  institutionCard: '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw',
  landingCard: '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
  /** Full-width city-hub / catalog landing banners */
  landingBanner: '100vw',
  blogCard: '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
  /** Inline body photo (float ~20–28rem or standalone max-w-2xl) */
  blogInline: '(max-width: 640px) 100vw, (max-width: 1024px) 28rem, 42rem',
  blogThumb: '5rem',
  blogFeatured: '(max-width: 768px) 100vw, 60vw',
  searchThumb: '2.5rem',
  favoritesThumb: '4rem',
  eventHero: '100vw',
  homeHero: '100vw',
} as const;

type SafeImageProps = Omit<ImageProps, 'src' | 'alt'> & {
  src?: string | null;
  alt?: string;
  /** Shown when src empty or load fails */
  fallback?: React.ReactNode;
};

/**
 * next/image wrapper: webp/avif via optimizer, graceful fallback on error/empty src.
 * Parent must be `position: relative` when using `fill`.
 */
export function SafeImage({
  src,
  alt = '',
  fallback = null,
  onError,
  className,
  unoptimized,
  ...props
}: SafeImageProps) {
  const [failed, setFailed] = React.useState(false);
  const normalized = typeof src === 'string' ? src.trim() : '';

  React.useEffect(() => {
    setFailed(false);
  }, [normalized]);

  if (!normalized || failed) {
    return <>{fallback}</>;
  }

  // Local repo static (/images/*) is served by nginx alias on prod — skip /_next/image.
  const isLocalStatic = normalized.startsWith('/images/');

  return (
    <Image
      src={normalized}
      alt={alt}
      className={className}
      unoptimized={isLocalStatic || unoptimized}
      onError={(event) => {
        setFailed(true);
        onError?.(event);
      }}
      {...props}
    />
  );
}
