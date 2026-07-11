'use client';

import * as React from 'react';

function buildOsmEmbedUrl(lat: number, lng: number, aspectRatio: number): string {
  const lonHalf = 0.006;
  const safeAspect = Math.max(0.35, Math.min(3.5, aspectRatio || 1.6));
  const latHalf = lonHalf / safeAspect;
  const bbox = `${lng - lonHalf},${lat - latHalf},${lng + lonHalf},${lat + latHalf}`;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;
}

export function OsmMapEmbed({
  lat,
  lng,
  title,
  className,
}: {
  lat: number;
  lng: number;
  title: string;
  className?: string;
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [embedSrc, setEmbedSrc] = React.useState(() => buildOsmEmbedUrl(lat, lng, 16 / 9));

  React.useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const update = () => {
      const { width, height } = node.getBoundingClientRect();
      if (width <= 0 || height <= 0) return;
      setEmbedSrc(buildOsmEmbedUrl(lat, lng, width / height));
    };

    update();
    const observer = new ResizeObserver(() => update());
    observer.observe(node);
    return () => observer.disconnect();
  }, [lat, lng]);

  return (
    <div ref={containerRef} className={className}>
      <iframe title={title} src={embedSrc} className="h-full w-full border-0" loading="lazy" />
    </div>
  );
}
