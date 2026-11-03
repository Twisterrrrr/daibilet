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
  publishedAt: string | null;
  status: 'DRAFT' | 'REVIEW' | 'READY';
  isIndexable: false;
  tourGroup: { id: string; title: string } | null;
  events: Array<{
    eventId: string;
    position: number;
    role: string;
    eventTitle: string;
    eventSlug: string;
    cityTitle: string | null;
    venueTitle: string | null;
    venueAddress: string | null;
    supplierTitle: string | null;
    sources: Array<{ code: string; name: string; externalId: string; metaExternalId: string | null; sourceUrl: string | null }>;
  }>;
  reviewCandidates: Array<{
    eventId: string;
    eventTitle: string;
    eventSlug: string;
    cityTitle: string | null;
    venueTitle: string | null;
    venueAddress: string | null;
    supplierTitle: string | null;
    pageId: string;
    pageSlug: string;
    pageTitle: string;
    sourceCode: string;
    sourceName: string;
    externalId: string;
    metaExternalId: string;
    canMove: boolean;
  }>;
  routes: Array<{ id: string; path: string; kind: string; source: string | null; createdAt: string }>;
  revisions: Array<{
    id: string;
    version: number;
    changeNote: string | null;
    createdAt: string;
    sourceSnapshot?: { membershipMove?: { eventId: string; fromPageId: string; fromPageSlug: string } } | null;
  }>;
};

export type AdminEventPageEditorData = {
  page: AdminEventPage | null;
  tourGroups: Array<{ id: string; title: string; pageCount: number; publishedPageCount: number }>;
  error: string | null;
};

export async function loadAdminEventPageForEvent(eventId: string): Promise<AdminEventPageEditorData> {
  try {
    const [pageResponse, groupsResponse] = await Promise.all([
      adminApiFetch(`/api/admin/event-pages/by-event/${encodeURIComponent(eventId)}`),
      adminApiFetch('/api/admin/event-tour-groups'),
    ]);
    if (!groupsResponse.ok) return { page: null, tourGroups: [], error: `API гастрольных групп вернул HTTP ${groupsResponse.status}.` };
    const tourGroups = await groupsResponse.json() as AdminEventPageEditorData['tourGroups'];
    if (pageResponse.status === 404) return { page: null, tourGroups, error: null };
    if (!pageResponse.ok) return { page: null, tourGroups, error: `EventPage API вернул HTTP ${pageResponse.status}.` };
    return { page: await pageResponse.json() as AdminEventPage, tourGroups, error: null };
  } catch (error) {
    return { page: null, tourGroups: [], error: error instanceof Error ? error.message : 'Не удалось загрузить подробности страницы события.' };
  }
}
