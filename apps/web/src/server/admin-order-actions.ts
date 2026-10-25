'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { adminApiFetch } from '@/server/admin-api-fetch';
import { requireAdminPermissions } from '@/server/admin-authorization';

export async function operateInternalAdminOrderAction(formData: FormData) {
  const orderKey = String(formData.get('orderKey') || '').trim();
  const operation = String(formData.get('operation') || '').trim();
  const confirmCode = String(formData.get('confirmCode') || '').trim();
  const reason = String(formData.get('reason') || '').trim();
  if (!orderKey || !['cancel', 'refund'].includes(operation) || !confirmCode || reason.length < 3 || reason.length > 500) {
    redirect(`/admin/orders/internal/${encodeURIComponent(orderKey)}?error=invalid_input`);
  }
  await requireAdminPermissions(operation === 'refund' ? ['refunds.execute'] : ['orders.cancel']);
  const base = process.env.FINANCE_API_BASE_URL || '';
  const token = process.env.DAIBILET_FINANCE_ADMIN_OPERATION_TOKEN || '';
  if (!base || !token) redirect(`/admin/orders/internal/${encodeURIComponent(orderKey)}?error=not_configured`);
  const url = new URL(`/api/internal/admin/orders/${encodeURIComponent(orderKey)}/operation`, base);
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ operation, confirmCode, reason }),
      cache: 'no-store',
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    redirect(`/admin/orders/internal/${encodeURIComponent(orderKey)}?error=network`);
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as { error?: string };
    const error = encodeURIComponent(payload.error || `http_${response.status}`);
    redirect(`/admin/orders/internal/${encodeURIComponent(orderKey)}?error=${error}`);
  }
  const result = await response.json() as { status: string };
  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/internal/${orderKey}`);
  redirect(`/admin/orders/internal/${encodeURIComponent(orderKey)}?operation=${encodeURIComponent(result.status)}`);
}
export async function syncAdminOrdersTcAction() {
  await requireAdminPermissions(['integrations.retry']);
  const response = await adminApiFetch('/api/admin/orders/sync', { method: 'POST' });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`orders sync failed HTTP ${response.status}${text ? `: ${text.slice(0, 200)}` : ''}`);
  }
  revalidatePath('/admin/orders');
  redirect('/admin/orders?synced=1');
}

export async function archiveAdminOrdersBulkAction() {
  await requireAdminPermissions(['orders.manage']);
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
  await requireAdminPermissions(['orders.manage']);
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
  await requireAdminPermissions(['orders.manage']);
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

export async function unarchiveAdminOrderAction(formData: FormData) {
  await requireAdminPermissions(['orders.manage']);
  const id = String(formData.get('id') || '').trim();
  if (!id) throw new Error('missing order id');
  const response = await adminApiFetch(`/api/admin/orders/${encodeURIComponent(id)}/unarchive`, {
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error(`unarchive failed HTTP ${response.status}`);
  }
  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${id}`);
  redirect(`/admin/orders/${encodeURIComponent(id)}?unarchived=1`);
}
