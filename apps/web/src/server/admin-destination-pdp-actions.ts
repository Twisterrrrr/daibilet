'use server';

import { revalidatePath, updateTag } from 'next/cache';
import { adminApiFetch } from '@/server/admin-api-fetch';
import { CITY_PAGE_CACHE_TAG } from '@/server/cache-config';
import type { DestinationPdpContent, DestinationPdpStatus } from '@daibilet/contracts/city-pdp';

export type DestinationOwnerType = 'cities' | 'regions';
export type DestinationEditorDocument = {
  id: string;
  summary: string | null;
  heroImageUrl: string | null;
  content: DestinationPdpContent;
  publishedContent: unknown;
  seoH1: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalPath: string | null;
  status: DestinationPdpStatus;
  isIndexable: boolean;
  publishedAt: string | null;
  version: number;
  updatedAt: string;
  revisions: Array<{ id: string; version: number; changeNote: string | null; createdAt: string }>;
};

async function call(path: string, init?: RequestInit) {
  const response = await adminApiFetch(path, init);
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`API HTTP ${response.status}${detail ? `: ${detail.slice(0, 240)}` : ''}`);
  }
  return response.json();
}

function base(type: DestinationOwnerType, id: string) {
  return `/api/admin/destinations/${type}/${encodeURIComponent(id)}/pdp`;
}

function revalidateDestination(type: DestinationOwnerType, id: string) {
  revalidatePath(type === 'regions'
    ? `/admin/cities/regions/${encodeURIComponent(id)}`
    : `/admin/cities/${encodeURIComponent(id)}`);
  updateTag(CITY_PAGE_CACHE_TAG);
  revalidatePath('/cities/[slug]', 'page');
  revalidatePath('/sitemaps/[chunk]', 'page');
}

export async function loadAdminDestinationPdpAction(type: DestinationOwnerType, id: string) {
  return call(base(type, id)) as Promise<{
    owner: { type: 'CITY' | 'REGION'; id: string; slug: string; title: string; legacyDraft: Record<string, string | null> };
    document: DestinationEditorDocument | null;
    readiness: { ready: boolean; missing: string[] };
  }>;
}

export async function saveAdminDestinationPdpAction(type: DestinationOwnerType, id: string, input: {
  summary: string | null;
  heroImageUrl: string | null;
  seoH1: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalPath: string | null;
  content: DestinationPdpContent;
  changeNote?: string;
}) {
  const result = await call(base(type, id), {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
  });
  revalidateDestination(type, id);
  return result;
}

export async function transitionAdminDestinationPdpAction(type: DestinationOwnerType, id: string, status: Exclude<DestinationPdpStatus, 'PUBLISHED'>) {
  const result = await call(`${base(type, id)}/status`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
  });
  revalidateDestination(type, id);
  return result;
}

export async function publishAdminDestinationPdpAction(type: DestinationOwnerType, id: string, isIndexable: boolean) {
  const result = await call(`${base(type, id)}/publish`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isIndexable }),
  });
  revalidateDestination(type, id);
  return result;
}

export async function listAdminRegionsAction() {
  return call('/api/admin/destinations/regions') as Promise<{ regions: Array<{
    id: string; title: string; slug: string; _count: { cities: number };
    pdpDocument: { status: string; isIndexable: boolean; publishedAt: string | null; updatedAt: string } | null;
  }> }>;
}

export async function createAdminRegionAction(title: string, slug: string) {
  const result = await call('/api/admin/destinations/regions', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, slug }),
  }) as { region: { id: string; title: string; slug: string } };
  revalidatePath('/admin/cities/regions');
  return result;
}
