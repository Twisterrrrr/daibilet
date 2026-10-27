import { adminApiFetch } from '@/server/admin-api-fetch';
import type { AdminPdpDocument } from '@/server/admin-pdp-data';

export type AdminEventPage = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  content: AdminPdpDocument['content'];
  seoH1: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalPath: string | null;
  status: 'DRAFT' | 'REVIEW' | 'READY';
  isIndexable: false;
  events: Array<{ eventId: string; position: number; role: string; eventTitle: string; eventSlug: string; cityTitle: string | null }>;
  routes: Array<{ id: string; path: string; kind: string; source: string | null; createdAt: string }>;
  revisions: Array<{ id: string; version: number; changeNote: string | null; createdAt: string }>;
};

export type AdminEventPageEditorData = {
  page: AdminEventPage | null;
  error: string | null;
};

export async function loadAdminEventPageForEvent(eventId: string): Promise<AdminEventPageEditorData> {
  try {
    const response = await adminApiFetch(`/api/admin/event-pages/by-event/${encodeURIComponent(eventId)}`);
    if (response.status === 404) return { page: null, error: null };
    if (!response.ok) return { page: null, error: `EventPage API вернул HTTP ${response.status}.` };
    return { page: await response.json() as AdminEventPage, error: null };
  } catch (error) {
    return { page: null, error: error instanceof Error ? error.message : 'Не удалось загрузить подробности страницы события.' };
  }
}
