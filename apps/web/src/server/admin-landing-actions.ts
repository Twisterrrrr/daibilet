'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { adminApiFetch } from '@/server/admin-api-fetch';

function emptyToNull(value: FormDataEntryValue | null): string | null {
  const trimmed = String(value || '').trim();
  return trimmed ? trimmed : null;
}

export async function saveAdminLandingSeoAction(formData: FormData) {
  const slug = String(formData.get('slug') || '').trim();
  if (!slug) throw new Error('missing landing slug');

  const body = {
    title: String(formData.get('title') || '').trim(),
    subtitle: emptyToNull(formData.get('subtitle')),
    description: emptyToNull(formData.get('description')),
    seoH1: emptyToNull(formData.get('seoH1')),
    seoTitle: emptyToNull(formData.get('seoTitle')),
    seoDescription: emptyToNull(formData.get('seoDescription')),
    canonicalUrl: emptyToNull(formData.get('canonicalUrl')) || `/landings/${slug}`,
    status: String(formData.get('status') || 'REVIEW').trim().toUpperCase(),
    isIndexable: formData.get('isIndexable') === 'on' || formData.get('isIndexable') === 'true',
  };

  const response = await adminApiFetch(`/api/admin/landings/${encodeURIComponent(slug)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`landing save failed HTTP ${response.status}${text ? `: ${text.slice(0, 200)}` : ''}`);
  }

  revalidatePath('/admin/landings');
  revalidatePath(`/admin/landings/${slug}`);
  redirect(`/admin/landings/${encodeURIComponent(slug)}?saved=seo`);
}

export async function saveAdminLandingMatchAction(formData: FormData) {
  const slug = String(formData.get('slug') || '').trim();
  const eventId = String(formData.get('eventId') || '').trim();
  const status = String(formData.get('status') || '').trim().toUpperCase();
  const groupRaw = String(formData.get('groupEventIds') || '').trim();
  if (!slug || !eventId) throw new Error('missing slug or eventId');
  if (!['PINNED', 'EXCLUDED', 'REVIEW'].includes(status)) {
    throw new Error(`invalid match status: ${status}`);
  }

  const groupEventIds = groupRaw
    ? groupRaw.split(',').map((item) => item.trim()).filter(Boolean)
    : [eventId];

  const response = await adminApiFetch(
    `/api/admin/landings/${encodeURIComponent(slug)}/matches/${encodeURIComponent(eventId)}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, groupEventIds }),
    },
  );

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`match save failed HTTP ${response.status}${text ? `: ${text.slice(0, 200)}` : ''}`);
  }

  revalidatePath('/admin/landings');
  revalidatePath(`/admin/landings/${slug}`);
  redirect(`/admin/landings/${encodeURIComponent(slug)}?match=${encodeURIComponent(status)}`);
}
