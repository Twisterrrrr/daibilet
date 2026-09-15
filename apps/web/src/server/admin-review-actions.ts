'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { redirect } from 'next/navigation';

import { adminApiFetch } from '@/server/admin-api-fetch';
import { EVENT_PAGE_CACHE_TAG } from '@/server/cache-config';

export async function moderateAdminReviewAction(formData: FormData) {
  const id = String(formData.get('id') || '').trim();
  const action = String(formData.get('action') || '').trim().toLowerCase();
  const statusFilter = String(formData.get('statusFilter') || 'PENDING_MODERATION').trim();
  const adminComment = String(formData.get('adminComment') || '').trim() || null;
  if (!id) throw new Error('missing review id');
  if (!['approve', 'reject', 'hide'].includes(action)) {
    throw new Error(`invalid review action: ${action}`);
  }

  const response = await adminApiFetch(
    `/api/admin/reviews/${encodeURIComponent(id)}/${action}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminComment }),
    },
  );

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`review ${action} failed HTTP ${response.status}${text ? `: ${text.slice(0, 200)}` : ''}`);
  }

  // Rating JSON-LD is derived only from approved reviews. Invalidate both the
  // aggregate query and rendered PDPs when a review crosses moderation states.
  revalidateTag(EVENT_PAGE_CACHE_TAG);
  revalidatePath('/events/[slug]', 'page');
  revalidatePath('/admin/reviews');
  const qs =
    statusFilter && statusFilter !== 'PENDING_MODERATION'
      ? `?status=${encodeURIComponent(statusFilter)}&done=${encodeURIComponent(action)}`
      : `?done=${encodeURIComponent(action)}`;
  redirect(`/admin/reviews${qs}`);
}
