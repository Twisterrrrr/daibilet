'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { adminApiFetch } from '@/server/admin-api-fetch';
import type { AdminPdpDocument } from '@/server/admin-pdp-data';
import { VENUE_PAGE_CACHE_TAG } from '@/server/cache-config';

export async function saveAdminVenuePdpAction(venueId: string, venueSlug: string, document: AdminPdpDocument) {
  const id = String(venueId || '').trim();
  if (!id || !venueSlug) throw new Error('Не указана площадка.');
  const response = await adminApiFetch(`/api/admin/pdp/venues/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(document),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`PDP не сохранён (HTTP ${response.status})${detail ? `: ${detail.slice(0, 240)}` : ''}`);
  }
  revalidatePath(`/venues/${encodeURIComponent(venueSlug)}`);
  revalidatePath(`/places/${encodeURIComponent(venueSlug)}`);
  revalidateTag(VENUE_PAGE_CACHE_TAG, { expire: 0 });
  return await response.json() as AdminPdpDocument;
}
