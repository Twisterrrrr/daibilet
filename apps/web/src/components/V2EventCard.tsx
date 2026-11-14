import Link from 'next/link';
import { Star } from 'lucide-react';

import { SafeImage } from '@/components/SafeImage.client';
import { formatPriceFrom } from '@/lib/format';
import { collectCatalogLabels } from '@/lib/catalog-labels';
import type { PublicCatalogListItemDto } from '@daibilet/contracts/public';

/** Карточка события нового шаблона (`.event-card`) — общая для главной и афиши. */
export function V2EventCard({ item }: { item: PublicCatalogListItemDto }) {
  const href = `/events/${item.eventPageSlug || item.slug || ''}`;
  const tag = collectCatalogLabels(item, 1)[0] || item.category;
  return (
    <Link href={href} className="event-card">
      <div className="event-card__media">
        {item.imageUrl ? <SafeImage src={item.imageUrl} alt="" fill sizes="300px" className="object-cover" /> : null}
        <span className="event-card__tag">{tag}</span>
      </div>
      <div className="event-card__body">
        <div className="event-card__date">
          {item.dateLabel}
          {item.timeLabel ? `, ${item.timeLabel}` : ''}
        </div>
        <span className="event-card__title">{item.title}</span>
        <div className="event-card__venue">
          {item.venue}
          {item.venueMetroStation ? ` · м. ${item.venueMetroStation}` : ''}
        </div>
        <div className="event-card__foot">
          {item.rating?.value ? (
            <div className="rating">
              <Star className="h-3.5 w-3.5 fill-current" aria-hidden />
              {item.rating.value} <span>({item.rating.count})</span>
            </div>
          ) : (
            <span />
          )}
          {item.priceFrom ? <div className="price">{formatPriceFrom(item.priceFrom)}</div> : null}
        </div>
      </div>
    </Link>
  );
}