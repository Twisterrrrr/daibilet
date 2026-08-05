'use client';

import { useEffect, useRef } from 'react';

/**
 * Intersection Observer sentinel for catalog infinite scroll
 * (same UX pattern as events «Показать ещё» / blog cursor feed).
 */
export function CatalogInfiniteSentinel({
  enabled,
  onIntersect,
  rootMargin = '400px 0px',
}: {
  enabled: boolean;
  onIntersect: () => void;
  rootMargin?: string;
}) {
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const onIntersectRef = useRef(onIntersect);
  onIntersectRef.current = onIntersect;

  useEffect(() => {
    if (!enabled) return;
    const node = nodeRef.current;
    if (!node) return;
    if (typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          onIntersectRef.current();
        }
      },
      { rootMargin, threshold: 0 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled, rootMargin]);

  if (!enabled) return null;
  return <div ref={nodeRef} className="h-8 w-full" aria-hidden />;
}
