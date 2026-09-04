'use client';

export type CitiesCatalogSort = 'popular' | 'name';

export function parseCitiesCatalogSort(raw: string | null | undefined): CitiesCatalogSort {
  return raw === 'name' ? 'name' : 'popular';
}
