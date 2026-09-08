'use client';

import { EventCard } from '@/components/EventCard';
import type { PreviewCardMock } from '@/lib/preview-cards-mock';

type PreviewCardsGridProps = {
  items: PreviewCardMock[];
};

/**
 * Isolated UX smoke grid: explicit 1/2/3 cols + featured `md:col-span-2`.
 * Does not use production `catalog-card-grid` (4-col ultrawide) so breakpoints stay predictable.
 */
export function PreviewCardsGrid({ items }: PreviewCardsGridProps) {
  const featuredCount = items.filter((item) => item.isFeatured).length;

  return (
    <div className="space-y-4">
      <p className="text-sm text-graphite-muted">
        Featured pin: {featuredCount} из {items.length} (каждая 4-я). На mobile span сбрасывается в 1
        колонку.
      </p>
      <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-3">
        {items.map((item, index) => {
          const featured = item.isFeatured;
          return (
            <li key={item.id} className={featured ? 'md:col-span-2' : undefined}>
              <EventCard
                session={item}
                compact
                catalogDense={!featured}
                catalogFeatured={featured}
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
