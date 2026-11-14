'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { adminApiFetch } from '@/server/admin-api-fetch';
import type { AdminPdpDocument } from '@/server/admin-pdp-data';
import { EVENT_PAGE_CACHE_TAG, VENUE_PAGE_CACHE_TAG, eventPageCacheTag } from '@/server/cache-config';

export async function saveAdminPdpAction(entity: 'venues' | 'events', entityId: string, entitySlug: string, document: AdminPdpDocument) {
  if (entity !== 'venues' && entity !== 'events') throw new Error('Неподдерживаемый тип PDP.');
  const id = String(entityId || '').trim();
  if (!id || !entitySlug) throw new Error('Не указана сущность для PDP.');
  const response = await adminApiFetch(`/api/admin/pdp/${entity}/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(document),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`PDP не сохранён (HTTP ${response.status})${detail ? `: ${detail.slice(0, 240)}` : ''}`);
  }
  if (entity === 'venues') {
    revalidatePath(`/venues/${encodeURIComponent(entitySlug)}`);
    revalidatePath(`/places/${encodeURIComponent(entitySlug)}`);
    revalidateTag(VENUE_PAGE_CACHE_TAG, { expire: 0 });
  } else {
    revalidatePath(`/events/${encodeURIComponent(entitySlug)}`);
    revalidateTag(EVENT_PAGE_CACHE_TAG, { expire: 0 });
    revalidateTag(eventPageCacheTag(entitySlug), { expire: 0 });
  }
  return await response.json() as AdminPdpDocument;
}
