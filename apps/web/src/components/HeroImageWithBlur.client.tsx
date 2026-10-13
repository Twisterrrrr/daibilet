'use client';

import * as React from 'react';
import { SafeImage, IMAGE_SIZES } from '@/components/SafeImage.client';

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
  if (!src) return null;

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
