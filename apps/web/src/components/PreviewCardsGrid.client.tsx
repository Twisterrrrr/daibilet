'use client';

import { useLayoutEffect, useMemo, useState } from 'react';

import { CatalogFeaturedCluster } from '@/components/CatalogFeaturedCluster';
import { EventCard } from '@/components/EventCard';
import {
  featuredIdsFromPreviewFlags,
  layoutCatalogFeaturedUnits,
  packCatalogFeaturedUnits,
} from '@/lib/catalog-featured';
import type { PreviewCardMock } from '@/lib/preview-cards-mock';

type PreviewCardsGridProps = {
  items: PreviewCardMock[];
};

/** Match `.preview-cards-grid`: 1 → md:2 → lg:3. */
function estimatePreviewGridColumns(viewportWidth: number): number {
  if (viewportWidth >= 1024) return 3;
  if (viewportWidth >= 768) return 2;
  return 1;
}

function usePreviewGridColumns(): number {
  const [columns, setColumns] = useState(() =>
    typeof window === 'undefined' ? 1 : estimatePreviewGridColumns(window.innerWidth),
  );

  useLayoutEffect(() => {
    const sync = () => setColumns(estimatePreviewGridColumns(window.innerWidth));
    sync();
    window.addEventListener('resize', sync);
    return () => window.removeEventListener('resize', sync);
  }, []);

  return columns;
}

/**
 * Isolated UX smoke grid: 1 / 2 (tablet) / 3 (desktop).
 * Below 3 cols: flat equal tiles + badge. lg+: magazine bento when aligned.
 */
export function PreviewCardsGrid({ items }: PreviewCardsGridProps) {
  const columns = usePreviewGridColumns();
  const featuredCount = items.filter((item) => item.isFeatured).length;
  const units = useMemo(() => {
    const featuredIds = featuredIdsFromPreviewFlags(items);
    const packed = packCatalogFeaturedUnits(items, featuredIds);
    return layoutCatalogFeaturedUnits(packed, columns);
  }, [items, columns]);

  const clusterCount = units.filter((unit) => unit.kind === 'cluster').length;
  const modeLabel =
    columns < 3
      ? `${columns === 1 ? 'mobile' : 'tablet'} ${columns} col: плоские плитки + бейдж (без bento)`
      : `desktop ${columns} col: bento-cluster ×${clusterCount}`;

  return (
    <div className="space-y-4">
      <p className="text-sm text-graphite-muted">
        Featured pin: {featuredCount} из {items.length} (каждая 4-я). Режим: {modeLabel}.
      </p>
      <ul className="preview-cards-grid">
        {units.map((unit, index) => {
          if (unit.kind === 'cluster') {
            return (
              <CatalogFeaturedCluster
                key={`cluster-${unit.featured.id}`}
                featured={unit.featured}
                stack={unit.stack}
                imagePriority={index === 0}
                suppressPurchaseAnchors
              />
            );
          }
          return (
            <li key={unit.session.id}>
              <EventCard
                session={unit.session}
                compact
                catalogDense={!unit.featured}
                catalogFeatured={unit.featured}
                imagePriority={index < 2}
                suppressPurchaseAnchors
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
