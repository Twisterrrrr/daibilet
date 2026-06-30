import { createHash, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MIN_DISPLAY_PRICE_RUB = 100;
const PUBLIC_CATALOG_CACHE_MS = 5 * 60 * 1000;
const CATALOG_TAG_DISPLAY_LIMIT = 4;

function orderedEventTagsSql(eventIdSql = 'e.id') {
  return `(
    select coalesce(array_agg(title order by priority, title), '{}')
    from (
      select distinct tag.title,
        case
          when tag.title in (
            'Речные прогулки', 'Экскурсии', 'Водные экскурсии', 'Автобусные туры',
            'Автобусные экскурсии', 'Смотровые площадки', 'Банкеты', 'Разводные мосты', 'Ночные'
          ) then 1
          when tag.title ~* '^(Теплоход|Площадка):' then 2
          when tag.title ~ '^\\d+\\s*(минут|мин\\.?|час|часа|часов)\\s*$' then 3
          else 4
        end as priority
      from "EventTag" event_tag_ordered
      join "Tag" tag on tag.id = event_tag_ordered."tagId"
      where event_tag_ordered."eventId" = ${eventIdSql}
    ) ordered_tags
  )`;
}

function sliceCatalogTags(tags, limit = CATALOG_TAG_DISPLAY_LIMIT) {
  return (tags || []).slice(0, limit);
}
const CITY_CARD_IMAGE_ALIASES = {
  moskva: 'moscow',
  'sankt-peterburg': 'saint-petersburg',
  'nizhniy-novgorod': 'nizhny-novgorod',
  'velikiy-novgorod': 'veliky-novgorod',
};
const CITY_CARD_IMAGE_SLUGS = new Set([
  'saint-petersburg',
  'moscow',
  'kazan',
  'kaliningrad',
  'vladivostok',
  'vologda',
  'irkutsk',
  'perm',
  'samara',
  'sochi',
  'ekaterinburg',
  'nizhny-novgorod',
  'novosibirsk',
  'krasnodar',
  'suzdal',
  'veliky-novgorod',
  'voronezh',
  'yaroslavl',
  'krasnoyarsk',
  'omsk',
]);
const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const CITY_ROUTING = loadCityRouting();
const STANDALONE_CITY_NAMES = new Set(CITY_ROUTING.standaloneCities || []);
const CITY_TO_REGION = new Map(Object.entries(CITY_ROUTING.cityToRegion || {}));
let publicHomeCache = null;
let publicDestinationsCache = null;
let publicHomePreviewCache = null;
const PUBLIC_HOME_PREVIEW_LIMIT = 96;
let publicEventRowsCache = null;
let publicCatalogCache = null;
let publicEventRowsBuildPromise = null;
let publicCatalogBuildPromise = null;

const LANDING_SLUG_ALIASES = {
  'river-cruises': ['river-walks', 'river-cruise', 'river'],
  'river-party': ['party-boat', 'river-disco', 'boat-party'],
  'bridges-night': ['razvodnye-mosty', 'bridges', 'spb-bridges-night'],
  'bus-tours': ['bus-sightseeing', 'bus'],
};

const LANDING_RULES = [
  {
    slug: 'river-cruises',
    title: 'Речные прогулки',
    subtitle: 'Теплоходы, катера, реки и каналы',
    chips: ['теплоход', 'катер', 'причалы'],
    tags: ['Водные экскурсии', 'Реки и каналы', 'На теплоходе', 'Водная экскурсия', 'На катере', 'Теплоходные экскурсии', 'Речные прогулки'],
    keywords: ['теплоход', 'катер', 'река', 'речн', 'канал', 'причал', 'прогулк'],
    keywordScope: 'content',
    requiredAnySubcategories: ['Водные экскурсии', 'Речные прогулки'],
    excludeKeywords: ['автобус', 'пешеход', 'парадн', 'двор', 'коммунал', 'мастер-класс', 'квест', 'концерт', 'вечеринк', 'дискотек'],
  },
  {
    slug: 'river-party',
    title: 'Вечеринки и дискотеки на теплоходе',
    subtitle: 'DJ, живая музыка и ночные речные круизы',
    chips: ['дискотека', 'DJ', 'вечеринка', 'ночь'],
    tags: ['Дискотека', 'Живая музыка', 'Вечеринка'],
    keywords: ['дискотек', 'вечеринк', 'ди-джей', 'dj', 'музыкальн', 'круиз', 'теплоход', 'речн', 'катер', 'нева'],
    keywordScope: 'content',
    requiredTitleKeywordGroups: [
      ['дискотек', 'вечеринк', 'ди-джей', 'dj', 'концерт', 'музыкальн'],
    ],
    requiredKeywordGroups: [
      ['теплоход', 'речн', 'катер', 'корабл', 'яхт', 'причал', 'канал', 'нева', 'круиз'],
    ],
    excludeKeywords: ['автобус', 'автобусн', 'пешеход'],
    excludeKeywordFields: ['title', 'category', 'sourceCategory', 'venue', 'subcategory'],
  },
  {
    slug: 'bridges-night',
    title: 'Разводные мосты',
    subtitle: 'Ночные прогулки по Неве и каналам',
    chips: ['ночные', 'мосты', 'теплоход'],
    city: 'Санкт-Петербург',
    tags: ['Разводные мосты', 'Ночные'],
    keywords: ['мост', 'развод', 'ночн', 'нева', 'теплоход', 'катер'],
    keywordScope: 'content',
    requiredAnyKeywords: ['мост', 'развод'],
    excludeKeywords: ['автобус', 'пешеход', 'парадн', 'двор', 'коммунал'],
    minStartsAtHour: 22,
    includeStartsAtHourUntil: 6,
  },
  {
    slug: 'new-year',
    title: 'Отмечаем Новый год',
    subtitle: 'Елки, шоу, концерты и праздничные программы',
    chips: ['декабрь', 'детям', 'шоу'],
    keywords: ['новогод', 'новый год', 'елка', 'ёлка', 'рождество'],
  },
  {
    slug: 'moscow-dinner-boat',
    title: 'Ужин на теплоходе в Москве',
    subtitle: 'Вечерние речные программы с ужином',
    city: 'Москва',
    chips: ['ужин', 'Москва-река', 'вечер'],
    tags: ['На теплоходе', 'Водная экскурсия'],
    keywords: ['ужин', 'обед', 'ланч', 'бранч', 'завтрак', 'фуршет', 'банкет', 'ресторан', 'теплоход', 'москва-река', 'речн', 'корабл', 'яхт', 'судн'],
    keywordScope: 'content',
    requiredTitleKeywordGroups: [
      ['ужин', 'обед', 'ланч', 'бранч', 'завтрак', 'фуршет', 'банкет', 'ресторан'],
    ],
    requiredKeywordGroups: [
      ['теплоход', 'москва-река', 'речн', 'корабл', 'яхт', 'судн'],
    ],
    excludeKeywords: ['автобус', 'пешеход', 'мастер-класс'],
  },
  {
    slug: 'salute-9-may',
    title: 'Салют 9 мая',
    subtitle: 'Лучшие точки обзора и экскурсии к Дню Победы',
    chips: ['9 мая', 'салют', 'праздник'],
    keywords: ['салют', 'фейерверк', 'день победы', 'праздничн', 'побед'],
    requiredAnyKeywords: ['салют', 'фейерверк'],
    keywordScope: 'content',
    excludeKeywords: ['новогод', 'ёлка', 'елка', 'рождеств'],
  },
  {
    slug: 'bus-tours',
    title: 'Автобусные обзорные экскурсии',
    subtitle: 'Городские маршруты и обзорные программы',
    chips: ['автобус', 'обзорная', 'город'],
    tags: ['Автобусные туры', 'Автобусные экскурсии'],
    keywords: ['автобус', 'автобусн', 'обзорн', 'сити тур', 'city tour'],
    requiredAnySubcategories: ['Автобусные туры', 'Автобусные экскурсии'],
    requiredAnyVenueKeywords: ['туристическ', 'city sightseeing', 'hop on', 'hop-off', 'hop off'],
    requiredTitleKeywordGroups: [
      ['обзорн', 'экскурс', 'двухэтажн', 'hop on', 'city tour', 'сити тур'],
    ],
    requiredKeywordGroups: [
      ['автобус', 'автобусн', 'двухэтажн', 'hop on', 'city tour', 'сити тур'],
      ['обзорн', 'экскурс', 'hop on', 'city tour', 'сити тур'],
    ],
    excludeTags: ['Водные экскурсии', 'На теплоходе', 'На катере', 'Реки и каналы'],
    excludeKeywords: ['теплоход', 'катер', 'лодк', 'корабл', 'причал', 'река', 'канал', 'нева', 'мост', 'пешеход', 'пешком', 'фест', 'фестиваль'],
    excludeKeywordFields: ['title', 'category', 'sourceCategory', 'venue', 'subcategory'],
  },
  {
    slug: 'standup',
    title: 'Стендап и юмор',
    subtitle: 'Комедийные шоу в барах и клубах',
    chips: ['stand up', 'юмор', 'вечер'],
    tags: ['Юмор', 'Stand up', 'Комедия', 'Импровизация'],
    keywords: ['стендап', 'stand up', 'юмор', 'комеди'],
  },
  {
    slug: 'planetarium',
    title: 'Планетарий 1',
    subtitle: 'Мультимедийные шоу и концерты',
    chips: ['шоу', 'концерты', 'СПб'],
    venue: 'Планетарий 1',
  },
];

const CATEGORY_SUBTITLE = new Map([
  ['Экскурсии', ['экскурсии', 'уточнять по тегам', 'review']],
  ['Музеи и арт', ['музеи и арт', 'музеи / выставки / мастер-классы', 'review']],
  ['Мероприятия', ['мероприятия', 'концерты / шоу / театр', 'auto']],
  ['Активный отдых', ['активный отдых', 'спорт / активности', 'auto']],
  ['Развлечения', ['развлечения', 'детям / зоопарки / шоу', 'review']],
]);

export function clearPublicDataCaches() {
  publicHomeCache = null;
  publicDestinationsCache = null;
  publicHomePreviewCache = null;
  publicEventRowsCache = null;
  publicCatalogCache = null;
  publicEventRowsBuildPromise = null;
  publicCatalogBuildPromise = null;
}

function loadCityRouting() {
  try {
    return JSON.parse(readFileSync(path.join(PROJECT_ROOT, 'data', 'geo', 'city-routing.ru.json'), 'utf8'));
  } catch {
    return { standaloneCities: [], cityToRegion: {} };
  }
}

export async function buildAdminDashboard(db) {
  const [stats, categories, events, venues, destinations] = await Promise.all([
    db.stats(),
    categoryRows(db),
    eventRows(db, 10000),
    venueRows(db, 90),
    destinationRows(db),
  ]);

  const landingRows = buildLandingRows(events);
  const groupedEvents = groupAdminEventRows(events);
  const readyEvents = groupedEvents.filter((event) => event.readiness === 'ready').length;
  const launchMetrics = buildLaunchMetrics(groupedEvents);

  return {
    generatedAt: new Date().toISOString(),
    importJob: {
      source: 'Ticketscloud',
      status: 'success',
      mode: 'Postgres seed from TC full sync',
      events: stats.events || 0,
      categories: categories.length,
      venues: stats.venues || 0,
      cities: stats.cities || 0,
      tags: stats.tags || 0,
      metaEvents: 0,
    },
    metrics: {
      events: groupedEvents.length,
      readyEvents,
      reviewEvents: Math.max(0, groupedEvents.length - readyEvents),
      venues: stats.venues || 0,
      landingRules: landingRows.length,
      destinations: destinations.length,
      launch: launchMetrics,
    },
    eventRows: events,
    mappingRows: categories.map((row) => {
      const mapping = CATEGORY_SUBTITLE.get(row.source) || ['мероприятия', 'уточнить', 'review'];
      return {
        source: row.source,
        target: mapping[0],
        subcategory: mapping[1],
        mode: mapping[2],
        events: row.events,
      };
    }),
    venueRows: venues,
    duplicateCandidates: [],
    destinationRows: destinations,
    landingRows,
  };
}

function buildLaunchMetrics(events) {
  return {
    groupedEvents: events.length,
    readyForSales: events.filter(isSaleableEventForPublic).length,
    readyForSeo: events.filter((event) => event.readiness === 'ready').length,
    needsAttention: events.filter((event) => event.status === 'needs_review').length,
    priceBlocked: events.filter((event) => event.priceFrom == null).length,
    purchaseBlocked: events.filter((event) => !event.purchaseReady).length,
    noImage: events.filter((event) => !event.hasImage).length,
    landingMatched: events.filter((event) => (event.landingHits || []).length > 0).length,
  };
}

function isSaleableEventForPublic(event) {
  return Boolean((event.startsAt || isOpenDateCatalogRow(event)) && event.purchaseReady && Number.isFinite(event.priceFrom) && event.priceFrom >= MIN_DISPLAY_PRICE_RUB);
}

export async function buildAdminCitiesList(db) {
  const rows = await destinationRows(db);

  return {
    generatedAt: new Date().toISOString(),
    total: rows.length,
    rows,
    metrics: {
      destinations: rows.length,
      cities: rows.filter((row) => row.type === 'city').length,
      regions: rows.filter((row) => row.type === 'region').length,
      events: rows.reduce((sum, row) => sum + (row.events || 0), 0),
      venues: rows.reduce((sum, row) => sum + (row.venues || 0), 0),
    },
  };
}

export async function buildAdminSources(db) {
  const result = await db.query(`
    with grouped_events as (
      select
        grouped."sourceId",
        count(*)::int as "groupedEvents",
        count(distinct nullif(grouped."venueKey", ''))::int as "groupedVenues",
        count(distinct nullif(grouped."cityKey", ''))::int as "groupedCities"
      from (
        select
          source.id as "sourceId",
          lower(regexp_replace(coalesce(event.title, ''), '\\s+', ' ', 'g')) as "titleKey",
          coalesce(event."primaryCityId", '') as "cityKey",
          coalesce(event."venueId", venue.title, '') as "venueKey"
        from "Source" source
        join "EventSourceLink" link on link."sourceId" = source.id
        join "Event" event on event.id = link."eventId"
        left join "Venue" venue on venue.id = event."venueId"
        group by
          source.id,
          lower(regexp_replace(coalesce(event.title, ''), '\\s+', ' ', 'g')),
          coalesce(event."primaryCityId", ''),
          coalesce(event."venueId", venue.title, '')
      ) grouped
      group by grouped."sourceId"
    )
    select
      source.id,
      source.code::text as code,
      source.name,
      source.enabled,
      count(distinct link."eventId")::int as "rawEvents",
      coalesce(grouped_events."groupedEvents", 0)::int as "groupedEvents",
      coalesce(grouped_events."groupedVenues", 0)::int as "groupedVenues",
      coalesce(grouped_events."groupedCities", 0)::int as "groupedCities",
      count(distinct event."venueId") filter (where event."venueId" is not null)::int as venues,
      count(distinct event."primaryCityId") filter (where event."primaryCityId" is not null)::int as cities,
      count(distinct session.id)::int as sessions,
      count(distinct offer.id)::int as offers,
      min(offer."priceRub") filter (where offer."priceRub" >= ${MIN_DISPLAY_PRICE_RUB})::int as "priceFrom",
      max(offer."widgetUrl") filter (where offer."widgetUrl" is not null) as "sampleWidgetUrl",
      max(offer."deeplinkUrl") filter (where offer."deeplinkUrl" is not null) as "sampleDeeplinkUrl",
      latest.status::text as "lastSyncStatus",
      latest.mode as "lastSyncMode",
      latest."startedAt" as "lastSyncStartedAt",
      latest."finishedAt" as "lastSyncFinishedAt",
      latest.error as "lastSyncError",
      last_success."startedAt" as "lastSuccessStartedAt",
      last_success."finishedAt" as "lastSuccessFinishedAt",
      coalesce(sync_health."consecutiveErrors", 0)::int as "consecutiveErrors",
      coalesce(sync_health."runningRuns", 0)::int as "runningRuns"
    from "Source" source
    left join "EventSourceLink" link on link."sourceId" = source.id
    left join "Event" event on event.id = link."eventId"
    left join "EventSession" session on session."eventId" = event.id
    left join "EventOffer" offer on offer."eventId" = event.id and offer."sourceCode"::text = source.code::text and offer.active is not false
    left join grouped_events on grouped_events."sourceId" = source.id
    left join lateral (
      select status, mode, "startedAt", "finishedAt", error
      from "SourceSyncRun"
      where "sourceId" = source.id
        and coalesce(mode, '') !~* 'orders|order|polling'
      order by "startedAt" desc
      limit 1
    ) latest on true
    left join lateral (
      select "startedAt", "finishedAt"
      from "SourceSyncRun"
      where "sourceId" = source.id and status::text = 'SUCCESS' and coalesce(mode, '') !~* 'orders|order|polling'
      order by "startedAt" desc
      limit 1
    ) last_success on true
    left join lateral (
      select
        count(*) filter (where status::text = 'FAILED')::int as "consecutiveErrors",
        count(*) filter (where status::text = 'RUNNING')::int as "runningRuns"
      from "SourceSyncRun"
      where "sourceId" = source.id
        and coalesce(mode, '') !~* 'orders|order|polling'
        and "startedAt" > coalesce(last_success."startedAt", timestamp '1970-01-01')
    ) sync_health on true
    group by
      source.id,
      grouped_events."groupedEvents",
      grouped_events."groupedVenues",
      grouped_events."groupedCities",
      latest.status,
      latest.mode,
      latest."startedAt",
      latest."finishedAt",
      latest.error,
      last_success."startedAt",
      last_success."finishedAt",
      sync_health."consecutiveErrors",
      sync_health."runningRuns"
    order by source.code asc
  `);

  const sources = result.rows.map((row) => {
    const sourceCode = String(row.code || '').toUpperCase();
    const purchaseReady = Boolean(
      row.sampleWidgetUrl ||
        row.sampleDeeplinkUrl ||
        sourceCode === 'TEPLOHOD' ||
        (sourceCode === 'TICKETSCLOUD' && (process.env.TICKETSCLOUD_WIDGET_TOKEN || process.env.TC_WIDGET_TOKEN || process.env.TICKETSCLOUD_API_TOKEN)),
    );
    const groupedEventsCount = row.groupedEvents || row.rawEvents || 0;
    const status = !row.enabled ? 'paused' : groupedEventsCount > 0 && purchaseReady ? 'live' : groupedEventsCount > 0 ? 'incomplete' : 'error';
    const lastSuccessAt = row.lastSuccessFinishedAt || row.lastSuccessStartedAt || null;
    const openIssues = sourceHealthIssues({
      sourceCode,
      enabled: row.enabled,
      status,
      purchaseReady,
      groupedEvents: groupedEventsCount,
      lastSyncStatus: row.lastSyncStatus,
      lastSyncError: row.lastSyncError,
      lastSuccessAt,
      consecutiveErrors: row.consecutiveErrors || 0,
    });
    const healthStatus = sourceHealthStatus(status, openIssues);
    const staleHours = lastSuccessAt ? Math.max(0, Math.round((Date.now() - new Date(lastSuccessAt).getTime()) / 36_000) / 100) : null;
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      enabled: row.enabled,
      status,
      healthStatus,
      purchaseReady,
      events: groupedEventsCount,
      rawEvents: row.rawEvents || 0,
      venues: row.groupedVenues || row.venues || 0,
      cities: row.groupedCities || row.cities || 0,
      sessions: row.sessions || 0,
      offers: row.offers || 0,
      priceFrom: row.priceFrom || null,
      sampleWidgetUrl: row.sampleWidgetUrl || null,
      sampleDeeplinkUrl: row.sampleDeeplinkUrl || null,
      lastSuccessAt,
      isStale: openIssues.some((issue) => issue.code === 'STALE_SYNC_24H' || issue.code === 'NO_SUCCESSFUL_SYNC'),
      staleHours,
      consecutiveErrors: row.consecutiveErrors || 0,
      runningRuns: row.runningRuns || 0,
      openIssues,
      lastSync: row.lastSyncStartedAt
        ? {
            status: row.lastSyncStatus,
            mode: row.lastSyncMode,
            startedAt: row.lastSyncStartedAt,
            finishedAt: row.lastSyncFinishedAt,
            error: row.lastSyncError,
          }
        : null,
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    sources,
    metrics: {
      sources: sources.length,
      live: sources.filter((source) => source.status === 'live').length,
      healthy: sources.filter((source) => source.healthStatus === 'ok').length,
      stale: sources.filter((source) => source.isStale).length,
      openIssues: sources.reduce((sum, source) => sum + source.openIssues.length, 0),
      events: sources.reduce((sum, source) => sum + source.events, 0),
      sessions: sources.reduce((sum, source) => sum + source.sessions, 0),
    },
  };
}

function sourceHealthIssues(source) {
  const issues = [];
  const lastSuccessAt = source.lastSuccessAt ? new Date(source.lastSuccessAt) : null;
  const lastSuccessTime = lastSuccessAt && Number.isFinite(lastSuccessAt.getTime()) ? lastSuccessAt.getTime() : null;
  const hoursSinceSuccess = lastSuccessTime ? (Date.now() - lastSuccessTime) / 3_600_000 : null;

  const add = (code, label, severity = 'medium') => issues.push({ code, label, severity });

  if (!source.enabled) add('SOURCE_DISABLED', 'Источник выключен', 'medium');
  if (!lastSuccessTime) add('NO_SUCCESSFUL_SYNC', 'Нет успешного sync', 'high');
  else if (hoursSinceSuccess > 24) add('STALE_SYNC_24H', 'Sync старше 24 часов', 'high');
  if (String(source.lastSyncStatus || '').toUpperCase() === 'FAILED') add('LAST_SYNC_FAILED', source.lastSyncError ? `Последний sync упал: ${source.lastSyncError}` : 'Последний sync упал', 'high');
  if ((source.consecutiveErrors || 0) > 0) add('CONSECUTIVE_ERRORS', `${source.consecutiveErrors} ошибок sync подряд`, source.consecutiveErrors > 2 ? 'high' : 'medium');
  if (!source.groupedEvents) add('NO_GROUPED_EVENTS', 'Нет карточек каталога', 'high');
  if (source.groupedEvents > 0 && !source.purchaseReady) add('PURCHASE_NOT_READY', 'Покупка не готова', 'high');
  if (source.sourceCode === 'TEPLOHOD' && !process.env.TEP_API_URL) {
    add('TEP_API_NOT_CONFIGURED', 'Не задан TEP_API_URL (импорт с сервера с белым IP, токен не нужен)', 'high');
  }

  return issues;
}

function sourceHealthStatus(status, issues) {
  if (status === 'paused') return 'paused';
  if (issues.some((issue) => issue.severity === 'high')) return 'error';
  if (issues.length) return 'warning';
  return 'ok';
}

export async function buildAdminOrdersList(db, searchParams = new URLSearchParams()) {
  const q = String(searchParams.get('q') || '').trim().toLowerCase();
  const view = String(searchParams.get('view') || 'all');
  const provider = String(searchParams.get('provider') || 'all').toUpperCase();
  const status = String(searchParams.get('status') || 'all').toLowerCase();
  const limit = clampNumber(searchParams.get('limit'), 1, 100, 50);
  const page = clampNumber(searchParams.get('page'), 1, 100000, 1);

  const result = await db.query(`
    select
      ext_order.id,
      ext_order."externalOrderId",
      ext_order."publicCode",
      ext_order.status,
      ext_order."buyerSnapshot",
      ext_order."purchasedAt",
      ext_order."updatedAt",
      source.code::text as "sourceCode",
      source.name as "sourceName",
      count(ticket.id)::int as "ticketCount",
      count(ticket.id) filter (where ticket."eventId" is null)::int as "unlinkedTickets",
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id', ticket.id,
            'externalTicketId', ticket."externalTicketId",
            'status', ticket.status,
            'origin', ticket.origin,
            'eventId', ticket."eventId",
            'sessionId', ticket."sessionId",
            'eventTitle', event.title,
            'eventSlug', event.slug,
            'startsAt', session."startsAt"
          )
        ) filter (where ticket.id is not null),
        '[]'::jsonb
      ) as tickets
    from "ExternalOrder" ext_order
    join "Source" source on source.id = ext_order."sourceId"
    left join "ExternalTicket" ticket on ticket."externalOrderId" = ext_order.id
    left join "Event" event on event.id = ticket."eventId"
    left join "EventSession" session on session.id = ticket."sessionId"
    group by ext_order.id, source.id
    order by coalesce(ext_order."purchasedAt", ext_order."updatedAt") desc
  `);

  const allRows = result.rows.map(mapAdminOrderRow);
  const rows = allRows.filter((order) => {
    if (view === 'attention' && !order.needsAttention) return false;
    if (view === 'missing_artifact' && order.artifactStatus !== 'missing') return false;
    if (view === 'failed_integration' && !isProblemOrderStatus(order.status)) return false;
    if (view === 'unlinked' && !order.tickets.some((ticket) => !ticket.eventId)) return false;
    if (view === 'pending_refunds' && !isRefundStatus(order.status)) return false;
    if (provider !== 'ALL' && order.sourceCode !== provider) return false;
    if (status !== 'all' && String(order.status || '').toLowerCase() !== status) return false;
    if (!q) return true;
    const haystack = [
      order.externalOrderId,
      order.publicCode,
      order.status,
      order.sourceName,
      order.sourceCode,
      order.buyer.name,
      order.buyer.phone,
      order.buyer.email,
      order.buyer.notes,
      ...order.tickets.flatMap((ticket) => [ticket.externalTicketId, ticket.status, ticket.eventTitle, ticket.eventId, ticket.sessionId]),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(page, pages);
  const windowRows = rows.slice((safePage - 1) * limit, safePage * limit);

  return {
    generatedAt: new Date().toISOString(),
    page: safePage,
    pages,
    limit,
    total,
    rows: windowRows,
    sources: Array.from(new Set(allRows.map((order) => order.sourceCode).filter(Boolean))).sort(),
    statuses: Array.from(new Set(allRows.map((order) => order.status).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'ru')),
    quickFilters: [
      { id: 'all', count: allRows.length },
      { id: 'attention', count: allRows.filter((order) => order.needsAttention).length },
      { id: 'pending_refunds', count: allRows.filter((order) => isRefundStatus(order.status)).length },
      { id: 'missing_artifact', count: allRows.filter((order) => order.artifactStatus === 'missing').length },
      { id: 'failed_integration', count: allRows.filter((order) => isProblemOrderStatus(order.status)).length },
      { id: 'unlinked', count: allRows.filter((order) => order.tickets.some((ticket) => !ticket.eventId)).length },
    ],
    metrics: {
      imported: allRows.length,
      confirmed: allRows.filter((order) => isConfirmedOrderStatus(order.status)).length,
      processing: allRows.filter((order) => isProcessingOrderStatus(order.status)).length,
      canceled: allRows.filter((order) => isCanceledOrderStatus(order.status)).length,
      tickets: allRows.reduce((sum, order) => sum + order.tickets.length, 0),
      missingArtifacts: allRows.filter((order) => order.artifactStatus === 'missing').length,
      failedIntegration: allRows.filter((order) => isProblemOrderStatus(order.status)).length,
      needsAttention: allRows.filter((order) => order.needsAttention).length,
    },
  };
}

export async function buildPublicBuyerOrders(db, searchParams = new URLSearchParams()) {
  const lookup = String(searchParams.get('lookup') || searchParams.get('q') || '').trim();
  const minLookupLength = 4;
  if (lookup.length < minLookupLength) {
    return {
      generatedAt: new Date().toISOString(),
      lookupRequired: true,
      minLookupLength,
      total: 0,
      rows: [],
      metrics: { orders: 0, tickets: 0, active: 0 },
    };
  }

  const lookupPattern = `%${escapeLikePattern(lookup)}%`;
  const digitPattern = digitsOnly(lookup).length >= 6 ? `%${digitsOnly(lookup)}%` : '';
  const result = await db.query(`
    select
      ext_order.id,
      ext_order."externalOrderId",
      ext_order."publicCode",
      ext_order.status,
      ext_order."buyerSnapshot",
      ext_order."purchasedAt",
      ext_order."updatedAt",
      source.code::text as "sourceCode",
      source.name as "sourceName",
      count(ticket.id)::int as "ticketCount",
      count(ticket.id) filter (where ticket."eventId" is null)::int as "unlinkedTickets",
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id', ticket.id,
            'externalTicketId', ticket."externalTicketId",
            'status', ticket.status,
            'origin', ticket.origin,
            'eventId', ticket."eventId",
            'sessionId', ticket."sessionId",
            'eventTitle', event.title,
            'eventSlug', event.slug,
            'startsAt', session."startsAt"
          )
        ) filter (where ticket.id is not null),
        '[]'::jsonb
      ) as tickets
    from "ExternalOrder" ext_order
    join "Source" source on source.id = ext_order."sourceId"
    left join "ExternalTicket" ticket on ticket."externalOrderId" = ext_order.id
    left join "Event" event on event.id = ticket."eventId"
    left join "EventSession" session on session.id = ticket."sessionId"
    where
      ext_order."externalOrderId" ilike $1 escape '\\'
      or ext_order."publicCode" ilike $1 escape '\\'
      or coalesce(ext_order."buyerSnapshot"::text, '') ilike $1 escape '\\'
      or ($2 <> '' and regexp_replace(coalesce(ext_order."buyerSnapshot"::text, ''), '\\D', '', 'g') like $2)
      or exists (
        select 1
        from "ExternalTicket" lookup_ticket
        where lookup_ticket."externalOrderId" = ext_order.id
          and lookup_ticket."externalTicketId" ilike $1 escape '\\'
      )
    group by ext_order.id, source.id
    order by coalesce(ext_order."purchasedAt", ext_order."updatedAt") desc
    limit 100
  `, [lookupPattern, digitPattern]);

  const matched = result.rows
    .map(mapAdminOrderRow)
    .filter((order) => matchesPublicOrderLookup(order, lookup))
    .slice(0, 20)
    .map(mapPublicBuyerOrder);

  return {
    generatedAt: new Date().toISOString(),
    lookupRequired: false,
    minLookupLength,
    total: matched.length,
    rows: matched,
    metrics: {
      orders: matched.length,
      tickets: matched.reduce((sum, order) => sum + order.ticketCount, 0),
      active: matched.filter((order) => !order.isFinal).length,
    },
  };
}

const ACCOUNT_ORDER_EMAIL_FILTER = `
  lower(trim(coalesce(ext_order."buyerSnapshot"->>'email', ''))) = $1
  or lower(trim(coalesce(ext_order."buyerSnapshot"->>'customerEmail', ''))) = $1
  or lower(trim(coalesce(ext_order."buyerSnapshot"->'buyer'->>'email', ''))) = $1
  or lower(trim(coalesce(ext_order."buyerSnapshot"->'customer'->>'email', ''))) = $1
`;

const ACCOUNT_ORDER_SELECT = `
  select
    ext_order.id,
    ext_order."externalOrderId",
    ext_order."publicCode",
    ext_order.status,
    ext_order."buyerSnapshot",
    ext_order."purchasedAt",
    ext_order."updatedAt",
    source.code::text as "sourceCode",
    source.name as "sourceName",
    count(ticket.id)::int as "ticketCount",
    count(ticket.id) filter (where ticket."eventId" is null)::int as "unlinkedTickets",
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', ticket.id,
          'externalTicketId', ticket."externalTicketId",
          'status', ticket.status,
          'origin', ticket.origin,
          'eventId', ticket."eventId",
          'sessionId', ticket."sessionId",
          'eventTitle', event.title,
          'eventSlug', event.slug,
          'startsAt', session."startsAt"
        )
      ) filter (where ticket.id is not null),
      '[]'::jsonb
    ) as tickets
  from "ExternalOrder" ext_order
  join "Source" source on source.id = ext_order."sourceId"
  left join "ExternalTicket" ticket on ticket."externalOrderId" = ext_order.id
  left join "Event" event on event.id = ticket."eventId"
  left join "EventSession" session on session.id = ticket."sessionId"
`;

function mapAccountBuyerOrder(order) {
  const base = mapPublicBuyerOrder(order);
  return {
    ...base,
    buyer: {
      name: order.buyer.name || null,
      email: order.buyer.email || null,
      phone: order.buyer.phone || null,
    },
  };
}

function orderMatchesAccountEmail(order, email) {
  return normalizeLookup(order.buyer.email) === normalizeLookup(email);
}

export async function buildAccountPurchases(db, userEmail, searchParams = new URLSearchParams()) {
  const email = normalizeLookup(userEmail);
  const limit = clampNumber(searchParams.get('limit'), 1, 50, 10);
  const page = clampNumber(searchParams.get('page'), 1, 1000, 1);
  const offset = (page - 1) * limit;

  if (!email || !email.includes('@')) {
    return {
      generatedAt: new Date().toISOString(),
      page,
      pages: 1,
      limit,
      total: 0,
      rows: [],
      metrics: { orders: 0, tickets: 0, active: 0 },
    };
  }

  const countResult = await db.query(
    `
      select count(*)::int as total
      from "ExternalOrder" ext_order
      where ${ACCOUNT_ORDER_EMAIL_FILTER}
    `,
    [email],
  );
  const total = Number(countResult.rows[0]?.total || 0);
  const pages = Math.max(1, Math.ceil(total / limit));

  const result = await db.query(
    `
      ${ACCOUNT_ORDER_SELECT}
      where ${ACCOUNT_ORDER_EMAIL_FILTER}
      group by ext_order.id, source.id
      order by coalesce(ext_order."purchasedAt", ext_order."updatedAt") desc
      limit $2 offset $3
    `,
    [email, limit, offset],
  );

  const rows = result.rows.map(mapAdminOrderRow).filter((order) => orderMatchesAccountEmail(order, email)).map(mapAccountBuyerOrder);

  return {
    generatedAt: new Date().toISOString(),
    page,
    pages,
    limit,
    total,
    rows,
    metrics: {
      orders: total,
      tickets: rows.reduce((sum, order) => sum + order.ticketCount, 0),
      active: rows.filter((order) => !order.isFinal).length,
    },
  };
}

export async function buildAccountOrderDetail(db, userEmail, orderId) {
  const email = normalizeLookup(userEmail);
  const order = await buildAdminOrderDetail(db, orderId);
  if (!order) return null;
  if (!orderMatchesAccountEmail(order, email)) return null;
  return mapAccountBuyerOrder(order);
}

export async function buildAdminBuyersList(db, searchParams = new URLSearchParams()) {
  const q = String(searchParams.get('q') || '').trim().toLowerCase();
  const limit = clampNumber(searchParams.get('limit'), 1, 300, 120);

  const result = await db.query(`
    select
      ext_order.id,
      ext_order."externalOrderId",
      ext_order."publicCode",
      ext_order.status,
      ext_order."buyerSnapshot",
      ext_order."purchasedAt",
      ext_order."updatedAt",
      source.code::text as "sourceCode",
      source.name as "sourceName",
      count(ticket.id)::int as "ticketCount",
      count(ticket.id) filter (where ticket."eventId" is null)::int as "unlinkedTickets",
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id', ticket.id,
            'externalTicketId', ticket."externalTicketId",
            'status', ticket.status,
            'origin', ticket.origin,
            'eventId', ticket."eventId",
            'sessionId', ticket."sessionId",
            'eventTitle', event.title,
            'eventSlug', event.slug,
            'startsAt', session."startsAt"
          )
        ) filter (where ticket.id is not null),
        '[]'::jsonb
      ) as tickets
    from "ExternalOrder" ext_order
    join "Source" source on source.id = ext_order."sourceId"
    left join "ExternalTicket" ticket on ticket."externalOrderId" = ext_order.id
    left join "Event" event on event.id = ticket."eventId"
    left join "EventSession" session on session.id = ticket."sessionId"
    group by ext_order.id, source.id
    order by coalesce(ext_order."purchasedAt", ext_order."updatedAt") desc
  `);

  const groups = new Map();
  for (const order of result.rows.map(mapAdminOrderRow)) {
    const buyerKey = adminBuyerKey(order);
    const current =
      groups.get(buyerKey) ||
      {
        id: buyerKey,
        name: order.buyer.name || null,
        email: order.buyer.email || null,
        phone: order.buyer.phone || null,
        notes: order.buyer.notes || null,
        lookup: order.buyer.email || order.buyer.phone || order.publicCode || order.externalOrderId,
        orders: 0,
        tickets: 0,
        activeOrders: 0,
        canceledOrders: 0,
        needsAttention: 0,
        amountRub: 0,
        lastOrderAt: null,
        providers: [],
        eventTitles: [],
        orderNumbers: [],
        lastOrderNumber: null,
        lastOrderStatus: null,
        lastOrderStatusLabel: null,
        lastOrderTone: null,
      };

    current.name ||= order.buyer.name || null;
    current.email ||= order.buyer.email || null;
    current.phone ||= order.buyer.phone || null;
    current.notes ||= order.buyer.notes || null;
    current.orders += 1;
    current.tickets += order.ticketCount || 0;
    current.activeOrders += isCanceledOrderStatus(order.status) ? 0 : 1;
    current.canceledOrders += isCanceledOrderStatus(order.status) ? 1 : 0;
    current.needsAttention += order.needsAttention ? 1 : 0;
    current.amountRub += order.amountRub || 0;
    current.providers = uniqueValues(current.providers.concat(order.sourceLabel || order.sourceCode).filter(Boolean));
    current.eventTitles = uniqueValues(current.eventTitles.concat(order.eventTitles || order.eventTitle || []).filter(Boolean)).slice(0, 8);
    current.orderNumbers = uniqueValues(current.orderNumbers.concat(order.publicCode || order.externalOrderId).filter(Boolean)).slice(0, 8);

    const orderDate = order.purchasedAt || order.updatedAt || null;
    if (orderDate && (!current.lastOrderAt || new Date(orderDate) > new Date(current.lastOrderAt))) {
      current.lastOrderAt = orderDate;
      current.lastOrderNumber = order.publicCode || order.externalOrderId;
      current.lastOrderStatus = order.status;
      current.lastOrderStatusLabel = order.displayStatus;
      current.lastOrderTone = order.statusTone;
    }

    groups.set(buyerKey, current);
  }

  const allRows = Array.from(groups.values()).map((row) => ({
    ...row,
    amountRub: row.amountRub || null,
    displayName: row.name || row.email || row.phone || `Покупатель ${row.lastOrderNumber || ''}`.trim(),
    hasContact: Boolean(row.email || row.phone),
    statusTone: row.needsAttention ? 'error' : row.activeOrders > 0 ? 'live' : 'archived',
    statusLabel: row.needsAttention ? 'требует внимания' : row.activeOrders > 0 ? 'есть активные заказы' : 'только завершенные',
  }));

  const rows = allRows
    .filter((buyer) => {
      if (!q) return true;
      return [
        buyer.displayName,
        buyer.name,
        buyer.email,
        buyer.phone,
        buyer.notes,
        buyer.lookup,
        buyer.lastOrderNumber,
        ...(buyer.providers || []),
        ...(buyer.eventTitles || []),
        ...(buyer.orderNumbers || []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q);
    })
    .sort((a, b) => {
      const aTime = a.lastOrderAt ? new Date(a.lastOrderAt).getTime() : 0;
      const bTime = b.lastOrderAt ? new Date(b.lastOrderAt).getTime() : 0;
      return bTime - aTime || String(a.displayName).localeCompare(String(b.displayName), 'ru');
    })
    .slice(0, limit);

  return {
    generatedAt: new Date().toISOString(),
    total: allRows.length,
    rows,
    metrics: {
      buyers: allRows.length,
      withContacts: allRows.filter((buyer) => buyer.hasContact).length,
      orders: allRows.reduce((sum, buyer) => sum + buyer.orders, 0),
      tickets: allRows.reduce((sum, buyer) => sum + buyer.tickets, 0),
      needsAttention: allRows.filter((buyer) => buyer.needsAttention > 0).length,
    },
  };
}

export async function buildAdminOrderEventCandidates(db, searchParams = new URLSearchParams()) {
  const query = String(searchParams.get('q') || '').trim();
  const limit = clampNumber(searchParams.get('limit'), 1, 30, 12);
  const queryPattern = `%${escapeLikePattern(query)}%`;

  const result = await db.query(
    `
      with event_base as (
        select
          e.id,
          e.slug,
          e.title,
          e."primaryCityId",
          e."venueId",
          e."priceFromRub",
          city.title as city,
          venue.title as venue,
          source.id as "sourceId",
          source.code::text as "sourceCode",
          source.name as "sourceName",
          category.title as category,
          min(session."startsAt") filter (where session."startsAt" >= now()) as "upcomingStartsAt",
          min(session."startsAt") as "firstStartsAt",
          count(distinct session.id)::int as "sessionCount",
          min(session."priceFromRub") filter (where session."priceFromRub" >= $3)::int as "sessionPriceFrom",
          min(offer."priceRub") filter (where offer."priceRub" >= $3 and offer.active = true)::int as "offerPriceFrom"
        from "Event" e
        left join "City" city on city.id = e."primaryCityId"
        left join "Venue" venue on venue.id = e."venueId"
        left join "Category" category on category.id = e."categoryId"
        left join "EventSourceLink" source_link on source_link."eventId" = e.id
        left join "Source" source on source.id = source_link."sourceId"
        left join "EventSession" session on session."eventId" = e.id
        left join "EventOffer" offer on offer."eventId" = e.id
        where
          $1 = ''
          or e.title ilike $2 escape '\\'
          or coalesce(city.title, '') ilike $2 escape '\\'
          or coalesce(venue.title, '') ilike $2 escape '\\'
          or coalesce(category.title, '') ilike $2 escape '\\'
          or coalesce(source_link."externalId", '') ilike $2 escape '\\'
        group by e.id, city.title, venue.title, source.id, category.title
      ),
      ranked as (
        select
          *,
          array_agg(id) over (
            partition by
              coalesce("sourceId", ''),
              lower(regexp_replace(coalesce(title, ''), '\\s+', ' ', 'g')),
              coalesce("primaryCityId", ''),
              coalesce("venueId", venue, '')
          ) as "groupEventIds",
          sum("sessionCount") over (
            partition by
              coalesce("sourceId", ''),
              lower(regexp_replace(coalesce(title, ''), '\\s+', ' ', 'g')),
              coalesce("primaryCityId", ''),
              coalesce("venueId", venue, '')
          )::int as "groupSessionCount",
          row_number() over (
            partition by
              coalesce("sourceId", ''),
              lower(regexp_replace(coalesce(title, ''), '\\s+', ' ', 'g')),
              coalesce("primaryCityId", ''),
              coalesce("venueId", venue, '')
            order by "upcomingStartsAt" asc nulls last, "firstStartsAt" desc nulls last, id asc
          ) as rn
        from event_base
      )
      select *
      from ranked
      where rn = 1
      order by "upcomingStartsAt" asc nulls last, "firstStartsAt" desc nulls last, title asc
      limit $4
    `,
    [query, queryPattern, MIN_DISPLAY_PRICE_RUB, limit],
  );

  const candidateRows = result.rows;
  const allEventIds = Array.from(new Set(candidateRows.flatMap((row) => normalizeStringArray(row.groupEventIds || [row.id]))));
  const sessionsResult = allEventIds.length
    ? await db.query(
        `
          select
            id,
            "eventId",
            "startsAt",
            "endsAt",
            "sourceStatus",
            "priceFromRub",
            "ticketsVacant"
          from "EventSession"
          where "eventId" = any($1)
          order by
            case when "startsAt" is null then 2 when "startsAt" >= now() then 0 else 1 end asc,
            "startsAt" asc nulls last
          limit 240
        `,
        [allEventIds],
      )
    : { rows: [] };

  const sessionsByEventId = new Map();
  for (const session of sessionsResult.rows) {
    const bucket = sessionsByEventId.get(session.eventId) || [];
    bucket.push({
      id: session.id,
      eventId: session.eventId,
      startsAt: session.startsAt,
      endsAt: session.endsAt,
      sourceStatus: session.sourceStatus,
      priceFrom: session.priceFromRub,
      vacant: session.ticketsVacant,
    });
    sessionsByEventId.set(session.eventId, bucket);
  }

  return {
    generatedAt: new Date().toISOString(),
    query,
    rows: candidateRows.map((row) => {
      const groupEventIds = normalizeStringArray(row.groupEventIds || [row.id]);
      const sessions = groupEventIds.flatMap((eventId) => sessionsByEventId.get(eventId) || []).slice(0, 8);
      return {
        id: row.id,
        slug: publicEventSlug(row.slug),
        title: row.title,
        city: row.city,
        venue: row.venue,
        category: row.category,
        sourceCode: row.sourceCode,
        sourceName: row.sourceName,
        startsAt: row.upcomingStartsAt || row.firstStartsAt || null,
        priceFrom: displayPriceFrom(row.priceFromRub, row.sessionPriceFrom, row.offerPriceFrom),
        sessionCount: row.groupSessionCount || row.sessionCount || sessions.length,
        groupEventIds,
        sessions,
      };
    }),
  };
}

export async function upsertAdminOrderTicket(db, orderId, payload = {}) {
  const orderKey = String(orderId || '').trim();
  const externalTicketId = firstString(payload.externalTicketId, payload.number, payload.ticketNumber);
  const status = firstString(payload.status, payload.ticketStatus) || 'issued';
  const eventId = firstString(payload.eventId);
  const sessionId = firstString(payload.sessionId);
  const ticketId = firstString(payload.id, payload.ticketId);

  if (!orderKey) {
    const error = new Error('order_id_required');
    error.statusCode = 400;
    throw error;
  }
  if (!externalTicketId || externalTicketId.length < 2) {
    const error = new Error('ticket_number_required');
    error.statusCode = 400;
    throw error;
  }

  const orderResult = await db.query('select id from "ExternalOrder" where id = $1 or "externalOrderId" = $1 or "publicCode" = $1 limit 1', [orderKey]);
  const order = orderResult.rows[0];
  if (!order) {
    const error = new Error('order_not_found');
    error.statusCode = 404;
    throw error;
  }

  let existingTicket = null;
  if (ticketId) {
    const existingById = await db.query('select id from "ExternalTicket" where id = $1 and "externalOrderId" = $2 limit 1', [ticketId, order.id]);
    existingTicket = existingById.rows[0] || null;
  }
  if (!existingTicket) {
    const existingByNumber = await db.query('select id from "ExternalTicket" where "externalOrderId" = $1 and "externalTicketId" = $2 limit 1', [order.id, externalTicketId]);
    existingTicket = existingByNumber.rows[0] || null;
  }

  if (existingTicket) {
    await db.query(
      `
        update "ExternalTicket"
        set
          "externalTicketId" = $2,
          status = $3,
          "eventId" = $4,
          "sessionId" = $5,
          origin = 'manual'
        where id = $1
      `,
      [existingTicket.id, externalTicketId, status, eventId, sessionId],
    );
  } else {
    await db.query(
      `
        insert into "ExternalTicket" (id, "externalOrderId", "externalTicketId", status, "eventId", "sessionId", origin)
        values ($1, $2, $3, $4, $5, $6, 'manual')
      `,
      [`extticket_manual_${randomUUID()}`, order.id, externalTicketId, status, eventId, sessionId],
    );
  }

  await db.query('update "ExternalOrder" set "updatedAt" = now() where id = $1', [order.id]);
  return { ok: true, order: await buildAdminOrderDetail(db, order.id) };
}

export async function buildAdminOrderDetail(db, orderId) {
  const orderKey = String(orderId || '').trim();
  if (!orderKey) return null;

  const result = await db.query(
    `
      select
        ext_order.id,
        ext_order."externalOrderId",
        ext_order."publicCode",
        ext_order.status,
        ext_order."buyerSnapshot",
        ext_order."purchasedAt",
        ext_order."updatedAt",
        source.code::text as "sourceCode",
        source.name as "sourceName",
        count(ticket.id)::int as "ticketCount",
        count(ticket.id) filter (where ticket."eventId" is null)::int as "unlinkedTickets",
        coalesce(
          jsonb_agg(
            jsonb_build_object(
              'id', ticket.id,
              'externalTicketId', ticket."externalTicketId",
              'status', ticket.status,
              'origin', ticket.origin,
              'eventId', ticket."eventId",
              'sessionId', ticket."sessionId",
              'eventTitle', event.title,
              'eventSlug', event.slug,
              'startsAt', session."startsAt"
            )
          ) filter (where ticket.id is not null),
          '[]'::jsonb
        ) as tickets
      from "ExternalOrder" ext_order
      join "Source" source on source.id = ext_order."sourceId"
      left join "ExternalTicket" ticket on ticket."externalOrderId" = ext_order.id
      left join "Event" event on event.id = ticket."eventId"
      left join "EventSession" session on session.id = ticket."sessionId"
      where ext_order.id = $1 or ext_order."externalOrderId" = $1 or ext_order."publicCode" = $1
      group by ext_order.id, source.id
      limit 1
    `,
    [orderKey],
  );

  return result.rows[0] ? mapAdminOrderRow(result.rows[0]) : null;
}

function mapAdminOrderRow(row) {
  const buyer = normalizeBuyerSnapshot(row.buyerSnapshot);
  const tickets = Array.isArray(row.tickets) ? row.tickets.map(mapAdminOrderTicket) : [];
  const problemStatus = isProblemOrderStatus(row.status);
  const shouldExpectTicket = shouldExpectOrderTicket(row.status);
  const hasUnlinkedTickets = shouldExpectTicket && tickets.some((ticket) => !ticket.eventId || !ticket.eventTitle);
  const missingArtifact = shouldExpectTicket && tickets.length === 0;
  const sourceCode = String(row.sourceCode || '').toUpperCase();
  const eventTitles = Array.from(new Set(tickets.map((ticket) => ticket.eventTitle).filter(Boolean)));
  const snapshotEventTitle = firstString(row.buyerSnapshot?.sourceEventTitle, row.buyerSnapshot?.eventTitle);
  const eventTitle = eventTitles[0] || snapshotEventTitle || null;
  const sessionDates = tickets.map((ticket) => ticket.startsAt).filter(Boolean).sort();

  return {
    id: row.id,
    externalOrderId: row.externalOrderId,
    publicCode: row.publicCode || publicOrderCode(row.sourceCode || row.sourceName, row.externalOrderId || row.id),
    status: row.status || 'unknown',
    displayStatus: orderStatusLabel(row.status),
    statusTone: orderStatusTone(row.status),
    sourceCode,
    sourceName: row.sourceName || sourceCode,
    sourceLabel: sourceLabel(sourceCode),
    buyer,
    purchasedAt: row.purchasedAt || row.updatedAt || null,
    updatedAt: row.updatedAt || null,
    ticketCount: Number(row.ticketCount || tickets.length || 0),
    unlinkedTickets: Number(row.unlinkedTickets || 0),
    eventTitle,
    eventTitles: eventTitles.length ? eventTitles : eventTitle ? [eventTitle] : [],
    eventDateLabel: sessionDates[0] || null,
    tickets,
    amountRub: extractOrderAmountRub(row.buyerSnapshot),
    artifactStatus: missingArtifact ? 'missing' : tickets.length > 0 ? 'tickets' : 'not_required',
    refundRequestsCount: 0,
    hasPendingRefundRequests: isRefundStatus(row.status),
    needsAttention: problemStatus || missingArtifact || hasUnlinkedTickets,
    problems: [
      ...(problemStatus ? ['Проверить статус у источника'] : []),
      ...(missingArtifact ? ['Нет билетов в зеркале'] : []),
      ...(hasUnlinkedTickets ? ['Есть билеты без связи с событием'] : []),
    ],
  };
}

function mapAdminOrderTicket(ticket) {
  return {
    id: ticket.id,
    externalTicketId: ticket.externalTicketId,
    status: ticket.status || 'unknown',
    displayStatus: orderStatusLabel(ticket.status),
    origin: ticket.origin || 'source',
    eventId: ticket.eventId || null,
    sessionId: ticket.sessionId || null,
    eventTitle: ticket.eventTitle || null,
    eventSlug: ticket.eventSlug || null,
    startsAt: ticket.startsAt || null,
  };
}

function matchesPublicOrderLookup(order, lookup) {
  const normalized = normalizeLookup(lookup);
  const digits = digitsOnly(lookup);
  const buyerEmail = normalizeLookup(order.buyer.email);
  const buyerPhone = digitsOnly(order.buyer.phone);

  if (normalized.length >= 4 && normalizeLookup(order.externalOrderId).includes(normalized)) return true;
  if (normalized.length >= 4 && normalizeLookup(order.publicCode).includes(normalized)) return true;
  if (normalized.length >= 4 && order.tickets.some((ticket) => normalizeLookup(ticket.externalTicketId).includes(normalized))) return true;
  if (buyerEmail && normalized.includes('@') && buyerEmail === normalized) return true;
  if (digits.length >= 6 && buyerPhone && buyerPhone.includes(digits)) return true;
  return false;
}

function adminBuyerKey(order) {
  const email = normalizeLookup(order.buyer.email);
  if (email) return `email:${email}`;
  const phone = digitsOnly(order.buyer.phone);
  if (phone.length >= 6) return `phone:${phone}`;
  const name = normalizeLookup(order.buyer.name);
  if (name) return `name:${name}`;
  return `order:${order.publicCode || order.externalOrderId || order.id}`;
}

function mapPublicBuyerOrder(order) {
  const primaryTicket = order.tickets.find((ticket) => ticket.eventTitle || ticket.eventId) || order.tickets[0] || null;
  const eventUrl = primaryTicket?.eventSlug
    ? `/events/${publicEventSlug(primaryTicket.eventSlug)}`
    : primaryTicket?.eventId
      ? `/events/${encodeURIComponent(primaryTicket.eventId)}`
      : null;
  const isFinal = isCanceledOrderStatus(order.status) || isConfirmedOrderStatus(order.status);
  return {
    id: order.id,
    number: order.publicCode,
    sourceOrderId: order.externalOrderId,
    status: order.status,
    displayStatus: order.displayStatus,
    statusTone: order.statusTone,
    isFinal,
    providerName: order.sourceLabel,
    buyer: {
      name: order.buyer.name || null,
      email: maskEmail(order.buyer.email),
      phone: maskPhone(order.buyer.phone),
    },
    eventTitle: order.eventTitle,
    eventUrl,
    purchasedAt: order.purchasedAt,
    updatedAt: order.updatedAt,
    amountRub: order.amountRub,
    ticketCount: order.ticketCount,
    artifactStatus: order.artifactStatus,
    message: publicOrderMessage(order),
    tickets: order.tickets.map((ticket) => ({
      id: ticket.id,
      number: ticket.externalTicketId,
      status: ticket.status || 'unknown',
      displayStatus: ticket.displayStatus || orderStatusLabel(ticket.status),
      eventTitle: ticket.eventTitle,
      eventUrl: ticket.eventSlug ? `/events/${publicEventSlug(ticket.eventSlug)}` : ticket.eventId ? `/events/${encodeURIComponent(ticket.eventId)}` : null,
      startsAt: ticket.startsAt,
    })),
  };
}

function publicOrderCode(source, externalOrderId) {
  const hex = createHash('sha256').update(`${source || 'source'}:${externalOrderId || ''}`).digest('hex').slice(0, 12);
  const number = (Number.parseInt(hex, 16) % 9000000) + 1000000;
  return String(number).padStart(7, '0');
}

function publicOrderMessage(order) {
  if (isConfirmedOrderStatus(order.status)) return 'Заказ подтвержден в билетной системе.';
  if (isCanceledOrderStatus(order.status)) return 'Заказ завершен или отменен в билетной системе.';
  if (order.artifactStatus === 'missing') return 'Билеты еще не попали в зеркало. Статус можно уточнить по номеру заказа.';
  if (isProcessingOrderStatus(order.status)) return 'Заказ обрабатывается в билетной системе.';
  return 'Статус получен из билетной системы.';
}

function normalizeBuyerSnapshot(snapshot) {
  const payload = snapshot && typeof snapshot === 'object' ? snapshot : {};
  const customer = payload.customer && typeof payload.customer === 'object' ? payload.customer : {};
  const buyer = payload.buyer && typeof payload.buyer === 'object' ? payload.buyer : {};
  return {
    name: firstString(payload.name, payload.fullName, payload.customerName, buyer.name, customer.name, customer.fullName),
    email: firstString(payload.email, payload.customerEmail, buyer.email, customer.email),
    phone: firstString(payload.phone, payload.customerPhone, buyer.phone, customer.phone),
    notes: firstString(payload.notes, payload.comment, buyer.notes, payload.code, payload.number, payload.source, payload.rawStatus),
  };
}

function normalizeLookup(value) {
  return String(value || '').trim().toLowerCase();
}

function escapeLikePattern(value) {
  return String(value || '').replace(/[\\%_]/g, (match) => `\\${match}`);
}

function digitsOnly(value) {
  return String(value || '').replace(/\D+/g, '');
}

function maskEmail(value) {
  const email = String(value || '').trim();
  if (!email || !email.includes('@')) return null;
  const [name, domain] = email.split('@');
  if (!name || !domain) return null;
  const visible = name.slice(0, 2);
  return `${visible}${'*'.repeat(Math.max(2, name.length - visible.length))}@${domain}`;
}

function maskPhone(value) {
  const digits = digitsOnly(value);
  if (digits.length < 6) return null;
  return `+${digits.slice(0, 1)} ${'*'.repeat(Math.max(3, digits.length - 5))} ${digits.slice(-4)}`;
}

function extractOrderAmountRub(snapshot) {
  const payload = snapshot && typeof snapshot === 'object' ? snapshot : {};
  const values = payload.values && typeof payload.values === 'object' ? payload.values : {};
  const raw = firstNumber(payload.amountRub, payload.amount, payload.full, payload.total, values.full, values.amount, values.total);
  if (raw == null) return null;
  return Math.round(raw > 100000 ? raw / 100 : raw);
}

function firstString(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

function normalizeStringArray(values) {
  return (Array.isArray(values) ? values : [values]).map((value) => String(value || '').trim()).filter(Boolean);
}

function firstNumber(...values) {
  for (const value of values) {
    const number = typeof value === 'number' ? value : typeof value === 'string' ? Number(value.replace(',', '.')) : NaN;
    if (Number.isFinite(number) && number > 0) return number;
  }
  return null;
}

function sourceLabel(sourceCode) {
  if (sourceCode === 'TEPLOHOD') return 'Teplohod.info';
  if (sourceCode === 'TICKETSCLOUD') return 'Ticketscloud';
  return sourceCode || 'Источник';
}

function isConfirmedOrderStatus(status) {
  const value = String(status || '').toLowerCase();
  return ['done', 'paid', 'confirmed', 'completed', 'success', 'executed', 'sold'].some((token) => value.includes(token));
}

function isProcessingOrderStatus(status) {
  const value = String(status || '').toLowerCase();
  return ['open', 'new', 'created', 'pending', 'processing', 'reserved', 'hold'].some((token) => value.includes(token));
}

function isCanceledOrderStatus(status) {
  const value = String(status || '').toLowerCase();
  return ['cancel', 'return', 'refund', 'reject', 'expired'].some((token) => value.includes(token));
}

function isRefundStatus(status) {
  const value = String(status || '').toLowerCase();
  return ['refund', 'return'].some((token) => value.includes(token));
}

function isProblemOrderStatus(status) {
  const value = String(status || '').toLowerCase();
  return ['fail', 'error', 'reject'].some((token) => value.includes(token));
}

function shouldExpectOrderTicket(status) {
  const value = String(status || '').toLowerCase();
  if (!value || isCanceledOrderStatus(value) || isRefundStatus(value)) return false;
  return (
    isConfirmedOrderStatus(value) ||
    ['issued', 'ticketed', 'generated', 'delivered', 'voucher'].some((token) => value.includes(token))
  );
}

function orderStatusTone(status) {
  if (isConfirmedOrderStatus(status)) return 'live';
  if (isCanceledOrderStatus(status)) return 'archived';
  if (isProblemOrderStatus(status)) return 'error';
  if (isProcessingOrderStatus(status)) return 'ready';
  return 'incomplete';
}

function orderStatusLabel(status) {
  const value = String(status || '').toLowerCase();
  if (isRefundStatus(value)) return 'возвращен';
  if (isConfirmedOrderStatus(value)) return 'подтвержден';
  if (isCanceledOrderStatus(value)) return 'отменен';
  if (['issued', 'ticketed', 'generated', 'delivered'].some((token) => value.includes(token))) return 'выпущен';
  if (['used', 'visited', 'redeemed', 'checked'].some((token) => value.includes(token))) return 'использован';
  if (isProcessingOrderStatus(value)) return 'в обработке';
  return status || 'неизвестно';
}

export async function buildAdminEventsList(db, searchParams) {
  const limit = clampNumber(searchParams.get('limit'), 1, 500, 80);
  const page = clampNumber(searchParams.get('page'), 1, 100000, 1);
  const query = String(searchParams.get('q') || '').trim().toLowerCase();
  const view = searchParams.get('view') || 'all';
  const sourceCategory = searchParams.get('category') || 'all';
  const sourceFilter = String(searchParams.get('source') || 'all').toUpperCase();
  const readiness = searchParams.get('readiness') || 'all';

  const sourceEvents = await eventRows(db, 10000);
  const events = groupAdminEventRows(sourceEvents);
  const quickFilters = ['all', 'needs_attention', 'ready_publish', 'purchase_blocked', 'no_image', 'landing_match'].map((id) => ({
    id,
    count: events.filter((event) => matchesAdminQuickFilter(event, id)).length,
  }));

  const rows = events.filter((event) => {
    if (!matchesAdminQuickFilter(event, view)) return false;
    if (sourceFilter !== 'ALL' && String(event.sourceCode || event.source || '').toUpperCase() !== sourceFilter) return false;
    if (sourceCategory !== 'all' && event.proposedCategory !== sourceCategory) return false;
    if (readiness !== 'all' && event.readiness !== readiness) return false;
    if (!query) return true;

    return [
      event.title,
      event.id,
      event.city,
      event.destination,
      event.venue,
      event.sourceCategory,
      event.proposedCategory,
      event.offerStatus,
      ...(event.tags || []),
      ...(event.landingHits || []),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(query);
  });

  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(page, pages);

  return {
    generatedAt: new Date().toISOString(),
    page: safePage,
    pages,
    limit,
    total,
    rows: rows.slice((safePage - 1) * limit, safePage * limit),
    categories: Array.from(new Set(events.map((event) => event.proposedCategory))).sort((a, b) => a.localeCompare(b, 'ru')),
    sources: Array.from(new Set(events.map((event) => event.sourceCode).filter(Boolean))).sort(),
    quickFilters,
    metrics: {
      events: events.length,
      readyEvents: events.filter((event) => event.readiness === 'ready').length,
      reviewEvents: events.filter((event) => event.readiness !== 'ready').length,
      landingRules: LANDING_RULES.length,
      sourceEvents: sourceEvents.length,
      groupedEvents: events.length,
    },
  };
}

export async function buildAdminLandingsList(db) {
  const [events, savedResult] = await Promise.all([
    eventRows(db, 10000),
    db.query(
      `
        select
          landing.id,
          landing.slug,
          landing.title,
          landing.subtitle,
          landing.description,
          landing.status,
          landing."heroTitle",
          landing."heroSubtitle",
          landing."seoH1",
          landing."seoTitle",
          landing."seoDescription",
          landing."canonicalUrl",
          landing."isIndexable",
          coalesce(count(match."eventId") filter (where match.reasons->>'manualStatus' = 'PINNED'), 0)::int as "pinnedEvents",
          coalesce(count(match."eventId") filter (where match.reasons->>'manualStatus' = 'EXCLUDED'), 0)::int as "excludedEvents",
          coalesce(count(match."eventId") filter (where match.reasons->>'manualStatus' = 'REVIEW'), 0)::int as "reviewEventsManual"
        from "Landing" landing
        left join "LandingMatch" match on match."landingId" = landing.id
        where landing.slug = any($1)
        group by landing.id
      `,
      [LANDING_RULES.map((rule) => rule.slug)],
    ),
  ]);
  const savedBySlug = new Map(savedResult.rows.map((row) => [row.slug, row]));
  const matchedEventIds = new Set();
  const rows = LANDING_RULES.map((rule) => {
    const saved = savedBySlug.get(rule.slug);
    const matched = events.filter((event) => matchesRule(event, rule));
    matched.forEach((event) => matchedEventIds.add(event.id));
    const prices = matched.map((event) => event.priceFrom).filter((price) => Number.isFinite(price) && price >= MIN_DISPLAY_PRICE_RUB);
    const readyEvents = matched.filter((event) => event.readiness === 'ready').length;
    const blockedEvents = matched.filter((event) => event.readiness === 'blocked').length;
    const venues = new Set(matched.map((event) => event.venue).filter(Boolean));
    const cities = new Set(matched.map((event) => event.city).filter(Boolean));

    return {
      id: saved?.id || null,
      slug: rule.slug,
      title: saved?.title || rule.title,
      subtitle: saved?.subtitle || rule.subtitle,
      description: saved?.description || null,
      chips: rule.chips || [],
      status: saved ? String(saved.status || '').toLowerCase() : matched.length >= 20 ? 'ready' : matched.length > 0 ? 'seed' : 'empty',
      events: matched.length,
      readyEvents,
      reviewEvents: Math.max(0, matched.length - readyEvents),
      blockedEvents,
      pinnedEvents: saved?.pinnedEvents || 0,
      excludedEvents: saved?.excludedEvents || 0,
      reviewEventsManual: saved?.reviewEventsManual || 0,
      venues: venues.size,
      cities: cities.size,
      city: rule.city || null,
      venue: rule.venue || null,
      keywords: rule.keywords || [],
      keywordScope: rule.keywordScope || 'full',
      requiredAnyKeywords: rule.requiredAnyKeywords || [],
      requiredKeywordGroups: rule.requiredKeywordGroups || [],
      requiredTags: rule.tags || [],
      excludedTags: rule.excludeTags || [],
      excludedKeywords: rule.excludeKeywords || [],
      priceFrom: prices.length ? Math.min(...prices) : null,
      seo: {
        h1: saved?.seoH1 || null,
        title: saved?.seoTitle || null,
        description: saved?.seoDescription || null,
        canonicalUrl: saved?.canonicalUrl || null,
        isIndexable: saved?.isIndexable ?? false,
      },
      sampleEvents: matched.slice(0, 6).map((event) => ({
        id: event.id,
        slug: event.slug,
        title: event.title,
        city: event.city,
        venue: event.venue,
        startsAt: event.startsAt,
        priceFrom: event.priceFrom,
        readiness: event.readiness,
      })),
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    total: rows.length,
    rows,
    metrics: {
      ready: rows.filter((row) => row.status === 'ready').length,
      seed: rows.filter((row) => row.status === 'seed').length,
      empty: rows.filter((row) => row.status === 'empty').length,
      matchedEvents: matchedEventIds.size,
    },
  };
}

export async function buildAdminLandingDetail(db, landingSlug) {
  const rule = LANDING_RULES.find((item) => item.slug === landingSlug);
  if (!rule) return null;

  const [events, landingResult] = await Promise.all([
    eventRows(db, 10000),
    db.query(
      `
        select
          landing.*,
          seo.title as "metaTitle",
          seo.description as "metaDescription",
          seo.h1 as "metaH1",
          seo."canonicalUrl" as "metaCanonicalUrl",
          seo.robots as "metaRobots",
          seo."ogTitle" as "metaOgTitle",
          seo."ogDescription" as "metaOgDescription",
          seo."ogImageUrl" as "metaOgImageUrl"
        from "Landing" landing
        left join "SeoMeta" seo on seo."entityType" = 'LANDING' and seo."entityId" = landing.id
        where landing.slug = $1
        limit 1
      `,
      [landingSlug],
    ),
  ]);
  const landing = landingResult.rows[0] || null;
  const manualRows = landing
    ? (await db.query('select "eventId", score, reasons from "LandingMatch" where "landingId" = $1', [landing.id])).rows
    : [];
  const manualByEventId = new Map(manualRows.map((row) => [row.eventId, row]));
  const autoMatches = events.filter((event) => matchesRule(event, rule));
  const autoIds = new Set(autoMatches.map((event) => event.id));
  const pinnedIds = new Set(manualRows.filter((row) => row.reasons?.manualStatus === 'PINNED').map((row) => row.eventId));
  const excludedIds = new Set(manualRows.filter((row) => row.reasons?.manualStatus === 'EXCLUDED').map((row) => row.eventId));
  const reviewIds = new Set(manualRows.filter((row) => row.reasons?.manualStatus === 'REVIEW').map((row) => row.eventId));
  const groupedEvents = groupAdminEventRows(events);
  const groupIdsFor = (event) => (event.groupEventIds?.length ? event.groupEventIds : [event.id]);
  const manualRowFor = (event) => groupIdsFor(event).map((id) => manualByEventId.get(id)).find(Boolean) || null;
  const isAutoGroup = (event) => groupIdsFor(event).some((id) => autoIds.has(id));
  const isPinnedGroup = (event) => groupIdsFor(event).some((id) => pinnedIds.has(id));
  const isExcludedGroup = (event) => groupIdsFor(event).some((id) => excludedIds.has(id));
  const isReviewGroup = (event) => groupIdsFor(event).some((id) => reviewIds.has(id));
  const autoMatchedGroups = groupedEvents.filter(isAutoGroup);
  const matched = groupedEvents.filter((event) => (isAutoGroup(event) || isPinnedGroup(event)) && !isExcludedGroup(event));
  const excluded = groupedEvents.filter(isExcludedGroup);
  const prices = matched.map((event) => event.priceFrom).filter((price) => Number.isFinite(price) && price >= MIN_DISPLAY_PRICE_RUB);
  const blockRows = landing
    ? (await db.query(
        `
          select
            id, type, variant, title, subtitle, eyebrow, body, "richTextJson",
            payload, "assetUrl", "mobileAssetUrl", "isEnabled", "sortOrder"
          from "LandingContentBlock"
          where "landingId" = $1
          order by "sortOrder" asc, id asc
        `,
        [landing.id],
      )).rows
    : [];
  const blocks = blockRows.length ? blockRows.map(mapLandingBlock) : buildDefaultLandingBlocks(rule, matched);

  return {
    generatedAt: new Date().toISOString(),
    slug: rule.slug,
    rule: {
      slug: rule.slug,
      title: rule.title,
      subtitle: rule.subtitle,
      chips: rule.chips || [],
      city: rule.city || null,
      venue: rule.venue || null,
      keywords: rule.keywords || [],
      keywordScope: rule.keywordScope || 'full',
      requiredAnyKeywords: rule.requiredAnyKeywords || [],
      requiredKeywordGroups: rule.requiredKeywordGroups || [],
      requiredTags: rule.tags || [],
      excludedTags: rule.excludeTags || [],
      excludedKeywords: rule.excludeKeywords || [],
    },
    landing: mapLandingRecord(landing, rule),
    blocks,
    seo: mapLandingSeo(landing, rule),
    metrics: {
      autoEvents: autoMatchedGroups.length,
      effectiveEvents: matched.length,
      pinnedEvents: groupedEvents.filter(isPinnedGroup).length,
      excludedEvents: excluded.length,
      reviewEvents: groupedEvents.filter(isReviewGroup).length,
      venues: new Set(matched.map((event) => event.venue).filter(Boolean)).size,
      cities: new Set(matched.map((event) => event.city).filter(Boolean)).size,
      priceFrom: prices.length ? Math.min(...prices) : null,
    },
    events: matched.slice(0, 160).map((event) => mapLandingAdminEvent(event, manualRowFor(event), isAutoGroup(event), rule)),
    excludedEvents: excluded
      .slice(0, 40)
      .map((event) => mapLandingAdminEvent(event, manualRowFor(event), isAutoGroup(event), rule)),
  };
}

export async function buildAdminLandingEventCandidates(db, landingSlug, searchParams = new URLSearchParams()) {
  const rule = LANDING_RULES.find((item) => item.slug === landingSlug);
  if (!rule) return null;

  const query = String(searchParams.get('q') || '').trim().toLowerCase();
  const limit = clampNumber(searchParams.get('limit'), 1, 50, 12);
  const [events, landingResult] = await Promise.all([
    eventRows(db, 10000),
    db.query('select id from "Landing" where slug = $1 limit 1', [landingSlug]),
  ]);
  const landing = landingResult.rows[0] || null;
  const manualRows = landing
    ? (await db.query('select "eventId", score, reasons from "LandingMatch" where "landingId" = $1', [landing.id])).rows
    : [];
  const manualByEventId = new Map(manualRows.map((row) => [row.eventId, row]));
  const autoIds = new Set(events.filter((event) => matchesRule(event, rule)).map((event) => event.id));
  const groupedEvents = groupAdminEventRows(events);
  const filtered = groupedEvents.filter((event) => {
    if (!query) return false;
    return landingEventSearchText(event).includes(query);
  });

  return {
    generatedAt: new Date().toISOString(),
    slug: rule.slug,
    query,
    total: filtered.length,
    rows: filtered.slice(0, limit).map((event) => {
      const groupIds = event.groupEventIds?.length ? event.groupEventIds : [event.id];
      const manualRow = groupIds.map((id) => manualByEventId.get(id)).find(Boolean) || null;
      const isAutoMatch = groupIds.some((id) => autoIds.has(id));
      return mapLandingAdminEvent(event, manualRow, isAutoMatch, rule);
    }),
  };
}

export async function updateAdminLanding(db, landingSlug, payload) {
  const rule = LANDING_RULES.find((item) => item.slug === landingSlug);
  if (!rule) return null;

  const title = normalizeNullableString(payload?.title) || rule.title;
  const subtitle = normalizeNullableString(payload?.subtitle) || rule.subtitle || null;
  const description = normalizeNullableString(payload?.description);
  const seoH1 = normalizeNullableString(payload?.seoH1);
  const seoTitle = normalizeNullableString(payload?.seoTitle);
  const seoDescription = normalizeNullableString(payload?.seoDescription);
  const canonicalUrl = normalizeNullableString(payload?.canonicalUrl);
  const isIndexable = payload?.isIndexable == null ? false : Boolean(payload.isIndexable);
  const status = normalizePublishStatus(payload?.status, 'REVIEW');

  const landingType = landingTypeForRule(rule);
  const landingResult = await db.query(
    `
      insert into "Landing" (
        id, type, slug, title, subtitle, description, status, rules,
        "heroTitle", "heroSubtitle", "seoH1", "seoTitle", "seoDescription",
        "canonicalUrl", "isIndexable", "isActive", "publishedAt", "updatedAt"
      )
      values ($1, $15::"LandingType", $2, $3, $4, $5, $6::"PublishStatus", $7::jsonb, $8, $9, $10, $11, $12, $13, $14, true, case when $6 = 'PUBLISHED' then now() else null end, now())
      on conflict (slug) do update set
        title = excluded.title,
        subtitle = excluded.subtitle,
        description = excluded.description,
        status = excluded.status,
        rules = excluded.rules,
        "heroTitle" = excluded."heroTitle",
        "heroSubtitle" = excluded."heroSubtitle",
        "seoH1" = excluded."seoH1",
        "seoTitle" = excluded."seoTitle",
        "seoDescription" = excluded."seoDescription",
        "canonicalUrl" = excluded."canonicalUrl",
        "isIndexable" = excluded."isIndexable",
        "isActive" = true,
        "publishedAt" = case when excluded.status = 'PUBLISHED' then coalesce("Landing"."publishedAt", now()) else "Landing"."publishedAt" end,
        "updatedAt" = now()
      returning id
    `,
    [
      randomUUID(),
      rule.slug,
      title,
      subtitle,
      description,
      status,
      JSON.stringify(rule),
      normalizeNullableString(payload?.heroTitle) || title,
      normalizeNullableString(payload?.heroSubtitle) || subtitle,
      seoH1,
      seoTitle,
      seoDescription,
      canonicalUrl,
      isIndexable,
      landingType,
    ],
  );
  const landingId = landingResult.rows[0]?.id;
  await upsertSeoMeta(db, 'LANDING', landingId, {
    title: seoTitle,
    description: seoDescription,
    h1: seoH1,
    canonicalUrl,
    robots: isIndexable ? 'index,follow' : 'noindex,follow',
    ogTitle: seoTitle,
    ogDescription: seoDescription,
  });

  return buildAdminLandingDetail(db, landingSlug);
}

export async function updateAdminLandingMatch(db, landingSlug, eventId, payload) {
  const rule = LANDING_RULES.find((item) => item.slug === landingSlug);
  if (!rule) return null;
  const landingId = await ensureLandingRecord(db, rule);
  const status = normalizeManualMatchStatus(payload?.status);
  const note = normalizeNullableString(payload?.note);
  const score = status === 'PINNED' ? 1000 : status === 'EXCLUDED' ? -1000 : 0;
  const eventIds = uniqueValues([eventId, ...normalizeStringArray(payload?.eventIds || payload?.groupEventIds)]).slice(0, 100);
  for (const targetEventId of eventIds) {
    await db.query(
      `
        insert into "LandingMatch" ("landingId", "eventId", score, reasons)
        values ($1, $2, $3, $4::jsonb)
        on conflict ("landingId", "eventId") do update set
          score = excluded.score,
          reasons = excluded.reasons
      `,
      [
        landingId,
        targetEventId,
        score,
        JSON.stringify({
          manualStatus: status,
          note,
          source: 'admin',
          updatedAt: new Date().toISOString(),
        }),
      ],
    );
  }
  return buildAdminLandingDetail(db, landingSlug);
}

export async function buildAdminTaxonomy(db) {
  const [categoriesResult, subcategoriesResult, tagsResult] = await Promise.all([
    db.query('select id, slug, title, position from "Category" order by position asc, title asc'),
    db.query('select id, "categoryId", slug, title, position from "Subcategory" order by position asc, title asc'),
    db.query('select id, slug, title from "Tag" order by title asc'),
  ]);

  return {
    categories: categoriesResult.rows,
    subcategories: subcategoriesResult.rows,
    tags: tagsResult.rows,
  };
}

export async function buildAdminVenuesList(db, searchParams) {
  const limit = clampNumber(searchParams.get('limit'), 1, 500, 120);
  const query = String(searchParams.get('q') || '').trim().toLowerCase();
  const rows = await venueRows(db, 500);
  const filtered = rows.filter((venue) => {
    if (!query) return true;
    return [venue.name, venue.city, venue.address, venue.proposedKind, venue.pageStatus].filter(Boolean).join(' ').toLowerCase().includes(query);
  });

  return {
    generatedAt: new Date().toISOString(),
    total: filtered.length,
    rows: filtered.slice(0, limit),
    metrics: {
      venues: rows.length,
      candidates: rows.filter((venue) => venue.pageStatus === 'candidate').length,
      published: rows.filter((venue) => venue.pageStatus === 'published').length,
      withEvents: rows.filter((venue) => venue.events > 0).length,
    },
  };
}

export async function buildAdminVenueDetail(db, venueId) {
  const [venueResult, eventsResult] = await Promise.all([
    db.query(
      `
        select
          venue.id,
          venue.slug,
          venue.title,
          venue.description,
          venue."shortDescription",
          venue."heroImageUrl",
          venue."seoH1",
          venue."seoTitle",
          venue."seoDescription",
          venue."canonicalPath",
          venue."isIndexable",
          venue.address,
          venue.latitude,
          venue.longitude,
          venue.kind,
          venue."pageStatus",
          city.title as city
        from "Venue" venue
        left join "City" city on city.id = venue."cityId"
        where venue.id = $1
      `,
      [venueId],
    ),
    db.query(
      `
        select
          event.id,
          event.title,
          event.status,
          event."priceFromRub",
          session."startsAt"
        from "Event" event
        left join "EventSession" session on session."eventId" = event.id
        where event."venueId" = $1
        order by session."startsAt" asc nulls last
        limit 24
      `,
      [venueId],
    ),
  ]);

  const venue = venueResult.rows[0];
  if (!venue) return null;

  return {
    ...venue,
    events: eventsResult.rows.map((event) => ({
      id: event.id,
      title: event.title,
      status: event.status,
      priceFrom: event.priceFromRub,
      startsAt: event.startsAt,
    })),
  };
}

export async function updateAdminVenue(db, venueId, payload) {
  const normalized = normalizeVenuePayload(payload);
  const current = await buildAdminVenueDetail(db, venueId);
  if (!current) return null;
  const next = { ...current, ...normalized };
  const result = await db.query(
    `
      update "Venue"
      set
        title = $2,
        description = $3,
        "shortDescription" = $4,
        "heroImageUrl" = $5,
        "seoH1" = $6,
        "seoTitle" = $7,
        "seoDescription" = $8,
        "canonicalPath" = $9,
        "isIndexable" = $10,
        kind = $11::"VenueKind",
        "pageStatus" = $12::"VenuePageStatus",
        "updatedAt" = now()
      where id = $1
      returning id
    `,
    [
      venueId,
      next.title,
      next.description,
      next.shortDescription,
      next.heroImageUrl,
      next.seoH1,
      next.seoTitle,
      next.seoDescription,
      next.canonicalPath,
      Boolean(next.isIndexable),
      next.kind || 'OTHER',
      next.pageStatus || 'NONE',
    ],
  );

  if (!result.rows[0]) return null;
  return buildAdminVenueDetail(db, venueId);
}

export async function updateAdminEventTaxonomy(db, eventId, payload) {
  const categoryId = normalizeNullableString(payload?.categoryId);
  const primarySubcategoryId = normalizeNullableString(payload?.primarySubcategoryId);
  const subcategoryIds = Array.isArray(payload?.subcategoryIds) ? payload.subcategoryIds.map(normalizeNullableString).filter(Boolean) : [];
  const tagIds = Array.isArray(payload?.tagIds) ? payload.tagIds.map(normalizeNullableString).filter(Boolean) : [];
  const allSubcategoryIds = Array.from(new Set([primarySubcategoryId, ...subcategoryIds].filter(Boolean)));

  await db.query(
    `
      update "Event"
      set "categoryId" = $2,
          "primarySubcategoryId" = $3,
          "updatedAt" = now()
      where id = $1
    `,
    [eventId, categoryId, primarySubcategoryId],
  );
  await db.query('delete from "EventSubcategory" where "eventId" = $1', [eventId]);
  for (const subcategoryId of allSubcategoryIds) {
    await db.query(
      `
        insert into "EventSubcategory" ("eventId", "subcategoryId", "isPrimary")
        values ($1, $2, $3)
        on conflict ("eventId", "subcategoryId") do update set "isPrimary" = excluded."isPrimary"
      `,
      [eventId, subcategoryId, subcategoryId === primarySubcategoryId],
    );
  }

  await db.query('delete from "EventTag" where "eventId" = $1', [eventId]);
  for (const tagId of Array.from(new Set(tagIds))) {
    await db.query(
      `
        insert into "EventTag" ("eventId", "tagId")
        values ($1, $2)
        on conflict ("eventId", "tagId") do nothing
      `,
      [eventId, tagId],
    );
  }

  const event = (await eventRowsByIds(db, [eventId]))[0] || null;
  return { eventId, event };
}

function groupAdminEventRows(events) {
  const groups = new Map();

  for (const event of events) {
    const key = adminEventGroupKey(event);
    const current = groups.get(key);
    if (!current) {
      groups.set(key, {
        ...event,
        groupKey: key,
        groupEventIds: [event.id],
        groupedEventsCount: 1,
        slotCount: event.slotCount || (event.startsAt ? 1 : 0),
        landingHits: [...(event.landingHits || [])],
        tags: [...(event.tags || [])],
        reasons: [...(event.reasons || [])],
      });
      continue;
    }

    current.groupEventIds.push(event.id);
    current.groupedEventsCount += 1;
    current.slotCount += event.slotCount || (event.startsAt ? 1 : 0);
    current.landingHits = uniqueValues(current.landingHits.concat(event.landingHits || []));
    current.tags = uniqueValues(current.tags.concat(event.tags || []));
    current.reasons = uniqueValues(current.reasons.concat(event.reasons || []));
    current.publishBlockers = uniqueValues((current.publishBlockers || []).concat(event.publishBlockers || []));
    current.publishWarnings = uniqueValues((current.publishWarnings || []).concat(event.publishWarnings || []));
    current.canPublish = Boolean(current.canPublish && event.canPublish);
    current.hasImage = Boolean(current.hasImage || event.hasImage);
    const hadPurchaseReady = Boolean(current.purchaseReady);
    current.purchaseReady = Boolean(current.purchaseReady || event.purchaseReady);
    current.purchaseProvider = current.purchaseProvider || event.purchaseProvider || null;
    if (!current.purchaseUrlSource || (current.purchaseUrlSource !== 'offer' && event.purchaseUrlSource === 'offer')) {
      current.purchaseUrlSource = event.purchaseUrlSource || current.purchaseUrlSource || null;
    }
    current.vacant = sumNullableNumbers([current.vacant, event.vacant]);
    current.priceFrom = minNullableNumber([current.priceFrom, event.priceFrom]);
    current.offerPriceRub = minNullableNumber([current.offerPriceRub, event.offerPriceRub]);

    if (event.startsAt && (!current.startsAt || new Date(event.startsAt) < new Date(current.startsAt))) {
      current.startsAt = event.startsAt;
      current.id = event.id;
      current.slug = event.slug;
      current.sourceSlug = event.sourceSlug;
      current.externalId = event.externalId;
      current.offerSourceCode = event.offerSourceCode;
      current.offerTitle = event.offerTitle;
      current.offerWidgetUrl = event.offerWidgetUrl;
      current.offerDeeplinkUrl = event.offerDeeplinkUrl;
    }

    current.severity = maxSeverity(current.severity, event.severity);
    current.readiness = worstReadiness(current.readiness, event.readiness);
    current.status = current.status === 'needs_review' || event.status === 'needs_review' ? 'needs_review' : 'ready';
    if ((!hadPurchaseReady && event.purchaseReady) || (!String(current.offerStatus || '').toLowerCase().includes('widget') && String(event.offerStatus || '').toLowerCase().includes('widget'))) {
      current.offerStatus = event.offerStatus;
      current.offerSourceCode = event.offerSourceCode || current.offerSourceCode;
      current.offerTitle = event.offerTitle || current.offerTitle;
      current.offerWidgetUrl = event.offerWidgetUrl || current.offerWidgetUrl;
      current.offerDeeplinkUrl = event.offerDeeplinkUrl || current.offerDeeplinkUrl;
    }
  }

  return Array.from(groups.values()).sort((a, b) => {
    const aTime = a.startsAt ? new Date(a.startsAt).getTime() : Number.POSITIVE_INFINITY;
    const bTime = b.startsAt ? new Date(b.startsAt).getTime() : Number.POSITIVE_INFINITY;
    return aTime - bTime || String(a.title).localeCompare(String(b.title), 'ru');
  });
}

function groupPublicEventRows(events) {
  const groups = new Map();

  for (const event of events) {
    const key = publicEventGroupKey(event);
    const slot = event.startsAt
      ? {
          eventId: event.id,
          startsAt: event.startsAt,
          dateLabel: formatDate(event.startsAt),
          timeLabel: formatTime(event.startsAt),
          purchaseUrl: event.offerWidgetUrl || event.offerDeeplinkUrl || buildProviderWidgetUrl(event),
        }
      : null;
    const current = groups.get(key);

    if (!current) {
      groups.set(key, {
        ...event,
        groupKey: key,
        groupEventIds: [event.id],
        groupedEventsCount: 1,
        sessionCount: event.slotCount || (slot ? 1 : 0),
        upcomingSlots: slot ? [slot] : [],
        tags: [...(event.tags || [])],
      });
      continue;
    }

    current.groupEventIds.push(event.id);
    current.groupedEventsCount += 1;
    current.sessionCount += event.slotCount || (slot ? 1 : 0);
    current.tags = uniqueValues(current.tags.concat(event.tags || []));
    current.priceFrom = minNullableNumber([current.priceFrom, event.priceFrom]);
    current.offerPriceRub = minNullableNumber([current.offerPriceRub, event.offerPriceRub]);
    current.vacant = sumNullableNumbers([current.vacant, event.vacant]);
    if (slot) current.upcomingSlots.push(slot);

    if (event.imageUrl && !current.imageUrl) current.imageUrl = event.imageUrl;
    if (event.override?.imageUrl && !current.override?.imageUrl) current.override = { ...(current.override || {}), imageUrl: event.override.imageUrl };

    if (event.startsAt && (!current.startsAt || new Date(event.startsAt) < new Date(current.startsAt))) {
      current.startsAt = event.startsAt;
      current.id = event.id;
      current.slug = event.slug;
      current.sourceSlug = event.sourceSlug;
      current.externalId = event.externalId;
      current.offerSourceCode = event.offerSourceCode;
      current.offerTitle = event.offerTitle;
      current.offerWidgetUrl = event.offerWidgetUrl;
      current.offerDeeplinkUrl = event.offerDeeplinkUrl;
    }
  }

  return Array.from(groups.values())
    .map((event) => ({
      ...event,
      upcomingSlots: uniqueSlots(event.upcomingSlots).sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()),
    }))
    .sort((a, b) => {
      const aTime = a.startsAt ? new Date(a.startsAt).getTime() : Number.POSITIVE_INFINITY;
      const bTime = b.startsAt ? new Date(b.startsAt).getTime() : Number.POSITIVE_INFINITY;
      return aTime - bTime || String(a.title).localeCompare(String(b.title), 'ru');
    });
}

function adminEventGroupKey(event) {
  return [
    normalizeGroupPart(event.source),
    normalizeGroupPart(event.title),
    normalizeGroupPart(event.city),
    normalizeGroupPart(event.venueId || event.venue),
  ].join('|');
}

function publicEventGroupKey(event) {
  return adminEventGroupKey(event);
}

function uniqueSlots(slots) {
  const seen = new Set();
  const result = [];
  for (const slot of slots || []) {
    const key = `${slot.startsAt || ''}|${slot.eventId || ''}`;
    if (!slot.startsAt || seen.has(key)) continue;
    seen.add(key);
    result.push(slot);
  }
  return result;
}

function sessionGroupIds(session) {
  return uniqueValues([session?.id, ...(session?.groupEventIds || [])]);
}

function primaryOfferMap(offers) {
  const map = new Map();
  const sorted = [...offers].sort((a, b) => {
    if (a.active !== b.active) return a.active ? -1 : 1;
    const aPrice = Number.isFinite(a.priceRub) ? a.priceRub : Number.POSITIVE_INFINITY;
    const bPrice = Number.isFinite(b.priceRub) ? b.priceRub : Number.POSITIVE_INFINITY;
    return aPrice - bPrice;
  });

  for (const offer of sorted) {
    if (!map.has(offer.eventId)) map.set(offer.eventId, offer);
  }

  return map;
}

function normalizeGroupPart(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function uniqueValues(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function minNullableNumber(values) {
  const numbers = values.filter((value) => Number.isFinite(value) && value >= MIN_DISPLAY_PRICE_RUB);
  return numbers.length ? Math.min(...numbers) : null;
}

function displayPriceFrom(...values) {
  return minNullableNumber(values);
}

function sumNullableNumbers(values) {
  const numbers = values.filter((value) => Number.isFinite(value));
  return numbers.length ? numbers.reduce((sum, value) => sum + value, 0) : null;
}

function maxSeverity(left, right) {
  const rank = { low: 0, medium: 1, high: 2 };
  return (rank[right] || 0) > (rank[left] || 0) ? right : left;
}

function worstReadiness(left, right) {
  const rank = { ready: 0, review: 1, blocked: 2 };
  return (rank[right] || 0) > (rank[left] || 0) ? right : left;
}

async function resolveAdminEventGroupIds(db, eventId) {
  const eventResult = await db.query(
    `
      select
        e.title,
        e."venueId",
        e."primaryCityId",
        source_link."sourceId"
      from "Event" e
      left join "EventSourceLink" source_link on source_link."eventId" = e.id
      where e.id = $1
      limit 1
    `,
    [eventId],
  );
  const event = eventResult.rows[0];
  if (!event) return [];

  const groupResult = await db.query(
    `
      select distinct e.id
      from "Event" e
      left join "EventSourceLink" source_link on source_link."eventId" = e.id
      where lower(trim(e.title)) = lower(trim($1))
        and e."venueId" is not distinct from $2
        and e."primaryCityId" is not distinct from $3
        and source_link."sourceId" is not distinct from $4
      order by e.id
    `,
    [event.title, event.venueId, event.primaryCityId, event.sourceId],
  );

  return groupResult.rows.map((row) => row.id);
}

export async function buildAdminEventDetail(db, eventId) {
  const eventIds = await resolveAdminEventGroupIds(db, eventId);
  if (!eventIds.length) {
    return {
      eventId,
      eventIds: [],
      summary: {
        slots: 0,
        offers: 0,
        vacant: null,
        priceFrom: null,
        soldTickets: 0,
        orders: 0,
      },
      sessions: [],
      offers: [],
      sales: {
        soldTickets: 0,
        orders: 0,
        ticketStatuses: [],
      },
    };
  }

  const [sessionsResult, offersResult, salesResult, orderStatusResult] = await Promise.all([
    db.query(
      `
        select
          id,
          "eventId",
          "startsAt",
          "endsAt",
          "sourceStatus",
          "priceFromRub",
          "ticketsVacant",
          "externalId"
        from "EventSession"
        where "eventId" = any($1)
        order by "startsAt" asc nulls last
      `,
      [eventIds],
    ),
    db.query(
      `
        select
          id,
          "eventId",
          "sourceCode",
          title,
          "priceRub",
          "widgetUrl",
          "deeplinkUrl",
          active
        from "EventOffer"
        where "eventId" = any($1)
        order by active desc, "priceRub" asc nulls last
      `,
      [eventIds],
    ),
    db.query(
      `
        select
          count(ticket.id)::int as "soldTickets",
          count(distinct ext_order.id)::int as orders
        from "ExternalTicket" ticket
        left join "ExternalOrder" ext_order on ext_order.id = ticket."externalOrderId"
        where ticket."eventId" = any($1)
      `,
      [eventIds],
    ),
    db.query(
      `
        select
          coalesce(ticket.status, 'unknown') as status,
          count(ticket.id)::int as tickets
        from "ExternalTicket" ticket
        where ticket."eventId" = any($1)
        group by ticket.status
        order by tickets desc, status asc
      `,
      [eventIds],
    ),
  ]);

  const sessions = sessionsResult.rows.map((row) => ({
    id: row.id,
    eventId: row.eventId,
    startsAt: normalizeStartsAt(row.startsAt),
    endsAt: row.endsAt,
    sourceStatus: row.sourceStatus,
    priceFrom: row.priceFromRub,
    vacant: row.ticketsVacant,
    externalId: row.externalId,
  }));
  const offers = offersResult.rows.map((row) => ({
    id: row.id,
    eventId: row.eventId,
    sourceCode: row.sourceCode,
    title: row.title,
    priceRub: row.priceRub,
    widgetUrl: row.widgetUrl,
    deeplinkUrl: row.deeplinkUrl,
    active: row.active,
  }));
  const soldTickets = salesResult.rows[0]?.soldTickets || 0;
  const orders = salesResult.rows[0]?.orders || 0;
  const vacantValues = sessions.map((session) => session.vacant).filter((value) => Number.isFinite(value));
  const priceValues = sessions
    .map((session) => session.priceFrom)
    .concat(offers.map((offer) => offer.priceRub))
    .filter((value) => Number.isFinite(value) && value >= MIN_DISPLAY_PRICE_RUB);

  return {
    eventId,
    eventIds,
    summary: {
      slots: sessions.length,
      offers: offers.length,
      vacant: vacantValues.length ? vacantValues.reduce((sum, value) => sum + value, 0) : null,
      priceFrom: priceValues.length ? Math.min(...priceValues) : null,
      soldTickets,
      orders,
    },
    sessions,
    offers,
    sales: {
      soldTickets,
      orders,
      ticketStatuses: orderStatusResult.rows,
    },
  };
}

export async function updateAdminEventOverride(db, eventId, payload) {
  const normalized = normalizeOverridePayload(payload);
  const currentResult = await db.query(
    `
      select
        title,
        description,
        "shortDescription",
        "imageUrl",
        "seoH1",
        "seoTitle",
        "seoDescription",
        "canonicalPath",
        "isIndexable",
        "editorStatus"
      from "EventOverride"
      where "eventId" = $1
    `,
    [eventId],
  );
  const current = currentResult.rows[0] || {};
  const next = {
    title: current.title ?? null,
    description: current.description ?? null,
    shortDescription: current.shortDescription ?? null,
    imageUrl: current.imageUrl ?? null,
    seoH1: current.seoH1 ?? null,
    seoTitle: current.seoTitle ?? null,
    seoDescription: current.seoDescription ?? null,
    canonicalPath: current.canonicalPath ?? null,
    isIndexable: current.isIndexable ?? null,
    editorStatus: current.editorStatus ?? null,
    ...normalized,
  };

  const result = await db.query(
    `
      insert into "EventOverride" (
        id,
        "eventId",
        title,
        description,
        "shortDescription",
        "imageUrl",
        "seoH1",
        "seoTitle",
        "seoDescription",
        "canonicalPath",
        "isIndexable",
        "editorStatus",
        "updatedAt"
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, now())
      on conflict ("eventId") do update set
        title = excluded.title,
        description = excluded.description,
        "shortDescription" = excluded."shortDescription",
        "imageUrl" = excluded."imageUrl",
        "seoH1" = excluded."seoH1",
        "seoTitle" = excluded."seoTitle",
        "seoDescription" = excluded."seoDescription",
        "canonicalPath" = excluded."canonicalPath",
        "isIndexable" = excluded."isIndexable",
        "editorStatus" = excluded."editorStatus",
        "updatedAt" = now()
      returning
        title,
        description,
        "shortDescription",
        "imageUrl",
        "seoH1",
        "seoTitle",
        "seoDescription",
        "canonicalPath",
        "isIndexable",
        "editorStatus"
    `,
    [
      randomUUID(),
      eventId,
      next.title,
      next.description,
      next.shortDescription,
      next.imageUrl,
      next.seoH1,
      next.seoTitle,
      next.seoDescription,
      next.canonicalPath,
      next.isIndexable,
      next.editorStatus,
    ],
  );

  return {
    eventId,
    override: mapOverrideRow(result.rows[0]),
  };
}

export async function buildPublicHome(db) {
  const now = Date.now();
  if (publicHomeCache && publicHomeCache.expiresAt > now) {
    return publicHomeCache.payload;
  }

  const [stats, destinations, catalogSessions, venues] = await Promise.all([
    db.stats(),
    destinationRows(db),
    publicCatalogSessions(db),
    publicVenues(db, 36),
  ]);
  const sessions = catalogSessions.slice(0, 180);
  const landings = buildPublicLandings(catalogSessions);

  const payload = {
    generatedAt: new Date().toISOString(),
    stats: {
      events: catalogSessions.length || sessions.length || stats.events || 0,
      destinations: destinations.length,
      venues: stats.venues || 0,
      landings: landings.length,
    },
    destinations,
    landings,
    sessions,
    venues,
  };

  publicHomeCache = {
    expiresAt: now + PUBLIC_CATALOG_CACHE_MS,
    payload,
  };

  return payload;
}

export async function buildPublicDestinations(db) {
  const now = Date.now();
  if (publicDestinationsCache && publicDestinationsCache.expiresAt > now) {
    return publicDestinationsCache.payload;
  }

  if (publicHomeCache && publicHomeCache.expiresAt > now) {
    const payload = {
      generatedAt: publicHomeCache.payload.generatedAt,
      destinations: publicHomeCache.payload.destinations,
    };
    publicDestinationsCache = {
      expiresAt: publicHomeCache.expiresAt,
      payload,
    };
    return payload;
  }

  const destinations = await destinationRows(db);
  const payload = {
    generatedAt: new Date().toISOString(),
    destinations,
  };

  publicDestinationsCache = {
    expiresAt: now + PUBLIC_CATALOG_CACHE_MS,
    payload,
  };

  return payload;
}

export async function buildPublicHomePreview(db) {
  const now = Date.now();
  if (publicHomePreviewCache && publicHomePreviewCache.expiresAt > now) {
    return publicHomePreviewCache.payload;
  }

  if (publicHomeCache && publicHomeCache.expiresAt > now) {
    const home = publicHomeCache.payload;
    const payload = {
      generatedAt: home.generatedAt,
      sessions: home.sessions.slice(0, PUBLIC_HOME_PREVIEW_LIMIT),
      landings: home.landings,
    };
    publicHomePreviewCache = {
      expiresAt: publicHomeCache.expiresAt,
      payload,
    };
    return payload;
  }

  const catalogSessions = await publicCatalogSessions(db);
  const payload = {
    generatedAt: new Date().toISOString(),
    sessions: catalogSessions.slice(0, PUBLIC_HOME_PREVIEW_LIMIT),
    landings: buildPublicLandings(catalogSessions),
  };

  publicHomePreviewCache = {
    expiresAt: now + PUBLIC_CATALOG_CACHE_MS,
    payload,
  };

  return payload;
}

export async function buildPublicStats(db) {
  const [result, stats, destinations] = await Promise.all([
    db.query(
      `
        with primary_offer as (
          select distinct on ("eventId")
            "eventId",
            "sourceCode",
            "priceRub",
            "widgetUrl",
            "deeplinkUrl"
          from "EventOffer"
          where active = true
          order by "eventId", ("priceRub" >= $1) desc nulls last, "priceRub" asc nulls last
        ),
        raw_events as (
          select
            e.id,
            coalesce(source.name, source.code::text, primary_offer."sourceCode"::text, '') as source_label,
            coalesce(e.title, '') as title,
            coalesce(city.title, '') as city,
            coalesce(e."venueId", venue.title, '') as venue_key,
            min(session."startsAt") filter (where session."startsAt" >= now()) as starts_at,
            min(e."priceFromRub") filter (where e."priceFromRub" >= $1) as event_price,
            min(session."priceFromRub") filter (where session."startsAt" >= now() and session."priceFromRub" >= $1) as session_price,
            min(primary_offer."priceRub") filter (where primary_offer."priceRub" >= $1) as offer_price,
            bool_or(
              primary_offer."widgetUrl" is not null
              or primary_offer."deeplinkUrl" is not null
              or (
                coalesce(source.code::text, primary_offer."sourceCode"::text, '') in ('TICKETSCLOUD', 'TEPLOHOD')
                and source_link."externalId" is not null
              )
            ) as purchase_ready
          from "Event" e
          left join "City" city on city.id = e."primaryCityId"
          left join "Venue" venue on venue.id = e."venueId"
          left join "EventSourceLink" source_link on source_link."eventId" = e.id
          left join "Source" source on source.id = source_link."sourceId"
          left join "EventSession" session on session."eventId" = e.id
          left join primary_offer on primary_offer."eventId" = e.id
          group by
            e.id,
            source.name,
            source.code,
            source_link."externalId",
            primary_offer."sourceCode",
            city.title,
            e."venueId",
            venue.title
        ),
        normalized_events as (
          select
            *,
            (
              select min(price)
              from (values (event_price), (session_price), (offer_price)) as prices(price)
              where price is not null
            ) as price_from
          from raw_events
        ),
        grouped_events as (
          select
            lower(regexp_replace(source_label, '\\s+', ' ', 'g')) as source_key,
            lower(regexp_replace(title, '\\s+', ' ', 'g')) as title_key,
            lower(regexp_replace(city, '\\s+', ' ', 'g')) as city_key,
            lower(regexp_replace(venue_key, '\\s+', ' ', 'g')) as venue_group_key
          from normalized_events
          where starts_at is not null
            and price_from >= $1
            and purchase_ready = true
          group by
            lower(regexp_replace(source_label, '\\s+', ' ', 'g')),
            lower(regexp_replace(title, '\\s+', ' ', 'g')),
            lower(regexp_replace(city, '\\s+', ' ', 'g')),
            lower(regexp_replace(venue_key, '\\s+', ' ', 'g'))
        )
        select count(*)::int as events
        from grouped_events
      `,
      [MIN_DISPLAY_PRICE_RUB],
    ),
    db.stats(),
    destinationSummaryRowsFast(db),
  ]);

  const row = result.rows[0] || {};
  return {
    generatedAt: new Date().toISOString(),
    stats: {
      events: row.events || 0,
      destinations: destinations.length,
      venues: stats.venues || 0,
      landings: LANDING_RULES.length,
    },
  };
}

export async function buildPublicSearch(db, searchParams) {
  const q = String(searchParams.get('q') || '').trim().toLowerCase();
  if (q.length < 2) {
    return { generatedAt: new Date().toISOString(), query: q, items: [] };
  }

  const cityFilter = String(searchParams.get('city') || '').trim().toLowerCase();
  const [sessions, destinations] = await Promise.all([publicCatalogSessions(db), destinationRows(db)]);

  let scopedSessions = sessions;
  if (cityFilter && cityFilter !== 'all') {
    scopedSessions = sessions.filter((session) => {
      const cityName = String(session.city || '').toLowerCase();
      const destination = String(session.destination || '').toLowerCase();
      const citySlug = String(session.citySlug || session.sourceCitySlug || '').toLowerCase();
      return cityName === cityFilter || destination === cityFilter || cityName.includes(cityFilter) || citySlug === cityFilter;
    });
  }

  const items = [];
  const seen = new Set();
  const pushItem = (item, key) => {
    if (seen.has(key)) return;
    seen.add(key);
    items.push(item);
  };

  for (const session of scopedSessions) {
    if (items.length >= 8) break;
    const haystack = [
      session.title,
      session.city,
      session.destination,
      session.venue,
      session.category,
      ...(session.tags || []),
      ...(session.subcategories || []),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    if (!haystack.includes(q)) continue;
    pushItem(
      {
        type: 'event',
        label: session.title,
        sublabel: [session.city, session.venue].filter(Boolean).join(' · '),
        href: `/events/${session.slug}`,
        imageUrl: session.imageUrl || null,
      },
      `event:${session.groupKey || session.id}`,
    );
  }

  if (items.length < 8) {
    for (const dest of destinations) {
      if (items.length >= 8) break;
      const name = String(dest.name || '').toLowerCase();
      const slug = String(dest.slug || '').toLowerCase();
      if (!name.includes(q) && !slug.includes(q)) continue;
      if (dest.type !== 'city' || !dest.slug) continue;
      pushItem(
        {
          type: 'city',
          label: dest.name,
          sublabel: `${dest.events} событий`,
          href: `/cities/${dest.slug}`,
          imageUrl: resolveCityCardImageFromSlug(dest.slug),
        },
        `city:${dest.slug}`,
      );
    }
  }

  if (items.length < 8) {
    const landings = buildPublicLandings(sessions).filter((landing) => landing.events > 0);
    for (const landing of landings) {
      if (items.length >= 8) break;
      const label = `${landing.title} ${landing.subtitle}`.toLowerCase();
      if (!label.includes(q) && !landing.slug.includes(q)) continue;
      pushItem(
        {
          type: 'landing',
          label: landing.title,
          sublabel: landing.subtitle,
          href: `/landings/${landing.slug}`,
          imageUrl: landing.imageUrl || null,
        },
        `landing:${landing.slug}`,
      );
    }
  }

  return { generatedAt: new Date().toISOString(), query: q, items: items.slice(0, 8) };
}

const PROMO_LANDING_ORDER = [
  'bridges-night',
  'moscow-dinner-boat',
  'river-party',
  'salute-9-may',
  'new-year',
  'bus-tours',
  'river-cruises',
  'standup',
  'planetarium',
];

const PROMO_CITY_LANDING_BOOSTS = {
  'sankt-peterburg': ['bridges-night'],
  'saint-petersburg': ['bridges-night'],
  'санкт-петербург': ['bridges-night'],
  'spb': ['bridges-night'],
  'moscow': ['moscow-dinner-boat'],
  'moskva': ['moscow-dinner-boat'],
  'москва': ['moscow-dinner-boat'],
};

export async function buildPublicPromoBlocks(db, searchParams) {
  const cityFilter = String(searchParams.get('city') || '').trim().toLowerCase();
  const sessions = await publicCatalogSessions(db);
  const scopedSessions =
    cityFilter && cityFilter !== 'all'
      ? sessions.filter((session) => {
          const cityName = String(session.city || '').toLowerCase();
          const destination = String(session.destination || '').toLowerCase();
          const citySlug = String(session.citySlug || session.sourceCitySlug || '').toLowerCase();
          return cityName === cityFilter || destination === cityFilter || citySlug === cityFilter;
        })
      : sessions;

  const landings = sortPromoLandings(
    buildPublicLandings(scopedSessions).filter((landing) => landing.events > 0),
    cityFilter,
  ).slice(0, 6);

  return {
    generatedAt: new Date().toISOString(),
    items: landings.map((landing, index) => ({
      slug: landing.slug,
      title: landing.title,
      subtitle: landing.subtitle,
      events: landing.events,
      priceFrom: landing.priceFrom,
      href: `/landings/${landing.slug}`,
      gradientIndex: index,
    })),
  };
}

function resolveCityCardImageFromSlug(slug) {
  const imageSlug = CITY_CARD_IMAGE_ALIASES[slug] || slug;
  if (!CITY_CARD_IMAGE_SLUGS.has(imageSlug)) return null;
  return `/images/cities/${imageSlug}.png`;
}

export async function buildCatalogSessions(db, searchParams) {
  const limit = clampNumber(searchParams.get('limit'), 1, 240, 120);
  const offset = clampNumber(searchParams.get('offset'), 0, 100000, 0);
  const query = String(searchParams.get('q') || '').trim().toLowerCase();
  const destination = searchParams.get('destination');
  const city = searchParams.get('city');
  const category = searchParams.get('category');
  const landing = searchParams.get('landing');
  const date = searchParams.get('date');
  const sort = searchParams.get('sort') || 'time';
  const maxPrice = Number(searchParams.get('maxPrice'));
  const forceRefresh = searchParams.get('refresh') === '1';

  const sessions = await publicCatalogSessions(db, forceRefresh);
  const facets = buildCatalogFacets(sessions);
  const rows = sessions.filter((session) => {
    if (destination && destination !== 'all' && session.destination !== destination) return false;
    if (city && city !== 'all' && session.city !== city && session.destination !== city) return false;
    if (category && category !== 'all' && session.category !== category && !pickCatalogSubcategories(session).includes(category)) return false;
    if (landing && landing !== 'all' && !(session.landingSlugs || []).includes(landing)) return false;
    if (date && date !== 'all' && !matchesCatalogDate(session, date)) return false;
    if (Number.isFinite(maxPrice) && maxPrice > 0 && (!session.priceFrom || session.priceFrom > maxPrice)) return false;
    if (!query) return true;
    return [session.title, session.city, session.destination, session.venue, session.category, ...(session.tags || [])]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(query);
    });

  const sorted = sortCatalogSessions(rows, sort);
  return { total: sorted.length, offset, limit, items: sorted.slice(offset, offset + limit), facets };
}

function buildCatalogFacets(sessions) {
  return {
    cities: countCatalogValues(sessions.map((session) => session.destination || session.city))
      .filter(([name, events]) => name && name !== 'Не указан' && events >= 2)
      .map(([name, events]) => ({ name, events })),
    categories: countCatalogValues(sessions.map((session) => session.category))
      .map(([name, events]) => ({ name, events })),
    subcategories: countCatalogValues(sessions.flatMap((session) => pickCatalogSubcategories(session, 8)))
      .filter(([name]) => name.length <= 32)
      .slice(0, 24)
      .map(([name, events]) => ({ name, events })),
    landings: countCatalogValues(sessions.flatMap((session) => session.landingSlugs || []))
      .map(([slug, events]) => {
        const rule = LANDING_RULES.find((item) => item.slug === slug);
        return { slug, title: rule?.title || humanizeSlug(slug), events };
      }),
    priceSteps: buildCatalogPriceSteps(sessions),
  };
}

function sortCatalogSessions(sessions, sort) {
  const sorted = [...sessions];
  if (sort === 'price') {
    return sorted.sort((a, b) => {
      const aPrice = Number.isFinite(a.priceFrom) ? a.priceFrom : Number.POSITIVE_INFINITY;
      const bPrice = Number.isFinite(b.priceFrom) ? b.priceFrom : Number.POSITIVE_INFINITY;
      return aPrice - bPrice || compareSessionTime(a, b);
    });
  }
  if (sort === 'popular') {
    return sorted.sort((a, b) => (b.sessionCount || 1) - (a.sessionCount || 1) || compareSessionTime(a, b));
  }
  return sorted.sort(compareSessionTime);
}

function compareSessionTime(a, b) {
  const aOpen = isOpenDateCatalogRow(a) && !a.startsAt;
  const bOpen = isOpenDateCatalogRow(b) && !b.startsAt;
  const aTime = aOpen ? Number.MAX_SAFE_INTEGER - 1 : a.startsAt ? new Date(a.startsAt).getTime() : Number.POSITIVE_INFINITY;
  const bTime = bOpen ? Number.MAX_SAFE_INTEGER - 1 : b.startsAt ? new Date(b.startsAt).getTime() : Number.POSITIVE_INFINITY;
  return aTime - bTime || String(a.title || '').localeCompare(String(b.title || ''), 'ru');
}

function countCatalogValues(values) {
  const counts = new Map();
  for (const value of values) {
    if (!value) continue;
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]), 'ru'));
}

function buildCatalogPriceSteps(sessions) {
  const max = sessions
    .map((session) => session.priceFrom)
    .filter((price) => Number.isFinite(price) && price >= MIN_DISPLAY_PRICE_RUB)
    .sort((a, b) => a - b)
    .at(-1);
  const candidates = [500, 1000, 1500, 2000, 3000, 5000].filter((price) => Number.isFinite(max) && price <= max);
  return candidates.length ? candidates : [1000, 2000, 3000];
}

function humanizeSlug(slug) {
  return String(slug || '')
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export async function buildPublicVenuePage(db, venueSlugOrId) {
  const venueResult = await db.query(
    `
      select
        venue.id,
        venue.slug,
        venue.title,
        venue.description,
        venue."shortDescription",
        venue."heroImageUrl",
        venue."seoH1",
        venue."seoTitle",
        venue."seoDescription",
        venue."canonicalPath",
        venue."isIndexable",
        venue.address,
        venue.latitude,
        venue.longitude,
        venue.kind,
        venue."pageStatus",
        city.title as city
      from "Venue" venue
      left join "City" city on city.id = venue."cityId"
      where venue.slug = $1 or venue.id = $1
      limit 1
    `,
    [venueSlugOrId],
  );

  const venue = venueResult.rows[0];
  if (!venue || venue.pageStatus === 'HIDDEN') return null;

  const [catalogSessions, relatedVenues] = await Promise.all([
    publicCatalogSessions(db),
    publicRelatedVenues(db, venue.id, venue.city, 6),
  ]);
  const sessions = catalogSessions.filter((session) => session.venueId === venue.id).slice(0, 120);
  const prices = sessions.map((session) => session.priceFrom).filter((price) => Number.isFinite(price) && price >= MIN_DISPLAY_PRICE_RUB);
  const categories = countBy(sessions.map((event) => event.category).filter(Boolean));

  return {
    generatedAt: new Date().toISOString(),
    venue: {
      id: venue.id,
      slug: venue.slug,
      name: venue.title,
      title: venue.title,
      city: venue.city || 'Не указан',
      address: venue.address,
      latitude: venue.latitude,
      longitude: venue.longitude,
      type: String(venue.kind || 'OTHER').toLowerCase(),
      pageStatus: venue.pageStatus,
      description: venue.description,
      shortDescription: venue.shortDescription,
      heroImageUrl: venue.heroImageUrl,
      seoH1: venue.seoH1,
      seoTitle: venue.seoTitle,
      seoDescription: venue.seoDescription,
      canonicalPath: venue.canonicalPath,
      isIndexable: venue.isIndexable,
      events: sessions.length,
      categories,
    },
    sessions,
    relatedVenues,
    stats: {
      events: sessions.length,
      categories: Object.keys(categories).length,
      priceFrom: prices.length ? Math.min(...prices) : null,
    },
  };
}

export async function buildPublicCityPage(db, citySlugOrId) {
  const requestedSlug = String(citySlugOrId || '').toLowerCase();
  const catalogSessions = await publicCatalogSessions(db);
  const matchedSessions = catalogSessions.filter((session) => matchesPublicDestinationPage(session, citySlugOrId, requestedSlug));
  if (!matchedSessions.length) return null;

  const destination = publicDestinationFromSession(matchedSessions[0]);
  const sessions = matchedSessions.slice(0, 160);
  const cityVenues = await publicVenuesForSessions(db, sessions, 24);
  const prices = sessions.map((session) => session.priceFrom).filter((price) => Number.isFinite(price) && price >= MIN_DISPLAY_PRICE_RUB);
  const categories = countBy(sessions.map((event) => event.category).filter(Boolean));
  const landings = buildPublicLandings(sessions).filter((landing) => landing.events > 0);
  const entityLabel = destinationPrepositional(destination);

  return {
    generatedAt: new Date().toISOString(),
    city: {
      id: destination.id,
      slug: destination.slug,
      sourceSlug: destination.sourceSlug,
      name: destination.name,
      title: destination.name,
      type: destination.type === 'region' ? 'region' : 'city',
      isDestination: true,
      events: sessions.length,
      venues: cityVenues.length,
      categories,
      seoTitle: `${destination.name}: афиша, экскурсии и билеты | Дайбилет`,
      seoDescription: `Афиша событий, экскурсий, музеев и активностей ${entityLabel}. Быстрый выбор по датам, площадкам и категориям.`,
    },
    sessions,
    venues: cityVenues,
    landings,
    stats: {
      events: sessions.length,
      venues: cityVenues.length,
      categories: Object.keys(categories).length,
      priceFrom: prices.length ? Math.min(...prices) : null,
    },
  };
}

export async function buildPublicLandingPage(db, landingSlug) {
  const rule = resolveLandingRule(landingSlug);
  if (!rule) return null;

  const catalogSessions = await publicCatalogSessions(db);
  const sessions = filterSessionsForLandingRule(catalogSessions, rule);
  const prices = sessions.map((session) => session.priceFrom).filter((price) => Number.isFinite(price) && price >= MIN_DISPLAY_PRICE_RUB);
  const cities = countBy(sessions.map((event) => event.destination || event.city).filter(Boolean));
  const categories = countBy(sessions.map((event) => event.category).filter(Boolean));
  const venues = countBy(sessions.map((event) => event.venue).filter(Boolean));

  return {
    generatedAt: new Date().toISOString(),
    landing: {
      slug: rule.slug,
      title: rule.title,
      subtitle: rule.subtitle,
      chips: rule.chips || [],
      events: sessions.length,
      venues: Object.keys(venues).length,
      priceFrom: prices.length ? Math.min(...prices) : null,
      imageUrl: null,
      strength: sessions.length >= 20 ? 'ready' : sessions.length > 0 ? 'seed' : 'empty',
      seoTitle: `${rule.title}: афиша, расписание и билеты | Дайбилет`,
      seoDescription: `${rule.subtitle}. Табличный выбор по датам, городам, площадкам и цене.`,
    },
    sessions,
    relatedLandings: buildPublicLandings(sessions).filter((landing) => landing.slug !== rule.slug && landing.events > 0),
    blocks: buildDefaultLandingBlocks(rule, sessions),
    stats: {
      events: sessions.length,
      sessions: sessions.length,
      cities,
      categories,
      venues,
      priceFrom: prices.length ? Math.min(...prices) : null,
    },
  };
}

export async function buildPublicLandingPageManaged(db, landingSlug) {
  const rule = resolveLandingRule(landingSlug);
  if (!rule) return null;

  const [catalogSessions, landingResult] = await Promise.all([
    publicCatalogSessions(db),
    db.query(
      `
        select
          landing.*,
          seo.title as "metaTitle",
          seo.description as "metaDescription",
          seo.h1 as "metaH1",
          seo."canonicalUrl" as "metaCanonicalUrl",
          seo.robots as "metaRobots",
          seo."ogTitle" as "metaOgTitle",
          seo."ogDescription" as "metaOgDescription",
          seo."ogImageUrl" as "metaOgImageUrl"
        from "Landing" landing
        left join "SeoMeta" seo on seo."entityType" = 'LANDING' and seo."entityId" = landing.id
        where landing.slug = $1 and landing."isActive" = true
        limit 1
      `,
      [landingSlug],
    ),
  ]);
  const landingRecord = landingResult.rows[0] || null;
  const [manualRows, blockRows] = landingRecord
    ? await Promise.all([
        db.query('select "eventId", reasons from "LandingMatch" where "landingId" = $1', [landingRecord.id]).then((result) => result.rows),
        db.query(
          `
            select
              id, type, variant, title, subtitle, eyebrow, body, "richTextJson",
              payload, "assetUrl", "mobileAssetUrl", "isEnabled", "sortOrder"
            from "LandingContentBlock"
            where "landingId" = $1 and "isEnabled" = true
            order by "sortOrder" asc, id asc
          `,
          [landingRecord.id],
        ).then((result) => result.rows),
      ])
    : [[], []];
  const pinnedIds = new Set(manualRows.filter((row) => row.reasons?.manualStatus === 'PINNED').map((row) => row.eventId));
  const excludedIds = new Set(manualRows.filter((row) => row.reasons?.manualStatus === 'EXCLUDED').map((row) => row.eventId));
  const manualByEventId = new Map(manualRows.map((row) => [row.eventId, row]));
  const sessions = catalogSessions
    .filter((session) => {
      const ids = sessionGroupIds(session);
      if (ids.some((id) => excludedIds.has(id))) return false;
      if (ids.some((id) => pinnedIds.has(id))) return true;
      return sessionMatchesLandingSlug(session, rule.slug) && sessionMatchesLandingSchedule(session, rule);
    })
    .slice(0, 240)
    .map((session) => {
      const pinned = sessionGroupIds(session).some((id) => pinnedIds.has(id));
      const scheduled = pinned ? session : applyLandingScheduleToSession(session, rule);
      return {
        ...(scheduled || session),
        manualLandingStatus: sessionGroupIds(session).map((id) => manualByEventId.get(id)?.reasons?.manualStatus).find(Boolean) || null,
      };
    })
    .filter((session) => sessionMatchesLandingSlug(session, rule.slug) || session.manualLandingStatus === 'PINNED');
  const prices = sessions.map((session) => session.priceFrom).filter((price) => Number.isFinite(price) && price >= MIN_DISPLAY_PRICE_RUB);
  const cities = countBy(sessions.map((event) => event.destination || event.city).filter(Boolean));
  const categories = countBy(sessions.map((event) => event.category).filter(Boolean));
  const venues = countBy(sessions.map((event) => event.venue).filter(Boolean));
  const landing = mapLandingRecord(landingRecord, rule);
  const seo = mapLandingSeo(landingRecord, rule);

  return {
    generatedAt: new Date().toISOString(),
    landing: {
      slug: rule.slug,
      type: landingTypeForRule(rule),
      title: landing.title,
      subtitle: landing.subtitle,
      chips: rule.chips || [],
      events: sessions.length,
      venues: Object.keys(venues).length,
      priceFrom: prices.length ? Math.min(...prices) : null,
      imageUrl: null,
      strength: sessions.length >= 20 ? 'ready' : sessions.length > 0 ? 'seed' : 'empty',
      seoH1: seo.h1,
      seoTitle: seo.title,
      seoDescription: seo.description,
      canonicalUrl: seo.canonicalUrl,
      isIndexable: landing.isIndexable,
    },
    sessions,
    relatedLandings: buildPublicLandings(sessions).filter((landingItem) => landingItem.slug !== rule.slug && landingItem.events > 0),
    blocks: blockRows.length ? blockRows.map(mapLandingBlock) : buildDefaultLandingBlocks(rule, sessions),
    stats: {
      events: sessions.length,
      sessions: sessions.length,
      cities,
      categories,
      venues,
      priceFrom: prices.length ? Math.min(...prices) : null,
    },
  };
}

export async function buildPublicEventPage(db, eventSlugOrId) {
  const catalogSessions = await publicCatalogSessions(db);
  const resolvedEventId = await resolvePublicEventId(db, eventSlugOrId, catalogSessions);
  const eventLocator = resolvedEventId || eventSlugOrId;
  const eventResult = await db.query(
    `
      select
        e.id,
        e.slug,
        e.title,
        e.description,
        e.kind,
        e.status,
        e."ageLimit",
        e."imageUrl",
        e."seoH1",
        e."seoTitle",
        e."seoDescription",
        e."canonicalPath",
        e."isIndexable",
        e."priceFromRub",
        e."ticketsVacant",
        cat.title as category,
        city.id as "cityId",
        city.title as city,
        city.slug as "citySourceSlug",
        city."isDestination" as "cityIsDestination",
        region.id as "regionId",
        region.slug as "regionSlug",
        region.title as "regionTitle",
        venue.id as "venueId",
        venue.slug as "venueSlug",
        venue.title as venue,
        venue.address as "venueAddress",
        venue.kind as "venueKind",
        source.code as "sourceCode",
        source.name as "sourceName",
        source_link."externalId",
        override.title as "overrideTitle",
        override.description as "overrideDescription",
        override."imageUrl" as "overrideImageUrl",
        override."seoH1" as "overrideSeoH1",
        override."seoTitle" as "overrideSeoTitle",
        override."seoDescription" as "overrideSeoDescription",
        ${orderedEventTagsSql('e.id')} as tags
      from "Event" e
      left join "Category" cat on cat.id = e."categoryId"
      left join "City" city on city.id = e."primaryCityId"
      left join "Region" region on region.id = city."regionId"
      left join "Venue" venue on venue.id = e."venueId"
      left join "EventSourceLink" source_link on source_link."eventId" = e.id
      left join "Source" source on source.id = source_link."sourceId"
      left join "EventOverride" override on override."eventId" = e.id
      where e.id = $1 or e.slug = $1
      group by e.id, cat.title, city.id, city.title, city.slug, city."isDestination", region.id, region.slug, region.title, venue.id, venue.slug, venue.title, venue.address, venue.kind, source.code, source.name, source_link."externalId", override.id
      limit 1
    `,
      [eventLocator],
  );
  const event = eventResult.rows[0];
  if (!event) return null;
  const eventDestination = publicDestinationForCity(event);

  const requestedSlug = publicEventSlug(eventSlugOrId);
  const targetPublicSession = catalogSessions.find((session) =>
    session.id === event.id ||
    session.sourceSlug === event.slug ||
    session.slug === requestedSlug ||
    sessionGroupIds(session).includes(event.id)
  );
  const fallbackPublicRow = {
    ...event,
    source: event.sourceName || publicSourceLabel(event.sourceCode) || 'Источник',
    sourceCode: event.sourceCode,
    sourceCategory: event.category,
    category: event.category,
    cityId: event.cityId,
    city: event.city,
    venueId: event.venueId,
    venue: event.venue,
  };
  const targetGroupKey = targetPublicSession?.groupKey || publicEventGroupKey(fallbackPublicRow);
  const groupEventIds = targetPublicSession?.groupEventIds?.length ? targetPublicSession.groupEventIds : [event.id];
  const representativeRow = targetPublicSession || fallbackPublicRow;

  const [sessionsResult, offersResult] = await Promise.all([
    db.query(
      `
        select
          session.id,
          session."eventId",
          session."startsAt",
          session."endsAt",
          session."sourceStatus",
          session."priceFromRub",
          session."ticketsVacant",
          session."externalId",
          session_source_link."externalId" as "eventExternalId",
          session_source.code as "eventSourceCode",
          session_offer."sourceCode" as "offerSourceCode",
          session_offer.title as "offerTitle",
          session_offer."priceRub" as "offerPriceRub",
          session_offer."widgetUrl" as "offerWidgetUrl",
          session_offer."deeplinkUrl" as "offerDeeplinkUrl",
          session_offer.active as "offerActive"
        from "EventSession" session
        left join "EventSourceLink" session_source_link on session_source_link."eventId" = session."eventId"
        left join "Source" session_source on session_source.id = session_source_link."sourceId"
        left join lateral (
          select
            "sourceCode",
            title,
            "priceRub",
            "widgetUrl",
            "deeplinkUrl",
            active
          from "EventOffer"
          where "eventId" = session."eventId" and active is not false
          order by ("priceRub" >= $2) desc nulls last, "priceRub" asc nulls last
          limit 1
        ) session_offer on true
        where session."eventId" = any($1)
          and (session."startsAt" is null or session."startsAt" >= now())
        order by session."startsAt" asc nulls last
        limit 5
      `,
      [groupEventIds, MIN_DISPLAY_PRICE_RUB],
    ),
    db.query(
      `
        select
          offer.id,
          offer."eventId",
          offer."sourceCode",
          coalesce(nullif(offer.title, ''), 'Ticketscloud widget') as title,
          offer."priceRub",
          offer."widgetUrl",
          offer."deeplinkUrl",
          offer.active,
          (offer.payload->>'sortOrder')::int as "sortOrder"
        from "EventOffer" offer
        where offer."eventId" = any($1)
          and offer.active is not false
          and offer."priceRub" >= $2
        order by
          case when offer."sourceCode"::text = 'TEPLOHOD' then coalesce((offer.payload->>'sortOrder')::int, 9999) else 9999 end,
          offer."priceRub" asc nulls last,
          offer.id asc
        limit 24
      `,
      [groupEventIds, MIN_DISPLAY_PRICE_RUB],
    ),
  ]);

  const publicOffers = dedupePublicOffers(offersResult.rows).slice(0, 12);

  const primaryOfferByEventId = primaryOfferMap(
    sessionsResult.rows
      .map((session) => ({
        eventId: session.eventId,
        sourceCode: session.offerSourceCode,
        title: session.offerTitle,
        priceRub: session.offerPriceRub,
        widgetUrl: session.offerWidgetUrl,
        deeplinkUrl: session.offerDeeplinkUrl,
        active: session.offerActive,
      }))
      .filter((offer) => offer.sourceCode || offer.priceRub != null || offer.widgetUrl || offer.deeplinkUrl),
  );
  const primaryOffer = primaryOfferByEventId.get(representativeRow.id) || publicOffers.find((offer) => offer.active) || publicOffers[0] || null;
  const totalSessionCount = targetPublicSession?.sessionCount || sessionsResult.rows.length;
  const eventPriceFrom = displayPriceFrom(
    targetPublicSession?.priceFrom,
    event.priceFromRub,
    ...sessionsResult.rows.map((session) => session.priceFromRub),
    ...publicOffers.map((offer) => offer.priceRub),
  );
  const fallbackWidgetUrl = buildProviderWidgetUrl(representativeRow.externalId ? representativeRow : { ...event, externalId: event.externalId, offerSourceCode: primaryOffer?.sourceCode });
  const purchase = purchaseInfo({
    ...representativeRow,
    sourceCode: event.sourceCode || primaryOffer?.sourceCode,
    offerSourceCode: primaryOffer?.sourceCode || representativeRow.offerSourceCode,
    offerWidgetUrl: primaryOffer?.widgetUrl || representativeRow.offerWidgetUrl,
    offerDeeplinkUrl: primaryOffer?.deeplinkUrl || representativeRow.offerDeeplinkUrl,
    externalId: representativeRow.externalId || event.externalId,
  });
  const purchaseUrl = purchase.url || fallbackWidgetUrl;
  const widgetProvider = providerWidgetProvider(event.sourceCode || primaryOffer?.sourceCode);
  const widgetPayload = buildProviderWidgetPayload({
    sourceCode: event.sourceCode || primaryOffer?.sourceCode,
    externalId: event.externalId,
  });
  const tags = event.tags || [];
  const baseEvent = {
    id: representativeRow.id || event.id,
    slug: publicEventSlug(representativeRow.sourceSlug || representativeRow.slug || event.slug),
    sourceSlug: representativeRow.sourceSlug || event.slug,
    sourceCode: event.sourceCode,
    externalId: event.externalId,
    widgetProvider,
    widgetPayload,
    groupKey: targetGroupKey,
    groupEventIds,
    sessionCount: totalSessionCount,
    title: event.overrideTitle || event.title,
    description: cleanImportedDescription(event.overrideDescription || event.description),
    imageUrl: event.overrideImageUrl || event.imageUrl || null,
    category: event.category || 'События',
    tags,
    city: event.city || 'Не указан',
    cityId: event.cityId,
    citySlug: eventDestination.slug,
    sourceCitySlug: event.citySourceSlug,
    destination: eventDestination.name,
    destinationType: eventDestination.type,
    venueId: event.venueId,
    venueSlug: event.venueSlug,
    venue: event.venue || 'Не указано',
    venueAddress: event.venueAddress,
    venueKind: event.venueKind || 'OTHER',
    ageLimit: event.ageLimit,
    priceFrom: eventPriceFrom,
    vacant: targetPublicSession?.vacant ?? event.ticketsVacant,
    eventType: String(event.kind || '').toLowerCase(),
    landingSlugs: targetPublicSession?.landingSlugs || LANDING_RULES.filter((rule) => matchesRule({ ...event, title: event.title, venue: event.venue, city: event.city, tags, sourceCategory: event.category }, rule)).map((rule) => rule.slug),
    purchaseUrl,
    widgetUrl: primaryOffer?.widgetUrl || fallbackWidgetUrl,
    deeplinkUrl: primaryOffer?.deeplinkUrl || null,
    purchaseReady: purchase.ready,
    purchaseMode: purchase.mode,
    purchaseProvider: purchase.provider,
    purchaseUrlSource: purchase.urlSource,
    seoH1: event.overrideSeoH1 || event.seoH1 || event.title,
    seoTitle: event.overrideSeoTitle || event.seoTitle || `${event.title}: билеты и расписание | Дайбилет`,
    seoDescription: cleanImportedDescription(event.overrideSeoDescription || event.seoDescription) || `Расписание, цены и билеты на ${event.title}. Покупка через виджет билетной системы.`,
    canonicalPath: event.canonicalPath || `/events/${publicEventSlug(representativeRow.sourceSlug || representativeRow.slug || event.slug)}`,
    isIndexable: event.isIndexable,
  };
  const sessions = sessionsResult.rows.map((session) => {
    const sessionOffer = primaryOfferByEventId.get(session.eventId) || primaryOffer;
    const sourceRow = targetPublicSession && sessionGroupIds(targetPublicSession).includes(session.eventId) ? targetPublicSession : null;
    const sessionSourceCode = session.eventSourceCode || sessionOffer?.sourceCode || sourceRow?.offerSourceCode || sourceRow?.sourceCode || event.sourceCode;
    const sessionExternalId = String(sessionSourceCode || '').toUpperCase().includes('TEPLOHOD')
      ? session.eventExternalId || sourceRow?.externalId || event.externalId
      : session.externalId || session.eventExternalId || sourceRow?.externalId || event.externalId;
    const sessionPurchase = purchaseInfo({
      ...sourceRow,
      sourceCode: sessionSourceCode,
      offerSourceCode: sessionOffer?.sourceCode || sessionSourceCode,
      offerWidgetUrl: sessionOffer?.widgetUrl || sourceRow?.offerWidgetUrl,
      offerDeeplinkUrl: sessionOffer?.deeplinkUrl || sourceRow?.offerDeeplinkUrl,
      externalId: sessionExternalId,
    });
    const schedule = publicSessionScheduleLabels({
      startsAt: session.startsAt,
      kind: event.kind,
      sourceStatus: session.sourceStatus,
    });
    return {
      id: session.id,
      eventId: session.eventId,
      startsAt: schedule.startsAt || null,
      endsAt: session.endsAt,
      dateLabel: schedule.dateLabel,
      timeLabel: schedule.timeLabel,
      timeBucket: schedule.timeBucket,
      sourceStatus: session.sourceStatus,
      priceFrom: displayPriceFrom(session.priceFromRub, baseEvent.priceFrom),
      vacant: session.ticketsVacant,
      purchaseUrl: sessionPurchase.url,
      purchaseReady: sessionPurchase.ready,
      purchaseUrlSource: sessionPurchase.urlSource,
    };
  });
  const widgetOnlySessions = sessions.length === 0
    && String(event.sourceCode || '').toUpperCase().includes('TEPLOHOD')
    && purchase.ready
    ? [{
        id: `widget_tep_${event.id}`,
        eventId: event.id,
        startsAt: null,
        endsAt: null,
        dateLabel: 'В виджете',
        timeLabel: 'Выберите время',
        timeBucket: 'day',
        sourceStatus: 'widget',
        priceFrom: baseEvent.priceFrom,
        vacant: baseEvent.vacant,
        purchaseUrl,
        purchaseReady: purchase.ready,
        purchaseUrlSource: purchase.urlSource,
      }]
    : [];
  const publicSessions = sessions.length ? sessions : widgetOnlySessions;
  const ticketPrices = buildPublicTicketPrices(publicOffers, publicSessions, baseEvent);
  const related = [];
  for (const session of catalogSessions) {
    if (related.length >= 12) break;
    if (sessionGroupIds(session).some((id) => groupEventIds.includes(id))) continue;
    if (session.cityId !== event.cityId && session.category !== event.category) continue;
    related.push(session);
  }
  const priceValues = [baseEvent.priceFrom, ...publicSessions.map((session) => session.priceFrom)].filter((price) => Number.isFinite(price) && price >= MIN_DISPLAY_PRICE_RUB);
  const vacantValues = publicSessions.map((session) => session.vacant).filter((value) => Number.isFinite(value));

  return {
    generatedAt: new Date().toISOString(),
    event: baseEvent,
    sessions: publicSessions,
    offers: publicOffers.map((offer) => ({
      id: offer.id,
      sourceCode: offer.sourceCode,
      title: offer.title,
      priceRub: offer.priceRub,
      widgetUrl: offer.widgetUrl,
      deeplinkUrl: offer.deeplinkUrl,
      active: offer.active,
    })),
    ticketPrices,
    related,
    landings: LANDING_RULES.filter((rule) => baseEvent.landingSlugs.includes(rule.slug)).map((rule) => ({
      slug: rule.slug,
      title: rule.title,
      subtitle: rule.subtitle,
      chips: rule.chips || [],
    })),
    stats: {
      sessions: totalSessionCount,
      priceFrom: priceValues.length ? Math.min(...priceValues) : null,
      vacant: vacantValues.length ? vacantValues.reduce((sum, value) => sum + value, 0) : null,
    },
  };
}

function readOfferSortOrder(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function dedupePublicOffers(rows) {
  const unique = new Map();
  for (const row of rows || []) {
    const key = `${String(row.sourceCode || '')}|${normalizeGroupPart(row.title)}|${row.priceRub}`;
    const sortOrder = readOfferSortOrder(row.sortOrder);
    const existing = unique.get(key);
    if (!existing) {
      unique.set(key, row);
      continue;
    }
    const existingOrder = readOfferSortOrder(existing.sortOrder) ?? 9999;
    const nextOrder = sortOrder ?? 9999;
    if (nextOrder < existingOrder) unique.set(key, row);
  }

  return Array.from(unique.values()).sort((a, b) => {
    const aIsTep = String(a.sourceCode || '').toUpperCase().includes('TEPLOHOD');
    const bIsTep = String(b.sourceCode || '').toUpperCase().includes('TEPLOHOD');
    if (aIsTep || bIsTep) {
      const aOrder = readOfferSortOrder(a.sortOrder) ?? 9999;
      const bOrder = readOfferSortOrder(b.sortOrder) ?? 9999;
      return aOrder - bOrder || Number(a.priceRub || 0) - Number(b.priceRub || 0);
    }
    return Number(a.priceRub || 0) - Number(b.priceRub || 0) || String(a.title || '').localeCompare(String(b.title || ''), 'ru');
  });
}

function buildPublicTicketPrices(offers, sessions, event) {
  const rows = [];
  const eventTitleKey = normalizeGroupPart(event.title);
  const isTeplohod = String(event.sourceCode || event.offerSourceCode || '').toUpperCase().includes('TEPLOHOD');

  for (const offer of offers || []) {
    if (offer.active === false || !Number.isFinite(offer.priceRub) || offer.priceRub < MIN_DISPLAY_PRICE_RUB) continue;
    const title = normalizePublicTicketTitle(offer.title, eventTitleKey);
    rows.push({
      key: `offer:${offer.id || offer.eventId}:${title}:${offer.priceRub}`,
      title,
      priceRub: offer.priceRub,
      source: publicSourceLabel(offer.sourceCode),
      description: 'Покупка открывается в виджете билетной системы.',
      purchaseUrl: offer.widgetUrl || offer.deeplinkUrl || event.purchaseUrl || null,
      kind: 'offer',
      sortOrder: readOfferSortOrder(offer.sortOrder),
    });
  }

  const offerPrices = new Set(rows.filter((row) => row.kind === 'offer').map((row) => row.priceRub));
  for (const session of sessions || []) {
    if (!Number.isFinite(session.priceFrom) || session.priceFrom < MIN_DISPLAY_PRICE_RUB) continue;
    if (offerPrices.has(session.priceFrom)) continue;
    rows.push({
      key: `session:${session.priceFrom}`,
      title: 'Билет на отдельные сеансы',
      priceRub: session.priceFrom,
      source: null,
      description: 'Минимальная доступная цена среди ближайших дат.',
      purchaseUrl: session.purchaseUrl || event.purchaseUrl || null,
      kind: 'session',
    });
  }

  if (!rows.length && Number.isFinite(event.priceFrom) && event.priceFrom >= MIN_DISPLAY_PRICE_RUB) {
    rows.push({
      key: `fallback:${event.priceFrom}`,
      title: 'Билет',
      priceRub: event.priceFrom,
      source: null,
      description: 'Точная категория билета уточняется в виджете поставщика.',
      purchaseUrl: event.purchaseUrl || null,
      kind: 'fallback',
    });
  }

  const unique = new Map();
  for (const row of rows) {
    const key = `${normalizeGroupPart(row.title)}:${row.priceRub}`;
    const existing = unique.get(key);
    if (!existing || (row.kind === 'offer' && existing.kind !== 'offer')) unique.set(key, row);
  }

  return Array.from(unique.values())
    .sort((a, b) => {
      if (isTeplohod) {
        const aOrder = readOfferSortOrder(a.sortOrder) ?? 9999;
        const bOrder = readOfferSortOrder(b.sortOrder) ?? 9999;
        return aOrder - bOrder || a.priceRub - b.priceRub;
      }
      return a.priceRub - b.priceRub || String(a.title).localeCompare(String(b.title), 'ru');
    })
    .slice(0, 8);
}

function normalizePublicTicketTitle(rawTitle, eventTitleKey) {
  const cleanTitle = cleanImportedDescription(rawTitle);
  const titleKey = normalizeGroupPart(cleanTitle);
  if (!titleKey || titleKey === eventTitleKey) return 'Билет';
  if (titleKey === 'widget' || titleKey.includes('ticketscloud widget')) return 'Билет';
  return cleanTitle;
}

function publicSourceLabel(sourceCode) {
  const normalized = String(sourceCode || '').toUpperCase();
  if (normalized.includes('TC') || normalized.includes('TICKETSCLOUD')) return 'Ticketscloud';
  if (normalized.includes('TEPLOHOD')) return 'Teplohod.info';
  return normalized || null;
}

function buildProviderWidgetUrl(row) {
  const sourceCode = String(row?.sourceCode || row?.offerSourceCode || '').toUpperCase();
  if (sourceCode.includes('TEPLOHOD')) return row?.offerDeeplinkUrl || row?.deeplinkUrl || (row?.externalId ? buildTeplohodUrl(row.externalId) : null);
  return buildTicketscloudWidgetUrl(row?.externalId);
}

function providerWidgetProvider(sourceCode) {
  const normalized = String(sourceCode || '').toUpperCase();
  if (normalized.includes('TEPLOHOD')) return 'TEPLOHOD';
  if (normalized.includes('TC') || normalized.includes('TICKETSCLOUD')) return 'TICKETSCLOUD';
  return null;
}

function buildProviderWidgetPayload(row) {
  const provider = providerWidgetProvider(row?.sourceCode || row?.offerSourceCode);
  if (provider === 'TEPLOHOD') {
    const tepEventId = normalizeTeplohodEventId(row?.externalId);
    return {
      provider,
      tepEventId,
      tepWidgetId: process.env.TEP_WIDGET_ID || '14208',
    };
  }

  if (provider === 'TICKETSCLOUD') {
    return {
      provider,
      tcEventId: row?.externalId || null,
    };
  }

  return null;
}

function normalizeTeplohodEventId(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const match = raw.match(/(?:^tep-)?(\d+)$/i);
  return match ? match[1] : raw;
}

async function categoryRows(db) {
  const result = await db.query(`
    select cat.title as source, count(e.id)::int as events
    from "Category" cat
    left join "Event" e on e."categoryId" = cat.id
    group by cat.title, cat.position
    order by cat.position asc
  `);
  return result.rows;
}

async function eventRows(db, limit) {
  const result = await db.query(
    `
      select
        e.id,
        e.slug,
        source_link."externalId",
        source.code as "sourceCode",
        source.name as "sourceName",
        e.title,
        e.description,
        e.kind,
        e.status,
        e."sourceStatus",
        e."ageLimit",
        e."imageUrl",
        e."seoH1",
        e."seoTitle",
        e."seoDescription",
        e."canonicalPath",
        e."isIndexable",
        e."priceFromRub",
        e."ticketsVacant",
        e."categoryId",
        e."primarySubcategoryId",
        override.title as "overrideTitle",
        override.description as "overrideDescription",
        override."shortDescription" as "overrideShortDescription",
        override."imageUrl" as "overrideImageUrl",
        override."seoH1" as "overrideSeoH1",
        override."seoTitle" as "overrideSeoTitle",
        override."seoDescription" as "overrideSeoDescription",
        override."canonicalPath" as "overrideCanonicalPath",
        override."isIndexable" as "overrideIsIndexable",
        override."editorStatus" as "overrideEditorStatus",
        cat.title as category,
        city.title as city,
        city."isDestination" as "cityIsDestination",
        region.id as "regionId",
        region.slug as "regionSlug",
        region.title as "regionTitle",
        venue.id as "venueId",
        venue.slug as "venueSlug",
        venue.title as venue,
        venue.kind as "venueKind",
        offer."sourceCode" as "offerSourceCode",
        offer.title as "offerTitle",
        offer."priceRub" as "offerPriceRub",
        offer."widgetUrl" as "offerWidgetUrl",
        offer."deeplinkUrl" as "offerDeeplinkUrl",
        city.id as "cityId",
        city.slug as "citySlug",
        min(session."startsAt") filter (where session."startsAt" >= now()) as "nextStartsAt",
        min(session."startsAt") as "startsAt",
        min(session."priceFromRub") filter (where session."priceFromRub" >= ${MIN_DISPLAY_PRICE_RUB}) as "sessionPriceFromRub",
        count(distinct session.id)::int as "slotCount",
        ${orderedEventTagsSql('e.id')} as tags,
        coalesce((
          select array_agg(tag.id order by tag.title)
          from "EventTag" event_tag_ids
          join "Tag" tag on tag.id = event_tag_ids."tagId"
          where event_tag_ids."eventId" = e.id
        ), '{}') as "tagIds",
        coalesce(array_remove(array_agg(distinct event_subcategory."subcategoryId"), null), '{}') as "subcategoryIds"
      from "Event" e
      left join "Category" cat on cat.id = e."categoryId"
      left join "City" city on city.id = e."primaryCityId"
      left join "Region" region on region.id = city."regionId"
      left join "Venue" venue on venue.id = e."venueId"
      left join "EventSourceLink" source_link on source_link."eventId" = e.id
      left join "Source" source on source.id = source_link."sourceId"
      left join "EventOverride" override on override."eventId" = e.id
      left join "EventSession" session on session."eventId" = e.id
      left join lateral (
        select
          "sourceCode",
          title,
          "priceRub",
          "widgetUrl",
          "deeplinkUrl"
        from "EventOffer"
        where "eventId" = e.id and active = true
        order by ("priceRub" >= ${MIN_DISPLAY_PRICE_RUB}) desc nulls last, "priceRub" asc nulls last
        limit 1
      ) offer on true
      left join "EventSubcategory" event_subcategory on event_subcategory."eventId" = e.id
      group by
        e.id,
        source_link."externalId",
        source.code,
        source.name,
        override.id,
        cat.title,
        city.title,
        city.id,
        city.slug,
        city."isDestination",
        region.id,
        region.slug,
        region.title,
        venue.id,
        venue.slug,
        venue.title,
        venue.kind,
        offer."sourceCode",
        offer.title,
        offer."priceRub",
        offer."widgetUrl",
        offer."deeplinkUrl"
      order by e.status asc, min(session."startsAt") asc nulls last
      limit $1
    `,
    [limit],
  );

  return result.rows.map((row) => {
    const tags = row.tags || [];
    const destination = publicDestinationForCity(row);
    const priceFrom = displayPriceFrom(row.priceFromRub, row.sessionPriceFromRub, row.offerPriceRub);
    const purchase = purchaseInfo(row);
    const normalizedRow = { ...row, startsAt: row.nextStartsAt || row.startsAt, priceFrom, purchaseReady: purchase.ready, hasImage: Boolean(row.overrideImageUrl || row.imageUrl) };
    const readinessIssues = buildReadinessIssues(normalizedRow);
    const reasons = readinessIssues.map((issue) => issue.label);
    const gate = publishGate(normalizedRow, reasons);
    const moderationStatus = row.overrideEditorStatus || row.status || 'REVIEW';
    const offerStatus = purchase.status;
    const severity = readinessSeverity(readinessIssues);
    const readiness = readinessIssues.length ? (severity === 'high' ? 'blocked' : 'review') : row.status === 'READY' ? 'ready' : 'review';
    return {
      id: row.id,
      slug: publicEventSlug(row.slug),
      sourceSlug: row.slug,
      source: row.sourceName || publicSourceLabel(row.sourceCode || row.offerSourceCode) || 'Источник',
      sourceCode: row.sourceCode || row.offerSourceCode,
      externalId: row.externalId,
      title: row.title,
      description: row.description,
      categoryId: row.categoryId,
      primarySubcategoryId: row.primarySubcategoryId,
      subcategoryIds: row.subcategoryIds || [],
      tagIds: row.tagIds || [],
      sourceCategory: row.category || 'unknown',
      proposedCategory: row.category || 'не определено',
      city: row.city || 'Не указан',
      cityId: row.cityId,
      citySlug: destination.slug,
      sourceCitySlug: row.citySlug,
      destination: destination.name,
      destinationType: destination.type,
      venue: row.venue || 'Не указано',
      venueId: row.venueId,
      venueSlug: row.venueSlug,
      venueKind: row.venueKind || 'OTHER',
      offerSourceCode: row.offerSourceCode,
      offerTitle: row.offerTitle,
      offerPriceRub: row.offerPriceRub,
      offerWidgetUrl: row.offerWidgetUrl,
      offerDeeplinkUrl: row.offerDeeplinkUrl,
      purchaseReady: purchase.ready,
      purchaseMode: purchase.mode,
      purchaseProvider: purchase.provider,
      purchaseUrlSource: purchase.urlSource,
      eventType: String(row.kind || '').toLowerCase(),
      startsAt: row.nextStartsAt || row.startsAt,
      slotCount: row.slotCount || 0,
      ageLimit: row.ageLimit,
      priceFrom,
      vacant: row.ticketsVacant,
      hasImage: Boolean(row.overrideImageUrl || row.imageUrl),
      imageUrl: row.imageUrl,
      seoH1: row.seoH1,
      seoTitle: row.seoTitle,
      seoDescription: row.seoDescription,
      canonicalPath: row.canonicalPath,
      isIndexable: row.isIndexable,
      override: {
        title: row.overrideTitle,
        description: row.overrideDescription,
        shortDescription: row.overrideShortDescription,
        imageUrl: row.overrideImageUrl,
        seoH1: row.overrideSeoH1,
        seoTitle: row.overrideSeoTitle,
        seoDescription: row.overrideSeoDescription,
        canonicalPath: row.overrideCanonicalPath,
        isIndexable: row.overrideIsIndexable,
        editorStatus: row.overrideEditorStatus,
      },
      tags,
      landingHits: LANDING_RULES.filter((rule) => matchesRule({ ...row, tags }, rule)).map((rule) => rule.title).slice(0, 3),
      reasons,
      readinessCodes: readinessIssues.map((issue) => issue.code),
      readinessIssues,
      moderationStatus,
      canPublish: gate.blockers.length === 0,
      publishBlockers: gate.blockers,
      publishWarnings: gate.warnings,
      severity,
      readiness,
      offerStatus,
      status: reasons.length ? 'needs_review' : row.status === 'READY' ? 'ready' : 'needs_review',
    };
  });
}

function purchaseInfo(row = {}) {
  const sourceCode = row.sourceCode || row.offerSourceCode;
  const provider = providerWidgetProvider(sourceCode);
  const explicitUrl = row.offerWidgetUrl || row.offerDeeplinkUrl || null;
  const fallbackUrl = buildProviderWidgetUrl({ ...row, offerSourceCode: sourceCode });
  const url = explicitUrl || fallbackUrl || null;
  const mode = provider === 'TEPLOHOD' || provider === 'TICKETSCLOUD' ? 'widget' : url ? 'redirect' : null;
  const urlSource = explicitUrl ? 'offer' : fallbackUrl ? 'fallback' : null;
  const status = !url
    ? 'нет виджета'
    : provider === 'TEPLOHOD'
      ? 'Teplohod widget'
      : provider === 'TICKETSCLOUD'
        ? 'TC widget'
        : 'widget';

  return {
    ready: Boolean(url),
    mode,
    provider,
    urlSource,
    url,
    status,
  };
}

function adminOfferStatus(row) {
  return purchaseInfo(row).status;
}

async function eventRowsByIds(db, ids) {
  if (!ids.length) return [];
  const rows = await eventRows(db, 10000);
  const expected = new Set(ids);
  return rows.filter((row) => expected.has(row.id));
}

function matchesAdminQuickFilter(event, view) {
  if (view === 'needs_attention') return event.status === 'needs_review';
  if (view === 'ready_publish') return event.readiness === 'ready';
  if (view === 'purchase_blocked') return !event.purchaseReady;
  if (view === 'no_image') return !event.hasImage;
  if (view === 'landing_match') return event.landingHits.length > 0;
  return true;
}

function publishGate(event, reasons) {
  const blockers = [];
  const warnings = [];

  if (event.priceFrom == null) blockers.push('нет цены / offer');
  if (!event.purchaseReady) blockers.push('нет виджета');
  if (!event.startsAt && event.kind !== 'OPEN_DATE') blockers.push('нет даты');
  if (!event.venue) blockers.push('нет площадки');
  if (!event.city) blockers.push('нет города');

  for (const reason of reasons || []) {
    if (reason.includes('изображ')) warnings.push(reason);
    else if (reason.includes('подкатег') || reason.includes('музея') || reason.includes('сквоз')) warnings.push(reason);
    else if (!blockers.includes(reason)) warnings.push(reason);
  }

  return {
    blockers: Array.from(new Set(blockers)),
    warnings: Array.from(new Set(warnings)),
  };
}

function normalizeOverridePayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Override payload must be an object');
  }

  const normalized = {};
  for (const key of ['title', 'description', 'shortDescription', 'imageUrl', 'seoH1', 'seoTitle', 'seoDescription', 'canonicalPath']) {
    if (!Object.prototype.hasOwnProperty.call(payload, key)) continue;
    normalized[key] = normalizeNullableString(payload[key]);
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'isIndexable')) {
    normalized.isIndexable = payload.isIndexable == null ? null : Boolean(payload.isIndexable);
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'editorStatus')) {
    const value = normalizeNullableString(payload.editorStatus);
    const allowed = new Set(['DRAFT', 'REVIEW', 'READY', 'PUBLISHED', 'HIDDEN']);
    normalized.editorStatus = value && allowed.has(value) ? value : null;
  }

  return normalized;
}

function normalizeVenuePayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Venue payload must be an object');
  }

  const normalized = {};
  for (const key of ['title', 'description', 'shortDescription', 'heroImageUrl', 'seoH1', 'seoTitle', 'seoDescription', 'canonicalPath']) {
    if (!Object.prototype.hasOwnProperty.call(payload, key)) continue;
    normalized[key] = normalizeNullableString(payload[key]);
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'isIndexable')) {
    normalized.isIndexable = payload.isIndexable == null ? null : Boolean(payload.isIndexable);
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'kind')) {
    const value = normalizeNullableString(payload.kind);
    const allowed = new Set(['VENUE', 'MUSEUM_ART_SPACE', 'THEATER', 'CONCERT_HALL', 'CLUB_BAR_RESTAURANT', 'PIER', 'MEETING_POINT', 'OUTDOOR_LOCATION', 'SPORT_ACTIVITY_SPACE', 'ATTRACTION', 'ONLINE', 'OTHER']);
    normalized.kind = value && allowed.has(value) ? value : null;
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'pageStatus')) {
    const value = normalizeNullableString(payload.pageStatus);
    const allowed = new Set(['NONE', 'CANDIDATE', 'PUBLISHED', 'HIDDEN']);
    normalized.pageStatus = value && allowed.has(value) ? value : null;
  }

  return normalized;
}

function normalizeNullableString(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text ? text : null;
}

function cleanImportedDescription(value) {
  if (value == null) return null;
  const text = String(value)
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/\s*(p|div|li|h[1-6])\s*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
  return text ? text : null;
}

function normalizePublishStatus(value, fallback = 'REVIEW') {
  const normalized = normalizeNullableString(value);
  const allowed = new Set(['DRAFT', 'REVIEW', 'READY', 'PUBLISHED', 'HIDDEN']);
  return normalized && allowed.has(normalized) ? normalized : fallback;
}

function normalizeManualMatchStatus(value) {
  const normalized = normalizeNullableString(value);
  const allowed = new Set(['PINNED', 'EXCLUDED', 'REVIEW']);
  return normalized && allowed.has(normalized) ? normalized : 'REVIEW';
}

async function ensureLandingRecord(db, rule) {
  const result = await db.query(
    `
      insert into "Landing" (id, type, slug, title, subtitle, status, rules, "isIndexable", "isActive", "updatedAt")
      values ($1, $6::"LandingType", $2, $3, $4, 'REVIEW', $5::jsonb, false, true, now())
      on conflict (slug) do update set
        rules = excluded.rules,
        "isActive" = true,
        "updatedAt" = now()
      returning id
    `,
    [randomUUID(), rule.slug, rule.title, rule.subtitle || null, JSON.stringify(rule), landingTypeForRule(rule)],
  );
  return result.rows[0]?.id;
}

async function upsertSeoMeta(db, entityType, entityId, payload) {
  if (!entityId) return null;
  const result = await db.query(
    `
      insert into "SeoMeta" (
        id, "entityType", "entityId", title, description, h1, "canonicalUrl", robots,
        "ogTitle", "ogDescription", "ogImageUrl", "updatedAt"
      )
      values ($1, $2::"SeoEntityType", $3, $4, $5, $6, $7, $8, $9, $10, $11, now())
      on conflict ("entityType", "entityId") do update set
        title = excluded.title,
        description = excluded.description,
        h1 = excluded.h1,
        "canonicalUrl" = excluded."canonicalUrl",
        robots = excluded.robots,
        "ogTitle" = excluded."ogTitle",
        "ogDescription" = excluded."ogDescription",
        "ogImageUrl" = excluded."ogImageUrl",
        "updatedAt" = now()
      returning id
    `,
    [
      randomUUID(),
      entityType,
      entityId,
      payload.title ?? null,
      payload.description ?? null,
      payload.h1 ?? null,
      payload.canonicalUrl ?? null,
      payload.robots ?? null,
      payload.ogTitle ?? null,
      payload.ogDescription ?? null,
      payload.ogImageUrl ?? null,
    ],
  );
  return result.rows[0] || null;
}

function mapLandingRecord(row, rule) {
  return {
    id: row?.id || null,
    slug: rule.slug,
    type: row?.type || landingTypeForRule(rule),
    title: row?.title || rule.title,
    subtitle: row?.subtitle || rule.subtitle || null,
    description: row?.description || null,
    status: row?.status || 'REVIEW',
    heroTitle: row?.heroTitle || row?.title || rule.title,
    heroSubtitle: row?.heroSubtitle || row?.subtitle || rule.subtitle || null,
    heroBadge: row?.heroBadge || null,
    heroImageUrl: row?.heroImageUrl || null,
    heroMobileImageUrl: row?.heroMobileImageUrl || null,
    templateType: row?.templateType || (rule.city ? 'COMPARISON_TABLE' : 'HYBRID'),
    layoutVariant: row?.layoutVariant || null,
    surfaceVariant: row?.surfaceVariant || null,
    isIndexable: row?.isIndexable ?? false,
    isActive: row?.isActive ?? true,
    publishedAt: row?.publishedAt || null,
  };
}

function mapLandingSeo(row, rule) {
  return {
    h1: row?.metaH1 || row?.seoH1 || rule.title,
    title: row?.metaTitle || row?.seoTitle || `${rule.title}: афиша, расписание и билеты | Дайбилет`,
    description: row?.metaDescription || row?.seoDescription || `${rule.subtitle || rule.title}. Быстрый выбор по датам, городам, площадкам и цене.`,
    canonicalUrl: row?.metaCanonicalUrl || row?.canonicalUrl || `/landings/${rule.slug}`,
    robots: row?.metaRobots || (row?.isIndexable ? 'index,follow' : 'noindex,follow'),
    ogTitle: row?.metaOgTitle || row?.seoTitle || null,
    ogDescription: row?.metaOgDescription || row?.seoDescription || null,
    ogImageUrl: row?.metaOgImageUrl || row?.ogImageUrl || null,
  };
}

function landingTypeForRule(rule) {
  return rule.city ? 'CITY' : 'MULTI_CITY';
}

function mapLandingBlock(row) {
  return {
    id: row.id,
    type: row.type,
    variant: row.variant || null,
    title: row.title || null,
    subtitle: row.subtitle || null,
    eyebrow: row.eyebrow || null,
    body: row.body || null,
    richTextJson: row.richTextJson || null,
    payload: row.payload || null,
    assetUrl: row.assetUrl || null,
    mobileAssetUrl: row.mobileAssetUrl || null,
    isEnabled: row.isEnabled !== false,
    sortOrder: row.sortOrder || 0,
  };
}

function buildDefaultLandingBlocks(rule, matchedEvents) {
  const cities = Object.entries(countBy(matchedEvents.map((event) => event.destination || event.city).filter(Boolean)))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([title, count]) => ({ title, count }));
  const venues = Object.entries(countBy(matchedEvents.map((event) => event.venue).filter(Boolean)))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([title, count]) => ({ title, count }));
  const prices = matchedEvents.map((event) => event.priceFrom).filter((price) => Number.isFinite(price) && price >= MIN_DISPLAY_PRICE_RUB);
  const minPrice = prices.length ? Math.min(...prices) : null;
  const landingType = landingTypeForRule(rule);
  const cityLabel = rule.city || (cities.length ? `${cities.length} городов` : 'разных городах');

  const blocks = [
    {
      id: `fallback-${rule.slug}-trust`,
      type: 'TRUST_BADGES',
      variant: 'compact',
      eyebrow: 'Быстрый выбор',
      title: landingType === 'CITY' ? `Что есть в подборке для города ${rule.city}` : 'Что есть в подборке',
      payload: {
        items: [
          { title: `${matchedEvents.length} событий`, text: 'Импортировано из билетных систем и сгруппировано без дублей слотов.' },
          { title: `${new Set(matchedEvents.map((event) => event.venue).filter(Boolean)).size} площадок`, text: 'Можно быстро сравнить место, дату и цену.' },
          { title: minPrice ? `от ${minPrice} ₽` : 'цены уточняются', text: 'Показываем взрослые/основные цены от 100 ₽, без младенческих тарифов.' },
        ],
      },
      sortOrder: 10,
    },
    {
      id: `fallback-${rule.slug}-value`,
      type: 'VALUE_PROPS',
      variant: landingType === 'CITY' ? 'scenario' : 'hub',
      title: landingType === 'CITY' ? 'Как выбрать подходящий вариант' : 'Быстрые сценарии выбора',
      subtitle: landingType === 'CITY'
        ? 'Сначала сузьте дату и формат, потом сравните ближайшие сеансы в таблице.'
        : 'Широкие лендинги работают как навигация: помогают выбрать город, формат и перейти к покупке.',
      payload: {
        items: [
          { title: 'По дате', text: 'Фильтры поднимают ближайшие сеансы и вечерние варианты.' },
          { title: 'По месту', text: venues.length ? `Популярные площадки: ${venues.slice(0, 3).map((item) => item.title).join(', ')}.` : 'Площадки появятся после импорта.' },
          { title: 'По цене', text: 'В таблице можно сортировать варианты по минимальной доступной цене.' },
        ],
      },
      sortOrder: 20,
    },
    {
      id: `fallback-${rule.slug}-story`,
      type: 'STORY',
      variant: 'editorial',
      title: rule.title,
      subtitle: rule.subtitle || null,
      body: landingType === 'CITY'
        ? `Подборка собирает предложения в городе ${rule.city}: ближайшие даты, площадки, цены и ссылку на покупку у билетного оператора.`
        : `Это тематическая витрина по направлению «${rule.title}». На верхнем уровне важнее быстро показать города и форматы, а покупочную таблицу оставляем как удобный модуль ниже.`,
      sortOrder: 30,
    },
    {
      id: `fallback-${rule.slug}-faq`,
      type: 'FAQ',
      variant: 'seo',
      title: 'Вопросы перед покупкой',
      payload: {
        items: [
          { question: 'Где проходит оплата?', answer: 'Оплата и чек остаются на стороне билетной системы. Дайбилет хранит факт покупки и статус билета.' },
          { question: 'Почему одно событие может иметь много сеансов?', answer: 'Поставщики часто отдают каждый слот отдельно. Мы группируем одинаковые названия и площадки в одну карточку.' },
          { question: 'Как обновляются даты и цены?', answer: 'Данные обновляются импортом из поставщика; финальная доступность проверяется при переходе к покупке.' },
        ],
      },
      sortOrder: 40,
    },
  ];

  if (landingType === 'MULTI_CITY' && cities.length) {
    blocks.splice(2, 0, {
      id: `fallback-${rule.slug}-cities`,
      type: 'CITY_GRID',
      variant: 'hub',
      title: 'Города в подборке',
      subtitle: 'На мультилендинге лучше вести пользователя в городские срезы, а не дублировать сотни одинаковых строк.',
      payload: { items: cities },
      sortOrder: 25,
    });
  }

  return blocks;
}

function mapLandingAdminEvent(event, manualRow, isAutoMatch, rule = null) {
  const manual = manualRow?.reasons || null;
  const ruleExplanation = rule ? explainRuleMatch(event, rule) : { reasons: [], blockers: [] };
  const manualStatus = manual?.manualStatus || null;
  return {
    id: event.id,
    groupEventIds: event.groupEventIds?.length ? event.groupEventIds : [event.id],
    slug: event.slug,
    title: event.title,
    city: event.city,
    venue: event.venue,
    startsAt: event.startsAt,
    priceFrom: event.priceFrom,
    readiness: event.readiness,
    category: event.sourceCategory,
    tags: event.tags || [],
    isAutoMatch,
    manualStatus,
    manualNote: manual?.note || null,
    matchReasons: uniqueValues([
      manualStatus === 'PINNED' ? 'ручное закрепление' : null,
      manualStatus === 'EXCLUDED' ? 'ручное скрытие' : null,
      manualStatus === 'REVIEW' ? 'ручной возврат к авто' : null,
      ...ruleExplanation.reasons,
    ].filter(Boolean)).slice(0, 10),
    matchBlockers: ruleExplanation.blockers || [],
  };
}

function landingEventSearchText(event) {
  return [
    event.title,
    event.id,
    event.city,
    event.destination,
    event.venue,
    event.sourceCategory,
    event.proposedCategory,
    event.sourceCode,
    event.source,
    ...(event.tags || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function mapOverrideRow(row) {
  return {
    title: row.title,
    description: row.description,
    shortDescription: row.shortDescription,
    imageUrl: row.imageUrl,
    seoH1: row.seoH1,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    canonicalPath: row.canonicalPath,
    isIndexable: row.isIndexable,
    editorStatus: row.editorStatus,
  };
}

async function venueRows(db, limit) {
  const result = await db.query(
    `
      select
        venue.id,
        venue.slug,
        venue.title as name,
        venue."shortDescription",
        venue."heroImageUrl",
        city.title as city,
        venue.address,
        venue.kind,
        venue."pageStatus",
        count(event.id)::int as events
      from "Venue" venue
      left join "City" city on city.id = venue."cityId"
      left join "Event" event on event."venueId" = venue.id
      group by venue.id, city.title
      order by events desc, venue.title asc
      limit $1
    `,
    [limit],
  );

  return result.rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    city: row.city || 'Не указан',
    address: row.address,
    shortDescription: row.shortDescription,
    heroImageUrl: row.heroImageUrl,
    proposedKind: String(row.kind || 'OTHER').toLowerCase(),
    pageStatus: String(row.pageStatus || 'NONE').toLowerCase(),
    reason: row.pageStatus === 'CANDIDATE' ? 'кандидат на public-страницу' : 'пока только локация',
    events: row.events,
  }));
}

async function destinationRows(db) {
  const sessions = await publicCatalogSessions(db);
  const buckets = new Map();

  for (const session of sessions) {
    const destination = publicDestinationFromSession(session);
    if (!destination.name || destination.name === 'Не указан') continue;
    if (!buckets.has(destination.name)) {
      buckets.set(destination.name, {
        id: destination.id,
        slug: destination.slug,
        sourceSlug: destination.sourceSlug,
        name: destination.name,
        type: destination.type,
        events: 0,
        venueIds: new Set(),
        categories: new Map(),
      });
    }

    const bucket = buckets.get(destination.name);
    bucket.events += 1;
    if (session.venueId) bucket.venueIds.add(session.venueId);
    if (session.category) bucket.categories.set(session.category, (bucket.categories.get(session.category) || 0) + 1);
  }

  return Array.from(buckets.values())
    .map((bucket) => ({
      id: bucket.id,
      slug: bucket.slug,
      sourceSlug: bucket.sourceSlug,
      name: bucket.name,
      type: bucket.type,
      events: bucket.events,
      venues: bucket.venueIds.size,
      categories: Array.from(bucket.categories.entries())
        .map(([name, events]) => ({ name, events }))
        .sort((a, b) => b.events - a.events || a.name.localeCompare(b.name, 'ru')),
    }))
    .filter((bucket) => bucket.events >= 2)
    .sort(destinationSort);
}

async function destinationSummaryRowsFast(db) {
  const result = await db.query(
    `
      with primary_offer as (
        select distinct on ("eventId")
          "eventId",
          "sourceCode",
          "priceRub",
          "widgetUrl",
          "deeplinkUrl"
        from "EventOffer"
        where active = true
        order by "eventId", ("priceRub" >= $1) desc nulls last, "priceRub" asc nulls last
      ),
      event_base as (
        select
          e.id,
          source.code as "sourceCode",
          coalesce(source.name, source.code::text, primary_offer."sourceCode"::text, '') as "sourceLabel",
          e.title,
          e.kind,
          e."sourceStatus",
          city.id as "cityId",
          city.title as city,
          city.slug as "citySlug",
          city."isDestination" as "cityIsDestination",
          region.id as "regionId",
          region.slug as "regionSlug",
          region.title as "regionTitle",
          venue.id as "venueId",
          venue.title as venue,
          min(session."startsAt") filter (where session."startsAt" >= now()) as "startsAt",
          min(e."priceFromRub") filter (where e."priceFromRub" >= $1) as "eventPriceFromRub",
          min(session."priceFromRub") filter (where session."startsAt" >= now() and session."priceFromRub" >= $1) as "sessionPriceFromRub",
          min(primary_offer."priceRub") filter (where primary_offer."priceRub" >= $1) as "offerPriceRub",
          bool_or(
            primary_offer."widgetUrl" is not null
            or primary_offer."deeplinkUrl" is not null
            or (
              coalesce(source.code::text, primary_offer."sourceCode"::text, '') in ('TICKETSCLOUD', 'TEPLOHOD')
              and source_link."externalId" is not null
            )
          ) as "purchaseReady"
        from "Event" e
        left join "City" city on city.id = e."primaryCityId"
        left join "Region" region on region.id = city."regionId"
        left join "Venue" venue on venue.id = e."venueId"
        left join "EventSourceLink" source_link on source_link."eventId" = e.id
        left join "Source" source on source.id = source_link."sourceId"
        left join "EventSession" session on session."eventId" = e.id
        left join primary_offer on primary_offer."eventId" = e.id
        group by
          e.id,
          source.name,
          source.code,
          source_link."externalId",
          primary_offer."sourceCode",
          city.id,
          city.title,
          city.slug,
          city."isDestination",
          region.id,
          region.slug,
          region.title,
          venue.id,
          venue.title
      ),
      normalized as (
        select
          *,
          (
            select min(price)
            from (values ("eventPriceFromRub"), ("sessionPriceFromRub"), ("offerPriceRub")) as prices(price)
            where price is not null and price >= $1
          ) as "priceFrom"
        from event_base
      ),
      saleable as (
        select
          *,
          concat_ws(
            '|',
            lower(regexp_replace(trim(coalesce("sourceLabel", '')), '\\s+', ' ', 'g')),
            lower(regexp_replace(trim(coalesce(title, '')), '\\s+', ' ', 'g')),
            lower(regexp_replace(trim(coalesce(city, '')), '\\s+', ' ', 'g')),
            lower(regexp_replace(trim(coalesce("venueId", venue, '')), '\\s+', ' ', 'g'))
          ) as "groupKey"
        from normalized
        where "priceFrom" >= $1
          and "purchaseReady" = true
          and (
            "startsAt" is not null
            or kind = 'OPEN_DATE'
            or "sourceStatus" = 'open_date'
            or "sourceCode" = 'TEPLOHOD'
          )
      ),
      ranked as (
        select
          *,
          row_number() over (partition by "groupKey" order by "startsAt" asc nulls last, title asc) as rank
        from saleable
      )
      select
        "groupKey",
        "cityId",
        city,
        "citySlug",
        "cityIsDestination",
        "regionId",
        "regionSlug",
        "regionTitle",
        "venueId"
      from ranked
      where rank = 1
    `,
    [MIN_DISPLAY_PRICE_RUB],
  );

  const buckets = new Map();
  for (const row of result.rows) {
    const destination = publicDestinationForCity(row);
    if (!destination.name || destination.name === 'Не указан') continue;
    if (!buckets.has(destination.name)) {
      buckets.set(destination.name, {
        id: destination.id,
        slug: destination.slug,
        sourceSlug: destination.sourceSlug,
        name: destination.name,
        type: destination.type,
        events: 0,
        venueIds: new Set(),
      });
    }

    const bucket = buckets.get(destination.name);
    bucket.events += 1;
    if (row.venueId) bucket.venueIds.add(row.venueId);
  }

  return Array.from(buckets.values())
    .map((bucket) => ({
      id: bucket.id,
      slug: bucket.slug,
      sourceSlug: bucket.sourceSlug,
      name: bucket.name,
      type: bucket.type,
      events: bucket.events,
      venues: bucket.venueIds.size,
    }))
    .filter((bucket) => bucket.events >= 2)
    .sort(destinationSort);
}

function publicDestinationForCity(row) {
  const cityName = cleanDisplayName(row.city) || 'Не указан';
  const mappedRegion = CITY_TO_REGION.get(cityName);
  if (mappedRegion && !STANDALONE_CITY_NAMES.has(cityName)) {
    const slug = publicCitySlug(mappedRegion);
    return {
      id: row.regionId || `region_${slug}`,
      slug,
      sourceSlug: row.regionSlug || slug,
      name: mappedRegion,
      type: 'region',
    };
  }

  if (row.cityIsDestination === false && row.regionTitle) {
    const slug = publicCitySlug(row.regionTitle);
    return {
      id: row.regionId || `region_${slug}`,
      slug,
      sourceSlug: row.regionSlug || slug,
      name: row.regionTitle,
      type: 'region',
    };
  }

  const slug = publicCitySlug(cityName);
  return {
    id: row.cityId || `city_${slug}`,
    slug,
    sourceSlug: row.citySlug || slug,
    name: cityName,
    type: 'city',
  };
}

function publicDestinationFromSession(session) {
  const name = cleanDisplayName(session.destination) || cleanDisplayName(session.city) || 'Не указан';
  const type = session.destinationType === 'region' ? 'region' : 'city';
  const slug = publicCitySlug(name);
  return {
    id: type === 'region' ? `region_${slug}` : session.cityId || `city_${slug}`,
    slug,
    sourceSlug: type === 'region' ? slug : session.sourceCitySlug || slug,
    name,
    type,
  };
}

const CITY_SLUG_CANONICAL = {
  moscow: 'moskva',
  moskva: 'moskva',
  'saint-petersburg': 'sankt-peterburg',
  'sankt-peterburg': 'sankt-peterburg',
  'nizhny-novgorod': 'nizhniy-novgorod',
  'nizhniy-novgorod': 'nizhniy-novgorod',
  'veliky-novgorod': 'velikiy-novgorod',
  'velikiy-novgorod': 'velikiy-novgorod',
  rostov: 'rostov-na-donu',
  'rostov-on-don': 'rostov-na-donu',
  'rostov-na-donu': 'rostov-na-donu',
};

function canonicalCitySlug(value) {
  const slug = publicCitySlug(value) || String(value || '').trim().toLowerCase();
  return CITY_SLUG_CANONICAL[slug] || slug;
}

function matchesPublicDestinationPage(session, citySlugOrId, requestedSlug) {
  const destination = publicDestinationFromSession(session);
  const requested = canonicalCitySlug(requestedSlug);
  if (destination.type === 'region') {
    return (
      destination.id === citySlugOrId ||
      canonicalCitySlug(destination.sourceSlug) === requested ||
      canonicalCitySlug(destination.slug) === requested
    );
  }

  return (
    session.cityId === citySlugOrId ||
    canonicalCitySlug(session.sourceCitySlug) === requested ||
    destination.id === citySlugOrId ||
    canonicalCitySlug(destination.sourceSlug) === requested ||
    canonicalCitySlug(destination.slug) === requested ||
    canonicalCitySlug(session.city) === requested
  );
}

function cleanDisplayName(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function destinationSort(a, b) {
  const aGroup = destinationSortGroup(a.name, a.type);
  const bGroup = destinationSortGroup(b.name, b.type);
  if (aGroup !== bGroup) return aGroup.localeCompare(bGroup, 'ru');
  if (a.type !== b.type) return a.type === 'city' ? -1 : 1;
  return b.events - a.events || a.name.localeCompare(b.name, 'ru');
}

function destinationSortGroup(name, type) {
  const groups = {
    'Москва': '01-moscow',
    'Московская область': '01-moscow',
    'Санкт-Петербург': '02-spb',
    'Ленинградская область': '02-spb',
    'Казань': '03-kazan',
    'Республика Татарстан': '03-kazan',
    'Краснодар': '04-krasnodar',
    'Краснодарский край': '04-krasnodar',
    'Красноярск': '05-krasnoyarsk',
    'Красноярский край': '05-krasnoyarsk',
    'Абакан': '06-khakasia',
    'Республика Хакасия': '06-khakasia',
    'Ульяновск': '07-ulyanovsk',
    'Ульяновская область': '07-ulyanovsk',
  };
  return groups[name] || `90-${type}-${name}`;
}

function destinationPrepositional(destination) {
  const bySlug = {
    'sankt-peterburg': 'в Санкт-Петербурге',
    'saint-petersburg': 'в Санкт-Петербурге',
    moscow: 'в Москве',
    moskva: 'в Москве',
    'moskovskaya-oblast': 'в Московской области',
    'leningradskaya-oblast': 'в Ленинградской области',
    'krasnodarskiy-kray': 'в Краснодарском крае',
    'krasnoyarskiy-kray': 'в Красноярском крае',
    'respublika-tatarstan': 'в Республике Татарстан',
    'respublika-hakasiya': 'в Республике Хакасии',
    'ulyanovskaya-oblast': 'в Ульяновской области',
    'habarovskiy-kray': 'в Хабаровском крае',
  };
  if (bySlug[destination.slug]) return bySlug[destination.slug];

  const name = cleanDisplayName(destination.name);
  if (!name) return 'в выбранном направлении';
  if (name === 'Москва') return 'в Москве';
  if (name === 'Санкт-Петербург') return 'в Санкт-Петербурге';
  if (destination.type === 'region') return `в регионе ${name}`;
  if (name.endsWith('а')) return `в ${name.slice(0, -1)}е`;
  return `в городе ${name}`;
}

async function publicSessions(db, limit) {
  const rows = await publicCatalogSessions(db);
  return rows.slice(0, limit);
}

async function publicCatalogSessions(db, forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && publicCatalogCache && publicCatalogCache.expiresAt > now) {
    return publicCatalogCache.sessions;
  }
  if (!forceRefresh && publicCatalogBuildPromise) {
    return publicCatalogBuildPromise;
  }

  if (forceRefresh) {
    publicCatalogCache = null;
    publicCatalogBuildPromise = null;
  }

  const buildPromise = (async () => {
    const rows = await publicCatalogSessionsFast(db);

    publicCatalogCache = {
      expiresAt: Date.now() + PUBLIC_CATALOG_CACHE_MS,
      sessions: rows,
    };

    return rows;
  })();

  publicCatalogBuildPromise = buildPromise;
  try {
    return await buildPromise;
  } finally {
    if (publicCatalogBuildPromise === buildPromise) publicCatalogBuildPromise = null;
  }
}

async function publicCatalogSessionsFast(db) {
  const result = await db.query(
    `
      with primary_offer as (
        select distinct on ("eventId")
          "eventId",
          "sourceCode",
          title,
          "priceRub",
          "widgetUrl",
          "deeplinkUrl"
        from "EventOffer"
        where active = true
        order by "eventId", ("priceRub" >= $1) desc nulls last, "priceRub" asc nulls last
      ),
      event_base as (
        select
          e.id,
          e.slug,
          source_link."externalId",
          source.code as "sourceCode",
          source.name as "sourceName",
          coalesce(source.name, source.code::text, primary_offer."sourceCode"::text, '') as "sourceLabel",
          e.title,
          e.description,
          e.kind,
          e."sourceStatus",
          e."imageUrl",
          e."priceFromRub",
          e."ticketsVacant",
          cat.title as category,
          city.id as "cityId",
          city.title as city,
          city.slug as "citySlug",
          city."heroImageUrl" as "cityHeroImageUrl",
          city."isDestination" as "cityIsDestination",
          region.id as "regionId",
          region.slug as "regionSlug",
          region.title as "regionTitle",
          venue.id as "venueId",
          venue.slug as "venueSlug",
          venue.title as venue,
          venue."heroImageUrl" as "venueHeroImageUrl",
          venue.kind as "venueKind",
          override.title as "overrideTitle",
          override.description as "overrideDescription",
          override."shortDescription" as "overrideShortDescription",
          override."imageUrl" as "overrideImageUrl",
          primary_offer."sourceCode" as "offerSourceCode",
          primary_offer.title as "offerTitle",
          primary_offer."priceRub" as "offerPriceRub",
          primary_offer."widgetUrl" as "offerWidgetUrl",
          primary_offer."deeplinkUrl" as "offerDeeplinkUrl",
          min(session."startsAt") filter (where session."startsAt" >= now()) as "startsAt",
          min(session."priceFromRub") filter (where session."startsAt" >= now() and session."priceFromRub" >= $1) as "sessionPriceFromRub",
          count(distinct session.id) filter (where session."startsAt" >= now())::int as "slotCount",
          ${orderedEventTagsSql('e.id')} as tags,
          (
            select coalesce(array_agg(distinct title), '{}')
            from (
              select sc.title
              from "EventSubcategory" es
              join "Subcategory" sc on sc.id = es."subcategoryId"
              where es."eventId" = e.id
              union
              select sc.title
              from "Subcategory" sc
              where sc.id = e."primarySubcategoryId"
            ) subcats
          ) as subcategories
        from "Event" e
        left join "Category" cat on cat.id = e."categoryId"
        left join "City" city on city.id = e."primaryCityId"
        left join "Region" region on region.id = city."regionId"
        left join "Venue" venue on venue.id = e."venueId"
        left join "EventSourceLink" source_link on source_link."eventId" = e.id
        left join "Source" source on source.id = source_link."sourceId"
        left join "EventOverride" override on override."eventId" = e.id
        left join "EventSession" session on session."eventId" = e.id
        left join primary_offer on primary_offer."eventId" = e.id
        group by
          e.id,
          source_link."externalId",
          source.code,
          source.name,
          override.id,
          cat.title,
          city.id,
          city.title,
          city.slug,
          city."heroImageUrl",
          city."isDestination",
          region.id,
          region.slug,
          region.title,
          venue.id,
          venue.slug,
          venue.title,
          venue."heroImageUrl",
          venue.kind,
          primary_offer."sourceCode",
          primary_offer.title,
          primary_offer."priceRub",
          primary_offer."widgetUrl",
          primary_offer."deeplinkUrl"
      ),
      normalized as (
        select
          *,
          (
            select min(price)
            from (values ("priceFromRub"), ("sessionPriceFromRub"), ("offerPriceRub")) as prices(price)
            where price is not null and price >= $1
          ) as "priceFrom",
          (
            "offerWidgetUrl" is not null
            or "offerDeeplinkUrl" is not null
            or (
              coalesce("sourceCode"::text, "offerSourceCode"::text, '') in ('TICKETSCLOUD', 'TEPLOHOD')
              and "externalId" is not null
            )
          ) as "purchaseReady"
        from event_base
      ),
      saleable as (
        select
          *,
          concat_ws(
            '|',
            lower(regexp_replace(trim(coalesce("sourceLabel", '')), '\\s+', ' ', 'g')),
            lower(regexp_replace(trim(coalesce(title, '')), '\\s+', ' ', 'g')),
            lower(regexp_replace(trim(coalesce(city, '')), '\\s+', ' ', 'g')),
            lower(regexp_replace(trim(coalesce("venueId", venue, '')), '\\s+', ' ', 'g'))
          ) as "groupKey"
        from normalized
        where "priceFrom" >= $1
          and "purchaseReady" = true
          and (
            "startsAt" is not null
            or kind = 'OPEN_DATE'
            or "sourceStatus" = 'open_date'
            or "sourceCode" = 'TEPLOHOD'
          )
      ),
      ranked as (
        select
          *,
          row_number() over (
            partition by "groupKey"
            order by case when kind = 'OPEN_DATE' or "sourceStatus" = 'open_date' then 1 else 0 end desc,
              "startsAt" asc nulls last,
              title asc
          ) as rank
        from saleable
      ),
      grouped as (
        select
          "groupKey",
          array_agg(id order by "startsAt" asc nulls last)::text[] as "groupEventIds",
          count(*)::int as "groupedEventsCount",
          sum(coalesce("slotCount", 0))::int as "sessionCount",
          min("priceFrom")::int as "priceFrom",
          nullif(sum(coalesce("ticketsVacant", 0)), 0)::int as vacant,
          jsonb_agg(
            jsonb_build_object(
              'eventId', id,
              'startsAt', "startsAt",
              'externalId', "externalId",
              'sourceCode', "sourceCode",
              'offerSourceCode', "offerSourceCode",
              'offerWidgetUrl', "offerWidgetUrl",
              'offerDeeplinkUrl', "offerDeeplinkUrl"
            )
            order by "startsAt" asc nulls last
          ) as "upcomingSlots"
        from ranked
        group by "groupKey"
      )
      select
        rep.id,
        rep.slug,
        rep."externalId",
        rep."sourceCode",
        rep."sourceName",
        rep."sourceLabel",
        rep.title,
        rep.description,
        rep."overrideDescription",
        rep."overrideShortDescription",
        rep.kind,
        rep."imageUrl",
        rep.category,
        rep."cityId",
        rep.city,
        rep."citySlug",
        rep."cityHeroImageUrl",
        rep."cityIsDestination",
        rep."regionId",
        rep."regionSlug",
        rep."regionTitle",
        rep."venueId",
        rep."venueSlug",
        rep.venue,
        rep."venueHeroImageUrl",
        rep."venueKind",
        rep."overrideTitle",
        rep."overrideImageUrl",
        rep."offerSourceCode",
        rep."offerTitle",
        rep."offerPriceRub",
        rep."offerWidgetUrl",
        rep."offerDeeplinkUrl",
        rep.kind,
        rep."sourceStatus",
        rep."startsAt",
        rep.tags,
        rep.subcategories,
        grouped."groupKey",
        grouped."groupEventIds",
        grouped."groupedEventsCount",
        grouped."sessionCount",
        grouped."priceFrom",
        rep."ticketsVacant" as vacant,
        grouped."upcomingSlots"
      from grouped
      join ranked rep on rep."groupKey" = grouped."groupKey" and rep.rank = 1
      order by rep."startsAt" asc nulls last, rep.title asc
    `,
    [MIN_DISPLAY_PRICE_RUB],
  );

  return result.rows.map(mapGroupedPublicSession);
}

function publicListDescription(row) {
  return (
    cleanImportedDescription(row.overrideDescription || row.description) ||
    cleanImportedDescription(row.overrideShortDescription)
  );
}

function isOpenDateCatalogRow(row) {
  const kind = String(row?.kind || '').toUpperCase();
  const sourceStatus = String(row?.sourceStatus || '').toLowerCase();
  return kind === 'OPEN_DATE' || sourceStatus === 'open_date';
}

function publicSessionScheduleLabels(row) {
  if (!isOpenDateCatalogRow(row)) {
    return {
      startsAt: normalizeStartsAt(row.startsAt) || '',
      dateLabel: formatDate(row.startsAt),
      timeLabel: formatTime(row.startsAt),
      timeBucket: timeBucket(row.startsAt),
    };
  }

  return {
    startsAt: '',
    dateLabel: 'Открытая дата',
    timeLabel: 'В виджете',
    timeBucket: 'day',
  };
}

function buildLandingRuleEvent(row, tags, destination, category) {
  return {
    title: row.overrideTitle || row.title,
    category: category || 'unknown',
    sourceCategory: category || 'unknown',
    venue: row.venue || 'Не указано',
    city: row.city || 'Не указан',
    destination: destination?.name || row.city || 'Не указан',
    tags,
    subcategories: pickCatalogSubcategories({
      subcategories: uniqueValues((row.subcategories || []).filter(Boolean)),
      tags,
      category: category || 'unknown',
    }),
  };
}

function resolvePublicSessionImageUrl(row) {
  if (row.overrideImageUrl) return row.overrideImageUrl;
  if (row.imageUrl) return row.imageUrl;
  if (row.venueHeroImageUrl) return row.venueHeroImageUrl;
  if (row.cityHeroImageUrl) return row.cityHeroImageUrl;

  const slug = row.citySlug || row.sourceCitySlug;
  if (!slug) return null;

  const imageSlug = CITY_CARD_IMAGE_ALIASES[slug] || slug;
  if (!CITY_CARD_IMAGE_SLUGS.has(imageSlug)) return null;
  return `/images/cities/${imageSlug}.png`;
}

const KNOWN_SESSION_CITIES = [
  'Нижний Новгород',
  'Санкт-Петербург',
  'Ростов-на-Дону',
  'Екатеринбург',
  'Красноярск',
  'Новосибирск',
  'Калининград',
  'Москва',
  'Казань',
  'Самара',
  'Волгоград',
  'Ярославль',
  'Владимир',
  'Пермь',
  'Тверь',
  'Сочи',
  'Тула',
].sort((a, b) => b.length - a.length);

function cityNameStem(city) {
  const compact = city.toLowerCase().replace(/[^а-яё]/g, '');
  if (!compact) return '';
  if (compact.length <= 5) return compact;
  return compact.slice(0, Math.max(5, compact.length - 2));
}

function inferCityNameFromText(...parts) {
  const haystack = parts
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .replace(/\s+/g, ' ');
  if (!haystack) return null;

  for (const city of KNOWN_SESSION_CITIES) {
    const needle = city.toLowerCase();
    if (haystack.includes(needle)) return city;
    const stem = cityNameStem(city);
    if (stem.length >= 4 && haystack.includes(stem)) return city;
  }

  const match = haystack.match(/(?:^|\s)г\.?\s*([а-яё][а-яё\s-]{2,40})/i);
  if (!match) return null;

  const fragment = match[1].trim().replace(/["«»]/g, '');
  for (const city of KNOWN_SESSION_CITIES) {
    const normalized = city.toLowerCase();
    if (normalized.startsWith(fragment) || fragment.startsWith(normalized.slice(0, 6))) return city;
  }

  return null;
}

function resolvePublicSessionCity(row) {
  const raw = cleanDisplayName(row.city);
  if (raw && raw !== 'Не указан') return raw;
  return inferCityNameFromText(row.title, row.venue, row.venueAddress, ...(row.tags || [])) || raw || 'Не указан';
}

function mapGroupedPublicSession(row) {
  const tags = row.tags || [];
  const cityName = resolvePublicSessionCity(row);
  const destination = publicDestinationForCity({ ...row, city: cityName });
  const fallbackWidgetUrl = buildProviderWidgetUrl(row);
  const purchase = purchaseInfo(row);
  const purchaseUrl = purchase.url || fallbackWidgetUrl;
  const upcomingSlots = (Array.isArray(row.upcomingSlots) ? row.upcomingSlots : [])
    .filter((slot) => slot?.startsAt)
    .slice(0, 8)
    .map((slot) => {
      const slotPurchase = purchaseInfo({
        sourceCode: slot.sourceCode || row.sourceCode,
        offerSourceCode: slot.offerSourceCode || row.offerSourceCode || row.sourceCode,
        offerWidgetUrl: slot.offerWidgetUrl,
        offerDeeplinkUrl: slot.offerDeeplinkUrl,
        externalId: slot.externalId || row.externalId,
      });
      return {
        eventId: slot.eventId,
        startsAt: normalizeStartsAt(slot.startsAt),
        dateLabel: formatDate(slot.startsAt),
        timeLabel: formatTime(slot.startsAt),
        purchaseUrl: slotPurchase.url || purchaseUrl,
      };
    });

  const schedule = publicSessionScheduleLabels(row);
  const ruleEvent = buildLandingRuleEvent({ ...row, city: cityName }, tags, destination, row.category || 'unknown');
  const session = {
    id: row.id,
    slug: publicEventSlug(row.slug),
    sourceSlug: row.slug,
    groupKey: row.groupKey,
    groupEventIds: (row.groupEventIds || [row.id]).slice(0, 12),
    groupedEventsCount: row.groupedEventsCount || 1,
    sessionCount: row.sessionCount || upcomingSlots.length || 1,
    upcomingSlots,
    title: row.overrideTitle || row.title,
    cityId: row.cityId,
    citySlug: destination.slug,
    sourceCitySlug: row.citySlug,
    city: cityName,
    destination: destination.name,
    destinationType: destination.type,
    venueId: row.venueId,
    venueSlug: row.venueSlug,
    venue: row.venue || 'Не указано',
    venueKind: row.venueKind || 'OTHER',
    offerTitle: row.offerTitle,
    offerSourceCode: row.offerSourceCode,
    purchaseUrl,
    widgetUrl: row.offerWidgetUrl || fallbackWidgetUrl,
    deeplinkUrl: row.offerDeeplinkUrl || null,
    purchaseReady: purchase.ready,
    purchaseMode: purchase.mode,
    purchaseProvider: purchase.provider,
    purchaseUrlSource: purchase.urlSource,
    category: row.category || 'unknown',
    sourceCategory: row.category || 'unknown',
    kind: row.kind || null,
    sourceStatus: row.sourceStatus || null,
    subcategories: ruleEvent.subcategories,
    tags: sliceCatalogTags(tags),
    startsAt: schedule.startsAt || '',
    dateLabel: schedule.dateLabel,
    timeLabel: schedule.timeLabel,
    timeBucket: schedule.timeBucket,
    priceFrom: row.priceFrom,
    vacant: row.vacant,
    imageUrl: resolvePublicSessionImageUrl(row),
    description: publicListDescription(row),
  };

  return {
    ...session,
    landingSlugs: resolveLandingSlugsForSession(ruleEvent, { startsAt: row.startsAt, upcomingSlots }),
  };
}

function isSaleablePublicSession(session) {
  return Boolean(session.purchaseReady && Number.isFinite(session.priceFrom) && session.priceFrom >= MIN_DISPLAY_PRICE_RUB);
}

async function publicEventRows(db, forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && publicEventRowsCache && publicEventRowsCache.expiresAt > now) {
    return publicEventRowsCache.rows;
  }
  if (!forceRefresh && publicEventRowsBuildPromise) {
    return publicEventRowsBuildPromise;
  }

  if (forceRefresh) {
    publicEventRowsCache = null;
    publicEventRowsBuildPromise = null;
    publicCatalogCache = null;
    publicHomeCache = null;
  }

  const buildPromise = (async () => {
    const rows = await publicEventRowsLean(db, 10000);
    publicEventRowsCache = {
      expiresAt: Date.now() + PUBLIC_CATALOG_CACHE_MS,
      rows,
    };
    return rows;
  })();

  publicEventRowsBuildPromise = buildPromise;
  try {
    return await buildPromise;
  } finally {
    if (publicEventRowsBuildPromise === buildPromise) publicEventRowsBuildPromise = null;
  }
}

async function publicEventRowsLean(db, limit) {
  const result = await db.query(
    `
      select
        e.id,
        e.slug,
        source_link."externalId",
        source.code as "sourceCode",
        source.name as "sourceName",
        e.title,
        e.kind,
        e."sourceStatus",
        e."imageUrl",
        e."priceFromRub",
        e."ticketsVacant",
        cat.title as category,
        city.id as "cityId",
        city.title as city,
        city.slug as "citySlug",
        city."isDestination" as "cityIsDestination",
        region.id as "regionId",
        region.slug as "regionSlug",
        region.title as "regionTitle",
        venue.id as "venueId",
        venue.slug as "venueSlug",
        venue.title as venue,
        venue.kind as "venueKind",
        override.title as "overrideTitle",
        override."imageUrl" as "overrideImageUrl",
        offer."sourceCode" as "offerSourceCode",
        offer.title as "offerTitle",
        offer."priceRub" as "offerPriceRub",
        offer."widgetUrl" as "offerWidgetUrl",
        offer."deeplinkUrl" as "offerDeeplinkUrl",
        min(session."startsAt") as "startsAt",
        min(session."priceFromRub") filter (where session."priceFromRub" >= ${MIN_DISPLAY_PRICE_RUB}) as "sessionPriceFromRub",
        count(distinct session.id)::int as "slotCount",
        ${orderedEventTagsSql('e.id')} as tags
      from "Event" e
      left join "Category" cat on cat.id = e."categoryId"
      left join "City" city on city.id = e."primaryCityId"
      left join "Region" region on region.id = city."regionId"
      left join "Venue" venue on venue.id = e."venueId"
      left join "EventSourceLink" source_link on source_link."eventId" = e.id
      left join "Source" source on source.id = source_link."sourceId"
      left join "EventOverride" override on override."eventId" = e.id
      left join "EventSession" session on session."eventId" = e.id
      left join lateral (
        select
          "sourceCode",
          title,
          "priceRub",
          "widgetUrl",
          "deeplinkUrl"
        from "EventOffer"
        where "eventId" = e.id and active = true
        order by ("priceRub" >= ${MIN_DISPLAY_PRICE_RUB}) desc nulls last, "priceRub" asc nulls last
        limit 1
      ) offer on true
      group by
        e.id,
        source_link."externalId",
        source.code,
        source.name,
        override.id,
        cat.title,
        city.id,
        city.title,
        city.slug,
        city."isDestination",
        region.id,
        region.slug,
        region.title,
        venue.id,
        venue.slug,
        venue.title,
        venue.kind,
        offer."sourceCode",
        offer.title,
        offer."priceRub",
        offer."widgetUrl",
        offer."deeplinkUrl"
      having (
        min(session."startsAt") is not null
        or e.kind = 'OPEN_DATE'
        or e."sourceStatus" = 'open_date'
        or source.code = 'TEPLOHOD'
      )
      order by min(session."startsAt") asc nulls last
      limit $1
    `,
    [limit],
  );

  return result.rows
    .map((row) => {
      const tags = row.tags || [];
      const destination = publicDestinationForCity(row);
      const priceFrom = displayPriceFrom(row.priceFromRub, row.sessionPriceFromRub, row.offerPriceRub);
      const purchase = purchaseInfo(row);

      return {
        id: row.id,
        slug: publicEventSlug(row.slug),
        sourceSlug: row.slug,
        source: row.sourceName || publicSourceLabel(row.sourceCode || row.offerSourceCode) || 'Источник',
        sourceCode: row.sourceCode || row.offerSourceCode,
        externalId: row.externalId,
        title: row.title,
        sourceCategory: row.category || 'unknown',
        city: row.city || 'Не указан',
        cityId: row.cityId,
        citySlug: destination.slug,
        sourceCitySlug: row.citySlug,
        destination: destination.name,
        destinationType: destination.type,
        venue: row.venue || 'Не указано',
        venueId: row.venueId,
        venueSlug: row.venueSlug,
        venueKind: row.venueKind || 'OTHER',
        offerSourceCode: row.offerSourceCode,
        offerTitle: row.offerTitle,
        offerPriceRub: row.offerPriceRub,
        offerWidgetUrl: row.offerWidgetUrl,
        offerDeeplinkUrl: row.offerDeeplinkUrl,
        purchaseReady: purchase.ready,
        purchaseMode: purchase.mode,
        purchaseProvider: purchase.provider,
        purchaseUrlSource: purchase.urlSource,
        eventType: String(row.kind || '').toLowerCase(),
        kind: row.kind || null,
        sourceStatus: row.sourceStatus || null,
        startsAt: normalizeStartsAt(row.startsAt),
        slotCount: row.slotCount || 0,
        priceFrom,
        vacant: row.ticketsVacant,
        hasImage: Boolean(row.overrideImageUrl || row.imageUrl),
        imageUrl: row.imageUrl,
        override: {
          title: row.overrideTitle,
          imageUrl: row.overrideImageUrl,
        },
        tags,
      };
    })
    .filter((row) => (row.startsAt || isOpenDateCatalogRow(row)) && row.purchaseReady && Number.isFinite(row.priceFrom) && row.priceFrom >= MIN_DISPLAY_PRICE_RUB);
}

function matchesCatalogDate(session, dateFilter) {
  if (dateFilter === 'all') return true;
  if (isOpenDateCatalogRow(session)) return dateFilter === 'today' || dateFilter === 'tomorrow' || dateFilter === 'weekend';

  const startsAt = new Date(session.startsAt);
  if (!Number.isFinite(startsAt.getTime())) return false;

  const today = startOfLocalDay(new Date());
  const eventDay = startOfLocalDay(startsAt);
  const diffDays = Math.round((eventDay.getTime() - today.getTime()) / 86400000);

  if (dateFilter === 'today') return diffDays === 0;
  if (dateFilter === 'tomorrow') return diffDays === 1;
  if (dateFilter === 'weekend') {
    const day = startsAt.getDay();
    return day === 0 || day === 6;
  }
  if (dateFilter === 'evening') return session.timeBucket === 'evening' || session.timeBucket === 'night';

  return true;
}

function startOfLocalDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function mapPublicSession(row) {
  const fallbackWidgetUrl = buildProviderWidgetUrl(row);
  const purchase = purchaseInfo(row);
  const purchaseUrl = purchase.url || fallbackWidgetUrl;
  const tags = row.tags || [];
  const ruleEvent = buildLandingRuleEvent(
    {
      ...row,
      overrideTitle: row.override?.title,
      title: row.title,
      venue: row.venue,
      city: row.city,
      category: row.sourceCategory,
      subcategories: row.subcategories,
    },
    tags,
    { name: row.destination || row.city },
    row.sourceCategory,
  );
  const schedule = publicSessionScheduleLabels(row);
  const upcomingSlots = Array.isArray(row.upcomingSlots) && row.upcomingSlots.length
    ? row.upcomingSlots
    : row.startsAt
      ? [{
          eventId: row.id,
          startsAt: normalizeStartsAt(row.startsAt),
          dateLabel: formatDate(row.startsAt),
          timeLabel: formatTime(row.startsAt),
          purchaseUrl,
        }]
      : [];

  return {
    id: row.id,
    slug: publicEventSlug(row.slug),
    sourceSlug: row.sourceSlug || row.slug,
    groupKey: row.groupKey || publicEventGroupKey(row),
    groupEventIds: (row.groupEventIds || [row.id]).slice(0, 12),
    groupedEventsCount: row.groupedEventsCount || 1,
    sessionCount: row.sessionCount || row.slotCount || upcomingSlots.length || 1,
    upcomingSlots: upcomingSlots.slice(0, 8).map((slot) => ({
      eventId: slot.eventId,
      startsAt: normalizeStartsAt(slot.startsAt),
      dateLabel: slot.dateLabel || formatDate(slot.startsAt),
      timeLabel: slot.timeLabel || formatTime(slot.startsAt),
      purchaseUrl: slot.purchaseUrl,
    })),
    landingSlugs: resolveLandingSlugsForSession(ruleEvent, { startsAt: row.startsAt, upcomingSlots }),
    title: row.override?.title || row.title,
    cityId: row.cityId,
    citySlug: row.citySlug,
    city: row.city,
    destination: row.destination,
    destinationType: row.destinationType || 'city',
    venueId: row.venueId,
    venueSlug: row.venueSlug,
    venue: row.venue,
    venueKind: row.venueKind,
    offerTitle: row.offerTitle,
    offerSourceCode: row.offerSourceCode,
    purchaseUrl,
    widgetUrl: row.offerWidgetUrl || fallbackWidgetUrl,
    deeplinkUrl: row.offerDeeplinkUrl || null,
    purchaseReady: purchase.ready,
    purchaseMode: purchase.mode,
    purchaseProvider: purchase.provider,
    purchaseUrlSource: purchase.urlSource,
    category: row.sourceCategory,
    kind: row.kind || null,
    sourceStatus: row.sourceStatus || null,
    subcategories: ruleEvent.subcategories,
    tags: sliceCatalogTags(tags),
    startsAt: schedule.startsAt || '',
    dateLabel: schedule.dateLabel,
    timeLabel: schedule.timeLabel,
    timeBucket: schedule.timeBucket,
    priceFrom: row.priceFrom,
    vacant: row.vacant,
    imageUrl: resolvePublicSessionImageUrl(row),
  };
}

function buildTicketscloudWidgetUrl(eventExternalId) {
  const token = process.env.TICKETSCLOUD_WIDGET_TOKEN || process.env.TC_WIDGET_TOKEN;
  if (!token || !eventExternalId) return null;

  const normalizedToken = token.startsWith('r:') ? token : `r:${token}`;
  const url = new URL(process.env.TICKETSCLOUD_WIDGET_BASE_URL || 'https://ticketscloud.org/v1/widgets/common');
  url.searchParams.set('token', normalizedToken);
  url.searchParams.set('event', eventExternalId);
  return url.toString();
}

function buildTeplohodUrl(eventExternalId) {
  if (!eventExternalId) return null;
  const baseUrl = process.env.TEP_WIDGET_BASE_URL || 'https://teplohod.info';
  return `${baseUrl.replace(/\/+$/, '')}/event/${encodeURIComponent(eventExternalId)}`;
}

async function publicVenues(db, limit) {
  const rows = await venueRows(db, limit);
  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    city: row.city,
    address: row.address,
    type: row.proposedKind,
    pageStatus: row.pageStatus,
    shortDescription: row.shortDescription,
    heroImageUrl: row.heroImageUrl,
    events: row.events,
    categories: {},
  }));
}

async function publicRelatedVenues(db, venueId, city, limit) {
  if (!city) return [];
  const rows = await venueRows(db, 500);
  return rows
    .filter((row) => row.id !== venueId && row.city === city && row.events > 0)
    .slice(0, limit)
    .map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      city: row.city,
      address: row.address,
      type: row.proposedKind,
      events: row.events,
      categories: {},
    }));
}

async function publicVenuesForCity(db, city, limit) {
  if (!city) return [];
  const rows = await venueRows(db, 500);
  return rows
    .filter((row) => row.city === city && row.events > 0)
    .slice(0, limit)
    .map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      city: row.city,
      address: row.address,
      type: row.proposedKind,
      pageStatus: row.pageStatus,
      shortDescription: row.shortDescription,
      heroImageUrl: row.heroImageUrl,
      events: row.events,
      categories: {},
    }));
}

async function publicVenuesForSessions(db, sessions, limit) {
  const venueIds = new Set(sessions.map((session) => session.venueId).filter(Boolean));
  if (!venueIds.size) return [];
  const rows = await venueRows(db, 500);
  return rows
    .filter((row) => venueIds.has(row.id) && row.events > 0)
    .slice(0, limit)
    .map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      city: row.city,
      address: row.address,
      type: row.proposedKind,
      pageStatus: row.pageStatus,
      shortDescription: row.shortDescription,
      heroImageUrl: row.heroImageUrl,
      events: row.events,
      categories: {},
    }));
}

async function resolvePublicEventId(db, eventSlugOrId, catalogSessions = null) {
  const value = String(eventSlugOrId || '').trim();
  if (!value) return null;
  const direct = await db.query('select id from "Event" where id = $1 or slug = $1 limit 1', [value]);
  if (direct.rows[0]?.id) return direct.rows[0].id;

  const suffixMatch = value.match(/(?:^|-)([a-f0-9]{20,})$/i);
  if (suffixMatch) {
    const suffix = suffixMatch[1];
    const suffixResult = await db.query('select id from "Event" where id = $1 or id = $2 or slug = $1 or slug = $2 limit 1', [suffix, `evt_${suffix}`]);
    if (suffixResult.rows[0]?.id) return suffixResult.rows[0].id;
  }

  const requestedSlug = publicEventSlug(value);
  const sessions = catalogSessions || (await publicCatalogSessions(db));
  const fromCatalog = sessions.find(
    (session) =>
      session.id === value ||
      session.slug === requestedSlug ||
      session.sourceSlug === value ||
      publicEventSlug(session.sourceSlug) === requestedSlug,
  );
  if (fromCatalog?.id) return fromCatalog.id;

  return null;
}

function countBy(values) {
  return values.reduce((acc, value) => {
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function publicEventSlug(value) {
  return publicCitySlug(value);
}

function publicCitySlug(value) {
  const letters = {
    а: 'a',
    б: 'b',
    в: 'v',
    г: 'g',
    д: 'd',
    е: 'e',
    ё: 'e',
    ж: 'zh',
    з: 'z',
    и: 'i',
    й: 'y',
    к: 'k',
    л: 'l',
    м: 'm',
    н: 'n',
    о: 'o',
    п: 'p',
    р: 'r',
    с: 's',
    т: 't',
    у: 'u',
    ф: 'f',
    х: 'h',
    ц: 'c',
    ч: 'ch',
    ш: 'sh',
    щ: 'sch',
    ъ: '',
    ы: 'y',
    ь: '',
    э: 'e',
    ю: 'yu',
    я: 'ya',
  };

  return String(value || '')
    .trim()
    .toLowerCase()
    .split('')
    .map((char) => letters[char] ?? char)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function buildLandingRows(events) {
  return LANDING_RULES.map((rule) => {
    const matched = events.filter((event) => matchesRule(event, rule));
    const prices = matched.map((event) => event.priceFrom).filter((price) => Number.isFinite(price) && price > 0);
    return {
      slug: rule.slug,
      title: rule.title,
      status: matched.length >= 20 ? 'ready' : matched.length > 0 ? 'seed' : 'empty',
      events: matched.length,
      venues: new Set(matched.map((event) => event.venue).filter(Boolean)).size,
      priceFrom: prices.length ? Math.min(...prices) : null,
    };
  });
}

function buildPublicLandings(sessions) {
  return LANDING_RULES.map((rule) => {
    const matched = sessions.filter((session) => sessionMatchesLandingSlug(session, rule.slug));
    const prices = matched.map((session) => session.priceFrom).filter((price) => Number.isFinite(price) && price >= MIN_DISPLAY_PRICE_RUB);
    return {
      slug: rule.slug,
      title: rule.title,
      subtitle: rule.subtitle,
      chips: rule.chips,
      events: matched.length,
      venues: new Set(matched.map((session) => session.venue).filter(Boolean)).size,
      priceFrom: prices.length ? Math.min(...prices) : null,
      imageUrl: null,
      strength: matched.length >= 20 ? 'ready' : matched.length > 0 ? 'seed' : 'empty',
    };
  });
}

function resolveLandingRule(landingSlug) {
  const key = String(landingSlug || '').trim().toLowerCase();
  const direct = LANDING_RULES.find((item) => item.slug === key);
  if (direct) return direct;
  return (
    LANDING_RULES.find((item) => (LANDING_SLUG_ALIASES[item.slug] || []).includes(key)) || null
  );
}

function sessionMatchesLandingSlug(session, canonicalSlug) {
  const slugs = new Set([canonicalSlug, ...(LANDING_SLUG_ALIASES[canonicalSlug] || [])]);
  return (session.landingSlugs || []).some((value) => slugs.has(String(value || '').toLowerCase()));
}

function sortPromoLandings(landings, cityFilter = '') {
  const cityKey = String(cityFilter || '').trim().toLowerCase();
  const boosts = PROMO_CITY_LANDING_BOOSTS[cityKey] || [];

  return [...landings].sort((a, b) => {
    const aBoost = boosts.indexOf(a.slug);
    const bBoost = boosts.indexOf(b.slug);
    if (aBoost !== -1 || bBoost !== -1) {
      if (aBoost === -1) return 1;
      if (bBoost === -1) return -1;
      if (aBoost !== bBoost) return aBoost - bBoost;
    }

    const aOrder = PROMO_LANDING_ORDER.indexOf(a.slug);
    const bOrder = PROMO_LANDING_ORDER.indexOf(b.slug);
    const aRank = aOrder === -1 ? 1000 : aOrder;
    const bRank = bOrder === -1 ? 1000 : bOrder;
    if (aRank !== bRank) return aRank - bRank;
    return b.events - a.events;
  });
}

function collectSessionSlots(session) {
  if (Array.isArray(session.upcomingSlots) && session.upcomingSlots.length) {
    return session.upcomingSlots.filter((slot) => slot?.startsAt);
  }
  if (session.startsAt) {
    return [{
      eventId: session.id,
      startsAt: session.startsAt,
      dateLabel: session.dateLabel,
      timeLabel: session.timeLabel,
      purchaseUrl: session.purchaseUrl,
    }];
  }
  return [];
}

function moscowHourFromStartsAt(value) {
  const date = parseSessionStartsAt(value);
  if (!Number.isFinite(date.getTime())) return Number.NaN;
  const hourPart = new Intl.DateTimeFormat('en-GB', {
    timeZone: SITE_TIME_ZONE,
    hour: 'numeric',
    hour12: false,
  }).formatToParts(date).find((part) => part.type === 'hour');
  return Number(hourPart?.value);
}

function slotMatchesMinHour(startsAt, minHour, includeStartsAtHourUntil = 0) {
  const hour = moscowHourFromStartsAt(startsAt);
  if (!Number.isFinite(hour)) return false;
  if (hour >= minHour) return true;
  return includeStartsAtHourUntil > 0 && hour < includeStartsAtHourUntil;
}

function sessionMatchesLandingSchedule(session, rule) {
  if (rule.minStartsAtHour == null) return true;
  const until = rule.includeStartsAtHourUntil ?? 0;
  return collectSessionSlots(session).some((slot) => slotMatchesMinHour(slot.startsAt, rule.minStartsAtHour, until));
}

function applyLandingScheduleToSession(session, rule) {
  if (rule.minStartsAtHour == null) return session;
  const until = rule.includeStartsAtHourUntil ?? 0;
  const slots = collectSessionSlots(session)
    .filter((slot) => slotMatchesMinHour(slot.startsAt, rule.minStartsAtHour, until))
    .map((slot) => ({
      eventId: slot.eventId || session.id,
      startsAt: normalizeStartsAt(slot.startsAt),
      dateLabel: slot.dateLabel || formatDate(slot.startsAt),
      timeLabel: slot.timeLabel || formatTime(slot.startsAt),
      purchaseUrl: slot.purchaseUrl || session.purchaseUrl,
    }));
  if (!slots.length) return null;

  const primary = slots[0];
  return {
    ...session,
    upcomingSlots: slots.slice(0, 8),
    startsAt: primary.startsAt,
    dateLabel: primary.dateLabel,
    timeLabel: primary.timeLabel,
    timeBucket: timeBucket(primary.startsAt),
    sessionCount: slots.length,
  };
}

function filterSessionsForLandingRule(sessions, rule) {
  return sessions
    .filter((session) => sessionMatchesLandingSlug(session, rule.slug) && sessionMatchesLandingSchedule(session, rule))
    .map((session) => applyLandingScheduleToSession(session, rule))
    .filter(Boolean)
    .slice(0, 240);
}

function resolveLandingSlugsForSession(ruleEvent, sessionDraft, rules = LANDING_RULES) {
  return rules
    .filter((rule) => matchesRule(ruleEvent, rule) && sessionMatchesLandingSchedule(sessionDraft, rule))
    .map((rule) => rule.slug);
}

function matchesRule(event, rule) {
  return explainRuleMatch(event, rule).matches;
}

function landingRequiredSignalsSatisfied(rule, keywordFields) {
  if (rule.requiredAnyKeywords?.length && !firstKeywordMatch(keywordFields, rule.requiredAnyKeywords)) return false;

  const titleKeywordFields = keywordFields.filter((field) => field.field === 'title');
  for (const group of rule.requiredTitleKeywordGroups || []) {
    if (!firstKeywordMatch(titleKeywordFields, group)) return false;
  }

  for (const group of rule.requiredKeywordGroups || []) {
    if (!firstKeywordMatch(keywordFields, group)) return false;
  }

  return true;
}

function explainRuleMatch(event, rule) {
  const tags = event.tags || [];
  const keywordFields = keywordFieldsForEvent(event, tags, rule.keywordScope || 'full');
  const fullKeywordFields = keywordFieldsForEvent(event, tags, 'full');
  const excludeKeywordFields = rule.excludeKeywordFields?.length
    ? fullKeywordFields.filter((field) => rule.excludeKeywordFields.includes(field.field))
    : fullKeywordFields;

  const reasons = [];
  const blockers = [];
  if (rule.city) {
    if (matchesRuleCity(event, rule.city)) reasons.push(`город: ${rule.city}`);
    else blockers.push(`другой город: ${event.city || event.destination || 'не указан'}`);
  }
  if (rule.venue) {
    if (event.venue === rule.venue) reasons.push(`площадка: ${rule.venue}`);
    else blockers.push(`другая площадка: ${event.venue || 'не указана'}`);
  }

  const excludedTag = rule.excludeTags?.find((tag) => tags.includes(tag));
  if (excludedTag) blockers.push(`исключающий тег: ${excludedTag}`);
  const excludedKeyword = firstKeywordMatch(excludeKeywordFields, rule.excludeKeywords || []);
  if (excludedKeyword) blockers.push(`исключающее слово(${excludedKeyword.field}): ${excludedKeyword.keyword}`);

  if (!blockers.length) {
    const fastMatchReasons = collectFastLandingMatchReasons(event, rule, tags);
    if (fastMatchReasons.length && landingRequiredSignalsSatisfied(rule, keywordFields)) {
      return { matches: true, reasons: uniqueValues([...reasons, ...fastMatchReasons]).slice(0, 10), blockers: [] };
    }
  }

  const requiredAnyTag = rule.requiredAnyTags?.find((tag) => tags.includes(tag));
  if (rule.requiredAnyTags?.length) {
    if (requiredAnyTag) reasons.push(`обязательный тег: ${requiredAnyTag}`);
    else blockers.push(`нет обязательного тега: ${rule.requiredAnyTags.join(' / ')}`);
  }

  const requiredAnyKeyword = firstKeywordMatch(keywordFields, rule.requiredAnyKeywords || []);
  if (rule.requiredAnyKeywords?.length) {
    if (requiredAnyKeyword) reasons.push(`обязательное слово(${requiredAnyKeyword.field}): ${requiredAnyKeyword.keyword}`);
    else blockers.push(`нет обязательного слова: ${rule.requiredAnyKeywords.join(' / ')}`);
  }

  for (const keyword of rule.requiredKeywords || []) {
    const found = firstKeywordMatch(keywordFields, [keyword]);
    if (found) reasons.push(`обязательное слово(${found.field}): ${keyword}`);
    else blockers.push(`нет обязательного слова: ${keyword}`);
  }

  const titleKeywordFields = keywordFields.filter((field) => field.field === 'title');
  for (const group of rule.requiredTitleKeywordGroups || []) {
    const found = firstKeywordMatch(titleKeywordFields, group);
    if (found) reasons.push(`группа(title): ${found.keyword}`);
    else blockers.push(`нет слова в названии: ${group.join(' / ')}`);
  }

  for (const group of rule.requiredKeywordGroups || []) {
    const found = firstKeywordMatch(keywordFields, group);
    if (found) reasons.push(`группа(${found.field}): ${found.keyword}`);
    else blockers.push(`нет слова из группы: ${group.join(' / ')}`);
  }

  if (blockers.length) {
    return { matches: false, reasons: uniqueValues(reasons).slice(0, 10), blockers: uniqueValues(blockers).slice(0, 10) };
  }

  const tagSignals = (rule.tags || []).filter((tag) => tags.includes(tag));
  const keywordSignals = matchingKeywordMatches(keywordFields, rule.keywords || []);
  for (const tag of tagSignals.slice(0, 4)) reasons.push(`тег: ${tag}`);
  for (const match of keywordSignals.slice(0, 4)) reasons.push(`слово(${match.field}): ${match.keyword}`);

  const hasTagSignal = tagSignals.length > 0;
  const hasKeywordSignal = keywordSignals.length > 0;
  const hasRequiredSignal = Boolean(rule.requiredAnyTags || rule.requiredAnyKeywords || rule.requiredKeywords || rule.requiredTitleKeywordGroups || rule.requiredKeywordGroups);
  const matches = Boolean(hasTagSignal || hasKeywordSignal || hasRequiredSignal || rule.city || rule.venue);
  return { matches, reasons: uniqueValues(reasons).slice(0, 10), blockers: [] };
}

function collectFastLandingMatchReasons(event, rule, tags) {
  const reasons = [];

  if (rule.requiredAnySubcategories?.length) {
    const subcategories = uniqueValues([
      ...(event.subcategories || []),
      ...pickCatalogSubcategories({
        subcategories: event.subcategories || [],
        tags,
        category: event.category || event.sourceCategory || '',
      }),
    ]);
    const hit = rule.requiredAnySubcategories.find((label) => subcategories.includes(label));
    if (hit) reasons.push(`подкатегория: ${hit}`);
  }

  if (!reasons.length && rule.requiredAnyVenueKeywords?.length && event.venue) {
    const venue = String(event.venue).toLowerCase();
    const hit = rule.requiredAnyVenueKeywords.find((keyword) => venue.includes(String(keyword).toLowerCase()));
    if (hit) reasons.push(`площадка: ${hit}`);
  }

  if (!reasons.length && rule.tags?.length) {
    const hit = rule.tags.find((tag) => tags.includes(tag));
    if (hit) reasons.push(`тег: ${hit}`);
  }

  return reasons;
}

function matchesRuleCity(event, expectedCity) {
  const candidates = [event.city, event.destination].filter(Boolean).map((value) => String(value).toLowerCase());
  return candidates.includes(String(expectedCity).toLowerCase());
}

function keywordFieldsForEvent(event, tags, scope = 'full') {
  const fields = [
    { field: 'title', value: event.title },
    { field: 'category', value: event.category },
    { field: 'sourceCategory', value: event.sourceCategory },
    { field: 'tag', value: tags.join(' ') },
  ];
  if (scope !== 'content') {
    fields.push(
      { field: 'venue', value: event.venue },
      { field: 'city', value: event.city },
      { field: 'destination', value: event.destination },
      { field: 'subcategory', value: (event.subcategories || []).join(' ') },
    );
  }
  return fields
    .filter((item) => item.value)
    .map((item) => ({ ...item, text: String(item.value).toLowerCase() }));
}

function firstKeywordMatch(fields, keywords) {
  for (const keyword of keywords) {
    const normalized = String(keyword).toLowerCase();
    const field = fields.find((item) => item.text.includes(normalized));
    if (field) return { keyword, field: field.field };
  }
  return null;
}

function matchingKeywordMatches(fields, keywords) {
  const matches = [];
  const seen = new Set();
  for (const keyword of keywords) {
    const normalized = String(keyword).toLowerCase();
    const field = fields.find((item) => item.text.includes(normalized));
    if (!field) continue;
    const key = `${field.field}:${keyword}`;
    if (seen.has(key)) continue;
    seen.add(key);
    matches.push({ keyword, field: field.field });
  }
  return matches;
}

const READINESS_ISSUE_META = {
  NO_FUTURE_SESSIONS: { label: 'нет будущих сеансов', severity: 'high' },
  MISSING_PURCHASE_ENTRY: { label: 'нет виджета/ссылки покупки', severity: 'high' },
  MISSING_PRICE: { label: 'нет цены', severity: 'high' },
  PRICE_TOO_LOW: { label: `цена ниже ${MIN_DISPLAY_PRICE_RUB} ₽`, severity: 'high' },
  MISSING_CATEGORY: { label: 'не выбрана категория', severity: 'high' },
  MISSING_SUBCATEGORY: { label: 'не выбрана подкатегория', severity: 'medium' },
  MISSING_VENUE: { label: 'нет площадки', severity: 'high' },
  WEAK_DESCRIPTION: { label: 'слабое описание', severity: 'medium' },
  MISSING_IMAGE: { label: 'нет изображения', severity: 'medium' },
};

function buildReadinessIssues(event) {
  const issues = [];
  const add = (code, details = null) => {
    const meta = READINESS_ISSUE_META[code];
    if (!meta || issues.some((issue) => issue.code === code)) return;
    issues.push({ code, label: details || meta.label, severity: meta.severity });
  };

  const rawPriceValues = [event.priceFromRub, event.offerPriceRub].filter((value) => Number.isFinite(value) && value > 0);
  const hasOnlyLowPrice = event.priceFrom == null && rawPriceValues.some((value) => value < MIN_DISPLAY_PRICE_RUB);
  const description = plainReadinessText(event.overrideDescription || event.description || event.overrideShortDescription || '');
  const venue = plainReadinessText(event.venue || '');
  const hasVenue = Boolean(event.venueId || (venue && !['не указано', 'не указан', 'unknown'].includes(venue.toLowerCase())));

  if (!hasFutureSession(event)) add('NO_FUTURE_SESSIONS');
  if (!event.purchaseReady) add('MISSING_PURCHASE_ENTRY');
  if (event.priceFrom == null) add(hasOnlyLowPrice ? 'PRICE_TOO_LOW' : 'MISSING_PRICE');
  else if (event.priceFrom < MIN_DISPLAY_PRICE_RUB) add('PRICE_TOO_LOW');
  if (!event.categoryId && !event.category) add('MISSING_CATEGORY');
  if (!event.primarySubcategoryId && !(event.subcategoryIds || []).length) add('MISSING_SUBCATEGORY');
  if (!hasVenue) add('MISSING_VENUE');
  if (description.length < 120) add('WEAK_DESCRIPTION');
  if (!event.hasImage && !event.imageUrl && !event.overrideImageUrl) add('MISSING_IMAGE');

  return issues;
}

function readinessSeverity(issues) {
  if (issues.some((issue) => issue.severity === 'high')) return 'high';
  if (issues.some((issue) => issue.severity === 'medium')) return 'medium';
  return 'low';
}

function hasFutureSession(event) {
  const kind = String(event.kind || event.eventType || '').toUpperCase();
  if (kind === 'OPEN_DATE') return true;
  if (!event.startsAt) return false;
  const startsAt = new Date(event.startsAt).getTime();
  return Number.isFinite(startsAt) && startsAt >= Date.now() - 15 * 60 * 1000;
}

function plainReadinessText(value) {
  return String(value || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&[a-z0-9#]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const SITE_TIME_ZONE = 'Europe/Moscow';

const UTILITY_CATALOG_TAG_RE =
  /^(wc|туалет|кондиционер|аудиосистема|аудиогид|wi-?fi|бар|кафе|кафе-бар|парковка|гардероб|кондиционирование)$/i;
const DURATION_CATALOG_TAG_RE = /^\d+\s*(минут|мин\.?|час|часа|часов)\s*$/i;
const VESSEL_CATALOG_TAG_RE = /^(теплоход|катер|яхт|судно|лодк)\s*:/i;
const VENUE_PLACE_CATALOG_TAG_RE = /^площадка\s*:/i;
const VENUE_POLICY_CATALOG_TAG_RE = /^(можно|нельзя|разрешено|запрещено)(?:\s|$)/i;

function isUtilityCatalogTag(tag) {
  const value = String(tag || '').trim();
  if (!value) return true;
  const lower = value.toLowerCase();
  if (UTILITY_CATALOG_TAG_RE.test(lower)) return true;
  if (DURATION_CATALOG_TAG_RE.test(lower)) return true;
  if (VESSEL_CATALOG_TAG_RE.test(lower)) return true;
  if (VENUE_PLACE_CATALOG_TAG_RE.test(lower)) return true;
  if (/^причал\b/i.test(lower)) return true;
  if (value.length > 42) return true;
  return false;
}

function isVenuePolicyCatalogTag(tag) {
  const lower = String(tag || '').trim().toLowerCase();
  if (!lower) return true;
  if (VENUE_POLICY_CATALOG_TAG_RE.test(lower)) return true;
  if (/отдельн/i.test(lower) && /столик/i.test(lower)) return true;
  if (/коляск/i.test(lower)) return true;
  if (/велосипед/i.test(lower)) return true;
  if (/животн/i.test(lower)) return true;
  if (/сво[ейё]м?\s+алкогол/i.test(lower)) return true;
  if (/сво[ейё]й?\s+ед/i.test(lower)) return true;
  return false;
}

function isAmenityCatalogTag(tag) {
  const lower = String(tag || '').trim().toLowerCase();
  if (!lower) return false;
  if (/^(ресторан[-\s]?бар|отопление|экскурсовод|аудиогид)$/i.test(lower)) return true;
  if (/тё?плые?\s+плед/i.test(lower)) return true;
  if (/^панорамн/i.test(lower)) return true;
  if (/детск(ие|ая)\s+стуль/i.test(lower)) return true;
  if (/^с\s+(обедом|ужином|питанием)/i.test(lower)) return true;
  if (/^ледовый\s+класс/i.test(lower)) return true;
  return false;
}

function isCatalogSubcategoryLabel(label, category) {
  const value = String(label || '').trim();
  if (!value || isUtilityCatalogTag(value) || isVenuePolicyCatalogTag(value) || isAmenityCatalogTag(value)) return false;
  if (category && value.toLowerCase() === String(category).toLowerCase()) return false;
  return true;
}

function pickCatalogSubcategories(session, limit = 4) {
  const category = session.category || session.sourceCategory || '';
  const labels = [];
  const seen = new Set();

  for (const label of session.subcategories || []) {
    const value = String(label || '').trim();
    if (!isCatalogSubcategoryLabel(value, category) || seen.has(value)) continue;
    seen.add(value);
    labels.push(value);
    if (labels.length >= limit) return labels;
  }

  for (const tag of session.tags || []) {
    const value = String(tag || '').trim();
    if (!isCatalogSubcategoryLabel(value, category) || seen.has(value)) continue;
    seen.add(value);
    labels.push(value);
    if (labels.length >= limit) break;
  }

  return labels;
}

function parseSessionStartsAt(value) {
  if (value instanceof Date) return value;
  const raw = String(value || '').trim();
  if (!raw) return new Date(NaN);
  if (/[zZ]$/.test(raw) || /[+-]\d{2}(:\d{2}|\d{2})$/.test(raw)) {
    return new Date(raw.replace(/([+-]\d{2})(\d{2})$/, '$1:$2'));
  }
  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(raw)) {
    return new Date(`${raw.replace(' ', 'T')}Z`);
  }
  return new Date(raw);
}

function normalizeStartsAt(value) {
  const date = parseSessionStartsAt(value);
  if (!Number.isFinite(date.getTime())) return null;
  return date.toISOString();
}

function formatDate(value) {
  const date = parseSessionStartsAt(value);
  if (!Number.isFinite(date.getTime())) return '';
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    weekday: 'short',
    timeZone: SITE_TIME_ZONE,
  }).format(date);
}

function formatTime(value) {
  const date = parseSessionStartsAt(value);
  if (!Number.isFinite(date.getTime())) return '';
  return new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: SITE_TIME_ZONE,
  }).format(date);
}

function timeBucket(value) {
  const date = parseSessionStartsAt(value);
  if (!Number.isFinite(date.getTime())) return 'night';
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', {
      hour: 'numeric',
      hour12: false,
      timeZone: SITE_TIME_ZONE,
    })
      .formatToParts(date)
      .find((part) => part.type === 'hour')?.value ?? 0,
  );
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'day';
  if (hour >= 17 && hour < 23) return 'evening';
  return 'night';
}

function clampNumber(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
}

const DEFAULT_LANDING_AUDIT_EXPECTATIONS = {
  'bus-tours': ['653', '661', '738', '769', '783', '1130', '1210', '1300', '1433'],
  'new-year': ['1049', '1050'],
};

function loadLandingAuditExpectations(rootDir) {
  const filePath = path.join(rootDir, 'data', 'teplohod', 'landing-expectations.json');
  try {
    const parsed = JSON.parse(readFileSync(filePath, 'utf8'));
    if (parsed && typeof parsed === 'object') return parsed;
  } catch {
    // Use built-in expectations when file is missing.
  }
  return DEFAULT_LANDING_AUDIT_EXPECTATIONS;
}

export async function runLandingAudit(db, rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..')) {
  const expectations = loadLandingAuditExpectations(rootDir);
  const catalogSessions = await publicCatalogSessions(db, true);
  const catalogById = new Map(catalogSessions.map((session) => [session.id, session]));
  const checkedAt = new Date().toISOString();
  const items = [];
  const issues = [];

  for (const [landingSlug, externalIds] of Object.entries(expectations)) {
    const rule = LANDING_RULES.find((item) => item.slug === landingSlug);
    if (!rule) {
      issues.push({ landingSlug, code: 'UNKNOWN_LANDING', message: `Лендинг ${landingSlug} не найден` });
      continue;
    }

    for (const externalId of externalIds) {
      const eventId = `evt_tep_${externalId}`;
      const auditRow = await fetchLandingAuditEventRow(db, eventId);
      const catalogSession = catalogById.get(eventId);
      const matchEvent = auditRow
        ? {
            title: auditRow.title,
            category: auditRow.category,
            sourceCategory: auditRow.category,
            venue: auditRow.venue,
            city: auditRow.city,
            tags: auditRow.tags || [],
            subcategories: pickCatalogSubcategories({
              subcategories: auditRow.subcategories || [],
              tags: auditRow.tags || [],
              category: auditRow.category || '',
            }),
          }
        : null;
      const ruleMatch = matchEvent ? explainRuleMatch(matchEvent, rule) : { matches: false, reasons: [], blockers: ['событие не найдено в БД'] };
      const inCatalog = Boolean(catalogSession);
      const onLanding = catalogSession?.landingSlugs?.includes(landingSlug) || false;
      const futureSessions = Number(auditRow?.futureSessionCount || 0);
      const blockers = [];

      if (!auditRow) blockers.push('нет в БД');
      if (auditRow && futureSessions === 0) blockers.push('нет будущих сеансов');
      if (auditRow && !inCatalog) blockers.push('нет в публичном каталоге');
      if (auditRow && inCatalog && !onLanding) blockers.push(`не на лендинге ${landingSlug}`);
      if (auditRow && !ruleMatch.matches) blockers.push(...(ruleMatch.blockers || []));

      const ok = blockers.length === 0;
      const item = {
        landingSlug,
        externalId: String(externalId),
        eventId,
        title: auditRow?.title || null,
        ok,
        inCatalog,
        onLanding,
        futureSessions,
        landingSlugs: catalogSession?.landingSlugs || [],
        matchReasons: ruleMatch.reasons || [],
        blockers: uniqueValues(blockers).slice(0, 10),
      };
      items.push(item);
      if (!ok) issues.push({ ...item, code: 'LANDING_AUDIT_FAIL' });
    }
  }

  return {
    checkedAt,
    summary: {
      total: items.length,
      ok: items.filter((item) => item.ok).length,
      failed: items.filter((item) => !item.ok).length,
    },
    items,
    issues,
  };
}

async function fetchLandingAuditEventRow(db, eventId) {
  const result = await db.query(
    `
      select
        e.id,
        e.title,
        e.status,
        cat.title as category,
        city.title as city,
        venue.title as venue,
        count(session.id) filter (where session."startsAt" >= now())::int as "futureSessionCount",
        min(session."startsAt") filter (where session."startsAt" >= now()) as "nextStartsAt",
        ${orderedEventTagsSql('e.id')} as tags,
        (
          select coalesce(array_agg(distinct title), '{}')
          from (
            select sc.title
            from "EventSubcategory" es
            join "Subcategory" sc on sc.id = es."subcategoryId"
            where es."eventId" = e.id
            union
            select sc.title
            from "Subcategory" sc
            where sc.id = e."primarySubcategoryId"
          ) subcats
        ) as subcategories
      from "Event" e
      left join "Category" cat on cat.id = e."categoryId"
      left join "City" city on city.id = e."primaryCityId"
      left join "Venue" venue on venue.id = e."venueId"
      left join "EventSession" session on session."eventId" = e.id
      where e.id = $1
      group by e.id, cat.title, city.title, venue.title
    `,
    [eventId],
  );
  return result.rows[0] || null;
}
