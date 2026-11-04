'use server';

import { revalidatePath } from 'next/cache';
import { adminApiFetch } from '@/server/admin-api-fetch';

export async function reviewSupplierPlaceRequestAction(formData: FormData) {
  const id = String(formData.get('id') || '').trim();
  const action = String(formData.get('action') || '').trim();
  const comment = String(formData.get('comment') || '').trim();
  if (!id || !['NEEDS_INFO', 'APPROVE', 'REJECT'].includes(action)) throw new Error('Invalid place request action');
  const response = await adminApiFetch(`/api/admin/supplier-place-requests/${encodeURIComponent(id)}`, {
    method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action, comment }),
  });
  if (!response.ok) throw new Error(`Не удалось сохранить решение: HTTP ${response.status}`);
  revalidatePath('/admin/place-requests');
}
