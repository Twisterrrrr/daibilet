'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { adminApiFetch } from '@/server/admin-api-fetch';

function emptyToNull(value: FormDataEntryValue | null): string | null {
  const trimmed = String(value || '').trim();
  return trimmed ? trimmed : null;
}

export async function saveAdminVenueAction(formData: FormData) {
  const id = String(formData.get('id') || '').trim();
  if (!id) throw new Error('missing venue id');

  const body = {
    title: String(formData.get('title') || '').trim(),
    shortDescription: emptyToNull(formData.get('shortDescription')),
    description: emptyToNull(formData.get('description')),
    heroImageUrl: emptyToNull(formData.get('heroImageUrl')),
    seoH1: emptyToNull(formData.get('seoH1')),
    seoTitle: emptyToNull(formData.get('seoTitle')),
    seoDescription: emptyToNull(formData.get('seoDescription')),
    canonicalPath: emptyToNull(formData.get('canonicalPath')),
    metroStation: emptyToNull(formData.get('metroStation')),
    wayToFind: emptyToNull(formData.get('wayToFind')),
    parkingInfo: emptyToNull(formData.get('parkingInfo')),
    isIndexable: formData.get('isIndexable') === 'on' || formData.get('isIndexable') === 'true',
    kind: String(formData.get('kind') || 'VENUE').trim(),
    pageStatus: String(formData.get('pageStatus') || 'NONE').trim(),
  };

  const response = await adminApiFetch(`/api/admin/venues/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`venue save failed HTTP ${response.status}${text ? `: ${text.slice(0, 200)}` : ''}`);
  }

  revalidatePath('/admin/venues');
  revalidatePath(`/admin/venues/${id}`);
  redirect(`/admin/venues/${encodeURIComponent(id)}?saved=1`);
}
