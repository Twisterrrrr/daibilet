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
  content: AdminPdpDocument['content'];
}) {
  const response = await adminApiFetch('/api/admin/event-pages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      eventIds: [input.eventId],
      slug: input.slug,
      title: input.title,
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
