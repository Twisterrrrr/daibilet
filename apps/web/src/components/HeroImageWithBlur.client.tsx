'use client';

import * as React from 'react';

/**
 * Adaptive hero image that chooses the best display strategy:
 * - Landscape image (wider than container): object-fit: contain, blurred background fills edges
 * - Portrait/square image (narrower than container): object-fit: cover with focal-point anchoring
 *
 * This ensures the hero is always filled while minimizing content cropping.
 */
export function HeroImageWithBlur({
  src,
  alt,
  className = '',
  style,
  priority = false,
  /** Override focal point for cover mode (e.g. 'center 25%'). */
  focalPoint,
}: {
  src: string | null;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  priority?: boolean;
  focalPoint?: string;
}) {
  const [isLandscape, setIsLandscape] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    if (!src) return;
    const img = new Image();
    img.src = src;
    img.onload = () => {
      // Heuristic: if image is wider than 4:3, treat as landscape.
      setIsLandscape(img.width / img.height > 1.33);
    };
    img.onerror = () => setIsLandscape(null);
  }, [src]);

  if (!src) return null;

  // While loading, show blurred background (safe default).
  const showContain = isLandscape === true;
  const showCover = isLandscape === false;

  return (
    <div
      className={`absolute inset-0 overflow-hidden bg-slate-900 ${className}`}
      style={style}
    >
      {/* Blurred background — always present, fills container */}
      <img
        src={src}
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full scale-110 object-cover blur-2xl opacity-50"
        loading={priority ? 'eager' : 'lazy'}
      />

      {/* Landscape mode: show full image, edges blend into blurred bg */}
      {showContain && (
        <img
          src={src}
          alt={alt}
          className="relative z-[1] h-full w-full object-contain opacity-90"
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
        />
      )}

      {/* Portrait/square mode: cover with focal point to minimize face cropping */}
      {showCover && (
        <img
          src={src}
          alt={alt}
          className="relative z-[1] h-full w-full object-cover opacity-80"
          style={{ objectPosition: focalPoint || 'center 25%' }}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
        />
      )}

      {/* Loading state: just blurred bg visible */}
      {isLandscape === null && (
        <div className="relative z-[1] h-full w-full" />
      )}
    </div>
  );
}
