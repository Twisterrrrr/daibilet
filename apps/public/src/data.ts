import type { PublicData, PublicDestination, PublicLanding, PublicSession } from '@/types';
import { API_BASE_URL } from '@/lib/api-base';
import { eventSlug } from '@/routes';

type PublicStatsPayload = Pick<PublicData, 'generatedAt' | 'stats'>;
type PublicDestinationsPayload = { generatedAt: string; destinations: PublicDestination[] };
type PublicHomePreviewPayload = {
  generatedAt: string;
  sessions: PublicSession[];
  landings: PublicLanding[];
};

const PUBLIC_STATS_STORAGE_KEY = 'daibilet:public-stats';
const PUBLIC_DESTINATIONS_STORAGE_KEY = 'daibilet:public-destinations';
const PUBLIC_HOME_PREVIEW_STORAGE_KEY = 'daibilet:public-home-preview';

export const PUBLIC_DESTINATIONS_UPDATED_EVENT = 'daibilet:destinations-updated';

const cachedStats = readCachedPublicStats();
const cachedDestinations = readCachedDestinations();
const cachedHomePreview = readCachedHomePreview();

export const publicData: PublicData = window.PUBLIC_DATA ?? {
  generatedAt: cachedStats?.generatedAt || cachedDestinations?.generatedAt || cachedHomePreview?.generatedAt || new Date().toISOString(),
  stats: cachedStats?.stats ?? { events: 0, destinations: 0, venues: 0, landings: 0 },
  destinations: cachedDestinations?.destinations ?? [],
  landings: cachedHomePreview?.landings ?? [],
  sessions: normalizeSessions(cachedHomePreview?.sessions ?? []),
  venues: [],
};

/** Быстрый слой: счётчики + города (кэш или лёгкие API). */
export async function hydratePublicShell(timeoutMs = 2500): Promise<boolean> {
  const [statsUpdated, destinationsUpdated] = await Promise.all([
    hydratePublicStats(timeoutMs),
    hydratePublicDestinations(timeoutMs),
  ]);
  return statsUpdated || destinationsUpdated;
}

export async function hydratePublicStats(timeoutMs = 2500): Promise<boolean> {
  try {
    const payload = await fetchPublicJson<PublicStatsPayload>(`${API_BASE_URL}/api/public/stats`, timeoutMs);
    if (payload?.stats) {
      publicData.generatedAt = payload.generatedAt || publicData.generatedAt;
      publicData.stats = normalizeStats(payload.stats);
      writeCachedPublicStats({ generatedAt: publicData.generatedAt, stats: publicData.stats });
      return true;
    }
  } catch {
    // Cached stats are good enough for the first paint.
  }

  return false;
}

export async function hydratePublicDestinations(timeoutMs = 2500): Promise<boolean> {
  try {
    const payload = await fetchPublicJson<PublicDestinationsPayload>(`${API_BASE_URL}/api/public/destinations`, timeoutMs);
    if (Array.isArray(payload?.destinations)) {
      publicData.generatedAt = payload.generatedAt || publicData.generatedAt;
      publicData.destinations = payload.destinations;
      if (publicData.stats.destinations !== payload.destinations.length) {
        publicData.stats = {
          ...publicData.stats,
          destinations: payload.destinations.length,
        };
      }
      writeCachedDestinations({ generatedAt: publicData.generatedAt, destinations: payload.destinations });
      writeCachedPublicStats({ generatedAt: publicData.generatedAt, stats: publicData.stats });
      window.dispatchEvent(new CustomEvent(PUBLIC_DESTINATIONS_UPDATED_EVENT));
      return true;
    }
  } catch {
    // Keep destinations from localStorage if the request fails.
  }

  return false;
}

/** Превью для главной: сессии + подборки без тяжёлого /home. */
export async function hydratePublicHomePreview(timeoutMs = 8000): Promise<boolean> {
  try {
    const payload = await fetchPublicJson<PublicHomePreviewPayload>(`${API_BASE_URL}/api/public/home/preview`, timeoutMs);
    if (payload?.sessions) {
      publicData.generatedAt = payload.generatedAt || publicData.generatedAt;
      publicData.sessions = normalizeSessions(payload.sessions);
      publicData.landings = payload.landings || publicData.landings;
      if (publicData.stats.landings !== publicData.landings.length) {
        publicData.stats = {
          ...publicData.stats,
          landings: publicData.landings.length,
        };
      }
      writeCachedHomePreview({
        generatedAt: publicData.generatedAt,
        sessions: publicData.sessions,
        landings: publicData.landings,
      });
      writeCachedPublicStats({ generatedAt: publicData.generatedAt, stats: publicData.stats });
      return true;
    }
  } catch {
    if (publicData.sessions.length > 0) return false;
    const staticData = await fetchStaticData();
    if (staticData) {
      assignPublicData(staticData, { preserveStats: true, preserveDestinations: true });
      return true;
    }
  }

  return false;
}

/** @deprecated Используйте hydratePublicShell + hydratePublicHomePreview */
export async function hydratePublicData(): Promise<boolean> {
  const shell = await hydratePublicShell();
  const preview = await hydratePublicHomePreview();
  return shell || preview;
}

function normalizeSessions(sessions: PublicSession[]): PublicSession[] {
  return sessions.map((session) => ({
    ...session,
    slug: eventSlug(session),
  }));
}

function normalizePublicData(data: PublicData): PublicData {
  return {
    ...data,
    stats: normalizeStats(data.stats),
    sessions: normalizeSessions(data.sessions),
  };
}

function assignPublicData(
  data: PublicData,
  options: { preserveStats?: boolean; preserveDestinations?: boolean } = {},
) {
  const normalized = normalizePublicData(data);
  Object.assign(publicData, {
    ...normalized,
    stats: options.preserveStats ? publicData.stats : normalized.stats,
    destinations: options.preserveDestinations ? publicData.destinations : normalized.destinations,
  });
  writeCachedPublicStats({ generatedAt: publicData.generatedAt, stats: publicData.stats });
  if (publicData.destinations.length) {
    writeCachedDestinations({ generatedAt: publicData.generatedAt, destinations: publicData.destinations });
  }
  if (publicData.sessions.length) {
    writeCachedHomePreview({
      generatedAt: publicData.generatedAt,
      sessions: publicData.sessions,
      landings: publicData.landings,
    });
  }
}

function normalizeStats(stats: PublicData['stats']): PublicData['stats'] {
  return {
    events: Number(stats?.events) || 0,
    destinations: Number(stats?.destinations) || 0,
    venues: Number(stats?.venues) || 0,
    landings: Number(stats?.landings) || 0,
  };
}

async function fetchPublicJson<T>(url: string, timeoutMs: number): Promise<T | null> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { cache: 'no-store', signal: controller.signal });
    if (!response.ok) return null;
    return (await response.json()) as T;
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

function readCachedDestinations(): PublicDestinationsPayload | null {
  try {
    const raw = window.localStorage.getItem(PUBLIC_DESTINATIONS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PublicDestinationsPayload;
    if (!Array.isArray(parsed?.destinations)) return null;
    return {
      generatedAt: parsed.generatedAt || new Date().toISOString(),
      destinations: parsed.destinations,
    };
  } catch {
    return null;
  }
}

function writeCachedDestinations(payload: PublicDestinationsPayload) {
  try {
    window.localStorage.setItem(PUBLIC_DESTINATIONS_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage errors.
  }
}

function readCachedHomePreview(): PublicHomePreviewPayload | null {
  try {
    const raw = window.localStorage.getItem(PUBLIC_HOME_PREVIEW_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PublicHomePreviewPayload;
    if (!Array.isArray(parsed?.sessions)) return null;
    return {
      generatedAt: parsed.generatedAt || new Date().toISOString(),
      sessions: parsed.sessions,
      landings: Array.isArray(parsed.landings) ? parsed.landings : [],
    };
  } catch {
    return null;
  }
}

function writeCachedHomePreview(payload: PublicHomePreviewPayload) {
  try {
    window.localStorage.setItem(PUBLIC_HOME_PREVIEW_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage errors.
  }
}

export function formatNumber(value?: number | null): string {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(value || 0);
}

/** Округление метрик hero до ближайших 10 (1–4 → 10). */
export function roundStatToTen(value?: number | null): number {
  const count = Math.max(0, Math.round(value || 0));
  if (count === 0) return 0;
  const rounded = Math.round(count / 10) * 10;
  return rounded > 0 ? rounded : 10;
}

/**
 * Marketing count for catalog eyebrows: floor to decade with `+` when not exact.
 * 51 → 50+, 55 → 50+, 50 → 50, 9 → 9.
 */
export function formatCountFloorTenPlus(value?: number | null): string {
  const count = Math.max(0, Math.round(value || 0));
  if (count < 10) return formatNumber(count);
  const floored = Math.floor(count / 10) * 10;
  if (count === floored) return formatNumber(count);
  return `${formatNumber(floored)}+`;
}

/** Для блоков метрик: «+» только при достаточно больших числах, чтобы не показывать «1+». */
export function formatStatCount(value?: number | null, plusThreshold = 500): string {
  const count = Math.max(0, Math.round(value || 0));
  if (count >= plusThreshold) return `${formatNumber(count)}+`;
  return formatNumber(count);
}

export function isMeaningfulStatCount(value?: number | null, min = 10): boolean {
  return Math.round(value || 0) >= min;
}

export function formatMoney(value?: number | null): string {
  if (!value || value <= 0) return '-';
  return `от ${formatNumber(Math.round(value))}\u00a0₽`;
}

export function formatMoneyRange(from?: number | null, to?: number | null): string {
  if (!from || from <= 0) return '—';
  const min = Math.round(from);
  const max = to && to > 0 ? Math.round(to) : min;
  if (max > min) return `${formatNumber(min)}-${formatNumber(max)} ₽`;
  return `от ${formatNumber(min)} ₽`;
}

export function moneyRangeStatLabel(from?: number | null, to?: number | null): string {
  if (!from || from <= 0) return 'цена';
  const min = Math.round(from);
  const max = to && to > 0 ? Math.round(to) : min;
  return max > min ? 'диапазон цен' : 'цена от';
}

export function formatDate(value?: string | null, timeZone = 'Europe/Moscow'): string {
  if (!value) return 'открытая дата';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'дата уточняется';

  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  }).format(date);
}
