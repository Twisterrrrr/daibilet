'use client';

import * as React from 'react';
import { SafeImage, IMAGE_SIZES } from '@/components/SafeImage.client';
import { resolveTeplohodPdpImage } from '@/lib/teplohod-pdp-image-map';

/**
 * Simple hero image that fills the container width.
 * Uses object-fit: cover with configurable focal point.
 */
export function HeroImageWithBlur({
  src,
  alt,
  className = '',
  style,
  priority = false,
  focalPoint = 'center 25%',
}: {
  src: string | null;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  priority?: boolean;
  focalPoint?: string;
}) {
  const [failedTeplohodSrc, setFailedTeplohodSrc] = React.useState<string | null>(null);
  if (!src) return null;

  const teplohodImage = resolveTeplohodPdpImage(src);
  if (teplohodImage && failedTeplohodSrc !== src) {
    return (
      <picture className="absolute inset-0">
        <source
          type="image/webp"
          srcSet={teplohodImage.srcSet}
          sizes={IMAGE_SIZES.eventHero}
        />
        <SafeImage
          src={teplohodImage.fallback}
          alt={alt}
          fill
          sizes={IMAGE_SIZES.eventHero}
          className={`object-cover ${className}`}
          style={{ objectPosition: focalPoint, opacity: 0.8, ...style }}
          priority={priority}
          onError={() => setFailedTeplohodSrc(src)}
        />
      </picture>
    );
  }

  return (
    <SafeImage
      src={src}
      alt={alt}
      fill
      sizes={IMAGE_SIZES.eventHero}
      className={`object-cover ${className}`}
      style={{ objectPosition: focalPoint, opacity: 0.8, ...style }}
      priority={priority}
    />
  );
}
