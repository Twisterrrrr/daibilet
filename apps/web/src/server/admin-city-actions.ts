'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { adminApiFetch } from '@/server/admin-api-fetch';

function emptyToNull(value: FormDataEntryValue | null): string | null {
  const trimmed = String(value || '').trim();
  return trimmed ? trimmed : null;
}

export async function saveAdminCityAction(formData: FormData) {
  const id = String(formData.get('id') || '').trim();
  if (!id) throw new Error('missing city id');

  const slug = String(formData.get('slug') || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const title = String(formData.get('title') || '').trim();
  if (!title) throw new Error('title required');
  if (!slug) throw new Error('slug required');

  const body = {
    title,
    slug,
    sourceTitle: emptyToNull(formData.get('sourceTitle')),
    introTitle: emptyToNull(formData.get('introTitle')),
    introText: emptyToNull(formData.get('introText')),
    heroImageUrl: emptyToNull(formData.get('heroImageUrl')),
    seoH1: emptyToNull(formData.get('seoH1')),
    seoTitle: emptyToNull(formData.get('seoTitle')),
    seoDescription: emptyToNull(formData.get('seoDescription')),
    canonicalPath: emptyToNull(formData.get('canonicalPath')) || `/cities/${slug}`,
    isDestination: formData.get('isDestination') === 'on' || formData.get('isDestination') === 'true',
  };

  const response = await adminApiFetch(`/api/admin/cities/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => ({}))) as { error?: string; id?: string };
  if (!response.ok) {
    if (payload.error === 'slug_not_unique') throw new Error('slug_not_unique');
    throw new Error(`city save failed HTTP ${response.status}${payload.error ? `: ${payload.error}` : ''}`);
  }

  const nextId = payload.id || id;
  revalidatePath('/admin/cities');
  revalidatePath(`/admin/cities/${nextId}`);
  redirect(`/admin/cities/${encodeURIComponent(nextId)}?saved=1`);
}
