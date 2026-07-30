import type { PublicCatalogListItemDto, PublicSessionDto } from '@daibilet/contracts/public';

import { resolveCityCardImage } from '@/lib/city-images';

type EventCardImageSource = Pick<
  PublicCatalogListItemDto | PublicSessionDto,
  'imageUrl' | 'city' | 'destination'
> & {
  citySlug?: string | null;
  sourceCitySlug?: string | null;
};

/**
 * Last-resort cover when primary `imageUrl` is empty or fails to load (404 / broken CDN).
 * Prefer city asset on disk over empty SafeImage fallback.
 */
export function resolveEventCardFallbackImage(session: EventCardImageSource): string | null {
  const cityName = String(session.city || session.destination || '').trim() || 'город';
  return resolveCityCardImage({
    slug: session.citySlug,
    sourceSlug: 'sourceCitySlug' in session ? session.sourceCitySlug : undefined,
    name: cityName,
    heroImageUrl: null,
  });
}
