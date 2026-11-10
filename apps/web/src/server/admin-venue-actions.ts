'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { adminApiFetch } from '@/server/admin-api-fetch';

function emptyToNull(value: FormDataEntryValue | null): string | null {
  const trimmed = String(value || '').trim();
  return trimmed ? trimmed : null;
}

function numberToNull(value: FormDataEntryValue | null): number | null {
  const text = String(value || '').trim();
  if (!text) return null;
  const number = Number(text);
  if (!Number.isFinite(number)) throw new Error('Координаты должны быть числами');
  return number;
}

/** Carry the list context (back) through save redirects so the operator returns to the same selection. */
function backSuffix(formData: FormData): string {
  const back = String(formData.get('back') || '').trim();
  return /^\/admin\/venues(?:\?|$)/.test(back) ? `&back=${encodeURIComponent(back)}` : '';
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
    cityId: emptyToNull(formData.get('cityId')),
    address: emptyToNull(formData.get('address')),
    latitude: numberToNull(formData.get('latitude')),
    longitude: numberToNull(formData.get('longitude')),
    websiteUrl: emptyToNull(formData.get('websiteUrl')),
    phone: emptyToNull(formData.get('phone')),
    openingHours: emptyToNull(formData.get('openingHours')),
    hookFact: emptyToNull(formData.get('hookFact')),
    isIndexable: formData.get('isIndexable') === 'on' || formData.get('isIndexable') === 'true',
    kind: String(formData.get('kind') || 'VENUE').trim(),
    placeType: emptyToNull(formData.get('placeType')),
    placeSubtype: emptyToNull(formData.get('placeSubtype')),
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
  redirect(`/admin/venues/${encodeURIComponent(id)}?saved=1${backSuffix(formData)}`);
}

export async function createAdminVenueAction(formData: FormData) {
  const body = {
    title: String(formData.get('title') || '').trim(),
    cityId: emptyToNull(formData.get('cityId')),
    address: emptyToNull(formData.get('address')),
    latitude: numberToNull(formData.get('latitude')),
    longitude: numberToNull(formData.get('longitude')),
    placeType: emptyToNull(formData.get('placeType')),
    placeSubtype: emptyToNull(formData.get('placeSubtype')),
    shortDescription: emptyToNull(formData.get('shortDescription')),
    description: emptyToNull(formData.get('description')),
    heroImageUrl: emptyToNull(formData.get('heroImageUrl')),
    websiteUrl: emptyToNull(formData.get('websiteUrl')),
    phone: emptyToNull(formData.get('phone')),
    openingHours: emptyToNull(formData.get('openingHours')),
    metroStation: emptyToNull(formData.get('metroStation')),
    wayToFind: emptyToNull(formData.get('wayToFind')),
    parkingInfo: emptyToNull(formData.get('parkingInfo')),
  };
  if (!body.title) throw new Error('Укажите название площадки');
  const response = await adminApiFetch('/api/admin/venues', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`venue create failed HTTP ${response.status}${text ? `: ${text.slice(0, 200)}` : ''}`);
  }
  const created = await response.json() as { id?: string };
  if (!created.id) throw new Error('Сервер создал площадку без ID');
  revalidatePath('/admin/venues');
  redirect(`/admin/venues/${encodeURIComponent(created.id)}?created=1`);
}
