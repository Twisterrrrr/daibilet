import { Prisma, prisma } from '@daibilet/db';
import type {
  AdminSourceDto,
  AdminSourcesDto,
  SourceCatalogState,
  SourceHealthStatus,
  SourceOpenIssue,
  SourceSyncSummary,
} from '@daibilet/contracts/source';

const MIN_DISPLAY_PRICE_RUB = 100;
const STALE_SYNC_HOURS = 24;

interface SourceAggregateRow {
  sourceId: string;
  sourceEvents: number;
  groupedEvents: number;
  groupedVenues: number;
  groupedCities: number;
  sessions: number;
  offers: number;
  priceFromRub: number | null;
  sampleWidgetUrl: string | null;
  sampleDeeplinkUrl: string | null;
}

interface SyncRunInput {
  id: string;
  mode: string;
  status: string;
  startedAt: Date;
  finishedAt: Date | null;
  stats: Prisma.JsonValue | null;
  error: string | null;
}

interface SourceSyncRunRow extends SyncRunInput {
  sourceId: string;
}

interface SourceDtoInput {
  id: string;
  code: string;
  name: string;
  enabled: boolean;
  orderCount: number;
  syncRuns: SyncRunInput[];
  aggregate: SourceAggregateRow | undefined;
}

export interface SourceRuntimeConfig {
  ticketscloudPurchaseConfigured: boolean;
  teplohodApiConfigured: boolean;
  teplohodPurchaseConfigured: boolean;
}

export async function buildAdminSourcesDto(now = new Date()): Promise<AdminSourcesDto> {
  const [sources, aggregates, syncRuns] = await Promise.all([
    prisma.source.findMany({
      orderBy: { code: 'asc' },
      include: {
        _count: { select: { orderLinks: true } },
      },
    }),
    loadSourceAggregates(),
    loadRecentSyncRuns(),
  ]);
  const aggregateBySource = new Map(aggregates.map((row) => [row.sourceId, row]));
  const syncRunsBySource = new Map<string, SyncRunInput[]>();
  for (const run of syncRuns) {
    const rows = syncRunsBySource.get(run.sourceId) || [];
    rows.push(run);
    syncRunsBySource.set(run.sourceId, rows);
  }
  const runtimeConfig = readSourceRuntimeConfig();
  const rows = sources.map((source) => mapAdminSourceDto({
    id: source.id,
    code: String(source.code),
    name: source.name,
    enabled: source.enabled,
    orderCount: source._count.orderLinks,
    syncRuns: syncRunsBySource.get(source.id) || [],
    aggregate: aggregateBySource.get(source.id),
  }, runtimeConfig, now));

  return {
    generatedAt: now.toISOString(),
    sources: rows,
    metrics: {
      sources: rows.length,
      live: rows.filter((source) => source.catalogState === 'live').length,
      healthy: rows.filter((source) => source.health.status === 'ok').length,
      stale: rows.filter((source) => source.health.isStale).length,
      openIssues: rows.reduce((sum, source) => sum + source.health.openIssues.length, 0),
      events: rows.reduce((sum, source) => sum + source.counts.groupedEvents, 0),
      sessions: rows.reduce((sum, source) => sum + source.counts.sessions, 0),
    },
  };
}

async function loadRecentSyncRuns(): Promise<SourceSyncRunRow[]> {
  return prisma.$queryRaw<SourceSyncRunRow[]>(Prisma.sql`
    select history.id, history."sourceId", history.mode, history.status, history."startedAt",
      history."finishedAt", history.stats, history.error
    from "Source" source
    cross join lateral (
      (
        select run.id, run."sourceId", run.mode, run.status::text as status, run."startedAt",
          run."finishedAt", run.stats, run.error
        from "SourceSyncRun" run
        where run."sourceId" = source.id and run.mode !~* 'orders?|polling'
        order by run."startedAt" desc
        limit 100
      )
      union all
      (
        select run.id, run."sourceId", run.mode, run.status::text as status, run."startedAt",
          run."finishedAt", run.stats, run.error
        from "SourceSyncRun" run
        where run."sourceId" = source.id and run.mode ~* 'orders?|polling'
        order by run."startedAt" desc
        limit 100
      )
    ) history
    order by history."sourceId", history."startedAt" desc
  `);
}

export function mapAdminSourceDto(
  input: SourceDtoInput,
  runtimeConfig: SourceRuntimeConfig,
  now = new Date(),
): AdminSourceDto {
  const sourceCode = input.code.toUpperCase();
  const aggregate = input.aggregate || emptyAggregate(input.id);
  const catalogRuns = input.syncRuns.filter((run) => !isOrdersSyncMode(run.mode));
  const ordersRuns = input.syncRuns.filter((run) => isOrdersSyncMode(run.mode));
  const catalogSync = buildSyncSummary(sourceCode, catalogRuns);
  const ordersSync = buildSyncSummary(sourceCode, ordersRuns);
  const lastSuccessAt = latestSuccessfulAt(catalogRuns);
  const consecutiveErrors = countConsecutiveFailures(catalogRuns);
  const runningRuns = catalogRuns.filter((run) => run.status.toUpperCase() === 'RUNNING').length;
  const hasSaleableInventory = aggregate.offers > 0 && Number(aggregate.priceFromRub) >= MIN_DISPLAY_PRICE_RUB;
  const hasPurchaseEntry = Boolean(
    aggregate.sampleWidgetUrl ||
    aggregate.sampleDeeplinkUrl ||
    (sourceCode === 'TEPLOHOD' && runtimeConfig.teplohodPurchaseConfigured) ||
    (sourceCode === 'TICKETSCLOUD' && runtimeConfig.ticketscloudPurchaseConfigured)
  );
  const purchaseReady = aggregate.groupedEvents > 0 && hasSaleableInventory && hasPurchaseEntry;
  const catalogState = catalogStateFor(input.enabled, aggregate.groupedEvents, purchaseReady);
  const openIssues = sourceHealthIssues({
    sourceCode,
    enabled: input.enabled,
    purchaseReady,
    groupedEvents: aggregate.groupedEvents,
    catalogSync,
    lastSuccessAt,
    consecutiveErrors,
    teplohodApiConfigured: runtimeConfig.teplohodApiConfigured,
    now,
  });
  const staleHours = hoursSince(lastSuccessAt, now);

  return {
    id: input.id,
    sourceCode,
    label: input.name,
    enabled: input.enabled,
    catalogState,
    catalogSync,
    ordersSync,
    lastSync: catalogSync,
    health: {
      status: sourceHealthStatus(catalogState, openIssues),
      enabled: input.enabled,
      lastSuccessAt,
      isStale: input.enabled && (staleHours == null || staleHours > STALE_SYNC_HOURS),
      staleHours,
      consecutiveErrors,
      runningRuns,
      openIssues,
    },
    purchase: {
      ready: purchaseReady,
      priceFromRub: aggregate.priceFromRub,
      sampleWidgetUrl: aggregate.sampleWidgetUrl,
      sampleDeeplinkUrl: aggregate.sampleDeeplinkUrl,
    },
    counts: {
      sourceEvents: aggregate.sourceEvents,
      groupedEvents: aggregate.groupedEvents,
      venues: aggregate.groupedVenues,
      cities: aggregate.groupedCities,
      sessions: aggregate.sessions,
      offers: aggregate.offers,
      orders: input.orderCount,
    },
  };
}

async function loadSourceAggregates(): Promise<SourceAggregateRow[]> {
  return prisma.$queryRaw<SourceAggregateRow[]>(Prisma.sql`
    with source_events as (
      select link."sourceId", link."eventId"
      from "EventSourceLink" link
      union
      select link."sourceId", link."eventId"
      from "ProviderLink" link
      where link."entityKind"::text = 'EVENT' and link."eventId" is not null
    ), event_groups as (
      select
        linked."sourceId",
        lower(regexp_replace(trim(coalesce(event.title, '')), '\\s+', ' ', 'g')) as "titleKey",
        coalesce(event."primaryCityId", '') as "cityKey",
        coalesce(event."venueId", venue.title, '') as "venueKey"
      from source_events linked
      join "Event" event on event.id = linked."eventId"
      left join "Venue" venue on venue.id = event."venueId"
      group by linked."sourceId", "titleKey", "cityKey", "venueKey"
    ), event_counts as (
      select "sourceId", count(*)::int as "sourceEvents"
      from source_events
      group by "sourceId"
    ), grouped_counts as (
      select
        "sourceId",
        count(*)::int as "groupedEvents",
        count(distinct nullif("venueKey", ''))::int as "groupedVenues",
        count(distinct nullif("cityKey", ''))::int as "groupedCities"
      from event_groups
      group by "sourceId"
    ), session_counts as (
      select linked."sourceId", count(distinct session.id)::int as sessions
      from source_events linked
      join "EventSession" session on session."eventId" = linked."eventId"
      group by linked."sourceId"
    ), offer_counts as (
      select
        linked."sourceId",
        count(distinct offer.id)::int as offers,
        min(offer."priceRub") filter (where offer."priceRub" >= ${MIN_DISPLAY_PRICE_RUB})::int as "priceFromRub",
        max(offer."widgetUrl") filter (where offer."widgetUrl" is not null) as "sampleWidgetUrl",
        max(offer."deeplinkUrl") filter (where offer."deeplinkUrl" is not null) as "sampleDeeplinkUrl"
      from source_events linked
      join "Source" source on source.id = linked."sourceId"
      join "EventOffer" offer on offer."eventId" = linked."eventId"
        and offer."sourceCode"::text = source.code::text
        and offer.active is not false
      group by linked."sourceId"
    )
    select
      source.id as "sourceId",
      coalesce(event_counts."sourceEvents", 0)::int as "sourceEvents",
      coalesce(grouped_counts."groupedEvents", 0)::int as "groupedEvents",
      coalesce(grouped_counts."groupedVenues", 0)::int as "groupedVenues",
      coalesce(grouped_counts."groupedCities", 0)::int as "groupedCities",
      coalesce(session_counts.sessions, 0)::int as sessions,
      coalesce(offer_counts.offers, 0)::int as offers,
      offer_counts."priceFromRub",
      offer_counts."sampleWidgetUrl",
      offer_counts."sampleDeeplinkUrl"
    from "Source" source
    left join event_counts on event_counts."sourceId" = source.id
    left join grouped_counts on grouped_counts."sourceId" = source.id
    left join session_counts on session_counts."sourceId" = source.id
    left join offer_counts on offer_counts."sourceId" = source.id
    order by source.code asc
  `);
}

function buildSyncSummary(sourceCode: string, runs: SyncRunInput[]): SourceSyncSummary | null {
  const latest = runs[0];
  if (!latest) return null;
  return {
    id: latest.id,
    sourceCode,
    mode: latest.mode,
    status: latest.status.toLowerCase(),
    startedAt: latest.startedAt.toISOString(),
    finishedAt: latest.finishedAt?.toISOString() || null,
    lastSuccessAt: latestSuccessfulAt(runs),
    message: latest.error,
    stats: jsonRecord(latest.stats),
  };
}

function sourceHealthIssues(input: {
  sourceCode: string;
  enabled: boolean;
  purchaseReady: boolean;
  groupedEvents: number;
  catalogSync: SourceSyncSummary | null;
  lastSuccessAt: string | null;
  consecutiveErrors: number;
  teplohodApiConfigured: boolean;
  now: Date;
}): SourceOpenIssue[] {
  const issues: SourceOpenIssue[] = [];
  const add = (code: string, label: string, severity: SourceOpenIssue['severity'] = 'medium') => {
    issues.push({ code, label, severity });
  };
  const staleHours = hoursSince(input.lastSuccessAt, input.now);

  if (!input.enabled) {
    add('SOURCE_DISABLED', 'Источник выключен');
    return issues;
  }
  if (staleHours == null) add('NO_SUCCESSFUL_SYNC', 'Нет успешного sync', 'high');
  else if (staleHours > STALE_SYNC_HOURS) add('STALE_SYNC_24H', 'Sync старше 24 часов', 'high');
  if (input.catalogSync?.status === 'failed') {
    add('LAST_SYNC_FAILED', input.catalogSync.message ? `Последний sync упал: ${input.catalogSync.message}` : 'Последний sync упал', 'high');
  }
  if (input.consecutiveErrors > 0) {
    add('CONSECUTIVE_ERRORS', `${input.consecutiveErrors} ошибок sync подряд`, input.consecutiveErrors > 2 ? 'high' : 'medium');
  }
  if (!input.groupedEvents) add('NO_GROUPED_EVENTS', 'Нет карточек каталога', 'high');
  if (input.groupedEvents > 0 && !input.purchaseReady) add('PURCHASE_NOT_READY', 'Покупка не готова', 'high');
  if (input.sourceCode === 'TEPLOHOD' && !input.teplohodApiConfigured) {
    add('TEP_API_NOT_CONFIGURED', 'Не задан TEP_API_URL', 'high');
  }
  return issues;
}

function latestSuccessfulAt(runs: SyncRunInput[]): string | null {
  const run = runs.find((candidate) => candidate.status.toUpperCase() === 'SUCCESS');
  return run ? (run.finishedAt || run.startedAt).toISOString() : null;
}

function countConsecutiveFailures(runs: SyncRunInput[]): number {
  let count = 0;
  for (const run of runs) {
    if (run.status.toUpperCase() !== 'FAILED') break;
    count += 1;
  }
  return count;
}

function catalogStateFor(enabled: boolean, groupedEvents: number, purchaseReady: boolean): SourceCatalogState {
  if (!enabled) return 'paused';
  if (!groupedEvents) return 'error';
  return purchaseReady ? 'live' : 'incomplete';
}

function sourceHealthStatus(catalogState: SourceCatalogState, issues: SourceOpenIssue[]): SourceHealthStatus {
  if (catalogState === 'paused') return 'paused';
  if (issues.some((issue) => issue.severity === 'high')) return 'error';
  return issues.length ? 'warning' : 'ok';
}

function isOrdersSyncMode(mode: string): boolean {
  return /orders?|polling/i.test(mode);
}

function hoursSince(value: string | null, now: Date): number | null {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return null;
  return Math.max(0, Math.round(((now.getTime() - timestamp) / 3_600_000) * 100) / 100);
}

function jsonRecord(value: Prisma.JsonValue | null): Record<string, unknown> | null {
  if (!value || Array.isArray(value) || typeof value !== 'object') return null;
  return value as Record<string, unknown>;
}

function readSourceRuntimeConfig(): SourceRuntimeConfig {
  return {
    ticketscloudPurchaseConfigured: Boolean(
      process.env.TICKETSCLOUD_WIDGET_TOKEN ||
      process.env.TC_WIDGET_TOKEN
    ),
    teplohodApiConfigured: Boolean(process.env.TEP_API_URL),
    teplohodPurchaseConfigured: Boolean(process.env.TEP_WIDGET_ID || process.env.TEP_WIDGET_BASE_URL),
  };
}

function emptyAggregate(sourceId: string): SourceAggregateRow {
  return {
    sourceId,
    sourceEvents: 0,
    groupedEvents: 0,
    groupedVenues: 0,
    groupedCities: 0,
    sessions: 0,
    offers: 0,
    priceFromRub: null,
    sampleWidgetUrl: null,
    sampleDeeplinkUrl: null,
  };
}
