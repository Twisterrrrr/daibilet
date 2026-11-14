'use server';

import { adminApiFetch } from '@/server/admin-api-fetch';
import type { AdminEventPage } from '@/server/admin-event-pages-data';
import type { AdminPdpDocument } from '@/server/admin-pdp-data';

async function readError(response: Response, fallback: string) {
  const detail = await response.text().catch(() => '');
  return new Error(`${fallback} (HTTP ${response.status})${detail ? `: ${detail.slice(0, 240)}` : ''}`);
}

export async function createAdminEventPageAction(input: {
  eventId: string;
  slug: string;
  title: string;
  heroImageUrl?: string;
  content: AdminPdpDocument['content'];
}) {
  const response = await adminApiFetch('/api/admin/event-pages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      eventIds: [input.eventId],
      slug: input.slug,
      title: input.title,
      heroImageUrl: input.heroImageUrl,
      summary: input.content.summary,
      content: input.content,
      changeNote: 'Первичная редакция подробностей события',
    }),
  });
  if (!response.ok) throw await readError(response, 'Не удалось создать черновик страницы события');
  return await response.json() as AdminEventPage;
}

export async function saveAdminEventPageAction(id: string, input: {
  slug: string;
  title: string;
  heroImageUrl: string;
  content: AdminPdpDocument['content'];
  seoH1: string;
  seoTitle: string;
  seoDescription: string;
  status: AdminPdpDocument['status'];
  changeNote?: string;
}) {
  const response = await adminApiFetch(`/api/admin/event-pages/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...input, summary: input.content.summary }),
  });
  if (!response.ok) throw await readError(response, 'Не удалось сохранить подробности страницы события');
  return await response.json() as AdminEventPage;
}

export async function publishAdminEventPageAction(id: string) {
  const response = await adminApiFetch(`/api/admin/event-pages/${encodeURIComponent(id)}/publish`, {
    method: 'POST',
  });
  if (!response.ok) throw await readError(response, 'Не удалось опубликовать EventPage');
  return await response.json() as AdminEventPage;
}

export async function createAdminEventTourGroupAction(title: string) {
  const response = await adminApiFetch('/api/admin/event-tour-groups', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });
  if (!response.ok) throw await readError(response, 'Не удалось создать гастрольную группу');
  return await response.json() as { id: string; title: string; pageCount: number; publishedPageCount: number };
}

export async function assignAdminEventPageTourGroupAction(pageId: string, tourGroupId: string | null) {
  const response = await adminApiFetch(`/api/admin/event-pages/${encodeURIComponent(pageId)}/tour-group`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tourGroupId }),
  });
  if (!response.ok) throw await readError(response, 'Не удалось изменить гастрольную группу EventPage');
  return await response.json() as AdminEventPage;
}

export async function searchAdminEventPageEventCandidatesAction(query: string) {
  const response = await adminApiFetch(`/api/admin/event-page-event-candidates?q=${encodeURIComponent(query)}`);
  if (!response.ok) throw await readError(response, 'Не удалось найти события-кандидаты');
  return await response.json() as AdminEventPageEventCandidate[];
}

export async function attachEventToAdminEventPageAction(pageId: string, eventIds: string[]) {
  const response = await adminApiFetch(`/api/admin/event-pages/${encodeURIComponent(pageId)}/events`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      eventIds,
      changeNote: 'К EventPage явно привязано импортированное событие',
    }),
  });
  if (!response.ok) throw await readError(response, 'Не удалось связать событие с EventPage');
  return await response.json() as AdminEventPage;
}

export async function moveEventToAdminEventPageAction(pageId: string, eventId: string) {
  const response = await adminApiFetch(`/api/admin/event-pages/${encodeURIComponent(pageId)}/events/move`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventId }),
  });
  if (!response.ok) throw await readError(response, 'Не удалось перенести событие');
  return await response.json() as { target: AdminEventPage; source: AdminEventPage | null; unchanged: boolean };
}

export async function splitEventFromAdminEventPageAction(pageId: string, eventId: string) {
  const response = await adminApiFetch(`/api/admin/event-pages/${encodeURIComponent(pageId)}/events/split`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventId }),
  });
  if (!response.ok) throw await readError(response, 'Не удалось отделить событие в новую EventPage');
  return await response.json() as { source: AdminEventPage; separated: AdminEventPage };
}

export type AdminEventPageEventCandidate = {
  id: string;
  title: string;
  slug: string;
  kind: string;
  status: string;
  cityTitle: string | null;
  venueTitle: string | null;
  venueAddress: string | null;
  supplierTitle: string | null;
  sources: Array<{ code: string; name: string; externalId: string; metaExternalId: string | null; sourceUrl: string | null }>;
  linkedPageId: string | null;
  linkedPageSlug: string | null;
  linkedPageTitle: string | null;
  linkedPageStatus: string | null;
  linkedPageCanMoveFromDraftShell: boolean;
  linkedPageCanMove: boolean;
};
