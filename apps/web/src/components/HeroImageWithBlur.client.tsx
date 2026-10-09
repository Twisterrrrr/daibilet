'use client';

import * as React from 'react';

/**
 * Hero image that shows the full artwork without cropping.
 * Background: blurred, scaled-up version of the same image (fills container).
 * Foreground: actual image centered with object-fit: contain.
 * Edges blend naturally between blurred bg and the image.
 */
export function HeroImageWithBlur({
  src,
  alt,
  className = '',
  style,
  priority = false,
}: {
  src: string | null;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  priority?: boolean;
}) {
  if (!src) return null;

  return (
    <div
      className={`absolute inset-0 overflow-hidden ${className}`}
      style={style}
    >
      {/* Blurred background layer — fills entire container */}
      <img
        src={src}
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full scale-110 object-cover blur-2xl opacity-60"
        loading={priority ? 'eager' : 'lazy'}
      />
      {/* Actual image — centered, not cropped */}
      <img
        src={src}
        alt={alt}
        className="relative z-[1] h-full w-full object-contain opacity-90"
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
      />
    </div>
  );
}
