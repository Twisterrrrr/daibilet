import { adminApiFetch } from '@/server/admin-api-fetch';

export type AdminSupplierPlaceRequest = {
  id: string;
  supplierId: string;
  supplierTitle: string;
  venueId: string | null;
  venueTitle: string | null;
  venueSlug?: string | null;
  type: string;
  status: string;
  title: string;
  payload: unknown;
  sourceSnapshot: unknown;
  adminComment: string | null;
  submittedAt: string;
  reviewedAt?: string | null;
};

export async function loadAdminSupplierPlaceRequests(status = '') {
  const params = status ? `?status=${encodeURIComponent(status)}` : '';
  const response = await adminApiFetch(`/api/admin/supplier-place-requests${params}`);
  if (!response.ok) return { rows: [] as AdminSupplierPlaceRequest[], error: `HTTP ${response.status}` };
  return { rows: await response.json() as AdminSupplierPlaceRequest[], error: '' };
}
