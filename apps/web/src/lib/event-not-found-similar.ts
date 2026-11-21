import type { PublicCatalogListItemDto } from '@daibilet/contracts/public';

type CatalogPayload = {
  items?: PublicCatalogListItemDto[] | null;
  sessions?: PublicCatalogListItemDto[] | null;
} | null | undefined;

/**
 * Public catalog answers with `items` (PublicCatalogDto); keep the legacy
 * `sessions` alias so the event 404 keeps showing alternatives.
 */
export function resolveSimilarEvents(payload: CatalogPayload): PublicCatalogListItemDto[] {
  return payload?.items ?? payload?.sessions ?? [];
}
