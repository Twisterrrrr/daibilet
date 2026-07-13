import * as React from 'react';
import { adminFetch } from '@/lib/admin-api';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle, ArrowRight, CheckCircle2, ExternalLink, EyeOff, Image, Loader2, Save, Search, X } from 'lucide-react';

import { DataTableShell, FilterBar, InfoNote, PageHeader, QuickFilterBar, SourceBadge, StatusBadge } from '@/components/admin/primitives';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { adminData, formatDateTime, formatMoney, formatNumber, problemLabels, suggestedDetailTab } from '@/data';
import type { AdminEventRow } from '@/types';

const PAGE_SIZE = 80;
const MIN_DISPLAY_PRICE_RUB = 100;
const PUBLIC_BASE_URL =
  ((import.meta as ImportMeta & { env?: { VITE_DAIBILET_PUBLIC_URL?: string } }).env?.VITE_DAIBILET_PUBLIC_URL as string | undefined) ||
  'http://127.0.0.1:5178';

const quickFilters = [
  { id: 'all', label: 'Все импортные' },
  { id: 'needs_attention', label: 'Нужно внимание' },
  { id: 'ready_publish', label: 'К публикации' },
  { id: 'purchase_blocked', label: 'Покупка не готова' },
  { id: 'no_image', label: 'Без фото' },
  { id: 'landing_match', label: 'В лендингах' },
];

type DetailTab = 'overview' | 'classification' | 'schedule' | 'sales' | 'content' | 'media' | 'seo' | 'source';

type EventsListResponse = {
  generatedAt: string;
  page: number;
  pages: number;
  limit: number;
  total: number;
  rows: AdminEventRow[];
  categories: string[];
  sources?: string[];
  quickFilters: Array<{ id: string; count: number }>;
  metrics: {
    events: number;
    readyEvents: number;
    reviewEvents: number;
    landingRules: number;
    sourceEvents?: number;
    groupedEvents?: number;
  };
};

type AdminEventDetail = {
  eventId: string;
  eventIds?: string[];
  summary: {
    slots: number;
    offers: number;
    vacant?: number | null;
    priceFrom?: number | null;
    soldTickets: number;
    orders: number;
  };
  sessions: Array<{
    id: string;
    eventId?: string;
    startsAt?: string | null;
    endsAt?: string | null;
    sourceStatus?: string | null;
    priceFrom?: number | null;
    vacant?: number | null;
    externalId?: string | null;
  }>;
  offers: Array<{
    id: string;
    eventId?: string;
    sourceCode: string;
    title?: string | null;
    priceRub?: number | null;
    widgetUrl?: string | null;
    deeplinkUrl?: string | null;
    active: boolean;
  }>;
  sales: {
    soldTickets: number;
    orders: number;
    ticketStatuses: Array<{ status: string; tickets: number }>;
  };
};

type EventOverridePatch = Partial<NonNullable<AdminEventRow['override']>>;

type AdminTaxonomy = {
  categories: Array<{ id: string; slug: string; title: string; position: number }>;
  subcategories: Array<{ id: string; categoryId: string; slug: string; title: string; position: number }>;
  tags: Array<{ id: string; slug: string; title: string }>;
};

function readinessBadge(event: AdminEventRow) {
  if (event.readiness === 'ready') return <StatusBadge status="live" label="готово" />;
  if (event.readiness === 'blocked') return <StatusBadge status="error" label="блокер" />;
  return <StatusBadge status="incomplete" label="доработать" />;
}

function eventStatus(event: AdminEventRow) {
  if (event.status === 'ready') return <StatusBadge status="live" label="active" />;
  return <StatusBadge status="incomplete" label="review" />;
}

function matchesQuickFilter(event: AdminEventRow, view: string) {
  if (view === 'needs_attention') return event.status === 'needs_review';
  if (view === 'ready_publish') return event.readiness === 'ready';
  if (view === 'purchase_blocked') return !isPurchaseReady(event);
  if (view === 'no_image') return !event.hasImage;
  if (view === 'landing_match') return event.landingHits.length > 0;
  return true;
}

function groupAdminRows(events: AdminEventRow[]): AdminEventRow[] {
  const groups = new Map<string, AdminEventRow>();

  for (const event of events) {
    const key = [event.source, event.title, event.city, event.venue].map((part) => String(part || '').trim().toLowerCase().replace(/\s+/g, ' ')).join('|');
    const current = groups.get(key);
    if (!current) {
      groups.set(key, {
        ...event,
        priceFrom: displayPriceFrom(event.priceFrom),
        offerStatus: normalizeOfferStatus(event),
        groupKey: key,
        groupEventIds: event.groupEventIds?.length ? [...event.groupEventIds] : [event.id],
        groupedEventsCount: event.groupedEventsCount || event.groupEventIds?.length || 1,
        slotCount: event.slotCount || (event.startsAt ? 1 : 0),
        landingHits: [...(event.landingHits || [])],
        tags: [...(event.tags || [])],
        reasons: [...(event.reasons || [])],
        readinessCodes: [...(event.readinessCodes || [])],
        readinessIssues: [...(event.readinessIssues || [])],
      });
      continue;
    }

    const currentTime = current.startsAt ? new Date(current.startsAt).getTime() : Number.POSITIVE_INFINITY;
    const eventTime = event.startsAt ? new Date(event.startsAt).getTime() : Number.POSITIVE_INFINITY;
    const priceCandidates = [current.priceFrom, event.priceFrom].filter((value): value is number => Number.isFinite(value) && Number(value) >= MIN_DISPLAY_PRICE_RUB);
    const vacantCandidates = [current.vacant, event.vacant].filter((value): value is number => Number.isFinite(value));

    current.groupEventIds = Array.from(new Set([...(current.groupEventIds || []), ...(event.groupEventIds?.length ? event.groupEventIds : [event.id])]));
    current.groupedEventsCount = (current.groupedEventsCount || 1) + (event.groupedEventsCount || event.groupEventIds?.length || 1);
    current.slotCount = (current.slotCount || 0) + (event.slotCount || (event.startsAt ? 1 : 0));
    current.landingHits = Array.from(new Set([...(current.landingHits || []), ...(event.landingHits || [])]));
    current.tags = Array.from(new Set([...(current.tags || []), ...(event.tags || [])]));
    current.reasons = Array.from(new Set([...(current.reasons || []), ...(event.reasons || [])]));
    current.readinessCodes = Array.from(new Set([...(current.readinessCodes || []), ...(event.readinessCodes || [])]));
    current.readinessIssues = mergeReadinessIssues(current.readinessIssues, event.readinessIssues);
    current.priceFrom = priceCandidates.length ? Math.min(...priceCandidates) : null;
    current.vacant = vacantCandidates.length ? vacantCandidates.reduce((sum, value) => sum + value, 0) : null;
    current.hasImage = current.hasImage || event.hasImage;
    const hadPurchaseReady = isPurchaseReady(current);
    const eventPurchaseReady = isPurchaseReady(event);
    current.purchaseReady = hadPurchaseReady || eventPurchaseReady;
    current.purchaseProvider = current.purchaseProvider || event.purchaseProvider || null;
    if (!current.purchaseUrlSource || (current.purchaseUrlSource !== 'offer' && event.purchaseUrlSource === 'offer')) {
      current.purchaseUrlSource = event.purchaseUrlSource || current.purchaseUrlSource || null;
    }
    current.status = current.status === 'needs_review' || event.status === 'needs_review' ? 'needs_review' : 'ready';
    current.readiness = worstReadiness(current.readiness, event.readiness);
    current.severity = worstSeverity(current.severity, event.severity);
    const eventOfferStatus = normalizeOfferStatus(event);
    if ((!hadPurchaseReady && eventPurchaseReady) || (!String(current.offerStatus || '').toLowerCase().includes('widget') && String(eventOfferStatus || '').toLowerCase().includes('widget'))) {
      current.offerStatus = eventOfferStatus;
      current.offerSourceCode = event.offerSourceCode || current.offerSourceCode;
      current.offerTitle = event.offerTitle || current.offerTitle;
      current.offerPriceRub = event.offerPriceRub ?? current.offerPriceRub;
      current.offerWidgetUrl = event.offerWidgetUrl || current.offerWidgetUrl;
      current.offerDeeplinkUrl = event.offerDeeplinkUrl || current.offerDeeplinkUrl;
    }

    if (eventTime < currentTime) {
      current.id = event.id;
      current.slug = event.slug;
      current.sourceSlug = event.sourceSlug;
      current.startsAt = event.startsAt;
    }
  }

  return Array.from(groups.values()).sort((left, right) => {
    const leftTime = left.startsAt ? new Date(left.startsAt).getTime() : Number.POSITIVE_INFINITY;
    const rightTime = right.startsAt ? new Date(right.startsAt).getTime() : Number.POSITIVE_INFINITY;
    return leftTime - rightTime || left.title.localeCompare(right.title, 'ru');
  });
}

function mergeReadinessIssues(left?: AdminEventRow['readinessIssues'], right?: AdminEventRow['readinessIssues']) {
  const byCode = new Map<string, NonNullable<AdminEventRow['readinessIssues']>[number]>();
  for (const issue of [...(left || []), ...(right || [])]) {
    if (!issue?.code || byCode.has(issue.code)) continue;
    byCode.set(issue.code, issue);
  }
  return Array.from(byCode.values());
}

function worstReadiness(left: AdminEventRow['readiness'], right: AdminEventRow['readiness']) {
  const rank = { ready: 0, review: 1, blocked: 2 };
  return rank[right] > rank[left] ? right : left;
}

function worstSeverity(left: AdminEventRow['severity'], right: AdminEventRow['severity']) {
  const rank = { low: 0, medium: 1, high: 2 };
  return rank[right] > rank[left] ? right : left;
}

function normalizeOfferStatus(event: AdminEventRow) {
  const value = String(event.offerStatus || '').toLowerCase();
  if (value.includes('widget')) return event.offerStatus;
  if (sourceBadgeFromEvent(event) === 'ticketscloud' && value.includes('цен')) return 'TC widget';
  if (sourceBadgeFromEvent(event) === 'teplohod' && value.includes('цен')) return 'Teplohod widget';
  return event.offerStatus;
}

function isPurchaseReady(event: AdminEventRow) {
  return Boolean(event.purchaseReady || String(event.offerStatus || '').toLowerCase().includes('widget'));
}

function purchaseSourceLabel(event: AdminEventRow) {
  if (!isPurchaseReady(event)) return 'проверить';
  if (event.purchaseUrlSource === 'offer') return 'offer';
  if (event.purchaseUrlSource === 'fallback') return 'fallback';
  return event.purchaseMode || 'widget';
}

function sourceBadgeFromEvent(event: Pick<AdminEventRow, 'source' | 'sourceCode'>): 'ticketscloud' | 'teplohod' | 'manual' {
  const source = `${event.sourceCode || ''} ${event.source || ''}`.toLowerCase();
  if (source.includes('teplohod') || source.includes('tep')) return 'teplohod';
  if (source.includes('ticketscloud') || source.includes('tc')) return 'ticketscloud';
  return 'manual';
}

function sourceCodeLabel(code: string) {
  const normalized = String(code || '').toUpperCase();
  if (normalized.includes('TEPLOHOD')) return 'Teplohod.info';
  if (normalized.includes('TICKETSCLOUD') || normalized.includes('TC')) return 'Ticketscloud';
  return code;
}

function displayPriceFrom(...values: Array<number | null | undefined>) {
  const prices = values.filter((value): value is number => Number.isFinite(value) && Number(value) >= MIN_DISPLAY_PRICE_RUB);
  return prices.length ? Math.min(...prices) : null;
}

function buildLocalResponse(searchParams: URLSearchParams): EventsListResponse {
  const q = (searchParams.get('q') ?? '').trim().toLowerCase();
  const view = searchParams.get('view') ?? 'all';
  const sourceCategory = searchParams.get('category') ?? 'all';
  const sourceFilter = searchParams.get('source') ?? 'all';
  const readiness = searchParams.get('readiness') ?? 'all';
  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1);
  const groupedEvents = groupAdminRows(adminData.eventRows);

  const filtered = groupedEvents.filter((event) => {
    if (!matchesQuickFilter(event, view)) return false;
    if (sourceFilter !== 'all' && String(event.sourceCode || event.source || '').toUpperCase() !== sourceFilter.toUpperCase()) return false;
    if (sourceCategory !== 'all' && event.proposedCategory !== sourceCategory) return false;
    if (readiness !== 'all' && event.readiness !== readiness) return false;
    if (!q) return true;
    return [
      event.title,
      event.id,
      event.city,
      event.destination,
      event.venue,
      event.sourceCategory,
      event.proposedCategory,
      event.offerStatus,
      ...event.tags,
      ...event.landingHits,
    ]
      .join(' ')
      .toLowerCase()
      .includes(q);
  });

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pages);

  return {
    generatedAt: adminData.generatedAt,
    page: safePage,
    pages,
    limit: PAGE_SIZE,
    total: filtered.length,
    rows: filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    categories: Array.from(new Set(groupedEvents.map((event) => event.proposedCategory))).sort((a, b) => a.localeCompare(b, 'ru')),
    sources: Array.from(new Set(groupedEvents.map((event) => event.sourceCode).filter((source): source is string => Boolean(source)))).sort(),
    quickFilters: quickFilters.map((item) => ({
      id: item.id,
      count: groupedEvents.filter((event) => matchesQuickFilter(event, item.id)).length,
    })),
    metrics: {
      events: groupedEvents.length,
      readyEvents: groupedEvents.filter((event) => event.readiness === 'ready').length,
      reviewEvents: groupedEvents.filter((event) => event.readiness !== 'ready').length,
      landingRules: adminData.metrics.landingRules,
    },
  };
}

function buildLoadingResponse(searchParams: URLSearchParams): EventsListResponse {
  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1);

  return {
    generatedAt: new Date().toISOString(),
    page,
    pages: 1,
    limit: PAGE_SIZE,
    total: 0,
    rows: [],
    categories: [],
    sources: [],
    quickFilters: quickFilters.map((item) => ({ id: item.id, count: 0 })),
    metrics: {
      events: 0,
      readyEvents: 0,
      reviewEvents: 0,
      landingRules: 0,
      sourceEvents: 0,
      groupedEvents: 0,
    },
  };
}

function normalizeEventsListResponse(response: EventsListResponse, searchParams: URLSearchParams): EventsListResponse {
  if (!response.metrics?.groupedEvents && !response.metrics?.sourceEvents) {
    return buildLocalResponse(searchParams);
  }

  const rows = groupAdminRows(response.rows || []);
  const pages = Math.max(1, Math.ceil(response.total / response.limit));
  return {
    ...response,
    pages,
    page: Math.min(response.page, pages),
    rows,
    quickFilters: quickFilters.map((item) => ({
      id: item.id,
      count: response.quickFilters.find((filter) => filter.id === item.id)?.count ?? rows.filter((event) => matchesQuickFilter(event, item.id)).length,
    })),
    metrics: {
      ...response.metrics,
      events: response.metrics.groupedEvents ?? response.metrics.events,
      readyEvents: response.metrics.readyEvents,
      reviewEvents: response.metrics.reviewEvents,
      sourceEvents: response.metrics.sourceEvents ?? response.total,
      groupedEvents: response.metrics.groupedEvents ?? response.metrics.events,
    },
  };
}

function detailTabFromSuggestion(event: AdminEventRow): DetailTab {
  const suggested = suggestedDetailTab(event);
  if (suggested === 'media') return 'media';
  if (suggested === 'schedule') return 'schedule';
  if (event.reasons.some((reason) => reason.toLowerCase().includes('катег'))) return 'classification';
  return 'overview';
}

export function EventsPage() {
  const [params, setParams] = useSearchParams();
  const [payload, setPayload] = React.useState<EventsListResponse>(() => buildLoadingResponse(params));
  const [isLoading, setIsLoading] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = React.useState<AdminEventRow | null>(null);
  const [detailTab, setDetailTab] = React.useState<DetailTab>('overview');
  const [eventDetail, setEventDetail] = React.useState<AdminEventDetail | null>(null);
  const [taxonomy, setTaxonomy] = React.useState<AdminTaxonomy | null>(null);
  const [isDetailLoading, setIsDetailLoading] = React.useState(false);
  const [isSavingOverride, setIsSavingOverride] = React.useState(false);
  const [isSavingModeration, setIsSavingModeration] = React.useState(false);
  const [isSavingTaxonomy, setIsSavingTaxonomy] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);

  const q = params.get('q') ?? '';
  const view = params.get('view') ?? 'all';
  const sourceCategory = params.get('category') ?? 'all';
  const sourceFilter = params.get('source') ?? 'all';
  const readiness = params.get('readiness') ?? 'all';
  const page = payload.page;
  const pages = payload.pages;
  const rows = payload.rows;

  React.useEffect(() => {
    const controller = new AbortController();
    const nextParams = new URLSearchParams(params);
    nextParams.set('limit', String(PAGE_SIZE));
    setPayload((current) => ({
      ...buildLoadingResponse(params),
      categories: current.categories,
      sources: current.sources,
      quickFilters: current.quickFilters,
      metrics: current.metrics,
    }));
    setIsLoading(true);

    adminFetch(`/api/admin/events?${nextParams.toString()}`, {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return (await response.json()) as EventsListResponse;
      })
      .then((data) => {
        setPayload(normalizeEventsListResponse(data, params));
        setLoadError(null);
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setPayload(buildLocalResponse(params));
        setLoadError(error instanceof Error ? error.message : String(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [params]);

  React.useEffect(() => {
    const controller = new AbortController();
    adminFetch(`/api/admin/taxonomy`, { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return (await response.json()) as AdminTaxonomy;
      })
      .then(setTaxonomy)
      .catch(() => {
        if (!controller.signal.aborted) setTaxonomy(null);
      });

    return () => controller.abort();
  }, []);

  React.useEffect(() => {
    if (!selectedEvent) {
      setEventDetail(null);
      setIsDetailLoading(false);
      return;
    }

    const controller = new AbortController();
    setIsDetailLoading(true);

    adminFetch(`/api/admin/events/${encodeURIComponent(selectedEvent.id)}`, {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return (await response.json()) as AdminEventDetail;
      })
      .then(setEventDetail)
      .catch(() => {
        if (!controller.signal.aborted) setEventDetail(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsDetailLoading(false);
      });

    return () => controller.abort();
  }, [selectedEvent]);

  const quickFilterItems = React.useMemo(() => {
    const counts = new Map(payload.quickFilters.map((item) => [item.id, item.count]));
    return quickFilters.map((item) => ({ ...item, count: counts.get(item.id) ?? 0 }));
  }, [payload.quickFilters]);

  const update = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (!value || value === 'all') next.delete(key);
    else next.set(key, value);
    if (key !== 'page') next.delete('page');
    setParams(next, { replace: true });
  };

  const reset = () => setParams(new URLSearchParams(), { replace: true });

  const openEvent = (event: AdminEventRow) => {
    setSelectedEvent(event);
    setDetailTab(detailTabFromSuggestion(event));
    setSaveError(null);
  };

  const saveOverride = async (patch: EventOverridePatch) => {
    if (!selectedEvent) return;
    setIsSavingOverride(true);
    setSaveError(null);

    try {
      const response = await adminFetch(`/api/admin/events/${encodeURIComponent(selectedEvent.id)}/override`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = (await response.json()) as { override: NonNullable<AdminEventRow['override']> };
      const applyOverride = (event: AdminEventRow): AdminEventRow => ({
        ...event,
        override: { ...(event.override || {}), ...result.override },
      });

      setSelectedEvent((event) => (event && event.id === selectedEvent.id ? applyOverride(event) : event));
      setPayload((current) => ({
        ...current,
        rows: current.rows.map((event) => (event.id === selectedEvent.id ? applyOverride(event) : event)),
      }));
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsSavingOverride(false);
    }
  };

  const saveModerationStatus = async (editorStatus: string) => {
    if (!selectedEvent) return;
    setIsSavingModeration(true);
    setSaveError(null);

    try {
      const response = await adminFetch(`/api/admin/events/${encodeURIComponent(selectedEvent.id)}/moderation`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ editorStatus }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = (await response.json()) as { override: NonNullable<AdminEventRow['override']> };
      const applyStatus = (event: AdminEventRow): AdminEventRow => ({
        ...event,
        moderationStatus: result.override.editorStatus || editorStatus,
        override: { ...(event.override || {}), ...result.override },
      });

      setSelectedEvent((event) => (event && event.id === selectedEvent.id ? applyStatus(event) : event));
      setPayload((current) => ({
        ...current,
        rows: current.rows.map((event) => (event.id === selectedEvent.id ? applyStatus(event) : event)),
      }));
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsSavingModeration(false);
    }
  };

  const saveTaxonomy = async (patch: { categoryId?: string | null; primarySubcategoryId?: string | null; subcategoryIds: string[]; tagIds: string[] }) => {
    if (!selectedEvent) return;
    setIsSavingTaxonomy(true);
    setSaveError(null);

    try {
      const response = await adminFetch(`/api/admin/events/${encodeURIComponent(selectedEvent.id)}/taxonomy`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = (await response.json()) as { event: AdminEventRow | null };
      if (!result.event) return;

      setSelectedEvent((event) => (event && event.id === selectedEvent.id ? { ...event, ...result.event } : event));
      setPayload((current) => ({
        ...current,
        rows: current.rows.map((event) => (event.id === selectedEvent.id ? { ...event, ...result.event } : event)),
      }));
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsSavingTaxonomy(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="События"
        description="Рабочий стол импортного каталога: качество данных, типизация, offer/widget и попадание в SEO-выборки."
        meta={
          <>
            <SourceBadge source="ticketscloud" />
            <SourceBadge source="teplohod" />
            <Badge variant="outline">{formatNumber(payload.metrics.events)} imported</Badge>
            <Badge variant="outline">{formatNumber(payload.metrics.reviewEvents)} need attention</Badge>
            {isLoading ? (
              <Badge variant="outline" className="gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                backend
              </Badge>
            ) : null}
          </>
        }
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setPayload(buildLocalResponse(params))}>
              Local fallback
            </Button>
            <Button size="sm">Run sync</Button>
          </>
        }
      />

      <div className="mb-4 grid gap-3 md:grid-cols-4">
        <MetricCard value={payload.metrics.events} label="Карточек событий" />
        <MetricCard value={payload.metrics.reviewEvents} label="Нужно внимание" />
        <MetricCard value={payload.metrics.readyEvents} label="Готово" />
        <MetricCard value={payload.metrics.landingRules} label="Landing rules" />
      </div>

      <FilterBar>
        <div className="relative min-w-[260px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(event) => update('q', event.target.value)} placeholder="Поиск события, площадки, города, тега..." className="h-9 pl-8" />
        </div>
        <select className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={sourceCategory} onChange={(event) => update('category', event.target.value)}>
          <option value="all">Все категории каталога</option>
          {payload.categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
        <select className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={sourceFilter} onChange={(event) => update('source', event.target.value)}>
          <option value="all">Все источники</option>
          {(payload.sources || ['TICKETSCLOUD', 'TEPLOHOD']).map((source) => (
            <option key={source} value={source}>
              {sourceCodeLabel(source)}
            </option>
          ))}
        </select>
        <select className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={readiness} onChange={(event) => update('readiness', event.target.value)}>
          <option value="all">Любая готовность</option>
          <option value="blocked">Блокер</option>
          <option value="review">Доработать</option>
          <option value="ready">Готово</option>
        </select>
        {(q || view !== 'all' || sourceCategory !== 'all' || sourceFilter !== 'all' || readiness !== 'all') && (
          <Button variant="ghost" size="sm" onClick={reset}>
            <X className="h-4 w-4" />
            Сбросить
          </Button>
        )}
      </FilterBar>

      <QuickFilterBar items={quickFilterItems} activeId={view} onChange={(id) => update('view', id)} />

      <div className="mb-4">
        <InfoNote>
          Импортные поля остаются source-managed. Ручная модерация пишет override: контент, медиа, SEO и редакционный статус события.
          <span className="ml-2">Одинаковые события от одного провайдера с тем же названием и площадкой сгруппированы в одну карточку.</span>
          {loadError ? <span className="ml-2 text-warning-foreground">Backend fallback: {loadError}</span> : null}
        </InfoNote>
      </div>

      <DataTableShell columns={['Событие', 'Источник', 'Каталог', 'Город', 'Площадка', 'Расписание', 'Цена', 'Покупка', 'Проблемы', 'Статус', '']}>
        {rows.map((event) => {
          const problems = problemLabels(event);
          const groupedEventsCount = event.groupedEventsCount || event.groupEventIds?.length || 1;
          const slotCount = event.slotCount || groupedEventsCount;
          return (
            <tr key={event.id} className="border-b border-border last:border-0 hover:bg-secondary/40">
              <td className="min-w-[320px] px-4 py-3 align-top">
                <div className="font-medium text-foreground">{event.override?.title || event.title}</div>
                <div className="mt-1 font-mono text-[11px] text-muted-foreground">{event.id}</div>
                {groupedEventsCount > 1 ? (
                  <div className="mt-1 flex flex-wrap gap-1">
                    <Badge variant="outline" className="border-primary/25 bg-primary/5 text-[11px] text-primary">
                      {formatNumber(groupedEventsCount)} импортных событий
                    </Badge>
                    <Badge variant="outline" className="text-[11px]">
                      одна карточка
                    </Badge>
                  </div>
                ) : null}
                {event.tags.length > 0 ? <div className="mt-1 line-clamp-1 text-xs text-muted-foreground">{event.tags.slice(0, 3).join(', ')}</div> : null}
              </td>
              <td className="px-4 py-3 align-top">
                <SourceBadge source={sourceBadgeFromEvent(event)} />
                <div className="mt-1 text-xs text-muted-foreground">{event.sourceCategory}</div>
              </td>
              <td className="px-4 py-3 align-top">
                <div className="text-sm font-medium">{event.proposedCategory}</div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {event.landingHits.slice(0, 2).map((hit) => (
                    <Badge key={hit} variant="outline" className="text-[11px]">
                      {hit}
                    </Badge>
                  ))}
                </div>
              </td>
              <td className="px-4 py-3 align-top">
                <div className="text-sm">{event.destination}</div>
                <div className="text-xs text-muted-foreground">{event.city}</div>
              </td>
              <td className="min-w-[220px] px-4 py-3 align-top">
                <div className="text-sm">{event.venue}</div>
                <div className="text-xs text-muted-foreground">{event.venueKind}</div>
              </td>
              <td className="px-4 py-3 align-top">
                <div className="text-sm">{formatDateTime(event.startsAt)}</div>
                <div className="mt-1 flex flex-wrap items-center gap-1">
                  <Badge variant="outline" className="text-[11px]">
                    {formatNumber(slotCount)} слотов
                  </Badge>
                  <span className="text-xs text-muted-foreground">{event.eventType}</span>
                </div>
              </td>
              <td className="px-4 py-3 align-top text-sm font-medium">{formatMoney(event.priceFrom)}</td>
              <td className="px-4 py-3 align-top">
                <div className="flex flex-col items-start gap-1.5">
                  <StatusBadge status={isPurchaseReady(event) ? 'live' : 'incomplete'} label={event.offerStatus} />
                  <Badge variant="outline" className="text-[11px]">
                    {purchaseSourceLabel(event)}
                  </Badge>
                </div>
              </td>
              <td className="max-w-[240px] px-4 py-3 align-top">
                {problems.length === 0 ? (
                  <span className="inline-flex items-center gap-1 text-xs text-success">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    нет
                  </span>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {problems.slice(0, 3).map((problem) => (
                      <Badge key={problem} variant="outline" className="gap-1 border-warning/30 bg-warning/10 text-warning-foreground">
                        <AlertTriangle className="h-3 w-3" />
                        {problem}
                      </Badge>
                    ))}
                  </div>
                )}
              </td>
              <td className="px-4 py-3 align-top">
                {readinessBadge(event)}
                <div className="mt-1">{eventStatus(event)}</div>
                <div className="mt-1">
                  <Badge variant="outline" className="text-[11px]">
                    {event.moderationStatus || event.override?.editorStatus || 'REVIEW'}
                  </Badge>
                </div>
              </td>
              <td className="px-4 py-3 align-top">
                <Button variant="ghost" size="sm" title={`Открыть карточку события`} onClick={() => openEvent(event)}>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </td>
            </tr>
          );
        })}
        {rows.length === 0 ? (
          <tr>
            <td colSpan={11} className="px-4 py-16 text-center text-sm text-muted-foreground">
              <EyeOff className="mx-auto mb-2 h-5 w-5" />
              Ничего не найдено
            </td>
          </tr>
        ) : null}
      </DataTableShell>

      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Показано {formatNumber(rows.length)} из {formatNumber(payload.total)}
        </span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => update('page', String(page - 1))}>
            Назад
          </Button>
          <span>
            {page} / {pages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => update('page', String(page + 1))}>
            Далее
          </Button>
        </div>
      </div>

      <EventDetailSheet
        event={selectedEvent}
        detail={eventDetail}
        isDetailLoading={isDetailLoading}
        isSavingOverride={isSavingOverride}
        isSavingModeration={isSavingModeration}
        isSavingTaxonomy={isSavingTaxonomy}
        saveError={saveError}
        taxonomy={taxonomy}
        tab={detailTab}
        onTabChange={setDetailTab}
        onSaveOverride={saveOverride}
        onSaveModerationStatus={saveModerationStatus}
        onSaveTaxonomy={saveTaxonomy}
        onOpenChange={(open) => !open && setSelectedEvent(null)}
      />
    </div>
  );
}

function MetricCard(props: { value: number; label: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-2xl font-semibold">{formatNumber(props.value)}</div>
      <div className="text-xs text-muted-foreground">{props.label}</div>
    </div>
  );
}

function EventDetailSheet(props: {
  event: AdminEventRow | null;
  detail: AdminEventDetail | null;
  taxonomy: AdminTaxonomy | null;
  isDetailLoading: boolean;
  isSavingOverride: boolean;
  isSavingModeration: boolean;
  isSavingTaxonomy: boolean;
  saveError: string | null;
  tab: DetailTab;
  onTabChange: (tab: DetailTab) => void;
  onSaveOverride: (patch: EventOverridePatch) => Promise<void>;
  onSaveModerationStatus: (editorStatus: string) => Promise<void>;
  onSaveTaxonomy: (patch: { categoryId?: string | null; primarySubcategoryId?: string | null; subcategoryIds: string[]; tagIds: string[] }) => Promise<void>;
  onOpenChange: (open: boolean) => void;
}) {
  const { event, detail, taxonomy, isDetailLoading, isSavingOverride, isSavingModeration, isSavingTaxonomy, saveError, tab, onTabChange, onSaveOverride, onSaveModerationStatus, onSaveTaxonomy, onOpenChange } = props;
  const problems = event ? problemLabels(event) : [];
  const tabs: Array<{ id: DetailTab; label: string }> = [
    { id: 'overview', label: 'Обзор' },
    { id: 'classification', label: 'Классификация' },
    { id: 'schedule', label: 'Расписание' },
    { id: 'sales', label: 'Продажи' },
    { id: 'content', label: 'Контент' },
    { id: 'media', label: 'Медиа' },
    { id: 'seo', label: 'SEO' },
    { id: 'source', label: 'Источник' },
  ];

  return (
    <Sheet open={Boolean(event)} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-[min(920px,96vw)] flex-col overflow-y-auto sm:max-w-[920px]">
        {event ? (
          <>
            <div className="pr-10">
              <div className="flex flex-wrap items-center gap-2">
                <SourceBadge source={sourceBadgeFromEvent(event)} />
                {readinessBadge(event)}
                <Badge variant="outline">{event.proposedCategory}</Badge>
              </div>
              <h2 className="mt-3 text-xl font-semibold leading-snug">{event.override?.title || event.title}</h2>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <div className="font-mono text-xs text-muted-foreground">{event.id}</div>
                <a
                  href={`${PUBLIC_BASE_URL}/events/${encodeURIComponent(event.slug || event.id)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-7 items-center gap-1 rounded-md border border-border px-2 text-xs font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Public card
                </a>
              </div>
            </div>

            <ModerationPanel event={event} isSaving={isSavingModeration} error={saveError} onChange={onSaveModerationStatus} />

            <div className="mt-5 flex flex-wrap gap-2 border-b border-border pb-3">
              {tabs.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onTabChange(item.id)}
                  className={`rounded-md border px-3 py-1.5 text-xs font-medium transition ${
                    tab === item.id ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground hover:bg-secondary'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {tab === 'overview' ? <OverviewTab event={event} problems={problems} /> : null}
            {tab === 'classification' ? <ClassificationTab event={event} taxonomy={taxonomy} isSaving={isSavingTaxonomy} saveError={saveError} onSave={onSaveTaxonomy} /> : null}
            {tab === 'schedule' ? <ScheduleTab event={event} detail={detail} isLoading={isDetailLoading} /> : null}
            {tab === 'sales' ? <SalesTab event={event} detail={detail} isLoading={isDetailLoading} /> : null}
            {tab === 'content' ? <ContentTab event={event} isSaving={isSavingOverride} saveError={saveError} onSave={onSaveOverride} /> : null}
            {tab === 'media' ? <MediaTab event={event} isSaving={isSavingOverride} saveError={saveError} onSave={onSaveOverride} /> : null}
            {tab === 'seo' ? <SeoTab event={event} isSaving={isSavingOverride} saveError={saveError} onSave={onSaveOverride} /> : null}
            {tab === 'source' ? <SourceTab event={event} problems={problems} /> : null}
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function ModerationPanel(props: { event: AdminEventRow; isSaving: boolean; error: string | null; onChange: (editorStatus: string) => Promise<void> }) {
  const { event, isSaving, error, onChange } = props;
  const status = event.moderationStatus || event.override?.editorStatus || 'REVIEW';
  const blockers = event.publishBlockers || [];
  const warnings = event.publishWarnings || [];
  const canPublish = event.canPublish !== false && blockers.length === 0;
  const actions = [
    { status: 'DRAFT', label: 'В черновик' },
    { status: 'REVIEW', label: 'На проверку' },
    { status: 'READY', label: 'Готово' },
    { status: 'PUBLISHED', label: 'Опубликовать', disabled: !canPublish },
    { status: 'HIDDEN', label: 'Скрыть' },
  ];

  return (
    <section className="mt-4 rounded-lg border border-border bg-secondary/20 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold">Модерация</h3>
            <Badge variant="outline">{status}</Badge>
            {canPublish ? (
              <Badge variant="outline" className="border-success/30 bg-success/10 text-success">
                publish gate ok
              </Badge>
            ) : (
              <Badge variant="outline" className="border-warning/30 bg-warning/10 text-warning-foreground">
                есть блокеры
              </Badge>
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {blockers.map((item) => (
              <Badge key={item} variant="outline" className="border-warning/30 bg-warning/10 text-warning-foreground">
                {item}
              </Badge>
            ))}
            {warnings.slice(0, 4).map((item) => (
              <Badge key={item} variant="outline">
                {item}
              </Badge>
            ))}
            {!blockers.length && !warnings.length ? <span className="text-xs text-muted-foreground">Критичных замечаний нет.</span> : null}
          </div>
          {error ? <div className="mt-2 text-xs text-warning-foreground">Ошибка сохранения: {error}</div> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {actions.map((action) => (
            <Button key={action.status} size="sm" variant={status === action.status ? 'default' : 'outline'} disabled={isSaving || action.disabled} onClick={() => onChange(action.status)}>
              {isSaving && status !== action.status ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {action.label}
            </Button>
          ))}
        </div>
      </div>
    </section>
  );
}

function OverviewTab(props: { event: AdminEventRow; problems: string[] }) {
  const { event, problems } = props;
  const groupedEventsCount = event.groupedEventsCount || event.groupEventIds?.length || 1;
  const slotCount = event.slotCount || groupedEventsCount;
  return (
    <div className="mt-5 grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
      <section className="rounded-lg border border-border p-4">
        <h3 className="text-sm font-semibold">Карточка каталога</h3>
        <dl className="mt-4 grid gap-3 text-sm">
          <DetailRow label="Город" value={event.destination} />
          <DetailRow label="Площадка" value={event.venue} />
          <DetailRow label="Ближайший слот" value={`${formatDateTime(event.startsAt)} · ${event.eventType}`} />
          <DetailRow label="Группа" value={`${formatNumber(groupedEventsCount)} импортных событий · ${formatNumber(slotCount)} слотов`} />
          <DetailRow label="Цена" value={formatMoney(event.priceFrom)} />
          <DetailRow label="Покупка" value={`${event.offerStatus} · ${purchaseSourceLabel(event)}`} />
        </dl>
      </section>
      <section className="rounded-lg border border-border p-4">
        <h3 className="text-sm font-semibold">Готовность</h3>
        <div className="mt-4 flex flex-wrap gap-2">
          {problems.length ? (
            problems.map((problem) => (
              <Badge key={problem} variant="outline" className="border-warning/30 bg-warning/10 text-warning-foreground">
                {problem}
              </Badge>
            ))
          ) : (
            <Badge variant="outline" className="border-success/30 bg-success/10 text-success">
              можно публиковать
            </Badge>
          )}
        </div>
      </section>
    </div>
  );
}

function ClassificationTab(props: {
  event: AdminEventRow;
  taxonomy: AdminTaxonomy | null;
  isSaving: boolean;
  saveError: string | null;
  onSave: (patch: { categoryId?: string | null; primarySubcategoryId?: string | null; subcategoryIds: string[]; tagIds: string[] }) => Promise<void>;
}) {
  const { event, taxonomy, isSaving, saveError, onSave } = props;
  const [categoryId, setCategoryId] = React.useState(event.categoryId || '');
  const [primarySubcategoryId, setPrimarySubcategoryId] = React.useState(event.primarySubcategoryId || '');
  const [subcategoryIds, setSubcategoryIds] = React.useState<string[]>(event.subcategoryIds || []);
  const [tagIds, setTagIds] = React.useState<string[]>(event.tagIds || []);
  const [tagQuery, setTagQuery] = React.useState('');

  React.useEffect(() => {
    setCategoryId(event.categoryId || '');
    setPrimarySubcategoryId(event.primarySubcategoryId || '');
    setSubcategoryIds(event.subcategoryIds || []);
    setTagIds(event.tagIds || []);
  }, [event.categoryId, event.id, event.primarySubcategoryId, event.subcategoryIds, event.tagIds]);

  const categorySubcategories = (taxonomy?.subcategories || []).filter((subcategory) => subcategory.categoryId === categoryId);
  const normalizedTagQuery = tagQuery.trim().toLowerCase();
  const selectedTagIds = new Set(tagIds);
  const visibleTags = (taxonomy?.tags || [])
    .filter((tag) => selectedTagIds.has(tag.id) || !normalizedTagQuery || tag.title.toLowerCase().includes(normalizedTagQuery) || tag.slug.toLowerCase().includes(normalizedTagQuery))
    .slice(0, 48);

  const toggleSubcategory = (subcategoryId: string) => {
    setSubcategoryIds((current) => (current.includes(subcategoryId) ? current.filter((id) => id !== subcategoryId) : [...current, subcategoryId]));
  };

  const toggleTag = (tagId: string) => {
    setTagIds((current) => (current.includes(tagId) ? current.filter((id) => id !== tagId) : [...current, tagId]));
  };

  if (!taxonomy) {
    return (
      <div className="mt-5">
        <InfoNote>Справочник taxonomy пока не загружен. Проверь backend `/api/admin/taxonomy`.</InfoNote>
      </div>
    );
  }

  return (
    <div className="mt-5 space-y-4">
      <InfoNote>Ручная классификация влияет на каталог, лендинги и publish gate. Source-tags можно оставить, но спорные события лучше доводить основной подкатегорией.</InfoNote>

      <section className="rounded-lg border border-border p-4">
        <h3 className="text-sm font-semibold">Категория и подкатегория</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-xs text-muted-foreground">Основная категория</span>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={categoryId}
              onChange={(changeEvent) => {
                setCategoryId(changeEvent.target.value);
                setPrimarySubcategoryId('');
                setSubcategoryIds([]);
              }}
            >
              <option value="">Не выбрано</option>
              {taxonomy.categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.title}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <span className="mb-1 block text-xs text-muted-foreground">Основная подкатегория</span>
            <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={primarySubcategoryId} onChange={(changeEvent) => setPrimarySubcategoryId(changeEvent.target.value)}>
              <option value="">Не выбрано</option>
              {categorySubcategories.map((subcategory) => (
                <option key={subcategory.id} value={subcategory.id}>
                  {subcategory.title}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4">
          <div className="mb-2 text-xs text-muted-foreground">Дополнительные подкатегории</div>
          <div className="flex flex-wrap gap-2">
            {categorySubcategories.map((subcategory) => (
              <label key={subcategory.id} className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs">
                <input type="checkbox" checked={subcategoryIds.includes(subcategory.id)} onChange={() => toggleSubcategory(subcategory.id)} />
                {subcategory.title}
              </label>
            ))}
            {!categorySubcategories.length ? <span className="text-xs text-muted-foreground">Сначала выбери категорию</span> : null}
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-border p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold">Теги</h3>
          <Badge variant="outline">{formatNumber(tagIds.length)} выбрано</Badge>
        </div>
        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={tagQuery} onChange={(changeEvent) => setTagQuery(changeEvent.target.value)} placeholder="Найти тег..." className="h-9 pl-8" />
        </div>
        <div className="mt-3 flex max-h-56 flex-wrap gap-2 overflow-y-auto rounded-md border border-border p-3">
          {visibleTags.map((tag) => (
            <label key={tag.id} className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs">
              <input type="checkbox" checked={tagIds.includes(tag.id)} onChange={() => toggleTag(tag.id)} />
              {tag.title}
            </label>
          ))}
        </div>
      </section>

      <SavePanel
        isSaving={isSaving}
        error={saveError}
        onSave={() =>
          onSave({
            categoryId,
            primarySubcategoryId,
            subcategoryIds,
            tagIds,
          })
        }
      />
    </div>
  );
}

function ScheduleTab(props: { event: AdminEventRow; detail: AdminEventDetail | null; isLoading: boolean }) {
  const { event, detail, isLoading } = props;
  const sessions = detail?.sessions?.length
    ? detail.sessions
    : [
        {
          id: `${event.id}:current`,
          startsAt: event.startsAt,
          endsAt: null,
          sourceStatus: event.status,
          priceFrom: event.priceFrom,
          vacant: event.vacant,
          externalId: null,
        },
      ];
  const summary = detail?.summary;

  return (
    <div className="mt-5 space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <MetricCard value={summary?.slots ?? sessions.length} label="Слотов" />
        <MetricCard value={summary?.vacant ?? event.vacant ?? 0} label="Остаток source" />
        <MetricCard value={summary?.offers ?? 0} label="Offer-строк" />
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-2xl font-semibold">{formatMoney(summary?.priceFrom ?? event.priceFrom)}</div>
          <div className="text-xs text-muted-foreground">Цена от</div>
        </div>
      </div>

      <section className="rounded-lg border border-border">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold">Слоты и наличие</h3>
          {isLoading ? (
            <Badge variant="outline" className="gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              загрузка
            </Badge>
          ) : null}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-secondary/50 text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Дата и время</th>
                <th className="px-4 py-3 font-medium">Статус</th>
                <th className="px-4 py-3 font-medium">Цена</th>
                <th className="px-4 py-3 font-medium">Остаток</th>
                <th className="px-4 py-3 font-medium">External ID</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => (
                <tr key={session.id} className="border-t border-border">
                  <td className="px-4 py-3">{formatDateTime(session.startsAt)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={session.sourceStatus === 'ready' || session.sourceStatus === 'READY' ? 'live' : 'incomplete'} label={session.sourceStatus || 'source'} />
                  </td>
                  <td className="px-4 py-3 font-medium">{formatMoney(session.priceFrom)}</td>
                  <td className="px-4 py-3">{formatNumber(session.vacant)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{session.externalId || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function SalesTab(props: { event: AdminEventRow; detail: AdminEventDetail | null; isLoading: boolean }) {
  const { event, detail, isLoading } = props;
  const sales = detail?.sales;
  const offers = detail?.offers ?? [];

  return (
    <div className="mt-5 space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <MetricCard value={sales?.orders ?? 0} label="Заказов у нас" />
        <MetricCard value={sales?.soldTickets ?? 0} label="Продано билетов" />
        <MetricCard value={event.vacant ?? 0} label="Остаток TC" />
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-2xl font-semibold">{event.offerStatus}</div>
          <div className="text-xs text-muted-foreground">Покупка · {purchaseSourceLabel(event)}</div>
        </div>
      </div>

      <InfoNote>
        Финансовый контур остается у билетной системы. Здесь показываем наши факты заказов/билетов и source-остатки, чтобы быстро понимать продажи без чеков и платежей у нас.
      </InfoNote>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg border border-border">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="text-sm font-semibold">Статусы билетов</h3>
            {isLoading ? (
              <Badge variant="outline" className="gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                загрузка
              </Badge>
            ) : null}
          </div>
          <div className="p-4">
            {sales?.ticketStatuses?.length ? (
              <div className="space-y-2">
                {sales.ticketStatuses.map((row) => (
                  <div key={row.status} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                    <span>{row.status}</span>
                    <span className="font-medium">{formatNumber(row.tickets)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">Пока нет сохраненных покупок по этому событию.</div>
            )}
          </div>
        </section>

        <section className="rounded-lg border border-border">
          <div className="border-b border-border px-4 py-3">
            <h3 className="text-sm font-semibold">Offer / widget</h3>
          </div>
          <div className="divide-y divide-border">
            {offers.length ? (
              offers.map((offer) => (
                <div key={offer.id} className="px-4 py-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium">{offer.title || offer.sourceCode}</div>
                    <StatusBadge status={offer.active ? 'live' : 'incomplete'} label={offer.active ? 'active' : 'inactive'} />
                  </div>
                  <div className="mt-1 text-muted-foreground">{formatMoney(offer.priceRub)}</div>
                  <div className="mt-1 truncate font-mono text-xs text-muted-foreground">{offer.widgetUrl || offer.deeplinkUrl || 'нет ссылки'}</div>
                </div>
              ))
            ) : (
              <div className="px-4 py-6 text-sm text-muted-foreground">Offer-строки не найдены.</div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function LegacyContentTab(props: { event: AdminEventRow }) {
  const { event } = props;
  return (
    <div className="mt-5 space-y-4">
      <InfoNote>Source-слой не редактируем напрямую. Эти поля должны сохраняться в EventOverride и перекрывать импорт при отдаче public.</InfoNote>
      <OverrideField label="Название / H1" sourceValue={event.title} overrideValue={event.override?.title} />
      <OverrideField label="Короткое описание" sourceValue={event.description || 'нет в источнике'} overrideValue={event.override?.shortDescription} multiline />
      <OverrideField label="Описание" sourceValue={event.description || 'нет в источнике'} overrideValue={event.override?.description} multiline />
    </div>
  );
}

function LegacyMediaTab(props: { event: AdminEventRow }) {
  const { event } = props;
  const imageUrl = event.override?.imageUrl || event.imageUrl;
  return (
    <div className="mt-5 grid gap-4 md:grid-cols-[320px_1fr]">
      <div className="aspect-[4/3] overflow-hidden rounded-lg border border-border bg-secondary">
        {imageUrl ? (
          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
            <Image className="h-6 w-6" />
            нет изображения
          </div>
        )}
      </div>
      <section className="rounded-lg border border-border p-4">
        <h3 className="text-sm font-semibold">Обложка события</h3>
        <div className="mt-4 space-y-3">
          <OverrideField label="Source imageUrl" sourceValue={event.imageUrl || 'нет'} overrideValue={null} />
          <OverrideField label="Override imageUrl" sourceValue="пусто" overrideValue={event.override?.imageUrl} />
        </div>
      </section>
    </div>
  );
}

function LegacySeoTab(props: { event: AdminEventRow }) {
  const { event } = props;
  const effectiveTitle = event.override?.seoTitle || event.seoTitle || event.title;
  const effectiveDescription = event.override?.seoDescription || event.seoDescription || event.description;
  return (
    <div className="mt-5 space-y-4">
      <div className="rounded-lg border border-border p-4">
        <h3 className="text-sm font-semibold">Индексация</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge variant="outline">{event.override?.isIndexable ?? event.isIndexable ? 'index' : 'noindex'}</Badge>
          <Badge variant="outline">{event.override?.canonicalPath || event.canonicalPath || 'canonical pending'}</Badge>
        </div>
      </div>
      <OverrideField label="seoH1" sourceValue={event.seoH1 || event.title} overrideValue={event.override?.seoH1} />
      <OverrideField label="seoTitle" sourceValue={effectiveTitle || 'нет'} overrideValue={event.override?.seoTitle} />
      <OverrideField label="seoDescription" sourceValue={effectiveDescription || 'нет'} overrideValue={event.override?.seoDescription} multiline />
      <OverrideField label="canonicalPath" sourceValue={event.canonicalPath || 'нет'} overrideValue={event.override?.canonicalPath} />
    </div>
  );
}

function SourceTab(props: { event: AdminEventRow; problems: string[] }) {
  const { event, problems } = props;
  return (
    <div className="mt-5 grid gap-4 md:grid-cols-2">
      <section className="rounded-lg border border-border p-4">
        <h3 className="text-sm font-semibold">Импорт</h3>
        <dl className="mt-4 grid gap-3 text-sm">
          <DetailRow label="Источник" value={event.source} />
          <DetailRow label="Категория каталога" value={event.proposedCategory} />
          <DetailRow label="Статус source" value={event.status} />
          <DetailRow label="Свободно билетов" value={formatNumber(event.vacant)} />
        </dl>
      </section>
      <section className="rounded-lg border border-border p-4">
        <h3 className="text-sm font-semibold">Диагностика</h3>
        <div className="mt-4 flex flex-wrap gap-2">
          {problems.length ? problems.map((problem) => <Badge key={problem} variant="outline">{problem}</Badge>) : <Badge variant="outline">нет проблем</Badge>}
        </div>
      </section>
    </div>
  );
}

function LegacyOverrideField(props: { label: string; sourceValue?: string | null; overrideValue?: string | null; multiline?: boolean }) {
  const value = props.overrideValue || '';
  return (
    <section className="rounded-lg border border-border p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">{props.label}</h3>
        <Badge variant="outline">{value ? 'override' : 'source'}</Badge>
      </div>
      <div className="mt-3 text-xs text-muted-foreground">Source: {props.sourceValue || 'нет'}</div>
      {props.multiline ? (
        <textarea
          value={value}
          readOnly
          placeholder="Override пока не заполнен"
          className="mt-3 min-h-24 w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      ) : (
        <Input value={value} readOnly placeholder="Override пока не заполнен" className="mt-3" />
      )}
    </section>
  );
}

const OverrideField = LegacyOverrideField;

function ContentTab(props: { event: AdminEventRow; isSaving: boolean; saveError: string | null; onSave: (patch: EventOverridePatch) => Promise<void> }) {
  const { event, isSaving, saveError, onSave } = props;
  const [draft, setDraft] = React.useState({
    title: event.override?.title || '',
    shortDescription: event.override?.shortDescription || '',
    description: event.override?.description || '',
    mergeGroupKey: event.override?.mergeGroupKey || '',
  });

  React.useEffect(() => {
    setDraft({
      title: event.override?.title || '',
      shortDescription: event.override?.shortDescription || '',
      description: event.override?.description || '',
      mergeGroupKey: event.override?.mergeGroupKey || '',
    });
  }, [event.id, event.override?.description, event.override?.mergeGroupKey, event.override?.shortDescription, event.override?.title]);

  return (
    <div className="mt-5 space-y-4">
      <InfoNote>Source-managed поля не редактируем напрямую. Эти значения сохраняются в EventOverride и перекрывают импорт при отдаче public.</InfoNote>
      <EditableOverrideField label="Название / H1" sourceValue={event.title} value={draft.title} onChange={(title) => setDraft((current) => ({ ...current, title }))} />
      <EditableOverrideField
        label="Короткое описание"
        sourceValue={event.description || 'нет в источнике'}
        value={draft.shortDescription}
        onChange={(shortDescription) => setDraft((current) => ({ ...current, shortDescription }))}
        multiline
      />
      <EditableOverrideField
        label="Описание"
        sourceValue={event.description || 'нет в источнике'}
        value={draft.description}
        onChange={(description) => setDraft((current) => ({ ...current, description }))}
        multiline
      />
      <EditableOverrideField
        label="Ключ мультисобытия (mergeGroupKey)"
        sourceValue="не задан"
        value={draft.mergeGroupKey}
        onChange={(mergeGroupKey) => setDraft((current) => ({ ...current, mergeGroupKey }))}
        hint="Одинаковый ключ объединяет разные ticket-продукты на одной странице: описание, цена и кнопка «Купить» на каждый. Пример: harry-potter-spb"
      />
      <SavePanel isSaving={isSaving} error={saveError} onSave={() => onSave(draft)} />
    </div>
  );
}

function MediaTab(props: { event: AdminEventRow; isSaving: boolean; saveError: string | null; onSave: (patch: EventOverridePatch) => Promise<void> }) {
  const { event, isSaving, saveError, onSave } = props;
  const [imageUrlDraft, setImageUrlDraft] = React.useState(event.override?.imageUrl || '');

  React.useEffect(() => {
    setImageUrlDraft(event.override?.imageUrl || '');
  }, [event.id, event.override?.imageUrl]);

  const imageUrl = imageUrlDraft || event.imageUrl;

  return (
    <div className="mt-5 grid gap-4 md:grid-cols-[320px_1fr]">
      <div className="aspect-[4/3] overflow-hidden rounded-lg border border-border bg-secondary">
        {imageUrl ? (
          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
            <Image className="h-6 w-6" />
            нет изображения
          </div>
        )}
      </div>
      <section className="rounded-lg border border-border p-4">
        <h3 className="text-sm font-semibold">Обложка события</h3>
        <div className="mt-4 space-y-3">
          <SourceValue label="Source imageUrl" value={event.imageUrl || 'нет'} />
          <EditableOverrideField label="Override imageUrl" sourceValue="пусто" value={imageUrlDraft} onChange={setImageUrlDraft} />
          <SavePanel isSaving={isSaving} error={saveError} onSave={() => onSave({ imageUrl: imageUrlDraft })} />
        </div>
      </section>
    </div>
  );
}

function SeoTab(props: { event: AdminEventRow; isSaving: boolean; saveError: string | null; onSave: (patch: EventOverridePatch) => Promise<void> }) {
  const { event, isSaving, saveError, onSave } = props;
  const [draft, setDraft] = React.useState({
    seoH1: event.override?.seoH1 || '',
    seoTitle: event.override?.seoTitle || '',
    seoDescription: event.override?.seoDescription || '',
    canonicalPath: event.override?.canonicalPath || '',
    isIndexable: event.override?.isIndexable ?? event.isIndexable ?? true,
  });

  React.useEffect(() => {
    setDraft({
      seoH1: event.override?.seoH1 || '',
      seoTitle: event.override?.seoTitle || '',
      seoDescription: event.override?.seoDescription || '',
      canonicalPath: event.override?.canonicalPath || '',
      isIndexable: event.override?.isIndexable ?? event.isIndexable ?? true,
    });
  }, [event.id, event.isIndexable, event.override?.canonicalPath, event.override?.isIndexable, event.override?.seoDescription, event.override?.seoH1, event.override?.seoTitle]);

  const effectiveTitle = event.override?.seoTitle || event.seoTitle || event.title;
  const effectiveDescription = event.override?.seoDescription || event.seoDescription || event.description;

  return (
    <div className="mt-5 space-y-4">
      <div className="rounded-lg border border-border p-4">
        <h3 className="text-sm font-semibold">Индексация</h3>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={draft.isIndexable} onChange={(event) => setDraft((current) => ({ ...current, isIndexable: event.target.checked }))} />
            index
          </label>
          <Badge variant="outline">{draft.canonicalPath || event.canonicalPath || 'canonical pending'}</Badge>
        </div>
      </div>
      <EditableOverrideField label="seoH1" sourceValue={event.seoH1 || event.title} value={draft.seoH1} onChange={(seoH1) => setDraft((current) => ({ ...current, seoH1 }))} />
      <EditableOverrideField label="seoTitle" sourceValue={effectiveTitle || 'нет'} value={draft.seoTitle} onChange={(seoTitle) => setDraft((current) => ({ ...current, seoTitle }))} />
      <EditableOverrideField
        label="seoDescription"
        sourceValue={effectiveDescription || 'нет'}
        value={draft.seoDescription}
        onChange={(seoDescription) => setDraft((current) => ({ ...current, seoDescription }))}
        multiline
      />
      <EditableOverrideField label="canonicalPath" sourceValue={event.canonicalPath || 'нет'} value={draft.canonicalPath} onChange={(canonicalPath) => setDraft((current) => ({ ...current, canonicalPath }))} />
      <SavePanel isSaving={isSaving} error={saveError} onSave={() => onSave(draft)} />
    </div>
  );
}

function SourceValue(props: { label: string; value?: string | null }) {
  return (
    <section className="rounded-lg border border-border p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">{props.label}</h3>
        <Badge variant="outline">source</Badge>
      </div>
      <div className="mt-3 break-all text-xs text-muted-foreground">{props.value || 'нет'}</div>
    </section>
  );
}

function EditableOverrideField(props: { label: string; sourceValue?: string | null; value: string; onChange: (value: string) => void; multiline?: boolean; hint?: string }) {
  return (
    <section className="rounded-lg border border-border p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">{props.label}</h3>
        <Badge variant="outline">{props.value ? 'override' : 'source'}</Badge>
      </div>
      <div className="mt-3 line-clamp-3 text-xs text-muted-foreground">Source: {props.sourceValue || 'нет'}</div>
      {props.hint ? <p className="mt-2 text-xs text-muted-foreground">{props.hint}</p> : null}
      {props.multiline ? (
        <textarea
          value={props.value}
          onChange={(event) => props.onChange(event.target.value)}
          placeholder="Override пока не заполнен"
          className="mt-3 min-h-28 w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      ) : (
        <Input value={props.value} onChange={(event) => props.onChange(event.target.value)} placeholder="Override пока не заполнен" className="mt-3" />
      )}
    </section>
  );
}

function SavePanel(props: { isSaving: boolean; error: string | null; onSave: () => void }) {
  return (
    <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-border bg-background/95 py-3 backdrop-blur">
      <div className="text-xs text-muted-foreground">{props.error ? <span className="text-warning-foreground">Ошибка сохранения: {props.error}</span> : 'Override сохранится поверх импортных данных.'}</div>
      <Button size="sm" onClick={props.onSave} disabled={props.isSaving}>
        {props.isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Сохранить
      </Button>
    </div>
  );
}

function DetailRow(props: { label: string; value?: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[130px_1fr] gap-3">
      <dt className="text-xs text-muted-foreground">{props.label}</dt>
      <dd className="min-w-0 text-sm">{props.value || '-'}</dd>
    </div>
  );
}
