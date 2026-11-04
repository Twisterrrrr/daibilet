'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { adminApiFetch } from '@/server/admin-api-fetch';

export async function runAdminEcrAction(formData: FormData) {
  const id = String(formData.get('id') || '').trim();
  const action = String(formData.get('action') || '').trim().toLowerCase();
  const adminComment = String(formData.get('adminComment') || '').trim();
  if (!id) throw new Error('missing ECR id');
  if (!['approve', 'reject', 'apply'].includes(action)) {
    throw new Error(`invalid ECR action: ${action}`);
  }
  if (action === 'reject' && !adminComment) {
    throw new Error('reject requires adminComment');
  }

  const init: RequestInit = { method: 'POST' };
  if (action !== 'apply') {
    init.headers = { 'Content-Type': 'application/json' };
    init.body = JSON.stringify({ adminComment: adminComment || undefined });
  }

  const response = await adminApiFetch(
    `/api/admin/event-change-requests/${encodeURIComponent(id)}/${action}`,
    init,
  );

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`ECR ${action} failed HTTP ${response.status}${text ? `: ${text.slice(0, 200)}` : ''}`);
  }

  revalidatePath('/admin/change-requests');
  revalidatePath(`/admin/change-requests/${id}`);
  redirect(`/admin/change-requests/${encodeURIComponent(id)}?done=${encodeURIComponent(action)}`);
}
