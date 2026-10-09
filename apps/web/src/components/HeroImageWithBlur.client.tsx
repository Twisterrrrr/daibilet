'use client';

import * as React from 'react';

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
    <img
      src={src}
      alt={alt}
      className={`absolute inset-0 h-full w-full object-cover opacity-80 ${className}`}
      style={{ objectPosition: focalPoint, ...style }}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
    />
  );
}
