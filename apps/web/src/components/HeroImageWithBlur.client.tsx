'use client';

import * as React from 'react';
import { SafeImage } from '@/components/SafeImage.client';
import { resolveTeplohodPdpImage } from '@/lib/teplohod-pdp-image-map';

const EVENT_HERO_BACKDROP_SIZES = '360px';
const EVENT_HERO_FRAME_SIZES = '(min-aspect-ratio: 21/9) 1600px, (max-width: 1280px) 100vw, 1280px';

/** Keep the artwork inside the page container and use a softened monochrome bleed behind it. */
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
  const useTeplohodImage = Boolean(teplohodImage && failedTeplohodSrc !== src);
  const renderLayer = ({
    imageAlt,
    sizes,
    className: layerClassName,
    layerStyle,
    layerPriority = false,
  }: {
    imageAlt: string;
    sizes: string;
    className: string;
    layerStyle: React.CSSProperties;
    layerPriority?: boolean;
  }) => {
    const image = (
      <SafeImage
        src={useTeplohodImage && teplohodImage ? teplohodImage.fallback : src}
        alt={imageAlt}
        fill
        sizes={sizes}
        className={layerClassName}
        style={layerStyle}
        priority={layerPriority}
        onError={useTeplohodImage ? () => setFailedTeplohodSrc(src) : undefined}
      />
    );

    if (!useTeplohodImage || !teplohodImage) return image;
    return (
      <picture className="absolute inset-0">
        <source type="image/webp" srcSet={teplohodImage.srcSet} sizes={sizes} />
        {image}
      </picture>
    );
  };

  return (
    <>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        {renderLayer({
          imageAlt: '',
          sizes: EVENT_HERO_BACKDROP_SIZES,
          className: 'scale-110 object-cover grayscale blur-2xl',
          layerStyle: { objectPosition: focalPoint, opacity: 0.55, ...style },
        })}
      </div>
      <div
        className="pointer-events-none absolute inset-y-0 left-1/2 w-full -translate-x-1/2 overflow-hidden"
        style={{ maxWidth: 'var(--container-page-max)' }}
      >
        {renderLayer({
          imageAlt: alt,
          sizes: EVENT_HERO_FRAME_SIZES,
          className: `object-cover ${className}`,
          layerStyle: {
            objectPosition: focalPoint,
            opacity: 0.8,
            ...style,
            WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%)',
            maskImage: 'linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%)',
          },
          layerPriority: priority,
        })}
      </div>
    </>
  );
}
