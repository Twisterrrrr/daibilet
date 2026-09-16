'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { adminApiFetch } from '@/server/admin-api-fetch';

const SYNC_ENDPOINTS = {
  TICKETSCLOUD: '/api/admin/sources/ticketscloud/sync',
  TEPLOHOD: '/api/v1/tep/sync',
} as const;

type SyncSource = keyof typeof SYNC_ENDPOINTS;

function formatSyncStats(stats?: Record<string, unknown> | null): string {
  if (!stats) return 'ok';
  const events = Number(stats.importedEvents ?? stats.events ?? stats.createdEvents ?? 0);
  const sessions = Number(stats.sessions ?? stats.importedSessions ?? 0);
  const offers = Number(stats.offers ?? stats.importedOffers ?? 0);
  const parts = [`${events} событий`];
  if (sessions) parts.push(`${sessions} сеансов`);
  if (offers) parts.push(`${offers} офферов`);
  return parts.join(', ');
}

export async function triggerSourceSyncAction(formData: FormData) {
  const source = String(formData.get('source') || '').toUpperCase() as SyncSource;
  const endpoint = SYNC_ENDPOINTS[source];
  if (!endpoint) {
    redirect('/admin/sources?error=unknown_source');
  }

  let nextUrl = '/admin/sources';
  try {
    const response = await adminApiFetch(endpoint, { method: 'POST' });
    const body = (await response.json().catch(() => null)) as {
      message?: string;
      stats?: Record<string, unknown>;
    } | null;
    if (!response.ok) {
      const message = encodeURIComponent(body?.message || `HTTP ${response.status}`);
      nextUrl = `/admin/sources?error=${message}`;
    } else {
      const stats = encodeURIComponent(formatSyncStats(body?.stats));
      revalidatePath('/admin/sources');
      revalidatePath('/admin');
      nextUrl = `/admin/sources?synced=${source}&stats=${stats}`;
    }
  } catch (error) {
    const message = encodeURIComponent(error instanceof Error ? error.message : 'sync_failed');
    nextUrl = `/admin/sources?error=${message}`;
  }

  redirect(nextUrl);
}
