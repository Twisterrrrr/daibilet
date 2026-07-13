import { ADMIN_API_BASE } from '@/lib/admin-api';
import type { AdminData, AdminEventRow } from '@/types';

export const adminData: AdminData = window.ADMIN_DATA ?? {
  generatedAt: new Date().toISOString(),
  importJob: {
    source: 'Ticketscloud',
    status: 'missing',
    mode: 'local data not loaded',
    events: 0,
    categories: 0,
    venues: 0,
    cities: 0,
    tags: 0,
    metaEvents: 0,
  },
  metrics: {
    events: 0,
    readyEvents: 0,
    reviewEvents: 0,
    venues: 0,
    landingRules: 0,
    destinations: 0,
    launch: {
      groupedEvents: 0,
      readyForSales: 0,
      readyForSeo: 0,
      needsAttention: 0,
      priceBlocked: 0,
      purchaseBlocked: 0,
      noImage: 0,
      landingMatched: 0,
    },
  },
  eventRows: [],
  mappingRows: [],
  venueRows: [],
  duplicateCandidates: [],
  destinationRows: [],
  landingRows: [],
};

export async function hydrateAdminData(): Promise<void> {
  const baseUrl = ADMIN_API_BASE;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 1500);
  try {
    const response = await fetch(`${baseUrl}/api/admin/dashboard`, {
      cache: 'no-store',
      credentials: 'same-origin',
      signal: controller.signal,
    });
    if (!response.ok) return;
    const remoteData = (await response.json()) as AdminData;
    Object.assign(adminData, remoteData);
  } catch {
    // Admin remains usable from apps/admin/data.js while the local API is offline.
  } finally {
    window.clearTimeout(timeout);
  }
}

export function formatNumber(value?: number | null): string {
  if (value == null) return '-';
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(value);
}

export function formatMoney(value?: number | null): string {
  if (value == null || value <= 0) return '-';
  return `от ${formatNumber(Math.round(value))} ₽`;
}

export function formatDateTime(value?: string | null): string {
  if (!value) return 'открытая дата';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'дата неизвестна';
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function problemLabels(event: AdminEventRow): string[] {
  const labels = event.readinessIssues?.length ? event.readinessIssues.map((issue) => issue.label) : [...(event.reasons ?? [])];
  if (!event.purchaseReady && !String(event.offerStatus || '').toLowerCase().includes('widget') && !labels.some((label) => label.toLowerCase().includes('виджет'))) labels.push('нет виджета');
  return Array.from(new Set(labels));
}

export function suggestedDetailTab(event: AdminEventRow): 'overview' | 'classification' | 'schedule' | 'media' {
  const codes = new Set(event.readinessCodes ?? []);
  if (codes.has('MISSING_IMAGE')) return 'media';
  if (codes.has('MISSING_CATEGORY') || codes.has('MISSING_SUBCATEGORY')) return 'classification';
  if (codes.has('NO_FUTURE_SESSIONS') || codes.has('MISSING_PRICE') || codes.has('PRICE_TOO_LOW') || codes.has('MISSING_PURCHASE_ENTRY')) return 'schedule';
  const issues = event.reasons ?? [];
  if (issues.some((issue) => issue.includes('изображ'))) return 'media';
  if (issues.some((issue) => issue.includes('подкатег') || issue.includes('катег'))) return 'classification';
  if (issues.some((issue) => issue.includes('дат') || issue.includes('цен'))) return 'schedule';
  return 'overview';
}
