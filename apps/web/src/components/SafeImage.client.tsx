'use client';

import Image, { type ImageProps } from 'next/image';
import * as React from 'react';

import { blogListingImageFallbacks, listingImageFallbacks } from '@/lib/card-image';
import {
  CATALOG_EVENT_CARD_HORIZONTAL_SIZES,
  CATALOG_EVENT_CARD_SIZES,
  CATALOG_IMAGE_QUALITY,
} from '@/lib/catalog-image-sizes';
import { shouldBypassNextImageOptimizer } from '@/lib/remote-image-bypass';
import { venueCardImageFallbacks } from '@/lib/venue-card-image';

export { CATALOG_IMAGE_QUALITY } from '@/lib/catalog-image-sizes';

export const IMAGE_SIZES = {
  eventCard: CATALOG_EVENT_CARD_SIZES,
  eventCardHorizontal: CATALOG_EVENT_CARD_HORIZONTAL_SIZES,
  /** Editorial city hub poster 4:5 */
  affichePoster: '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw',
  cityCard: '(max-width: 640px) 68vw, (max-width: 1024px) 218px, 229px',
  /** /places + venue/location cards: 1 / 2 / 3 col, not 100vw */
  institutionCard: '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
  placeCard: '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
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
  /** My Day must-see grid thumb (~4.5–6rem) */
  dayMustSeeThumb: '6rem',
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

  // Local /images/* and external CDNs (teplohod, ticketscloud): browser fetches directly.
  // Listing cards: CardSafeImage tries -card then -thumb; this bypass cannot resize originals.
  const bypassOptimizer = shouldBypassNextImageOptimizer(normalized);

  return (
    <Image
      src={normalized}
      alt={alt}
      className={className}
      unoptimized={bypassOptimizer || unoptimized}
      onError={(event) => {
        setFailed(true);
        onError?.(event);
      }}
      {...props}
    />
  );
}

/**
 * Listing cards: `-card.jpg` → `-thumb.jpg` (places pack) → original → `fallback`.
 * If `src` is already `-thumb`, thumb is tried first so a missing sidecar
 * falls through to the original instead of an empty placeholder.
 * PDP / heroes should keep using SafeImage with the editorial path.
 */
export function CardSafeImage({ src, fallback = null, ...props }: SafeImageProps) {
  const value = typeof src === 'string' ? src.trim() : '';
  const chain =
    value.startsWith('/images/venues/') && !value.includes('/generated/')
      ? venueCardImageFallbacks(value)
      : listingImageFallbacks(src);
  if (!chain.length) return <>{fallback}</>;
  return chain.reduceRight(
    (next, url) => <SafeImage src={url} fallback={next} {...props} />,
    fallback,
  );
}

/** /blog + home + hub teasers: `*-og.jpg` → `-card` → `-thumb` → original cover. */
export function BlogCardSafeImage({
  slug,
  coverImageUrl,
  fallback = null,
  ...props
}: SafeImageProps & { slug?: string | null; coverImageUrl?: string | null }) {
  const chain = blogListingImageFallbacks({ slug, coverImageUrl });
  if (!chain.length) return <>{fallback}</>;
  return chain.reduceRight(
    (next, url) => <SafeImage src={url} fallback={next} {...props} />,
    fallback,
  );
}
