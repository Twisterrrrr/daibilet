import { EventCard } from '@/components/EventCard';
import type { PublicCatalogListItemDto } from '@daibilet/contracts/public';

type CatalogFeaturedClusterProps = {
  featured: PublicCatalogListItemDto;
  stack: [PublicCatalogListItemDto, PublicCatalogListItemDto];
  /** First cards in viewport - eager images. */
  imagePriority?: boolean;
  suppressPurchaseAnchors?: boolean;
};

/**
 * Magazine / Apple News style: hero left (2 rows), two compact cards stacked right.
 * Mount only when layout yields a cluster (lg+ / 3+ columns). Tablet/mobile flatten
 * to equal cards + «Выбор редакции» badge - no full-row hole in a 2-col grid.
 */
export function CatalogFeaturedCluster({
  featured,
  stack,
  imagePriority = false,
  suppressPurchaseAnchors = false,
}: CatalogFeaturedClusterProps) {
  return (
    <li className="catalog-featured-cluster-item">
      <div className="catalog-featured-cluster">
        <div className="catalog-featured-cluster__hero">
          <EventCard
            session={featured}
            compact
            catalogFeatured
            imagePriority={imagePriority}
            suppressPurchaseAnchors={suppressPurchaseAnchors}
          />
        </div>
        <div className="catalog-featured-cluster__stack">
          {stack.map((session, index) => (
            <div key={`${session.id}-${session.startsAt}`} className="min-h-0">
              <EventCard
                session={session}
                compact
                catalogDense
                imagePriority={imagePriority && index === 0}
                suppressPurchaseAnchors={suppressPurchaseAnchors}
              />
            </div>
          ))}
        </div>
      </div>
    </li>
  );
}
