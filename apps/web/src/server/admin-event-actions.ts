'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { adminApiFetch } from '@/server/admin-api-fetch';

function emptyToNull(value: FormDataEntryValue | null): string | null {
  const trimmed = String(value || '').trim();
  return trimmed ? trimmed : null;
}

export async function saveAdminEventOverrideAction(formData: FormData) {
  const id = String(formData.get('id') || '').trim();
  if (!id) throw new Error('missing event id');

  const section = String(formData.get('section') || 'content').trim();
  let body: Record<string, unknown>;

  if (section === 'seo') {
    body = {
      seoH1: emptyToNull(formData.get('seoH1')),
      seoTitle: emptyToNull(formData.get('seoTitle')),
      seoDescription: emptyToNull(formData.get('seoDescription')),
      canonicalPath: emptyToNull(formData.get('canonicalPath')),
      isIndexable: formData.get('isIndexable') === 'on' || formData.get('isIndexable') === 'true',
    };
  } else if (section === 'media') {
    body = {
      imageUrl: emptyToNull(formData.get('imageUrl')),
    };
  } else {
    body = {
      title: emptyToNull(formData.get('title')),
      shortDescription: emptyToNull(formData.get('shortDescription')),
      description: emptyToNull(formData.get('description')),
      mergeGroupKey: emptyToNull(formData.get('mergeGroupKey')),
    };
  }

  const response = await adminApiFetch(`/api/admin/events/${encodeURIComponent(id)}/override`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`override save failed HTTP ${response.status}${text ? `: ${text.slice(0, 200)}` : ''}`);
  }

  revalidatePath('/admin/events');
  revalidatePath(`/admin/events/${id}`);
  redirect(`/admin/events/${encodeURIComponent(id)}?saved=${encodeURIComponent(section)}`);
}

export async function saveAdminEventModerationAction(formData: FormData) {
  const id = String(formData.get('id') || '').trim();
  const editorStatus = String(formData.get('editorStatus') || '').trim().toUpperCase();
  if (!id) throw new Error('missing event id');
  if (!editorStatus) throw new Error('missing editorStatus');

  const response = await adminApiFetch(`/api/admin/events/${encodeURIComponent(id)}/moderation`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ editorStatus }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`moderation save failed HTTP ${response.status}${text ? `: ${text.slice(0, 200)}` : ''}`);
  }

  revalidatePath('/admin/events');
  revalidatePath(`/admin/events/${id}`);
  redirect(`/admin/events/${encodeURIComponent(id)}?moderation=1`);
}

export async function saveAdminEventTaxonomyAction(formData: FormData) {
  const id = String(formData.get('id') || '').trim();
  if (!id) throw new Error('missing event id');

  const categoryId = emptyToNull(formData.get('categoryId'));
  const primarySubcategoryId = emptyToNull(formData.get('primarySubcategoryId'));
  const subcategoryIds = formData
    .getAll('subcategoryIds')
    .map((item) => String(item || '').trim())
    .filter(Boolean);
  const tagIds = formData
    .getAll('tagIds')
    .map((item) => String(item || '').trim())
    .filter(Boolean);

  const response = await adminApiFetch(`/api/admin/events/${encodeURIComponent(id)}/taxonomy`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      categoryId,
      primarySubcategoryId,
      subcategoryIds,
      tagIds,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`taxonomy save failed HTTP ${response.status}${text ? `: ${text.slice(0, 200)}` : ''}`);
  }

  revalidatePath('/admin/events');
  revalidatePath(`/admin/events/${id}`);
  redirect(`/admin/events/${encodeURIComponent(id)}?saved=taxonomy`);
}

export async function saveAdminEventVenueLinksAction(formData: FormData) {
  const id = String(formData.get('id') || '').trim();
  if (!id) throw new Error('missing event id');

  const venueIds = formData.getAll('venueIds').map((item) => String(item || '').trim());
  const labels = formData.getAll('labels').map((item) => String(item || '').trim());
  const sortOrders = formData.getAll('sortOrders').map((item) => String(item || '').trim());

  const links = venueIds
    .map((venueId, index) => ({
      venueId,
      label: labels[index] || null,
      sortOrder: Number.isFinite(Number(sortOrders[index])) ? Number(sortOrders[index]) : index,
      role: 'STOP' as const,
    }))
    .filter((link) => Boolean(link.venueId));

  const response = await adminApiFetch(`/api/admin/events/${encodeURIComponent(id)}/venue-links`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ links }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(
      `venue-links save failed HTTP ${response.status}${text ? `: ${text.slice(0, 200)}` : ''}`,
    );
  }

  revalidatePath('/admin/events');
  revalidatePath(`/admin/events/${id}`);
  redirect(`/admin/events/${encodeURIComponent(id)}?saved=venue-links`);
}
