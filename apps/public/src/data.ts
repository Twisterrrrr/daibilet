import type { PublicData } from '@/types';
import { eventSlug } from '@/routes';

type PublicStatsPayload = Pick<PublicData, 'generatedAt' | 'stats'>;

const PUBLIC_STATS_STORAGE_KEY = 'daibilet:public-stats';
const API_BASE_URL =
  ((import.meta as ImportMeta & { env?: { VITE_DAIBILET_API_URL?: string } }).env?.VITE_DAIBILET_API_URL as string | undefined) ||
  'http://127.0.0.1:4000';
const cachedStats = readCachedPublicStats();

export const publicData: PublicData = window.PUBLIC_DATA ?? {
  generatedAt: cachedStats?.generatedAt ?? new Date().toISOString(),
  stats: cachedStats?.stats ?? { events: 0, destinations: 0, venues: 0, landings: 0 },
  destinations: [],
  landings: [],
  sessions: [],
  venues: [],
};

export async function hydratePublicStats(timeoutMs = 1000): Promise<boolean> {
  try {
    const payload = await fetchPublicStats(`${API_BASE_URL}/api/public/stats`, timeoutMs);
    if (payload?.stats) {
      publicData.generatedAt = payload.generatedAt || new Date().toISOString();
      publicData.stats = normalizeStats(payload.stats);
      writeCachedPublicStats({ generatedAt: publicData.generatedAt, stats: publicData.stats });
      return true;
    }
  } catch {
    // Cached stats are good enough for the first paint while the full catalog hydrates.
  }

  return false;
}

export async function hydratePublicData(): Promise<boolean> {
  try {
    const remoteData = await fetchPublicJson(`${API_BASE_URL}/api/public/home`, 12000);
    if (remoteData) {
      assignPublicData(remoteData);
      return true;
    }
  } catch {
    // Fall through to the local static dataset.
  }

  if (publicData.sessions.length > 0) return false;

  try {
    const staticData = await fetchStaticData();
    if (staticData) {
      assignPublicData(staticData, { preserveStats: publicData.stats.events > 0 });
      return true;
    }
  } catch {
    // Local prototypes still render an empty shell when both API and data.js are unavailable.
  }

  return false;
}

function normalizePublicData(data: PublicData): PublicData {
  return {
    ...data,
    stats: normalizeStats(data.stats),
    sessions: data.sessions.map((session) => ({
      ...session,
      slug: eventSlug(session),
    })),
  };
}

function assignPublicData(data: PublicData, options: { preserveStats?: boolean } = {}) {
  const normalized = normalizePublicData(data);
  Object.assign(publicData, {
    ...normalized,
    stats: options.preserveStats ? publicData.stats : normalized.stats,
  });
  writeCachedPublicStats({ generatedAt: publicData.generatedAt, stats: publicData.stats });
}

function normalizeStats(stats: PublicData['stats']): PublicData['stats'] {
  return {
    events: Number(stats?.events) || 0,
    destinations: Number(stats?.destinations) || 0,
    venues: Number(stats?.venues) || 0,
    landings: Number(stats?.landings) || 0,
  };
}

async function fetchPublicJson(url: string, timeoutMs: number): Promise<PublicData | null> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { cache: 'no-store', signal: controller.signal });
    if (!response.ok) return null;
    return (await response.json()) as PublicData;
  } finally {
    window.clearTimeout(timeout);
  }
}

async function fetchPublicStats(url: string, timeoutMs: number): Promise<PublicStatsPayload | null> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { cache: 'no-store', signal: controller.signal });
    if (!response.ok) return null;
    return (await response.json()) as PublicStatsPayload;
  } finally {
    window.clearTimeout(timeout);
  }
}

async function fetchStaticData(): Promise<PublicData | null> {
  const response = await fetch('/data.js', { cache: 'no-store' });
  if (!response.ok) return null;

  const source = await response.text();
  const match = source.match(/window\.PUBLIC_DATA\s*=\s*(\{[\s\S]*\})\s*;?\s*$/);
  if (!match) return null;

  return JSON.parse(match[1]) as PublicData;
}

function readCachedPublicStats(): PublicStatsPayload | null {
  try {
    const raw = window.localStorage.getItem(PUBLIC_STATS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PublicStatsPayload;
    if (!parsed?.stats) return null;
    return { generatedAt: parsed.generatedAt || new Date().toISOString(), stats: normalizeStats(parsed.stats) };
  } catch {
    return null;
  }
}

function writeCachedPublicStats(payload: PublicStatsPayload) {
  try {
    window.localStorage.setItem(PUBLIC_STATS_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Private browsing or disabled storage should not affect rendering.
  }
}

export function formatNumber(value?: number | null): string {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(value || 0);
}

export function formatMoney(value?: number | null): string {
  if (!value || value <= 0) return '-';
  return `от ${formatNumber(Math.round(value))} ₽`;
}

export function formatDate(value?: string | null): string {
  if (!value) return 'открытая дата';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'дата уточняется';

  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
