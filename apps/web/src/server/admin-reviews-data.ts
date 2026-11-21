import { asNumber } from '@/lib/admin-ui';
import { adminApiFetch } from '@/server/admin-api-fetch';

export type AdminReviewRow = {
  id: string;
  rating: number;
  title: string | null;
  text: string;
  authorName: string;
  authorEmail: string;
  isVerified: boolean;
  status: string;
  adminComment: string | null;
  purchaseRef: string | null;
  createdAt: string;
  eventTitle: string | null;
  eventSlug: string | null;
  eventId: string | null;
};

export type AdminReviewsListData = {
  page: number;
  pages: number;
  total: number;
  pendingCount: number;
  items: AdminReviewRow[];
  errors: string[];
};

function normalizeReview(raw: unknown): AdminReviewRow {
  const row = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const event = (row.event && typeof row.event === 'object' ? row.event : {}) as Record<
    string,
    unknown
  >;
  return {
    id: String(row.id || ''),
    rating: asNumber(row.rating, 0),
    title: row.title != null ? String(row.title) : null,
    text: String(row.text || ''),
    authorName: String(row.authorName || '—'),
    authorEmail: String(row.authorEmail || ''),
    isVerified: Boolean(row.isVerified),
    status: String(row.status || '—'),
    adminComment: row.adminComment != null ? String(row.adminComment) : null,
    purchaseRef: row.purchaseRef != null ? String(row.purchaseRef) : null,
    createdAt: String(row.createdAt || ''),
    eventTitle: event.title != null ? String(event.title) : null,
    eventSlug: event.slug != null ? String(event.slug) : null,
    eventId: event.id != null ? String(event.id) : null,
  };
}

export async function loadAdminReviewsList(searchParams: {
  status?: string;
  page?: string;
}): Promise<AdminReviewsListData> {
  const errors: string[] = [];
  const params = new URLSearchParams();
  params.set('limit', '30');
  params.set('page', String(Math.max(1, asNumber(searchParams.page, 1))));
  const status = searchParams.status || 'PENDING_MODERATION';
  if (status !== 'all') params.set('status', status);

  try {
    const response = await adminApiFetch(`/api/admin/reviews?${params.toString()}`);
    if (!response.ok) {
      errors.push(`reviews HTTP ${response.status}`);
      return { page: 1, pages: 1, total: 0, pendingCount: 0, items: [], errors };
    }
    const payload = (await response.json()) as Record<string, unknown>;
    return {
      page: asNumber(payload.page, 1),
      pages: Math.max(1, asNumber(payload.pages, 1)),
      total: asNumber(payload.total),
      pendingCount: asNumber(payload.pendingCount),
      items: Array.isArray(payload.items) ? payload.items.map(normalizeReview) : [],
      errors,
    };
  } catch (error) {
    errors.push(`reviews: ${error instanceof Error ? error.message : 'network error'}`);
    return { page: 1, pages: 1, total: 0, pendingCount: 0, items: [], errors };
  }
}
