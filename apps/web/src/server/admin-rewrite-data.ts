import { adminApiFetch } from '@/server/admin-api-fetch';

export type RewriteQueuePayload = {
  items: Array<{
    id: string;
    eventId: string;
    status: string;
    priority: string | null;
    sourceText: string;
    draftText: string | null;
    finalText: string | null;
    model: string | null;
    qaFlags: Array<{ code: string; message: string }>;
    eventTitle: string | null;
    eventSlug: string | null;
    city: string | null;
    updatedAt: string | Date;
  }>;
  counts: Record<string, number>;
};

/** Server-side loader for /admin/rewrite-queue. */
export async function loadRewriteQueue(status?: string): Promise<RewriteQueuePayload> {
  const params = new URLSearchParams({ limit: '100' });
  if (status) params.set('status', status);
  try {
    const response = await adminApiFetch(`/api/admin/rewrite-queue?${params.toString()}`);
    if (!response.ok) return { items: [], counts: {} };
    const body = (await response.json()) as RewriteQueuePayload;
    return { items: body.items || [], counts: body.counts || {} };
  } catch {
    return { items: [], counts: {} };
  }
}