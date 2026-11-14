'use client';

import { EventCard } from '@/components/EventCard';
import type { PreviewCardMock } from '@/lib/preview-cards-mock';

type PreviewCardsGridProps = {
  items: PreviewCardMock[];
};

/** Isolated smoke grid: equal tiles only (featured bento rolled back). */
export function PreviewCardsGrid({ items }: PreviewCardsGridProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-graphite-muted">
        Равная сетка {items.length} карточек (1 → 2 → 3 колонки). Featured/bento отключён.
      </p>
      <ul className="preview-cards-grid">
        {items.map((session, index) => (
          <li key={session.id}>
            <EventCard
              session={session}
              compact
              catalogDense
              imagePriority={index < 2}
              suppressPurchaseAnchors
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
