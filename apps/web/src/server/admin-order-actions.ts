'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { adminApiFetch } from '@/server/admin-api-fetch';

export async function syncAdminOrdersTcAction() {
  const response = await adminApiFetch('/api/admin/orders/sync', { method: 'POST' });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`orders sync failed HTTP ${response.status}${text ? `: ${text.slice(0, 200)}` : ''}`);
  }
  revalidatePath('/admin/orders');
  redirect('/admin/orders?synced=1');
}

export async function archiveAdminOrdersBulkAction() {
  const response = await adminApiFetch('/api/admin/orders/archive', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`bulk archive failed HTTP ${response.status}${text ? `: ${text.slice(0, 200)}` : ''}`);
  }
  revalidatePath('/admin/orders');
  redirect('/admin/orders?archived=bulk');
}

export async function archiveAdminOrderAction(formData: FormData) {
  const id = String(formData.get('id') || '').trim();
  if (!id) throw new Error('missing order id');
  const response = await adminApiFetch(`/api/admin/orders/${encodeURIComponent(id)}/archive`, {
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error(`archive failed HTTP ${response.status}`);
  }
  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${id}`);
  redirect(`/admin/orders/${encodeURIComponent(id)}?archived=1`);
}

export async function upsertAdminOrderTicketAction(formData: FormData) {
  const id = String(formData.get('id') || '').trim();
  const externalTicketId = String(formData.get('externalTicketId') || '').trim();
  const status = String(formData.get('status') || 'issued').trim() || 'issued';
  const eventId = String(formData.get('eventId') || '').trim() || null;
  const ticketId = String(formData.get('ticketId') || '').trim() || null;
  if (!id) throw new Error('missing order id');
  if (!externalTicketId || externalTicketId.length < 2) {
    throw new Error('ticket number required');
  }

  const response = await adminApiFetch(`/api/admin/orders/${encodeURIComponent(id)}/tickets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: ticketId,
      externalTicketId,
      status,
      eventId,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`ticket upsert failed HTTP ${response.status}${text ? `: ${text.slice(0, 200)}` : ''}`);
  }

  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${id}`);
  redirect(`/admin/orders/${encodeURIComponent(id)}?ticket=1`);
}
