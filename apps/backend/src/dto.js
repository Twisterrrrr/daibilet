import { createHash, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  normalizePublicVenueRecord,
  formatBusLocationDisplayName,
  formatPierLocationDisplayName,
  findVenueOverride,
} from './venue-normalize.js';
import {
  resolveCityTimeZone,
  resolveSessionTimeZone,
  diffLocalDays,
  isLocalWeekend,
  localHourFromInstant,
  DEFAULT_CITY_TIME_ZONE,
} from './city-timezone.js';
import {
  resolveContextInstitutionForEvent,
  resolveContextInstitutionFromTitle,
  shouldResolveInstitutionFromTitle,
} from './event-venue-context.js';
import { formatPublicEventTitle } from './event-title-normalize.ts';

const MIN_DISPLAY_PRICE_RUB = 100;
const ACTIVE_SESSION_SQL = `(
  (
    session."startsAt" is not null
    and session."startsAt" >= now() - interval '15 minutes'
  )
  or (
    session."startsAt" is not null
    and session."endsAt" is not null
    and session."startsAt" < now()
    and session."endsAt" >= now()
    and session."endsAt" - session."startsAt" < interval '36 hours'
  )
)`;
const PUBLIC_DESTINATION_MIN_EVENTS = 1;
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
  'rostov-na-donu': 'rostov-on-don',
  rostov: 'rostov-on-don',
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
  'chelyabinsk',
  'rostov-on-don',
  'saratov',
  'tula',
  'tver',
  'tyumen',
  'ufa',
  'ulan-ude',
  'ryazan',
  'stavropol',
  'tomsk',
  'ulyanovsk',
  'izhevsk',
  'orel',
  'orenburg',
  'penza',
  'volgograd',
  'sortavala',
]);
const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const CITY_ROUTING = loadCityRouting();
const STANDALONE_CITY_NAMES = new Set(CITY_ROUTING.standaloneCities || []);
const CITY_TO_REGION = new Map(Object.entries(CITY_ROUTING.cityToRegion || {}));

function isPublicRegionName(name) {
  const clean = cleanDisplayName(name);
  if (!clean || clean === 'Не указан') return false;
  if (STANDALONE_CITY_NAMES.has(clean)) return false;
  return /(?:область|край|республика|округ)$/iu.test(clean);
}

const PUBLIC_REGION_NAMES = new Set([
  ...(CITY_ROUTING.publicRegions || []),
  ...Object.values(CITY_ROUTING.cityToRegion || {}).filter((name) => isPublicRegionName(name)),
]);
let publicHomeCache = null;
let publicDestinationsCache = null;
let publicHomePreviewCache = null;
const PUBLIC_HOME_PREVIEW_LIMIT = 96;
let publicEventRowsCache = null;
let publicCatalogCache = null;
let publicStatsCache = null;
let publicEventRowsBuildPromise = null;
let publicCatalogBuildPromise = null;
let publicVenueHubCache = null;
let publicVenueCatalogLists = null;

const LANDING_SLUG_ALIASES = {
  'river-cruises': ['river-walks', 'river-cruise', 'river'],
  'river-party': ['party-boat', 'river-disco', 'boat-party'],
  'bridges-night': ['razvodnye-mosty', 'bridges', 'spb-bridges-night', 'bridges_night', 'night-bridges'],
  'bus-tours': ['bus-sightseeing', 'bus'],
  'spb-yards': ['spb-paradnye', 'yards-spb', 'dory-paradnye'],
  'family-kids': ['kids-family', 'detyam'],
  'concerts-genre': ['concerts', 'concerts-genres'],
  'moscow-museums': ['moscow-museums-workshops'],
  'active-sport': ['active-extreme', 'autosport'],
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
    excludeKeywords: ['автобус', 'пешеход', 'парадн', 'двор', 'коммунал', 'мастер-класс', 'квест', 'концерт', 'вечеринк', 'дискотек', 'церк', 'храм', 'кирх', 'орган', 'музыкальн', 'аренда', 'чартер'],
  },
  {
    slug: 'river-party',
    title: 'Вечеринки и дискотеки на теплоходе',
    subtitle: 'DJ, живая музыка и ночные речные круизы',
    chips: ['дискотека', 'DJ', 'вечеринка', 'ночь'],
    tags: ['Дискотека', 'Живая музыка', 'Вечеринка'],
    keywords: ['дискотек', 'вечеринк', 'ди-джей', 'dj', 'музыкальн', 'круиз', 'теплоход', 'речн', 'катере', 'нева'],
    keywordScope: 'content',
    requiredTitleKeywordGroups: [
      ['дискотек', 'вечеринк', 'ди-джей', 'dj', 'концерт', 'музыкальн'],
    ],
    requiredKeywordGroups: [
      ['теплоход', 'теплоходн', 'речн', 'катере', 'катера', 'корабл', 'яхт', 'причал', 'канал', 'нева', 'круиз'],
    ],
    excludeKeywords: ['автобус', 'автобусн', 'пешеход'],
    excludeKeywordFields: ['title', 'category', 'sourceCategory', 'venue', 'subcategory'],
  },
  {
    slug: 'bridges-night',
    title: 'Разводные мосты',
    subtitle: 'Ночные прогулки к разводке мостов по Неве и каналам',
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
  {
    slug: 'spb-yards',
    title: 'Дворы, парадные и коммуналки',
    subtitle: 'Авторские прогулки по скрытому Петербургу',
    city: 'Санкт-Петербург',
    chips: ['парадные', 'коммуналки', 'дворы'],
    tags: ['Дворы и парадные', 'Экскурсия по парадным', 'Экскурсия по коммуналкам', 'Экскурсия по дворам', 'Интерьерная'],
    requiredAnySubcategories: ['Дворы и парадные', 'Экскурсия по парадным', 'Экскурсия по коммуналкам', 'Экскурсия по дворам', 'Интерьерная'],
    excludeTags: ['Водные экскурсии', 'На теплоходе', 'На катере', 'Реки и каналы'],
    excludeKeywords: ['автобус', 'автобусн', 'теплоход', 'катер', 'речн', 'нева', 'канал', 'причал'],
    excludeKeywordFields: ['title', 'category', 'sourceCategory', 'venue', 'subcategory'],
  },
  {
    slug: 'family-kids',
    title: 'Детям и семьям',
    subtitle: 'Ёлки, цирк, шоу и анимация для детей',
    chips: ['детям', 'семья', 'цирк'],
    tags: ['Детям', 'Детская анимация', 'Шоу для детей', 'Цирк', 'Детское шоу'],
    requiredAnySubcategories: ['Детям', 'Детская анимация', 'Шоу для детей'],
    keywords: ['детск', 'семейн', 'цирк', 'анимац', 'для детей', 'ёлк', 'елк'],
    keywordScope: 'content',
    excludeKeywords: ['18+', 'stand up', 'стендап', 'комеди', 'юмор'],
    excludeKeywordFields: ['title', 'category', 'sourceCategory'],
  },
  {
    slug: 'concerts-genre',
    title: 'Концерты',
    subtitle: 'Рок, джаз, классика, эстрада и живые выступления',
    chips: ['рок', 'джаз', 'классика'],
    tags: ['Рок', 'Джаз', 'Классика', 'Поп', 'Эстрада', 'Металл', 'Альтернатива', 'Электронная музыка', 'Хип-хоп', 'Орган', 'Симфоническая музыка', 'Инди'],
    keywords: ['концерт', 'live', 'симфон', 'оркестр', 'филармон'],
    keywordScope: 'content',
    excludeTags: ['Юмор', 'Stand up', 'Комедия', 'Импровизация', 'TV комики'],
    excludeKeywords: ['стендап', 'stand up', 'комеди', 'юмор', 'импров'],
    excludeKeywordFields: ['title', 'category', 'sourceCategory', 'subcategory'],
  },
  {
    slug: 'moscow-museums',
    title: 'Музеи и мастер-классы в Москве',
    subtitle: 'Выставки, экскурсии и творческие занятия',
    city: 'Москва',
    chips: ['музеи', 'мастер-класс', 'творчество'],
    tags: ['Музеи', 'Мастер-класс', 'Мастер-классы', 'Выставки', 'Искусство', 'Творчество'],
    requiredAnySubcategories: ['Музеи', 'Мастер-класс', 'Мастер-классы', 'Выставки'],
    keywords: ['мастер-класс', 'музе', 'выставк', 'эмаль'],
    keywordScope: 'content',
    excludeKeywords: ['автобус', 'автобусн', 'теплоход', 'речн'],
    excludeKeywordFields: ['title', 'venue', 'subcategory'],
  },
  {
    slug: 'active-sport',
    title: 'Активный отдых и автоспорт',
    subtitle: 'Дрифт, гонки и активные развлечения',
    chips: ['дрифт', 'автоспорт', 'активный'],
    tags: ['Автоспорт', 'Дрифт', 'Активный отдых'],
    requiredAnySubcategories: ['Автоспорт', 'Дрифт', 'Активный отдых'],
    keywords: ['дрифт', 'автоспорт', 'картинг', 'гонк', 'формул'],
    keywordScope: 'content',
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
  publicStatsCache = null;
  publicEventRowsBuildPromise = null;
  publicCatalogBuildPromise = null;
  publicVenueHubCache = null;
  publicVenueCatalogLists = null;
}

/** Прогрев тяжёлого каталога и индекса городов (вызывается при старте API). */
export async function warmPublicCatalogCache(db) {
  await publicCatalogSessions(db);
  const rows = await publicVenueHubRows(db, 500);
  publicVenueCatalogLists = {
    expiresAt: Date.now() + PUBLIC_CATALOG_CACHE_MS,
    institution: [],
    location: [],
  };
  for (const row of rows) {
    const item = mapPublicVenueListItem(row);
    if (item.template === 'institution') publicVenueCatalogLists.institution.push(item);
    else publicVenueCatalogLists.location.push(item);
  }
}

function warmVenueCatalogList(family) {
  if (!publicVenueCatalogLists || publicVenueCatalogLists.expiresAt <= Date.now()) return null;
  if (family === 'institution') return publicVenueCatalogLists.institution;
  if (family === 'location') return publicVenueCatalogLists.location;
  return null;
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

export function isSaleableEventForPublic(event) {
  return Boolean(hasUpcomingOrOpenSchedule(event) && event.purchaseReady && Number.isFinite(event.priceFrom) && event.priceFrom >= MIN_DISPLAY_PRICE_RUB);
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
  lower(trim(coalesce(ext_order."buyerEmailNormalized", ''))) = $1
  or lower(trim(coalesce(ext_order."buyerSnapshot"->>'email', ''))) = $1
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
          min(session."startsAt") filter (where ${ACTIVE_SESSION_SQL}) as "upcomingStartsAt",
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
        venue: formatPublicVenueTitle(row.venue),
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
    publicCode: resolveBuyerFacingOrderNumber({
      buyerSnapshot: row.buyerSnapshot,
      buyer,
      publicCode: row.publicCode || publicOrderCode(row.sourceCode || row.sourceName, row.externalOrderId || row.id),
      externalOrderId: row.externalOrderId,
    }),
    buyerSnapshot: row.buyerSnapshot || null,
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
    number: resolveBuyerFacingOrderNumber(order),
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

/** For external purchases show provider order number; hashed publicCode only as fallback. */
function resolveBuyerFacingOrderNumber(order) {
  const snap = order.buyerSnapshot && typeof order.buyerSnapshot === 'object' ? order.buyerSnapshot : {};
  const notes = firstString(order.buyer?.notes, snap.buyer?.notes);
  const fromNotes = notes && /^#?\d{4,}$/.test(String(notes).trim()) ? String(notes).trim().replace(/^#/, '') : null;
  return firstString(
    snap.number != null ? String(snap.number) : null,
    snap.code,
    fromNotes,
    order.publicCode,
    order.externalOrderId,
  );
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
  const familyFilter = String(searchParams.get('family') || '').trim().toLowerCase();
  const rows = await venueRows(db, 500);
  const filtered = rows.filter((venue) => {
    if (query) {
      const haystack = [venue.name, venue.city, venue.address, venue.proposedKind, venue.pageStatus]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    if (!familyFilter) return true;
    const kind = normalizeVenueKindValue(venue.kind || venue.proposedKind);
    const isInstitution = INSTITUTION_VENUE_KINDS.has(kind);
    if (familyFilter === 'institution') return isInstitution;
    if (familyFilter === 'location') return !isInstitution;
    return true;
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
    const eventTimeZone = resolveCityTimeZone(event.city, event.destination);
    const slot = event.startsAt
      ? {
          eventId: event.id,
          startsAt: event.startsAt,
          dateLabel: formatDate(event.startsAt, eventTimeZone),
          timeLabel: formatTime(event.startsAt, eventTimeZone),
          purchaseUrl: event.offerWidgetUrl || event.offerDeeplinkUrl || buildProviderWidgetUrl(event),
          sourceStatus: event.sourceStatus || null,
          vacant: event.vacant ?? null,
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

    if (event.startsAt && shouldPromoteGroupedRepresentative(current, event)) {
      current.startsAt = event.startsAt;
      current.id = event.id;
      current.slug = event.slug;
      current.sourceSlug = event.sourceSlug;
      current.externalId = event.externalId;
      current.sourceStatus = event.sourceStatus;
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
    normalizeGroupPart(formatPublicVenueTitle(event.venue) || event.venue),
  ].join('|');
}

function publicEventGroupKey(event) {
  const city = resolvePublicSessionCity(event);
  const venue = formatPublicVenueTitle(event.venue) || event.venue;
  const rawTitle = event.overrideTitle || event.title;
  const normalizedTitle = normalizeCatalogGroupTitle(rawTitle);
  let titleForKey = normalizedTitle;
  if (!titleForKey || isDateLikeCatalogTitle(rawTitle)) {
    const venueTitle = formatPublicVenueTitle(event.venue) || String(event.venue || '').trim();
    titleForKey = venueTitle || rawTitle;
  }
  return [
    normalizeGroupPart(event.sourceLabel || event.source || event.sourceCode || event.sourceName),
    normalizeGroupPart(titleForKey),
    normalizeGroupPart(city),
    normalizeGroupPart(venue),
  ].join('|');
}

export function regroupMappedPublicCatalogSessions(sessions) {
  const groups = new Map();

  for (const session of sessions) {
    const key = session.groupKey;
    if (!key) {
      groups.set(`id:${session.id}`, session);
      continue;
    }

    const slotFromSession = session.startsAt
      ? {
          eventId: session.id,
          startsAt: session.startsAt,
          dateLabel: session.dateLabel,
          timeLabel: session.timeLabel,
          purchaseUrl: session.purchaseUrl,
          sourceStatus: session.sourceStatus || null,
          purchaseReady: session.purchaseReady,
          vacant: session.vacant ?? null,
        }
      : null;
    const current = groups.get(key);

    if (!current) {
      groups.set(key, {
        ...session,
        groupEventIds: uniqueValues(session.groupEventIds || [session.id]),
        groupedEventsCount: session.groupedEventsCount || 1,
        sessionCount: session.sessionCount || (slotFromSession ? 1 : 0),
        upcomingSlots: uniqueSlots(
          (session.upcomingSlots || []).concat(slotFromSession ? [slotFromSession] : []),
        ),
      });
      continue;
    }

    current.groupEventIds = uniqueValues(current.groupEventIds.concat(session.groupEventIds || [session.id]));
    current.groupedEventsCount = current.groupEventIds.length;
    current.sessionCount = (current.sessionCount || 0) + (session.sessionCount || (slotFromSession ? 1 : 0));
    current.upcomingSlots = uniqueSlots(
      (current.upcomingSlots || []).concat(session.upcomingSlots || []).concat(slotFromSession ? [slotFromSession] : []),
    );
    current.priceFrom = minNullableNumber([current.priceFrom, session.priceFrom]);
    current.priceTo = maxNullableNumber([current.priceTo, session.priceTo, session.priceFrom]);
    current.vacant = sumNullableNumbers([current.vacant, session.vacant]);
    current.tags = uniqueValues((current.tags || []).concat(session.tags || []));
    current.title = mergeCatalogDisplayTitle(current.title, session.title, current.venue || session.venue);
    if (session.manualLandingStatus === 'PINNED') current.manualLandingStatus = 'PINNED';

    if (shouldPromoteGroupedRepresentative(current, session)) {
      const merged = {
        groupKey: key,
        groupEventIds: current.groupEventIds,
        groupedEventsCount: current.groupedEventsCount,
        sessionCount: current.sessionCount,
        upcomingSlots: current.upcomingSlots,
        priceFrom: current.priceFrom,
        priceTo: current.priceTo,
        vacant: current.vacant,
        tags: current.tags,
        manualLandingStatus: current.manualLandingStatus,
      };
      Object.assign(current, session, merged);
    }
  }

  return Array.from(groups.values())
    .map((session) => ({
      ...session,
      title: resolveCatalogDisplayTitle(session.title, session.venue),
      groupedEventsCount: session.groupEventIds?.length || session.groupedEventsCount || 1,
      sessionCount: session.sessionCount || session.upcomingSlots?.length || 1,
      upcomingSlots: uniqueSlots(session.upcomingSlots || []).sort(
        (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
      ),
    }))
    .sort((a, b) => {
      const aTime = a.startsAt ? new Date(a.startsAt).getTime() : Number.POSITIVE_INFINITY;
      const bTime = b.startsAt ? new Date(b.startsAt).getTime() : Number.POSITIVE_INFINITY;
      return aTime - bTime || String(a.title).localeCompare(String(b.title), 'ru');
    });
}

const KNOWN_PIER_ADDRESS_PATTERNS = [
  { key: 'sinopskaya-10', test: (text) => /синопск/.test(text) && /\b10\b/.test(text) },
  { key: 'fontanka-53', test: (text) => /фонтанк/.test(text) && /\b53\b/.test(text) },
];

function sessionWidgetProvider(session) {
  const code = String(session.offerSourceCode || session.purchaseProvider || session.sourceCode || '').toUpperCase();
  if (code.includes('TEPLOHOD')) return 'TEPLOHOD';
  if (code.includes('TICKETSCLOUD') || code === 'TC') return 'TICKETSCLOUD';
  const url = String(session.purchaseUrl || '').toLowerCase();
  if (url.includes('teplohod.info')) return 'TEPLOHOD';
  if (url.includes('ticketscloud')) return 'TICKETSCLOUD';
  const groupKey = String(session.groupKey || '').toLowerCase();
  if (groupKey.startsWith('teplohod')) return 'TEPLOHOD';
  if (groupKey.startsWith('ticketscloud')) return 'TICKETSCLOUD';
  return null;
}

function isWidgetProviderSession(session) {
  return sessionWidgetProvider(session) != null;
}

function canonicalPierLocationKey(name, address) {
  const text = normalizeVenueTextKey(`${name || ''} ${address || ''}`);
  if (!text) return null;

  for (const pattern of KNOWN_PIER_ADDRESS_PATTERNS) {
    if (pattern.test(text)) return pattern.key;
  }

  if (/причал|набереж/.test(text)) {
    const addressKey = canonicalVenueAddressKey(name, address);
    if (addressKey.length >= 8) return `pier|${addressKey}`;
  }

  return null;
}

function canonicalSessionPierKey(session) {
  return canonicalPierLocationKey(session.venue, session.venueAddress);
}

function normalizeCrossSourceTourTitle(title) {
  let text = String(title || '')
    .toLowerCase()
    .replace(/[«»"'“”]/g, ' ')
    .replace(
      /^(?:(?:обзорная|ночная|утренняя|авторская|детская|вечерняя)\s+)?(?:экскурсия|развлекательно\s*-\s*познавательная\s+программа)\s+/i,
      '',
    )
    .replace(/\s+с\s+гидом\b/g, '')
    .replace(/,\s*или\s+.+/g, '')
    .replace(/\s+\d+\+\s*$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return normalizeVenueTextKey(text);
}

function crossSourceTitlesMatch(leftTitle, rightTitle) {
  const left = normalizeCrossSourceTourTitle(leftTitle);
  const right = normalizeCrossSourceTourTitle(rightTitle);
  if (!left || !right) return false;
  if (left === right) return true;
  if (left.includes(right) || right.includes(left)) return true;

  const leftTokens = new Set(left.split(' ').filter((token) => token.length > 3));
  const rightTokens = new Set(right.split(' ').filter((token) => token.length > 3));
  if (!leftTokens.size || !rightTokens.size) return false;

  let overlap = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) overlap += 1;
  }

  const minSize = Math.min(leftTokens.size, rightTokens.size);
  return overlap >= 2 && overlap / minSize >= 0.6;
}

function crossSourceProviderScore(session) {
  let score = 0;
  if (sessionWidgetProvider(session) === 'TEPLOHOD') score += 100;
  if (sessionWidgetProvider(session) === 'TICKETSCLOUD') score += 10;
  if (session.purchaseReady !== false) score += 50;
  if ((session.upcomingSlots || []).length > 0) score += 5;
  if (session.imageUrl) score += 3;
  if (session.manualLandingStatus === 'PINNED') score += 1000;
  if (!isPublicSessionPurchaseBlocked(session)) score += 20;
  return score;
}

function preferCrossSourceRepresentative(current, candidate) {
  return crossSourceProviderScore(candidate) > crossSourceProviderScore(current);
}

function publicCrossSourceCatalogKey(session) {
  const city = normalizeGroupPart(resolvePublicSessionCity(session));
  const pier = canonicalSessionPierKey(session) || normalizeGroupPart(session.venue);
  const title = normalizeCrossSourceTourTitle(session.title);
  return `${city}|${pier}|${title}`;
}

function mergeCrossSourceSessions(current, candidate) {
  const winner = preferCrossSourceRepresentative(current, candidate) ? candidate : current;
  const mergedGroupEventIds = uniqueValues(
    sessionGroupIds(current).concat(sessionGroupIds(candidate)),
  );

  return {
    ...winner,
    groupKey: publicCrossSourceCatalogKey(winner),
    groupEventIds: mergedGroupEventIds,
    groupedEventsCount: mergedGroupEventIds.length,
    priceFrom: minNullableNumber([current.priceFrom, candidate.priceFrom]),
    priceTo: maxNullableNumber([current.priceTo, candidate.priceTo, current.priceFrom, candidate.priceFrom]),
    vacant: sumNullableNumbers([current.vacant, candidate.vacant]),
    manualLandingStatus:
      current.manualLandingStatus === 'PINNED' || candidate.manualLandingStatus === 'PINNED' ? 'PINNED' : null,
  };
}

export function dedupeCrossSourceCatalogSessions(sessions) {
  const passthrough = [];
  const pierSessions = [];

  for (const session of sessions || []) {
    if (isWidgetProviderSession(session) && canonicalSessionPierKey(session)) {
      pierSessions.push(session);
    } else {
      passthrough.push(session);
    }
  }

  const used = new Set();
  const merged = [];

  for (let index = 0; index < pierSessions.length; index += 1) {
    if (used.has(index)) continue;

    let current = pierSessions[index];
    used.add(index);
    const pierKey = canonicalSessionPierKey(current);

    for (let otherIndex = index + 1; otherIndex < pierSessions.length; otherIndex += 1) {
      if (used.has(otherIndex)) continue;
      const other = pierSessions[otherIndex];
      if (canonicalSessionPierKey(other) !== pierKey) continue;
      if (sessionWidgetProvider(current) === sessionWidgetProvider(other)) continue;
      if (!crossSourceTitlesMatch(current.title, other.title)) continue;
      current = mergeCrossSourceSessions(current, other);
      used.add(otherIndex);
    }

    merged.push(current);
  }

  return passthrough.concat(merged);
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

function isDateLikeCatalogTitle(title) {
  const text = String(title || '').trim();
  if (!text) return true;
  if (/^\d{1,2}[./]\d{1,2}(?:[./]\d{2,4})?/u.test(text)) return true;
  if (/^\d{1,2}:\d{2}/u.test(text)) return true;
  return false;
}

/** Убирает дату/время/город из заголовка TC-событий для группировки карточек каталога. */
function normalizeCatalogGroupTitle(rawTitle) {
  let text = String(rawTitle || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';

  text = text
    .replace(
      /^\d{1,2}[./]\d{1,2}(?:[./]\d{2,4})?(?:\s*(?:,\s*|\s+в\s+))?\d{1,2}:\d{2}(?:\s*(?:\([^)]{2,40}\))?)?(?:\s*[-–—]\s*)?/iu,
      '',
    )
    .trim();
  text = text.replace(/\s*\([^)]{2,40}\)\s*$/u, '').trim();
  text = text.replace(/^\d{1,2}[./]\d{1,2}(?:[./]\d{2,4})?(?:\s*,\s*)?/u, '').trim();

  return text;
}

function resolveCatalogDisplayTitle(rawTitle, venue) {
  const normalized = normalizeCatalogGroupTitle(rawTitle);
  if (normalized.length >= 3 && !isDateLikeCatalogTitle(normalized)) {
    return formatPublicEventTitle(normalized);
  }

  const cleanRaw = String(rawTitle || '').replace(/\s+/g, ' ').trim();
  if (cleanRaw && !isDateLikeCatalogTitle(cleanRaw)) return formatPublicEventTitle(cleanRaw);

  const venueTitle = formatPublicVenueTitle(venue) || String(venue || '').trim();
  if (venueTitle && venueTitle !== 'Не указано') return formatPublicEventTitle(venueTitle);

  return formatPublicEventTitle(cleanRaw || 'Событие');
}

function mergeCatalogDisplayTitle(currentTitle, candidateTitle, venue) {
  const candidates = [currentTitle, candidateTitle].filter(Boolean);
  for (const raw of candidates) {
    const normalized = normalizeCatalogGroupTitle(raw);
    if (normalized.length >= 3 && !isDateLikeCatalogTitle(normalized)) {
      return formatPublicEventTitle(normalized);
    }
  }
  for (const raw of candidates) {
    if (raw && !isDateLikeCatalogTitle(raw)) return formatPublicEventTitle(String(raw).trim());
  }
  return resolveCatalogDisplayTitle(candidates[0], venue);
}

const CATALOG_GROUP_TITLE_SOURCE_SQL = `coalesce(nullif(trim("overrideTitle"), ''), title)`;

function catalogGroupTitleSqlExpression(column = CATALOG_GROUP_TITLE_SOURCE_SQL) {
  return `regexp_replace(
    regexp_replace(
      regexp_replace(
        trim(coalesce(${column}, '')),
        '^\\\\d{1,2}[./]\\\\d{1,2}(?:[./]\\\\d{2,4})?(?:\\\\s*(?:,\\\\s*|\\\\s+в\\\\s+))?\\\\d{1,2}:\\\\d{2}.*',
        '',
        'i'
      ),
      '\\\\s*\\\\([^)]+\\\\)\\\\s*$',
      '',
      'g'
    ),
    '\\\\s+', ' ', 'g'
  )`;
}

function uniqueValues(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function maxNullableNumber(values) {
  const numbers = values.filter((value) => Number.isFinite(value) && value >= MIN_DISPLAY_PRICE_RUB);
  return numbers.length ? Math.max(...numbers) : null;
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
        "editorStatus",
        "mergeGroupKey"
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
    mergeGroupKey: current.mergeGroupKey ?? null,
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
        "mergeGroupKey",
        "updatedAt"
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, now())
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
        "mergeGroupKey" = excluded."mergeGroupKey",
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
        "editorStatus",
        "mergeGroupKey"
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
      next.mergeGroupKey,
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
    sessions: catalogSessions.filter(sessionHasCoverImage).slice(0, PUBLIC_HOME_PREVIEW_LIMIT),
    landings: buildPublicLandings(catalogSessions),
  };

  publicHomePreviewCache = {
    expiresAt: now + PUBLIC_CATALOG_CACHE_MS,
    payload,
  };

  return payload;
}

export async function buildPublicStats(db) {
  const now = Date.now();
  if (publicStatsCache && publicStatsCache.expiresAt > now) {
    return publicStatsCache.payload;
  }

  const [sessions, destinations, stats] = await Promise.all([
    publicCatalogSessions(db),
    destinationSummaryRowsFast(db),
    db.stats(),
  ]);

  const saleableGroups = new Set();
  for (const session of sessions) {
    if (session.purchaseReady === false) continue;
    saleableGroups.add(session.groupKey || session.id);
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    stats: {
      events: saleableGroups.size,
      destinations: destinations.length,
      venues: stats.venues || 0,
      landings: LANDING_RULES.length,
    },
  };

  publicStatsCache = { expiresAt: now + PUBLIC_CATALOG_CACHE_MS, payload };
  return payload;
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
          href: publicLandingHref(landing.slug),
          imageUrl: landing.imageUrl || null,
        },
        `landing:${landing.slug}`,
      );
    }
  }

  return { generatedAt: new Date().toISOString(), query: q, items: items.slice(0, 8) };
}

const PROMO_LANDING_ORDER = [
  'spb-yards',
  'bridges-night',
  'moscow-dinner-boat',
  'moscow-museums',
  'river-party',
  'concerts-genre',
  'salute-9-may',
  'family-kids',
  'new-year',
  'bus-tours',
  'river-cruises',
  'standup',
  'planetarium',
  'active-sport',
];

const PUBLIC_LANDING_CATEGORY_PATH = new Map([
  ['river-cruises', 'rechnye-progulki'],
  ['bus-tours', 'avtobusnye-ekskursii'],
  ['river-party', 'vecherinki-na-teplohode'],
  ['standup', 'stendap-i-yumor'],
  ['family-kids', 'detyam-i-semyam'],
  ['concerts-genre', 'kontserty'],
  ['active-sport', 'aktivnyj-otdyh'],
  ['new-year', 'novyj-god'],
  ['salute-9-may', 'salut-9-maya'],
]);

const PUBLIC_CITY_LANDING_PATH = new Map([
  ['bridges-night', 'night-bridges'],
  ['spb-yards', 'spb-yards'],
  ['moscow-dinner-boat', 'dinner-boat'],
  ['moscow-museums', 'moscow-museums'],
  ['planetarium', 'planetarium'],
]);

const PUBLIC_MULTI_CITY_LANDINGS = new Set(['river-cruises', 'bus-tours', 'river-party', 'salute-9-may', 'new-year']);
const PUBLIC_CITY_SCOPED_LANDINGS = new Set(PUBLIC_CITY_LANDING_PATH.keys());
const PUBLIC_DEFAULT_CITY_BY_LANDING = new Map([
  ['bridges-night', 'saint-petersburg'],
  ['spb-yards', 'saint-petersburg'],
  ['moscow-dinner-boat', 'moscow'],
  ['moscow-museums', 'moscow'],
  ['planetarium', 'saint-petersburg'],
]);

/** Канон города в публичном URL (СПб — полное saint-petersburg). */
const PUBLIC_CITY_PATH_SEGMENT = new Map([
  ['moscow', 'moscow'],
  ['moskva', 'moscow'],
  ['msk', 'moscow'],
  ['saint-petersburg', 'saint-petersburg'],
  ['sankt-peterburg', 'saint-petersburg'],
  ['spb', 'saint-petersburg'],
  ['peterburg', 'saint-petersburg'],
  ['kazan', 'kazan'],
  ['nizhny-novgorod', 'nizhny-novgorod'],
  ['nizhniy-novgorod', 'nizhny-novgorod'],
  ['samara', 'samara'],
  ['sochi', 'sochi'],
  ['kaliningrad', 'kaliningrad'],
  ['ekaterinburg', 'ekaterinburg'],
  ['rostov-on-don', 'rostov-on-don'],
  ['rostov-na-donu', 'rostov-on-don'],
  ['rostov', 'rostov-on-don'],
]);

function publicCityPathSegment(slug) {
  const key = String(slug || '').trim().toLowerCase();
  if (!key) return '';
  if (PUBLIC_CITY_PATH_SEGMENT.has(key)) return PUBLIC_CITY_PATH_SEGMENT.get(key);
  const canonical = canonicalCitySlug(key);
  if (PUBLIC_CITY_PATH_SEGMENT.has(canonical)) return PUBLIC_CITY_PATH_SEGMENT.get(canonical);
  if (canonical === 'sankt-peterburg') return 'saint-petersburg';
  if (canonical === 'moskva') return 'moscow';
  return canonical || key;
}

function publicLandingHref(slug, citySlug = null) {
  if (PUBLIC_CITY_SCOPED_LANDINGS.has(slug)) {
    const city = PUBLIC_DEFAULT_CITY_BY_LANDING.get(slug) || citySlug;
    const citySegment = publicCityPathSegment(city);
    const topic = PUBLIC_CITY_LANDING_PATH.get(slug) || slug;
    return `/${citySegment}/${topic}/`;
  }

  const categoryPath = PUBLIC_LANDING_CATEGORY_PATH.get(slug) || slug;
  if (citySlug && PUBLIC_MULTI_CITY_LANDINGS.has(slug)) {
    const segment = publicCityPathSegment(citySlug);
    return `/${categoryPath}/${segment}/`;
  }
  return `/${categoryPath}/`;
}

function resolvePromoCitySlug(cityFilter) {
  const key = String(cityFilter || '').trim().toLowerCase();
  if (!key || key === 'all') return null;
  if (PUBLIC_CITY_PATH_SEGMENT.has(key)) return publicCityPathSegment(key);
  const canonical = canonicalCitySlug(key);
  if (PUBLIC_CITY_PATH_SEGMENT.has(canonical)) return publicCityPathSegment(canonical);
  if (key.includes('моск')) return 'moscow';
  if (key.includes('петерб') || key.includes('spb')) return 'saint-petersburg';
  if (key.includes('казан')) return 'kazan';
  return null;
}

const PROMO_CITY_LANDING_BOOSTS = {
  'sankt-peterburg': ['spb-yards', 'bridges-night'],
  'saint-petersburg': ['spb-yards', 'bridges-night'],
  'санкт-петербург': ['spb-yards', 'bridges-night'],
  'spb': ['spb-yards', 'bridges-night'],
  'moscow': ['moscow-dinner-boat', 'moscow-museums'],
  'moskva': ['moscow-dinner-boat', 'moscow-museums'],
  'москва': ['moscow-dinner-boat', 'moscow-museums'],
};

function scopePublicCatalogSessions(sessions, cityFilter) {
  const key = String(cityFilter || '').trim().toLowerCase();
  if (!key || key === 'all') return sessions;
  return sessions.filter((session) => {
    const cityName = String(session.city || '').toLowerCase();
    const destination = String(session.destination || '').toLowerCase();
    const citySlug = String(session.citySlug || session.sourceCitySlug || '').toLowerCase();
    return cityName === key || destination === key || citySlug === key;
  });
}

function buildSortedPublicLandings(sessions, cityFilter = '') {
  return sortPromoLandings(
    buildPublicLandings(sessions).filter((landing) => landing.events > 0),
    cityFilter,
  );
}

export async function buildPublicPromoBlocks(db, searchParams) {
  const cityFilter = String(searchParams.get('city') || '').trim().toLowerCase();
  const sessions = await publicCatalogSessions(db);
  const landings = buildSortedPublicLandings(scopePublicCatalogSessions(sessions, cityFilter), cityFilter).slice(0, 6);

  return {
    generatedAt: new Date().toISOString(),
    items: landings.map((landing, index) => ({
      slug: landing.slug,
      title: landing.title,
      subtitle: landing.subtitle,
      events: landing.events,
      priceFrom: landing.priceFrom,
      href: publicLandingHref(landing.slug, resolvePromoCitySlug(cityFilter)),
      gradientIndex: index,
    })),
  };
}

export async function buildPublicLandingsCatalog(db, searchParams) {
  const cityFilter = String(searchParams.get('city') || '').trim().toLowerCase();
  const sessions = await publicCatalogSessions(db);
  const landings = buildSortedPublicLandings(scopePublicCatalogSessions(sessions, cityFilter), cityFilter);

  return {
    generatedAt: new Date().toISOString(),
    city: cityFilter || 'all',
    items: landings.map((landing) => ({
      slug: landing.slug,
      title: landing.title,
      subtitle: landing.subtitle,
      events: landing.events,
      priceFrom: landing.priceFrom,
    })),
  };
}

function resolveCityCardImageFromSlug(slug) {
  const imageSlug = CITY_CARD_IMAGE_ALIASES[slug] || slug;
  if (!CITY_CARD_IMAGE_SLUGS.has(imageSlug)) return null;
  return `/images/cities/${imageSlug}.png`;
}

export async function buildCatalogSessions(db, searchParams) {
  const limit = clampNumber(searchParams.get('limit'), 1, 300, 100);
  const offset = clampNumber(searchParams.get('offset'), 0, 100000, 0);
  const query = String(searchParams.get('q') || '').trim().toLowerCase();
  const destination = searchParams.get('destination');
  const city = searchParams.get('city');
  const category = searchParams.get('category');
  const landing = searchParams.get('landing');
  const date = searchParams.get('date');
  const sort = searchParams.get('sort') || 'time';
  const maxPriceRaw = searchParams.get('maxPrice');
  const minPriceRaw = searchParams.get('minPrice');
  const maxPrice = maxPriceRaw != null && String(maxPriceRaw).trim() !== '' ? Number(maxPriceRaw) : NaN;
  const minPrice = minPriceRaw != null && String(minPriceRaw).trim() !== '' ? Number(minPriceRaw) : NaN;
  const dateFrom = String(searchParams.get('dateFrom') || '').trim();
  const dateTo = String(searchParams.get('dateTo') || '').trim();
  const ageMaxRaw = searchParams.get('ageMax');
  const ageMax = ageMaxRaw != null && String(ageMaxRaw).trim() !== '' ? Number(ageMaxRaw) : NaN;
  const forceRefresh = searchParams.get('refresh') === '1';

  const sessions = await publicCatalogSessions(db, forceRefresh);
  const coverSessions = sessions.filter(sessionHasCoverImage);
  const facets =
    !forceRefresh && publicCatalogCache?.catalogFacets
      ? publicCatalogCache.catalogFacets
      : buildCatalogFacets(coverSessions);
  const rows = coverSessions.filter((session) => {
    if (destination && destination !== 'all' && session.destination !== destination) return false;
    if (city && city !== 'all' && session.city !== city && session.destination !== city) return false;
    if (category && category !== 'all' && session.category !== category && !pickCatalogSubcategories(session).includes(category)) return false;
    if (landing && landing !== 'all' && !(session.landingSlugs || []).includes(landing)) return false;
    if (dateFrom || dateTo) {
      if (!matchesCatalogDateRange(session, dateFrom, dateTo)) return false;
    } else if (date && date !== 'all' && !matchesCatalogDate(session, date)) return false;
    if (!matchesCatalogPrice(session, minPrice, maxPrice)) return false;
    if (Number.isFinite(ageMax) && ageMax >= 0 && !matchesCatalogAgeLimit(session, ageMax)) return false;
    if (!query) return true;
    return [session.title, session.city, session.destination, session.venue, session.category, ...(session.tags || [])]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(query);
    });

  const sorted = sortCatalogSessions(rows, sort);
  const arranged = sort === 'price' || sort === 'time' ? sorted : spreadCatalogSessionsByCoverImage(sorted);
  return { total: arranged.length, offset, limit, items: arranged.slice(offset, offset + limit), facets };
}

function buildCatalogFacets(sessions) {
  return {
    cities: countCatalogValues(sessions.map((session) => session.destination || session.city))
      .filter(([name, events]) => name && name !== 'Не указан' && events >= PUBLIC_DESTINATION_MIN_EVENTS)
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

export function sessionHasCoverImage(session) {
  const url = String(session?.imageUrl || '').trim();
  if (!url) return false;
  if (url.startsWith('/images/cities/')) return false;
  return true;
}

function normalizePublicSessionImageKey(imageUrl) {
  const raw = String(imageUrl || '').trim();
  if (!raw) return null;

  let pathname = raw;
  let hostname = '';
  try {
    const parsed = new URL(raw, 'https://daibilet.ru');
    pathname = parsed.pathname;
    hostname = parsed.hostname.toLowerCase();
  } catch {
    pathname = raw.split('?')[0]?.split('#')[0] || raw;
  }

  const normalizedPath = pathname.replace(/\/$/, '').toLowerCase();
  const file = normalizedPath.split('/').filter(Boolean).pop() || '';
  if (file && /\.(jpe?g|png|webp|gif|avif|bmp|svg)$/i.test(file)) {
    if (/^[a-f0-9-]{16,}$/i.test(file.replace(/\.[^.]+$/, '')) || file.length >= 16) {
      return `img:${file}`;
    }
    if (hostname) return `img:${hostname}/${file}`;
  }

  if (hostname) return `${hostname}${normalizedPath}`;
  return normalizedPath || null;
}

export function spreadCatalogSessionsByCoverImage(sessions) {
  if (!Array.isArray(sessions) || sessions.length <= 1) return sessions;

  const pool = [...sessions];
  const result = [];

  while (pool.length > 0) {
    const lastKey = result.length ? normalizePublicSessionImageKey(result[result.length - 1]?.imageUrl) : null;
    let pickIndex = 0;

    if (lastKey) {
      const firstKey = normalizePublicSessionImageKey(pool[0]?.imageUrl);
      if (firstKey && firstKey === lastKey) {
        const alternateIndex = pool.findIndex((session) => {
          const key = normalizePublicSessionImageKey(session.imageUrl);
          return !key || key !== lastKey;
        });
        if (alternateIndex > 0) pickIndex = alternateIndex;
      }
    }

    result.push(pool.splice(pickIndex, 1)[0]);
  }

  return result;
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
  const venue = await resolvePublicVenueRow(db, venueSlugOrId);
  if (!venue || venue.pageStatus === 'HIDDEN') return null;

  const [catalogSessions, hubRows] = await Promise.all([
    publicCatalogSessions(db),
    publicVenueHubRows(db, 500, { requireEvents: false }),
  ]);
  const venueHeroImageFallbacks = buildActiveVenueEventCounts(catalogSessions).heroImageFallbacks;
  const mergedGroup = findMergedVenueGroup(hubRows, venue.id);
  const venueIds = mergedGroup?.mergedVenueIds || [venue.id];
  const venueContexts = collectVenueSessionLookupContexts(venue, mergedGroup);
  const sessions = lookupVenueCatalogSessions(venueIds, catalogSessions, venueContexts).slice(0, 120);
  if (!sessions.length) {
    const hasProfile =
      Boolean(String(venue.address || '').trim()) &&
      Boolean(String(venue.description || venue.shortDescription || '').trim());
    const status = String(venue.pageStatus || '').toUpperCase();
    const isLocationPage = publicVenuePageTemplate(resolvePublicVenueKindFromRow(venue)) === 'location';
    if (!(isLocationPage && hasProfile && status !== 'NONE' && status !== 'HIDDEN')) {
      return null;
    }
  }
  const waterEvents = sessions.filter(isWaterCatalogSession).length;
  const busEvents = sessions.filter(isBusCatalogSession).length;
  const canonicalVenue =
    mergedGroup && mergedGroup.id !== venue.id ? (await resolvePublicVenueRow(db, mergedGroup.id)) || venue : venue;
  const relatedVenues = await publicRelatedVenues(db, venue.id, venue.city, 6, hubRows);
  const hubGateRow = {
    title: canonicalVenue.title,
    name: canonicalVenue.title,
    kind: canonicalVenue.kind,
    pageStatus: canonicalVenue.pageStatus,
    address: canonicalVenue.address,
    description: canonicalVenue.description,
    shortDescription: canonicalVenue.shortDescription,
    events: sessions.length,
    busEvents,
    waterEvents,
    totalEvents: sessions.length,
  };
  const inPublicHub = isPublicVenueHub(hubGateRow, { requireEvents: false });
  const curatedMeetingPointPage =
    !inPublicHub &&
    resolvePublicVenueKindFromRow(hubGateRow) === 'meeting_point' &&
    Boolean(String(canonicalVenue.address || '').trim()) &&
    Boolean(String(canonicalVenue.description || canonicalVenue.shortDescription || '').trim()) &&
    sessions.length > 0 &&
    !['NONE', 'HIDDEN'].includes(String(canonicalVenue.pageStatus || '').toUpperCase());
  if (!inPublicHub && !curatedMeetingPointPage) {
    return null;
  }
  const prices = sessions.map((session) => session.priceFrom).filter((price) => Number.isFinite(price) && price >= MIN_DISPLAY_PRICE_RUB);
  const categories = countBy(sessions.map((event) => event.category).filter(Boolean));
  const routeCount = new Set(sessions.map((session) => session.groupKey || session.id).filter(Boolean)).size || sessions.length;
  const resolvedType = resolvePublicVenueKind(canonicalVenue.kind, canonicalVenue.title, canonicalVenue.address, {
    shortDescription: mergedGroup?.shortDescription || canonicalVenue.shortDescription,
    description: canonicalVenue.description,
    waterEvents,
    busEvents,
    totalEvents: sessions.length,
  });
  const displayName = applyPublicVenueDisplayName(
    {
      name: formatPublicVenueTitle(canonicalVenue.title),
      address: mergedGroup?.address || canonicalVenue.address,
      city: canonicalVenue.city || 'Не указан',
    },
    resolvedType,
  );
  const normalizedVenue = applyPublicVenueNormalization({
    name: displayName,
    title: displayName,
    address: mergedGroup?.address || canonicalVenue.address,
    city: canonicalVenue.city || 'Не указан',
  });
  const hasDescription = Boolean(String(canonicalVenue.description || mergedGroup?.shortDescription || canonicalVenue.shortDescription || '').trim());
  const hasAddress = Boolean(String(normalizedVenue.address || '').trim());
  const hasHeroImage = Boolean(resolveVenueHeroImageUrl(
    {
      id: canonicalVenue.id,
      heroImageUrl: mergedGroup?.heroImageUrl || canonicalVenue.heroImageUrl,
      mergedVenueIds: venueIds,
    },
    venueHeroImageFallbacks,
  ));
  const pageTemplate = publicVenuePageTemplate(resolvedType);
  const sessionCount = sessions.length;
  const weakVenuePage =
    pageTemplate === 'location'
      ? !hasAddress || (!hasDescription && !hasHeroImage) || sessionCount < 1
      : routeCount < 3 || (!hasDescription && !hasHeroImage) || !hasAddress;
  const isIndexable = canonicalVenue.isIndexable !== false && !weakVenuePage;

  const venueCoordinates = resolvePublicVenueCoordinates(canonicalVenue, { resolvedType });

  return {
    generatedAt: new Date().toISOString(),
    venue: {
      id: canonicalVenue.id,
      slug: publicVenueSlug(canonicalVenue.slug, normalizedVenue.name, canonicalVenue.id),
      name: normalizedVenue.name,
      title: normalizedVenue.name,
      city: normalizedVenue.city || 'Не указан',
      address: normalizedVenue.address,
      latitude: venueCoordinates?.latitude ?? null,
      longitude: venueCoordinates?.longitude ?? null,
      type: resolvedType,
      template: publicVenuePageTemplate(resolvedType),
      pageStatus: canonicalVenue.pageStatus,
      description: pickPublicVenueDescriptionText(canonicalVenue.shortDescription, canonicalVenue.description),
      shortDescription: pickPublicVenueLeadText(canonicalVenue.shortDescription, canonicalVenue.description),
      heroImageUrl: resolveVenueHeroImageUrl(
        {
          id: canonicalVenue.id,
          heroImageUrl: mergedGroup?.heroImageUrl || canonicalVenue.heroImageUrl,
          mergedVenueIds: venueIds,
        },
        venueHeroImageFallbacks,
      ),
      seoH1: canonicalVenue.seoH1,
      seoTitle: canonicalVenue.seoTitle,
      seoDescription: canonicalVenue.seoDescription,
      canonicalPath: canonicalVenue.canonicalPath || `/${publicVenuePageTemplate(resolvedType) === 'location' ? 'locations' : 'venues'}/${publicVenueSlug(canonicalVenue.slug, normalizedVenue.name, canonicalVenue.id)}`,
      isIndexable,
      events: routeCount,
      categories,
    },
    sessions,
    relatedVenues,
    stats: {
      events: routeCount,
      categories: Object.keys(categories).length,
      priceFrom: prices.length ? Math.min(...prices) : null,
    },
  };
}

export async function buildPublicCityPage(db, citySlugOrId) {
  const requestedSlug = String(citySlugOrId || '').toLowerCase();
  const [catalogSessions, venueHubRows] = await Promise.all([
    publicCatalogSessions(db),
    publicVenueHubRows(db, 500),
  ]);
  const matchedSessions = lookupDestinationCatalogSessions(citySlugOrId, requestedSlug, catalogSessions);
  if (!matchedSessions.length) return null;

  const destination = publicDestinationFromSession(matchedSessions[0]);
  const sessions = matchedSessions.slice(0, 160);
  const cityVenues = publicVenuesForSessionsFromHub(sessions, venueHubRows, 24);
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
      city: rule.city || null,
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
      city: rule.city || null,
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
  const cachedCatalogSessions = publicCatalogCache?.sessions || null;
  let catalogSessions = cachedCatalogSessions;
  let resolvedEventId = await resolvePublicEventId(db, eventSlugOrId, catalogSessions);
  let targetPublicSession = lookupCatalogSessionBySlug(eventSlugOrId, catalogSessions);

  const loadEventRow = async (eventLocator) => {
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
    const row = eventResult.rows[0];
    if (!row) return null;
    if (String(row.status || '').toUpperCase() === 'HIDDEN') return null;
    return row;
  };

  let event = await loadEventRow(resolvedEventId || eventSlugOrId);
  if (!event) {
    catalogSessions = await publicCatalogSessions(db);
    resolvedEventId = await resolvePublicEventId(db, eventSlugOrId, catalogSessions);
    targetPublicSession = lookupCatalogSessionBySlug(eventSlugOrId, catalogSessions);
    event = resolvedEventId ? await loadEventRow(resolvedEventId) : null;
  }

  if (!event) return null;
  if (!catalogSessions) {
    catalogSessions = await publicCatalogSessions(db);
  }
  const eventDestination = publicDestinationForCity(event);

  const requestedSlug = publicEventSlug(eventSlugOrId);
  if (!targetPublicSession && catalogSessions?.length) {
    targetPublicSession =
      lookupCatalogSessionBySlug(eventSlugOrId, catalogSessions) ||
      catalogSessions.find(
        (session) =>
          session.id === event.id ||
          session.sourceSlug === event.slug ||
          session.slug === requestedSlug ||
          sessionGroupIds(session).includes(event.id),
      );
  }
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
          session_event."sourceStatus" as "eventSourceStatus",
          session_source_link."externalId" as "eventExternalId",
          session_source.code as "eventSourceCode",
          session_offer."sourceCode" as "offerSourceCode",
          session_offer.title as "offerTitle",
          session_offer."priceRub" as "offerPriceRub",
          session_offer."widgetUrl" as "offerWidgetUrl",
          session_offer."deeplinkUrl" as "offerDeeplinkUrl",
          session_offer.active as "offerActive"
        from "EventSession" session
        left join "Event" session_event on session_event.id = session."eventId"
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
          and ${ACTIVE_SESSION_SQL}
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
          offer.payload,
          (offer.payload->>'sortOrder')::int as "sortOrder"
        from "EventOffer" offer
        where offer."eventId" = any($1)
          and offer.active is not false
          and offer."priceRub" >= $2
        order by
          coalesce((offer.payload->>'sortOrder')::int, 9999),
          offer."priceRub" asc nulls last,
          offer.id asc
        limit 32
      `,
      [groupEventIds, MIN_DISPLAY_PRICE_RUB],
    ),
  ]);

  const publicOffers = preferNamedTicketOffers(dedupePublicOffers(offersResult.rows)).slice(0, 32);

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
    title: formatPublicEventTitle(event.overrideTitle || event.title),
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
    timeZone: resolveCityTimeZone(event.city, eventDestination.name),
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
  const institutionContext = await resolveContextInstitutionForEvent(db, {
    title: baseEvent.title,
    cityId: event.cityId,
    venue: event.venue,
    venueKind: event.venueKind,
  });
  if (institutionContext) {
    baseEvent.institutionVenue = institutionContext.displayName;
    baseEvent.institutionVenueId = institutionContext.id;
    baseEvent.institutionVenueSlug = institutionContext.slug;
  }
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
      endsAt: session.endsAt,
      kind: event.kind,
      sourceStatus: session.sourceStatus,
      city: event.city,
      destination: eventDestination.name,
    });
    return {
      id: session.id,
      eventId: session.eventId,
      startsAt: schedule.startsAt || null,
      endsAt: session.endsAt,
      dateLabel: schedule.dateLabel,
      timeLabel: schedule.timeLabel,
      timeBucket: schedule.timeBucket,
      timeZone: schedule.timeZone,
      sourceStatus: session.sourceStatus,
      eventSourceStatus: session.eventSourceStatus,
      priceFrom: displayPriceFrom(session.priceFromRub, baseEvent.priceFrom),
      vacant: session.ticketsVacant,
      purchaseUrl: sessionPurchase.url,
      purchaseReady: sessionPurchase.ready,
      purchaseUrlSource: sessionPurchase.urlSource,
    };
  });
  const widgetOnlySessions = sessions.length === 0
    && (isOpenDateCatalogRow({ kind: event.kind, sourceStatus: event.sourceStatus }) || purchase.provider === 'TICKETSCLOUD')
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
  applyEventPrimaryPurchase(baseEvent, publicSessions, event.sourceCode || primaryOffer?.sourceCode);
  const ticketPrices = buildPublicTicketPrices(publicOffers, publicSessions, baseEvent);
  const relatedCandidates = catalogSessions.filter((session) => {
    if (sessionGroupIds(session).some((id) => groupEventIds.includes(id))) return false;
    if (event.cityId && session.cityId) return session.cityId === event.cityId;
    return normalizeGroupPart(session.city) === normalizeGroupPart(event.city);
  });
  relatedCandidates.sort((left, right) => {
    const score = (session) => {
      let value = 0;
      if (session.category === event.category) value += 2;
      if (session.venueKind && session.venueKind === event.venueKind) value += 1;
      if (session.venueId && session.venueId === event.venueId) value += 3;
      return value;
    };
    const byScore = score(right) - score(left);
    if (byScore !== 0) return byScore;
    return String(left.startsAt || '').localeCompare(String(right.startsAt || ''));
  });
  const related = relatedCandidates.slice(0, 12);
  const priceValues = [baseEvent.priceFrom, ...publicSessions.map((session) => session.priceFrom)].filter((price) => Number.isFinite(price) && price >= MIN_DISPLAY_PRICE_RUB);
  const vacantValues = publicSessions.map((session) => session.vacant).filter((value) => Number.isFinite(value));

  if (!isSaleableEventForPublic({ ...baseEvent, kind: event.kind, sourceStatus: publicSessions.find((session) => session.sourceStatus === 'widget')?.sourceStatus || event.sourceStatus, startsAt: publicSessions.find((session) => session.startsAt)?.startsAt || null,
      endsAt: publicSessions.find((session) => session.endsAt)?.endsAt || null })) {
    return null;
  }

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
      sortOrder: readOfferSortOrder(offer.sortOrder),
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

export function preferNamedTicketOffers(rows) {
  const list = rows || [];
  const named = list.filter((row) => !isGenericTcOfferTitle(row.title));
  return named.length ? named : list;
}

function isGenericTcOfferTitle(title) {
  const key = normalizeGroupPart(title);
  return !key || key === 'widget' || key.includes('ticketscloud widget');
}

export function dedupePublicOffers(rows) {
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
    const aOrder = readOfferSortOrder(a.sortOrder) ?? 9999;
    const bOrder = readOfferSortOrder(b.sortOrder) ?? 9999;
    return aOrder - bOrder || Number(a.priceRub || 0) - Number(b.priceRub || 0) || String(a.title || '').localeCompare(String(b.title || ''), 'ru');
  });
}

function buildPublicTicketPrices(offers, sessions, event) {
  const rows = [];
  const eventTitleKey = normalizeGroupPart(event.title);

  for (const offer of preferNamedTicketOffers(offers || [])) {
    if (offer.active === false || !Number.isFinite(offer.priceRub) || offer.priceRub < MIN_DISPLAY_PRICE_RUB) continue;
    const title = normalizePublicTicketTitle(offer.title, eventTitleKey);
    rows.push({
      key: `offer:${offer.id || offer.eventId}:${normalizeGroupPart(title)}:${offer.priceRub}`,
      title,
      priceRub: offer.priceRub,
      source: publicSourceLabel(offer.sourceCode),
      description: resolvePublicOfferTicketDescription(offer, title),
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
      key: `session:${session.id || session.priceFrom}:${session.priceFrom}`,
      title: 'Билет на отдельные сеансы',
      priceRub: session.priceFrom,
      source: null,
      description: null,
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
      description: null,
      purchaseUrl: event.purchaseUrl || null,
      kind: 'fallback',
    });
  }

  const unique = new Map();
  for (const row of rows) {
    const labelKey = normalizeGroupPart(normalizeTicketCategoryLabel(row.title));
    const mergeKey = `${labelKey}:${row.priceRub}`;
    const existing = unique.get(mergeKey);
    if (!existing || (row.kind === 'offer' && existing.kind !== 'offer')) unique.set(mergeKey, row);
  }

  return Array.from(unique.values())
    .sort((a, b) => {
      const aOrder = readOfferSortOrder(a.sortOrder) ?? 9999;
      const bOrder = readOfferSortOrder(b.sortOrder) ?? 9999;
      return aOrder - bOrder || a.priceRub - b.priceRub || String(a.title).localeCompare(String(b.title), 'ru');
    })
    .slice(0, 32);
}

function splitTitlePartsWithoutWeekdays(title) {
  const parts = String(title || '').split(',').map((part) => part.trim()).filter(Boolean);
  const weekdayToken = /^(?:ПН|ВТ|СР|ЧТ|ПТ|СБ|ВС)$/iu;
  const weekdayRange = /^(?:ПН|ВТ|СР|ЧТ|ПТ|СБ|ВС)(?:\s*[,—–\-]\s*(?:ПН|ВТ|СР|ЧТ|ПТ|СБ|ВС))+$/iu;

  while (parts.length > 1) {
    const last = parts[parts.length - 1];
    if (weekdayToken.test(last) || weekdayRange.test(last)) {
      parts.pop();
      continue;
    }
    break;
  }

  return parts;
}

function isGenericPublicTicketDescription(value) {
  const text = String(cleanImportedDescription(value) || '').toLowerCase();
  if (!text) return true;
  if (text.includes('покупка открывается в виджете')) return true;
  if (text.includes('уточняется в виджете')) return true;
  if (text.includes('минимальная доступная цена')) return true;
  return false;
}

function isTransportBoilerplate(value) {
  const text = cleanImportedDescription(value);
  if (!text) return false;
  return /перевозка\s+пас[-.\s]?в/i.test(text) && /\bТС\s*\d+/i.test(text);
}

function normalizeTicketCategoryLabel(raw) {
  let text = cleanImportedDescription(raw);
  if (!text) return 'Билет';

  const dashSplit = text.split(/\s[-–—]\s/);
  if (dashSplit.length > 1) {
    const head = String(dashSplit[0] || '').trim();
    const tail = dashSplit.slice(1).join(' - ').trim();
    if (head && (!tail || isTransportBoilerplate(tail))) return head;
  }

  text = text
    .replace(/\s*[-–—]?\s*перевозка\s+пас[-.\s]?в\s+.+?\s+ТС\s*\d+\s*$/iu, '')
    .trim();

  const parts = splitTitlePartsWithoutWeekdays(text);
  if (parts.length > 1) {
    const tail = parts.slice(1).join(', ').trim();
    if (!tail || isTransportBoilerplate(tail)) return parts[0] || 'Билет';
  }

  return text || 'Билет';
}

function extractPublicOfferPayloadDescription(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  for (const key of ['description', 'comment', 'text']) {
    const direct = cleanImportedDescription(payload[key]);
    if (direct && !isGenericPublicTicketDescription(direct) && !isTransportBoilerplate(direct)) return direct;
  }
  const ticket = payload.ticket;
  if (ticket && typeof ticket === 'object' && !Array.isArray(ticket)) {
    for (const key of ['description', 'comment', 'text']) {
      const nested = cleanImportedDescription(ticket[key]);
      if (nested && !isGenericPublicTicketDescription(nested) && !isTransportBoilerplate(nested)) return nested;
    }
  }
  return null;
}

function parsePublicTitleSupplement(rawTitle, normalizedTitle) {
  const clean = cleanImportedDescription(rawTitle);
  if (!clean) return null;
  const parts = splitTitlePartsWithoutWeekdays(clean);
  if (parts.length <= 1) return null;
  const supplement = parts.slice(1).join(', ').trim();
  if (!supplement || isGenericPublicTicketDescription(supplement) || isTransportBoilerplate(supplement)) return null;
  if (normalizeGroupPart(parts[0]) === normalizeGroupPart(normalizedTitle)) return supplement;
  if (normalizeGroupPart(clean) === normalizeGroupPart(normalizedTitle)) return supplement;
  return supplement;
}

function resolvePublicOfferTicketDescription(offer, normalizedTitle) {
  const fromPayload = extractPublicOfferPayloadDescription(offer.payload);
  if (fromPayload) return fromPayload;
  const fromTitle = parsePublicTitleSupplement(offer.title, normalizedTitle);
  if (fromTitle) return fromTitle;
  return null;
}

function normalizePublicTicketTitle(rawTitle, eventTitleKey) {
  const cleanTitle = cleanImportedDescription(rawTitle);
  const titleKey = normalizeGroupPart(cleanTitle);
  if (!titleKey || titleKey === eventTitleKey) return 'Билет';
  if (titleKey === 'widget' || titleKey.includes('ticketscloud widget')) return 'Билет';
  return normalizeTicketCategoryLabel(cleanTitle);
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

function extractTcExternalIdFromPurchaseUrl(url) {
  if (!url) return null;
  const match = String(url).match(/[?&]event=([^&]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function isPublicSessionPurchaseBlocked(session) {
  const statuses = [session.sourceStatus, session.eventSourceStatus].map((value) => String(value || '').toLowerCase());
  if (!session.startsAt && !isOpenDateCatalogRow(session)) return true;
  if (statuses.some((status) => ['paused', 'suspended', 'stopped', 'cancelled', 'canceled', 'draft', 'hidden'].includes(status))) {
    return true;
  }
  if (session.purchaseReady === false) return true;
  const purchaseUrl = session.purchaseUrl || session.widgetUrl || session.offerWidgetUrl || null;
  const provider = String(session.purchaseProvider || session.offerSourceCode || session.sourceCode || '').toUpperCase();
  if (
    (provider.includes('TEPLOHOD') || provider.includes('TEP') || String(purchaseUrl).includes('teplohod.info')) &&
    session.purchaseReady !== false &&
    purchaseUrl
  ) {
    return false;
  }
  if (session.vacant === 0) return true;
  return false;
}

function shouldPromoteGroupedRepresentative(current, candidate) {
  if (!candidate?.startsAt) return false;
  const currentBlocked = isPublicSessionPurchaseBlocked(current);
  const candidateBlocked = isPublicSessionPurchaseBlocked(candidate);
  if (currentBlocked && !candidateBlocked) return true;
  if (!currentBlocked && candidateBlocked) return false;
  if (!current.startsAt) return true;
  return new Date(candidate.startsAt) < new Date(current.startsAt);
}

function pickPrimaryPurchasableSession(sessions) {
  for (const session of sessions || []) {
    if (isPublicSessionPurchaseBlocked(session)) continue;
    if (!extractTcExternalIdFromPurchaseUrl(session.purchaseUrl)) continue;
    return session;
  }
  return sessions?.[0] || null;
}

function applyEventPrimaryPurchase(baseEvent, sessions, sourceCode) {
  const primarySession = pickPrimaryPurchasableSession(sessions);
  if (!primarySession?.purchaseUrl) return baseEvent;

  const tcEventId = extractTcExternalIdFromPurchaseUrl(primarySession.purchaseUrl);
  if (!tcEventId) return baseEvent;

  baseEvent.purchaseUrl = primarySession.purchaseUrl;
  baseEvent.widgetUrl = primarySession.purchaseUrl;
  if (providerWidgetProvider(sourceCode) === 'TICKETSCLOUD') {
    baseEvent.externalId = tcEventId;
    baseEvent.widgetPayload = {
      ...(baseEvent.widgetPayload || {}),
      provider: 'TICKETSCLOUD',
      tcEventId,
    };
  }

  return baseEvent;
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
        override."mergeGroupKey" as "overrideMergeGroupKey",
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
        min(session."startsAt") filter (where ${ACTIVE_SESSION_SQL}) as "nextStartsAt",
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
      venue: formatPublicVenueTitle(row.venue) || 'Не указано',
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
        mergeGroupKey: row.overrideMergeGroupKey,
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

  if (Object.prototype.hasOwnProperty.call(payload, 'mergeGroupKey')) {
    const value = normalizeNullableString(payload.mergeGroupKey);
    if (!value) {
      normalized.mergeGroupKey = null;
    } else {
      const normalizedKey = value.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
      if (!normalizedKey || normalizedKey.length > 64) {
        throw new Error('mergeGroupKey must be 1-64 chars: a-z, 0-9, _ and -');
      }
      normalized.mergeGroupKey = normalizedKey;
    }
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

function formatPublicVenueTitle(value) {
  if (value == null) return value;
  return String(value)
    .replace(/\s*\(\s*-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?\s*\)\s*$/u, '')
    .trim();
}

function isValidVenueCoordinatePair(latitude, longitude) {
  return Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;
}

function extractEmbeddedVenueCoordinates(...parts) {
  const text = parts.filter(Boolean).join(' ');

  const parenMatch = text.match(/\(\s*(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*\)/u);
  if (parenMatch) {
    const latitude = Number(parenMatch[1]);
    const longitude = Number(parenMatch[2]);
    if (isValidVenueCoordinatePair(latitude, longitude)) return { latitude, longitude };
  }

  const decimalSlugMatch = text.match(/(?:^|[-_/])(-?\d{1,2}\.\d{3,})[-_/](-?\d{1,3}\.\d{3,})(?:[-_/]|$)/u);
  if (decimalSlugMatch) {
    const latitude = Number(decimalSlugMatch[1]);
    const longitude = Number(decimalSlugMatch[2]);
    if (isValidVenueCoordinatePair(latitude, longitude)) return { latitude, longitude };
  }

  const dashedSlugMatch = text.match(/(?:^|[-_/])(\d{1,2})-(\d{4,7})-(\d{1,3})-(\d{4,7})(?:[-_/]|$)/u);
  if (dashedSlugMatch) {
    const latitude = Number(`${dashedSlugMatch[1]}.${dashedSlugMatch[2]}`);
    const longitude = Number(`${dashedSlugMatch[3]}.${dashedSlugMatch[4]}`);
    if (isValidVenueCoordinatePair(latitude, longitude)) return { latitude, longitude };
  }

  return null;
}

export function resolvePublicVenueCoordinates(venue = {}, options = {}) {
  const embedded = extractEmbeddedVenueCoordinates(venue.title, venue.name, venue.slug, venue.address);
  if (embedded) return embedded;

  const kind = options.resolvedType || venue.type || venue.kind;
  const override = lookupLocationDescriptionCoordinates(
    venue.slug,
    venue.title || venue.name,
    venue.id,
  );
  let latitude = override?.latitude ?? Number(venue.latitude);
  let longitude = override?.longitude ?? Number(venue.longitude);
  if (!isValidVenueCoordinatePair(latitude, longitude)) return null;

  if (isPierVenueKind(kind) && !override) {
    return adjustPierCoordinatesToWater(latitude, longitude, venue);
  }

  return { latitude, longitude };
}

let locationDescriptionCoordinatesCache = null;

function getLocationDescriptionCoordinatesMap() {
  if (locationDescriptionCoordinatesCache) return locationDescriptionCoordinatesCache;
  const map = new Map();
  try {
    const filePath = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      '../../../scripts/data/location-descriptions.json',
    );
    const items = JSON.parse(readFileSync(filePath, 'utf8'));
    for (const item of items) {
      if (typeof item.latitude !== 'number' || typeof item.longitude !== 'number') continue;
      const slug = String(item.slug || '').trim().toLowerCase();
      if (!slug) continue;
      const coords = { latitude: item.latitude, longitude: item.longitude };
      map.set(slug, coords);
      const shortSlug = slug.replace(/-[a-f0-9]{20,}$/i, '');
      if (shortSlug !== slug) map.set(shortSlug, coords);
    }
  } catch {
    // optional curated overrides
  }
  locationDescriptionCoordinatesCache = map;
  return map;
}

function lookupLocationDescriptionCoordinates(slug, title, id) {
  const candidates = [];
  const add = (value) => {
    const key = String(value || '').trim().toLowerCase();
    if (!key) return;
    candidates.push(key);
    const transliterated = publicCitySlug(key);
    if (transliterated && transliterated !== key) candidates.push(transliterated);
    const deduped = dedupeVenueSlugSuffix(transliterated || key);
    if (deduped && !candidates.includes(deduped)) candidates.push(deduped);
  };

  add(slug);
  add(publicVenueSlug(slug, title, id));

  const map = getLocationDescriptionCoordinatesMap();
  for (const value of candidates) {
    if (map.has(value)) return map.get(value);
    const withoutHash = value.replace(/-[a-f0-9]{20,}$/i, '');
    if (map.has(withoutHash)) return map.get(withoutHash);
    for (const [key, coords] of map) {
      if (value.startsWith(`${key}-`) || key.startsWith(`${value}-`)) return coords;
    }
  }
  return null;
}

export function isPierVenueKind(kindOrType) {
  const key = String(kindOrType || '')
    .trim()
    .toLowerCase()
    .replace(/-/g, '_');
  return key === 'pier' || key === 'pier_water';
}

function detectPierWaterOffset(venue = {}) {
  const city = String(venue.city || '').toLowerCase();
  const text = `${venue.address || ''} ${venue.title || ''} ${venue.name || ''}`.toLowerCase();
  if (city.includes('петербург') || text.includes('санкт-петербург') || text.includes('спб')) {
    return { dLat: -0.00094, dLng: 0.00116 };
  }
  if (city.includes('москва') || text.includes('москва')) {
    return { dLat: -0.00072, dLng: 0.00042 };
  }
  if (city.includes('казан') || text.includes('казань')) {
    return { dLat: -0.00055, dLng: 0.00035 };
  }
  if (/наб(?:ережн)?|причал|речн/i.test(text)) {
    return { dLat: -0.00065, dLng: 0.0005 };
  }
  return null;
}

function adjustPierCoordinatesToWater(latitude, longitude, venue = {}) {
  const offset = detectPierWaterOffset(venue);
  if (!offset) return { latitude, longitude };
  return {
    latitude: latitude + offset.dLat,
    longitude: longitude + offset.dLng,
  };
}

function isVenueHallSuffix(suffix) {
  const key = normalizeVenueTextKey(suffix);
  if (!key) return true;
  if (
    /^(основной|малый|большой|маленький|верхний|нижний|концертный|выставочный|камерный|банкетный|театральный|красный|черный|белый|синий|зеленый|vip)(\s+зал)?$/.test(
      key,
    )
  ) {
    return true;
  }
  if (/^зал(\s+[a-zа-яё0-9\-]+)?$/i.test(key)) return true;
  return false;
}

function canonicalVenueMergeTitle(name) {
  let title = String(formatPublicVenueTitle(name) || '').trim();
  if (!title) return title;

  const segments = title.split(/\s*\|\s*/).map((part) => part.trim()).filter(Boolean);
  if (segments.length <= 1) return title;
  if (segments.slice(1).every((part) => isVenueHallSuffix(part))) return segments[0];
  return title;
}

function applyPublicVenueNormalization(row = {}) {
  const normalized = normalizePublicVenueRecord({
    id: row.id,
    title: row.name || row.title,
    name: row.name || row.title,
    address: row.address,
    city: row.city,
  });
  return {
    ...row,
    name: normalized.title,
    title: normalized.title,
    address: normalized.address,
    city: normalized.city || row.city,
  };
}

function normalizeVenueTextKey(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-z0-9а-я]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function venueTitleLooksLikeAddress(name) {
  const text = String(name || '').toLowerCase();
  return /(?:\bul\.|\bпр\.|\bпер\.|наб\.|,\s*с\.|,\s*д\.|,\s*дом\b|район,|область,|республик)/i.test(text);
}

function canonicalVenueAddressKey(name, address) {
  let text = normalizeVenueTextKey(`${canonicalVenueMergeTitle(name) || formatPublicVenueTitle(name) || ''} ${address || ''}`);
  text = text
    .replace(/(?:^|\s)причал(?:\s|$)/g, ' ')
    .replace(/(?:^|\s)наб(?:\s|$)/g, ' набережная ')
    .replace(/(?:^|\s)ул(?:\s|$)/g, ' улица ')
    .replace(/\s+/g, ' ')
    .trim();
  return text;
}

function normalizePublicVenueMergeKey(name, city, address) {
  const title = normalizeVenueTextKey(canonicalVenueMergeTitle(name));
  const cityKey = normalizeVenueTextKey(city || 'не указан');

  if (/причал|набереж/i.test(`${name || ''} ${address || ''}`)) {
    const pierKey = canonicalPierLocationKey(name, address);
    if (pierKey) return `pier|${cityKey}|${pierKey}`;
    return `pier|${cityKey}|${title}`;
  }

  if (hasBusLikeText(name, address)) {
    return `bus|${cityKey}|${title}`;
  }

  if (venueTitleLooksLikeAddress(name)) {
    return `geo|${title}`;
  }

  const addressKey = canonicalVenueAddressKey(name, address);
  if (addressKey.length >= 10) {
    return `addr|${cityKey}|${addressKey}`;
  }

  return `city|${cityKey}|${title}`;
}

function capitalizeLocality(value) {
  const text = String(value || '').trim();
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function routeCityToPublicDisplayName(cityName) {
  const clean = canonicalizePublicCityName(cityName) || cleanDisplayName(cityName);
  if (!clean || clean === 'Не указан') return clean;
  if (STANDALONE_CITY_NAMES.has(clean)) return clean;
  const mapped = CITY_TO_REGION.get(clean);
  if (mapped) return mapped;
  return clean;
}

function isAllowedPublicDestination(destination) {
  if (!destination?.name || destination.name === 'Не указан') return false;
  if (destination.type === 'city') return STANDALONE_CITY_NAMES.has(destination.name);
  if (destination.type === 'region') return PUBLIC_REGION_NAMES.has(destination.name) || isPublicRegionName(destination.name);
  return false;
}

function buildPublicDestinationRecord(row, mappedName) {
  if (STANDALONE_CITY_NAMES.has(mappedName)) {
    const slug = publicCitySlug(mappedName);
    return {
      id: row.cityId || `city_${slug}`,
      slug,
      sourceSlug: row.citySlug || slug,
      name: mappedName,
      type: 'city',
    };
  }

  const slug = publicCitySlug(mappedName);
  return {
    id: row.regionId || `region_${slug}`,
    slug,
    sourceSlug: row.regionSlug || slug,
    name: mappedName,
    type: 'region',
  };
}

/** Обрезки названий: regex «с.» ошибочно съедал начальную «с» у слов (Синопской → Инопской). */
const CITY_BOGUS_ALIASES = new Map([
  ['анкт-петербург', 'Санкт-Петербург'],
  ['инопской', 'Санкт-Петербург'],
  ['инопская', 'Санкт-Петербург'],
  ['пуск', 'Санкт-Петербург'],
  ['плетни', 'Санкт-Петербург'],
  ['оляной', 'Санкт-Петербург'],
  ['аунд', 'Санкт-Петербург'],
  ['основское', 'Сосновское'],
  ['ветланская', 'Владивосток'],
  ['тромынский', 'Москва'],
  ['партаковская', 'Москва'],
  ['тороны', 'Москва'],
  ['ити', 'Владивосток'],
  ['алиха', 'Казань'],
  ['ерова', 'Самара'],
  ['цена', 'Нижний Новгород'],
  ['вобода', 'Самара'],
  ['оветская', 'Самара'],
  ['троителей', 'Тольятти'],
  ['троение', 'Тольятти'],
]);

function canonicalizePublicCityName(value) {
  const raw = cleanDisplayName(value);
  if (!raw || raw === 'Не указан') return null;
  const alias = CITY_BOGUS_ALIASES.get(normalizeVenueTextKey(raw));
  return alias || raw;
}

function haystackIncludesCityToken(haystack, cityName) {
  const token = normalizeVenueTextKey(cityName);
  if (!token) return false;
  const normalizedHaystack = normalizeVenueTextKey(haystack);
  return ` ${normalizedHaystack} `.includes(` ${token} `);
}

function inferVenueLocalityLabel(name, address) {
  const text = `${name || ''} ${address || ''}`.toLowerCase();
  // Только «с.» с точкой — иначе «синопской» превращается в «инопской».
  const villageMatch = text.match(/(?:^|[,\s])с\.(\s*)([а-яё][а-яё-]{2,40})/);
  if (villageMatch) return capitalizeLocality(villageMatch[2]);
  const regionMatch = text.match(/республик[аи]\s+[а-яё][а-яё\s-]{2,40}/i);
  if (regionMatch) return capitalizeLocality(regionMatch[0]);
  if (text.includes('хакас')) return 'Республика Хакасия';
  return null;
}

function venueLocationContradictsCity(name, address, dbCity) {
  const db = normalizeVenueTextKey(dbCity);
  if (!db || db === 'не указан') return false;
  const haystack = `${name || ''} ${address || ''}`.toLowerCase();
  if (haystack.includes('хакас') && !['абакан', 'хакас', 'черногор', 'минусин', 'ефрем'].some((part) => db.includes(part))) {
    return true;
  }
  if (CITY_BOGUS_ALIASES.has(db)) return true;
  const locality = inferVenueLocalityLabel(name, address);
  if (locality && !haystackIncludesCityToken(haystack, dbCity) && normalizeVenueTextKey(locality) !== db) {
    return true;
  }
  const inferred = inferCityNameFromText(name, address);
  if (inferred && normalizeVenueTextKey(inferred) !== db && !haystackIncludesCityToken(haystack, dbCity)) {
    return true;
  }
  return false;
}

function resolvePublicVenueCity(row) {
  const dbCity = cleanDisplayName(row.city);
  const name = row.name || row.title || '';
  const address = row.address || '';
  const inferred = inferCityNameFromText(name, address);
  const canonicalDb = canonicalizePublicCityName(dbCity);

  if (inferred) return routeCityToPublicDisplayName(inferred);
  if (canonicalDb) return routeCityToPublicDisplayName(canonicalDb);
  if (dbCity && dbCity !== 'Не указан') return routeCityToPublicDisplayName(dbCity);
  const locality = inferVenueLocalityLabel(name, address);
  return locality ? routeCityToPublicDisplayName(locality) : 'Не указан';
}

function venueRowMergeScore(row) {
  let score = (Number(row.events) || 0) * 1000;
  if (row.heroImageUrl) score += 500;
  if (String(row.pageStatus || '').toUpperCase() === 'PUBLISHED') score += 200;
  if (row.address) score += 50;
  if (row.shortDescription) score += 25;
  return score;
}

function mergePublicVenueHubRows(rows) {
  const groups = new Map();

  for (const row of rows) {
    const key = normalizePublicVenueMergeKey(row.name || row.title, row.city, row.address);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }

  const merged = [];
  for (const items of groups.values()) {
    if (items.length === 1) {
      const only = items[0];
      const canonicalName = canonicalVenueMergeTitle(only.name || only.title) || only.name;
      merged.push({ ...only, name: canonicalName, title: canonicalName, mergedVenueIds: [only.id] });
      continue;
    }

    const sorted = [...items].sort((a, b) => venueRowMergeScore(b) - venueRowMergeScore(a));
    const primary = sorted[0];
    const canonicalName = canonicalVenueMergeTitle(primary.name || primary.title) || primary.name;
    merged.push({
      ...primary,
      name: canonicalName,
      title: canonicalName,
      city: resolvePublicVenueCity(primary),
      events: items.reduce((sum, item) => sum + (Number(item.events) || 0), 0),
      waterEvents: items.reduce((sum, item) => sum + (Number(item.waterEvents) || 0), 0),
      busEvents: items.reduce((sum, item) => sum + (Number(item.busEvents) || 0), 0),
      heroImageUrl: sorted.find((item) => item.heroImageUrl)?.heroImageUrl || primary.heroImageUrl,
      shortDescription: sorted.find((item) => item.shortDescription)?.shortDescription || primary.shortDescription,
      description: sorted.find((item) => item.description)?.description || primary.description,
      address: sorted.find((item) => item.address)?.address || primary.address,
      mergedVenueIds: items.map((item) => item.id),
    });
  }

  return merged.sort((a, b) => (b.events - a.events) || String(a.name || '').localeCompare(String(b.name || ''), 'ru'));
}

function findMergedVenueGroup(rows, venueId) {
  if (!venueId) return null;
  return rows.find((row) => row.id === venueId || (row.mergedVenueIds || []).includes(venueId)) || null;
}

function venueGroupsOverlap(a, b) {
  const left = new Set(a?.mergedVenueIds || (a?.id ? [a.id] : []));
  return (b?.mergedVenueIds || (b?.id ? [b.id] : [])).some((id) => left.has(id));
}

export async function publicVenueHubRows(db, limit = 500, options = {}) {
  const now = Date.now();
  const cacheKey = `${limit}:${options.requireEvents === false ? 'all' : 'hub'}`;
  if (publicVenueHubCache?.cacheKey === cacheKey && publicVenueHubCache.expiresAt > now) {
    return publicVenueHubCache.rows;
  }

  const [rows, sessions] = await Promise.all([venueRows(db, limit), publicCatalogSessions(db)]);
  const { activeCounts, waterCounts, busCounts, heroImageFallbacks, nextSessionStartsAt } = buildActiveVenueEventCounts(sessions);
  const enriched = rows.map((row) => ({
    ...row,
    events: activeCounts.get(row.id) || 0,
    waterEvents: waterCounts.get(row.id) || 0,
    busEvents: busCounts.get(row.id) || 0,
    heroImageUrl: resolveVenueHeroImageUrl(row, heroImageFallbacks),
    nextSessionStartsAt: nextSessionStartsAt.get(row.id) || null,
  }));
  const merged = mergePublicVenueHubRows(enriched.filter((row) => isPublicVenueHub(row, options)));
  publicVenueHubCache = {
    cacheKey,
    expiresAt: now + PUBLIC_CATALOG_CACHE_MS,
    rows: merged,
  };
  if (!publicVenueCatalogLists || publicVenueCatalogLists.expiresAt <= now) {
    if (options.requireEvents !== false) {
      publicVenueCatalogLists = {
        expiresAt: now + PUBLIC_CATALOG_CACHE_MS,
        institution: [],
        location: [],
      };
      for (const row of merged) {
        const item = mapPublicVenueListItem(row);
        if (item.template === 'institution') publicVenueCatalogLists.institution.push(item);
        else publicVenueCatalogLists.location.push(item);
      }
    }
  }
  return merged;
}

const PUBLIC_VENUE_ROW_SELECT = `
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
`;

async function resolvePublicVenueRow(db, venueSlugOrId) {
  const value = String(venueSlugOrId || '').trim();
  if (!value) return null;

  const candidates = new Set([value]);
  try {
    candidates.add(decodeURIComponent(value));
  } catch {
    // ignore malformed URI sequences
  }
  candidates.add(publicCitySlug(value));
  candidates.add(stripOpaqueVenueIdSuffix(publicCitySlug(value)));
  for (const candidate of [...candidates]) {
    const result = await db.query(`${PUBLIC_VENUE_ROW_SELECT} where venue.slug = $1 or venue.id = $1 limit 1`, [candidate]);
    if (result.rows[0]) return result.rows[0];
  }

  const suffix = extractOpaqueIdSuffix(value);
  if (suffix) {
    const suffixResult = await db.query(`${PUBLIC_VENUE_ROW_SELECT} where venue.id = $1 or venue.id = $2 limit 1`, [`venue_${suffix}`, suffix]);
    if (suffixResult.rows[0]) return suffixResult.rows[0];
  }

  return resolvePublicVenueRowByComputedSlug(db, value);
}

function normalizePublicVenueSlugKey(value) {
  return dedupeVenueSlugSuffix(stripOpaqueVenueIdSuffix(publicCitySlug(value) || value));
}

async function resolvePublicVenueRowByComputedSlug(db, requestedSlug) {
  const normalized = normalizePublicVenueSlugKey(requestedSlug);
  if (!normalized) return null;

  const numericSuffix = normalized.match(/-(\d+)$/);
  if (numericSuffix) {
    for (const venueId of [`venue_tep_${numericSuffix[1]}`, `venue_${numericSuffix[1]}`]) {
      const result = await db.query(`${PUBLIC_VENUE_ROW_SELECT} where venue.id = $1 limit 1`, [venueId]);
      const row = result.rows[0];
      if (row && publicVenueSlug(row.slug, row.title, row.id) === normalized) return row;
    }
  }

  const prefixResult = await db.query(
    `${PUBLIC_VENUE_ROW_SELECT}
     where venue.slug = $1
        or venue.slug like $2
     order by length(venue.slug) asc
     limit 24`,
    [normalized, `${normalized}-%`],
  );
  for (const row of prefixResult.rows) {
    if (publicVenueSlug(row.slug, row.title, row.id) === normalized) return row;
  }

  const cyrillicResult = await db.query(
    `${PUBLIC_VENUE_ROW_SELECT} where venue.slug ~ '[А-Яа-яЁё]' order by venue."updatedAt" desc nulls last limit 1200`,
  );
  for (const row of cyrillicResult.rows) {
    if (publicVenueSlug(row.slug, row.title, row.id) === normalized) return row;
  }

  return null;
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

function isWeakVenueLeadText(value) {
  const text = String(cleanImportedDescription(value) || '').trim();
  if (!text) return true;
  if (text.length < 24) return true;
  if (/^(легенда|описание|текст|n\/a|нет|—|-)$/i.test(text)) return true;
  return false;
}

function pickPublicVenueDescriptionText(shortDescription, description) {
  const full = cleanImportedDescription(description);
  if (full) return full;
  const short = cleanImportedDescription(shortDescription);
  if (short && !isWeakVenueLeadText(short)) return short;
  return null;
}

function truncateVenueLeadText(text, maxLength = 220) {
  const value = String(text || '').trim();
  if (value.length <= maxLength) return value;
  const slice = value.slice(0, maxLength - 1).trimEnd();
  const lastSpace = slice.lastIndexOf(' ');
  const clipped = lastSpace > Math.floor(maxLength * 0.55) ? slice.slice(0, lastSpace) : slice;
  return `${clipped}...`;
}

function pickPublicVenueLeadText(shortDescription, description) {
  const full = cleanImportedDescription(description);
  const short = cleanImportedDescription(shortDescription);
  if (short && !isWeakVenueLeadText(short)) return short;
  if (!full) return null;
  return truncateVenueLeadText(full);
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
    mergeGroupKey: row.mergeGroupKey,
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
        venue.description,
        venue."heroImageUrl",
        city.title as city,
        venue.address,
        venue.kind,
        venue."pageStatus",
        count(event.id)::int as events,
        count(event.id) filter (where ${PUBLIC_WATER_EVENT_SQL})::int as "waterEvents"
      from "Venue" venue
      left join "City" city on city.id = venue."cityId"
      left join "Event" event on event."venueId" = venue.id
      left join "Category" cat on cat.id = event."categoryId"
      left join "Subcategory" sub on sub.id = event."primarySubcategoryId"
      group by venue.id, city.title
      order by events desc, venue.title asc
      limit $1
    `,
    [limit],
  );

  return result.rows.map((row) => {
    const name = formatPublicVenueTitle(row.name);
    const mapped = {
      id: row.id,
      slug: row.slug,
      name,
      city: row.city || 'Не указан',
      address: row.address,
      shortDescription: row.shortDescription,
      heroImageUrl: row.heroImageUrl,
      proposedKind: String(row.kind || 'OTHER').toLowerCase(),
      kind: String(row.kind || 'OTHER').toUpperCase(),
      pageStatus: String(row.pageStatus || 'NONE').toLowerCase(),
      reason: row.pageStatus === 'CANDIDATE' ? 'кандидат на public-страницу' : 'пока только локация',
      events: row.events,
      waterEvents: row.waterEvents,
    };
    mapped.city = resolvePublicVenueCity(mapped);
    return applyPublicVenueNormalization(mapped);
  });
}

const PUBLIC_VENUE_HUB_EXCLUDED_KINDS = new Set(['MEETING_POINT', 'ONLINE']);

const INSTITUTION_VENUE_KINDS = new Set(['MUSEUM_ART_SPACE', 'THEATER', 'CONCERT_HALL', 'CLUB_BAR_RESTAURANT', 'BAR']);

function normalizeVenueKindValue(value) {
  return String(value || 'OTHER')
    .trim()
    .toUpperCase()
    .replace(/-/g, '_');
}

export function publicVenuePageTemplate(kind) {
  const normalized = normalizeVenueKindValue(kind);
  return INSTITUTION_VENUE_KINDS.has(normalized) ? 'institution' : 'location';
}

const MEETING_POINT_TEXT_RE =
  /место сбора|место встречи|точка сбора|точка встречи|площадка:|^метро\b|^м\.(?:\s|«|"|')|\bм\.\s*(?:«|[а-яё])|\bу метро\b|около метро|у памятник|памятник|\bпам\.|\bу пам\b|пл\.\s*у\s*пам/iu;

function hasMeetingPointSignals(name, address, shortDescription, description) {
  const text = `${venueNameAddressText(name, address)} ${shortDescription || ''} ${description || ''}`.toLowerCase();
  return MEETING_POINT_TEXT_RE.test(text);
}

function isMeetingPointLikeRow(row) {
  const resolved = resolvePublicVenueKindFromRow(row);
  if (resolved === 'bus') return false;
  if (resolved === 'meeting_point') return true;
  const name = `${row.name || row.title || ''} ${row.address || ''}`.toLowerCase();
  return MEETING_POINT_TEXT_RE.test(name);
}

function venueNameAddressText(name, address) {
  return `${name || ''} ${address || ''}`.toLowerCase();
}

const PUBLIC_WATER_EVENT_TEXT_RE =
  /водн|речн|теплоход|катер|яхт|корабл|судн|лодк|канал|круиз|развод.*мост|мост.*развод|прогулк/i;

const PUBLIC_WATER_EVENT_SQL = `
  (
    coalesce(cat.title, '') ~* 'водн|речн|теплоход|катер'
    or coalesce(sub.title, '') ~* 'водн|речн|теплоход|катер'
    or coalesce(event.title, '') ~* 'теплоход|катер|яхт|корабл|судн|лодк|речн|река|канал|круиз|развод.*мост|мост.*развод|прогулк'
    or exists (
      select 1
      from "EventTag" event_tag
      join "Tag" tag on tag.id = event_tag."tagId"
      where event_tag."eventId" = event.id
        and tag.title ~* 'водн|речн|теплоход|катер|яхт|корабл'
    )
    or exists (
      select 1
      from "EventOffer" event_offer
      where event_offer."eventId" = event.id
        and event_offer.active = true
        and event_offer."sourceCode"::text = 'TEPLOHOD'
    )
  )
`;

function isWaterCatalogSession(session) {
  if (!session) return false;
  if (String(session.sourceCode || '').toUpperCase().includes('TEPLOHOD')) return true;
  const text = [session.category, session.title, ...(session.tags || []), session.sourceCode].filter(Boolean).join(' ').toLowerCase();
  return PUBLIC_WATER_EVENT_TEXT_RE.test(text);
}

function hasWaterOnlyEvents(waterEvents, totalEvents) {
  const water = Number(waterEvents || 0);
  const total = Number(totalEvents || 0);
  return total > 0 && water >= total;
}

const PUBLIC_BUS_EVENT_TEXT_RE =
  /автобус|автобусн|hop[\s-]?on|hop[\s-]?off|city[\s-]?sightseeing|city[\s-]?tour|сити[\s-]?тур|двухэтажн|садись[\s-]?руляй/i;

function isBusCatalogSession(session) {
  if (!session) return false;
  const text = [session.category, session.title, ...(session.tags || []), ...(session.subcategories || [])]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return PUBLIC_BUS_EVENT_TEXT_RE.test(text);
}

function hasBusOnlyEvents(busEvents, totalEvents) {
  const bus = Number(busEvents || 0);
  const total = Number(totalEvents || 0);
  return total > 0 && bus >= total;
}

function hasActiveBusCatalogEvents(busEvents) {
  return Number(busEvents || 0) > 0;
}

function hasBusLikeText(name, address) {
  const text = venueNameAddressText(name, address);
  if (
    /автобус|bus[\s-]?stop|авт\.?\s*остан|автобусн(?:ая|ой)?\s+останов|остановк.*автобус|hop[\s-]?on|hop[\s-]?off|city[\s-]?sightseeing|city[\s-]?tour|сити[\s-]?тур|двухэтажн|маршрут.*автобус|садись[\s-]?руляй|^автобус$/i.test(
      text,
    )
  ) {
    return true;
  }
  if (/\bсектор\s*[«"'][A-ZBCАВСЕ]/i.test(text)) {
    if (/причал|пристань|набереж|речн|канал|фонтанк|мойк|нев|мост|устьин|китай/i.test(text)) return false;
    return true;
  }
  return false;
}

function isTransportVehicleVenueName(name) {
  const text = String(name || '').trim();
  if (!text) return false;
  if (/^yutong\b|^маз\b|^паз\b|^hyundai\b|^mercedes\b|^volvo\b|^man\b|^ikarus\b/i.test(text)) return true;
  if (/^[a-zа-яё][a-zа-яё\s-]{0,20}\d{3,5}$/i.test(text) && text.length <= 28) return true;
  return false;
}

function isJunkPublicVenueRow(row) {
  const name = String(row?.name || row?.title || '').trim();
  const address = String(row?.address || '').trim();
  const text = venueNameAddressText(name, address);

  if (isTransportVehicleVenueName(name)) return true;
  if (/^на парковке\b|парковк.*турист|турист.*транспорт|парковка.*(?:трц|торгов|молл)/i.test(text)) {
    if (Number(row?.busEvents || 0) <= 0) return true;
  }
  if (/^wc\b|^туалет\b|^кондиционер\b/i.test(name)) return true;

  const resolved = resolvePublicVenueKindFromRow(row);
  if (resolved === 'meeting_point' && !hasActiveBusCatalogEvents(row?.busEvents)) return true;

  return false;
}

function buildActiveVenueEventCounts(sessions) {
  const activeCounts = new Map();
  const waterCounts = new Map();
  const busCounts = new Map();
  const heroImageFallbacks = new Map();
  const nextSessionStartsAt = new Map();
  const seen = new Map();
  const now = Date.now();

  for (const session of sessions || []) {
    if (!session?.venueId) continue;
    if (!seen.has(session.venueId)) seen.set(session.venueId, new Set());
    const keys = seen.get(session.venueId);
    const key = session.groupKey || session.id;
    if (!key || keys.has(key)) continue;
    keys.add(key);
    activeCounts.set(session.venueId, (activeCounts.get(session.venueId) || 0) + 1);
    if (isWaterCatalogSession(session)) {
      waterCounts.set(session.venueId, (waterCounts.get(session.venueId) || 0) + 1);
    }
    if (isBusCatalogSession(session)) {
      busCounts.set(session.venueId, (busCounts.get(session.venueId) || 0) + 1);
    }
    if (!heroImageFallbacks.has(session.venueId)) {
      const imageUrl = pickRealPublicImageUrl(session.imageUrl);
      if (imageUrl) heroImageFallbacks.set(session.venueId, imageUrl);
    }
    if (session.startsAt) {
      const at = parseSessionStartsAt(session.startsAt).getTime();
      if (Number.isFinite(at) && at >= now - 30 * 60 * 1000) {
        const previous = nextSessionStartsAt.get(session.venueId);
        if (!previous || at < previous) nextSessionStartsAt.set(session.venueId, session.startsAt);
      }
    }
  }

  return { activeCounts, waterCounts, busCounts, heroImageFallbacks, nextSessionStartsAt };
}

function pickRealPublicImageUrl(value) {
  const url = String(value || '').trim();
  if (!url) return null;
  if (url.startsWith('/images/cities/')) return null;
  return /^https?:\/\//i.test(url) ? url : null;
}

function resolveVenueHeroImageUrl(row, heroImageFallbacks = null) {
  const stored = pickRealPublicImageUrl(row?.heroImageUrl);
  if (stored) return stored;

  const venueIds = row?.mergedVenueIds || (row?.id ? [row.id] : []);
  for (const venueId of venueIds) {
    const fallback = heroImageFallbacks?.get(venueId);
    if (fallback) return fallback;
  }

  return row?.heroImageUrl || null;
}

function hasStrongPierLocationText(name, address) {
  const text = venueNameAddressText(name, address);
  if (/смотров(?:ая|ой|ую|ые)\s+площадк/i.test(text)) return false;
  if (/пассажирск(?:ий|ого|ая|ые)\s+терминал/i.test(text)) return true;
  if (/морск(?:ой|ого|ая|ые)\s+вокзал/i.test(text)) return true;
  if (/речн(?:ой|ая|ого|ые)?\s+(?:вокзал|порт)/i.test(text)) return true;
  if (/причал|пристань/i.test(text)) return true;
  if (/набереж/i.test(text) && /(?:терминал|вокзал|порт)/i.test(text)) return true;
  return false;
}

function hasPierLikeText(name, address) {
  return hasStrongPierLocationText(name, address);
}

function isViewingPlatformLikeVenue(name, address, shortDescription, description) {
  const text = [name, address, shortDescription, description].filter(Boolean).join(' ');
  return /смотров(?:ая|ой|ую|ые)\s+площадк|smotrovaya|viewing platform|observation deck/i.test(text);
}

function isBarLikeFromText(text) {
  const t = String(text || '').trim().toLowerCase();
  if (!t) return false;
  if (/(?:^|[\s«"'(\[]|-)(?:бар|паб)(?:[\s"'»)\],!.]|$)/u.test(t)) return true;
  if (/\bpub\b|(?:^|[\s-])bar(?:[\s.-]|$)|-bar\b|\bbar\b|barrock|music\s*bar|lounge[\s-]?bar|bar$/iu.test(t)) return true;
  if (/концертный бар|рок-бар|коктейльн(?:ый|ого) бар|музыкальн(?:ый|ого) бар|ночной бар/iu.test(t)) return true;
  return false;
}

function isClubRestaurantLikeFromText(text) {
  const t = String(text || '').trim().toLowerCase();
  if (!t || isBarLikeFromText(t)) return false;
  if (
    /ресторан|кафе|гастроном|пивной ресторан|ресторан-клуб|музыкальн(?:ый|ого) ресторан|баварск|грузинск|хачапури|хинкали|гостеприимств|oktoberfest|пивоварен/iu.test(
      t,
    )
  ) {
    return true;
  }
  if (
    /ночной клуб|музыкальн(?:ый|ого) клуб|концертный клуб|клубный ресторан|арт-пространств[^\n]{0,48}клуб|клуб[^\n]{0,24}арт-пространств|(?:^|[\s«"'(\[]|-)(?:клуб)(?:[\s"'»)\],!.]|$)/u.test(
      t,
    )
  ) {
    return true;
  }
  return /\bclub\b/i.test(t) && !/concert hall|concert-hall/i.test(t);
}

function inferBarOrClubFromContent(name, address, shortDescription, description) {
  const content = [name, address, shortDescription, description].filter(Boolean).join(' ');
  if (isBarLikeVenue(name, address) || isBarLikeFromText(content)) return 'bar';
  if (isClubRestaurantLikeFromText(content)) return 'club_bar_restaurant';
  return null;
}

function isBarLikeVenue(name, address) {
  const nameText = String(name || '').trim().toLowerCase();
  if (!nameText) return false;
  if (/(?:^|[\s«"'(\[]|-)(?:бар|паб)(?:[\s"'»)\],!.]|$)/u.test(nameText)) return true;
  return /\bpub\b|(?:^|[\s-])bar(?:[\s.-]|$)|-bar\b|\bbar\b|barrock|music\s*bar|lounge[\s-]?bar|bar$/iu.test(nameText);
}

function inferPublicVenueKindFromName(name, address) {
  const text = venueNameAddressText(name, address);
  if (MEETING_POINT_TEXT_RE.test(text)) return 'meeting_point';
  if (/смотров(?:ая|ой|ую|ые)\s+площадк/i.test(text)) return 'museum_art_space';
  if (hasBusLikeText(name, address)) return 'bus';
  if (hasStrongPierLocationText(name, address)) return 'pier';
  if (/турбаз|база отдыха|глэмпинг/i.test(text)) return 'outdoor_location';
  if (/театр|teatr/i.test(text)) return 'theater';
  if (/музей|галере|выстав/i.test(text)) return 'museum_art_space';
  if (isBarLikeVenue(name, address)) return 'bar';
  if (/банкет|\bзал\b|hall|концерт|филармони|дворец/i.test(text)) return 'concert_hall';
  if (/клуб|\bclub\b|ресторан|кафе/i.test(text)) return 'club_bar_restaurant';
  if (/стадион|арена|спорт|каток/i.test(text)) return 'sport_activity_space';
  if (/\bпарк\b|сквер/i.test(text)) return 'outdoor_location';
  return 'venue';
}

function canonicalStoredVenueKind(storedKind) {
  const stored = normalizeVenueKindValue(storedKind).toLowerCase();
  if (stored === 'pier_water' || stored === 'pier') return 'pier';
  return stored;
}

function resolvePublicVenueKind(storedKind, name, address, options = {}) {
  const stored = canonicalStoredVenueKind(storedKind);
  const inferred = inferPublicVenueKindFromName(name, address);
  const { shortDescription, description, waterEvents = 0, busEvents = 0, totalEvents = 0 } = options;
  const text = venueNameAddressText(name, address);
  const busByAllEvents =
    hasBusOnlyEvents(busEvents, totalEvents) && !/teplohod|теплоход|причал|пристань/i.test(text);
  const busByCatalogEvents = hasActiveBusCatalogEvents(busEvents);

  if (inferred === 'bus' || hasBusLikeText(name, address) || busByAllEvents || busByCatalogEvents) {
    return 'bus';
  }

  if (
    inferred === 'meeting_point' ||
    stored === 'meeting_point' ||
    hasMeetingPointSignals(name, address, shortDescription, description)
  ) {
    return 'meeting_point';
  }

  const barOrClub = inferBarOrClubFromContent(name, address, shortDescription, description);
  if (barOrClub) return barOrClub;

  if (isViewingPlatformLikeVenue(name, address, shortDescription, description)) {
    return 'museum_art_space';
  }

  if (
    stored === 'pier' ||
    hasStrongPierLocationText(name, address) ||
    hasPierLikeText(name, address) ||
    inferred === 'pier' ||
    (hasWaterOnlyEvents(waterEvents, totalEvents) && !isViewingPlatformLikeVenue(name, address, shortDescription, description))
  ) {
    return 'pier';
  }

  if (INSTITUTION_VENUE_KINDS.has(normalizeVenueKindValue(storedKind))) {
    return stored;
  }

  if (stored === 'other' || stored === 'venue') {
    return inferred;
  }

  if (stored === 'theater' && inferred !== 'theater') {
    return inferred;
  }

  return stored;
}

function resolvePublicVenueKindFromRow(row) {
  const override = findVenueOverride({
    id: row.id,
    title: row.name || row.title,
    name: row.name || row.title,
  });
  const storedKind = override?.kind || row.kind || row.proposedKind;
  return resolvePublicVenueKind(storedKind, row.name || row.title, row.address, {
    shortDescription: row.shortDescription,
    description: row.description,
    waterEvents: Number(row.waterEvents || 0),
    busEvents: Number(row.busEvents || 0),
    totalEvents: Number(row.events || 0),
  });
}

function isPublicVenueHub(row, options = {}) {
  const requireEvents = options.requireEvents !== false;
  if (!row) return false;
  const kind = normalizeVenueKindValue(row.kind || row.proposedKind);
  if (PUBLIC_VENUE_HUB_EXCLUDED_KINDS.has(kind)) {
    if (!(kind === 'MEETING_POINT' && hasActiveBusCatalogEvents(row.busEvents))) return false;
  }
  if (isMeetingPointLikeRow(row)) return false;
  if (isJunkPublicVenueRow(row)) return false;
  if (String(row.pageStatus || '').toUpperCase() === 'HIDDEN') return false;
  if (requireEvents && Number(row.events) <= 0) return false;
  return true;
}

function applyPublicVenueDisplayName(row, type) {
  const name = row.name || row.title;
  if (type === 'bus') return formatBusLocationDisplayName(name, row.address, row.city);
  if (type === 'pier') return formatPierLocationDisplayName(name, row.address, row.city);
  return name;
}

function mapPublicVenueListItem(row) {
  const normalized = applyPublicVenueNormalization(row);
  const type = resolvePublicVenueKindFromRow(normalized);
  const name = applyPublicVenueDisplayName(normalized, type);
  const shortDescription = pickPublicVenueLeadText(normalized.shortDescription, normalized.description);
  return {
    id: normalized.id,
    slug: publicVenueSlug(normalized.slug, name, normalized.id),
    name,
    city: normalized.city,
    address: normalized.address,
    type,
    template: publicVenuePageTemplate(type),
    pageStatus: normalized.pageStatus,
    shortDescription,
    heroImageUrl: normalized.heroImageUrl,
    events: normalized.events,
    categories: {},
    nextSlot: normalized.nextSessionStartsAt ? formatTime(normalized.nextSessionStartsAt) : null,
  };
}

export async function buildPublicVenuesCatalog(db, searchParams = new URLSearchParams()) {
  const limit = clampNumber(searchParams.get('limit'), 1, 500, 240);
  const query = String(searchParams.get('q') || '').trim().toLowerCase();
  const cityFilter = String(searchParams.get('city') || '').trim().toLowerCase();
  const typeFilter = String(searchParams.get('type') || '').trim().toLowerCase();
  const familyFilter = String(searchParams.get('family') || '').trim().toLowerCase();

  if (!query && !cityFilter && !typeFilter && familyFilter) {
    const warmList = warmVenueCatalogList(familyFilter);
    if (warmList) {
      const venues = warmList.slice(0, limit);
      const cities = countBy(venues.map((venue) => venue.city).filter(Boolean));
      const types = countBy(venues.map((venue) => venue.type).filter(Boolean));
      return {
        generatedAt: new Date().toISOString(),
        total: venues.length,
        venues,
        stats: {
          venues: venues.length,
          cities,
          types,
        },
      };
    }
  }

  const rows = await publicVenueHubRows(db, 500);
  const venues = rows
    .filter((row) => {
      if (!query) return true;
      return [row.name, row.city, row.address, row.proposedKind].filter(Boolean).join(' ').toLowerCase().includes(query);
    })
    .filter((row) => {
      if (!cityFilter) return true;
      const citySlug = publicCitySlug(row.city || '');
      return citySlug === cityFilter || String(row.city || '').toLowerCase().includes(cityFilter);
    })
    .filter((row) => {
      if (!typeFilter) return true;
      return resolvePublicVenueKindFromRow(row) === typeFilter;
    })
    .filter((row) => {
      if (!familyFilter) return true;
      const template = publicVenuePageTemplate(resolvePublicVenueKindFromRow(row));
      return template === familyFilter;
    })
    .slice(0, limit)
    .map(mapPublicVenueListItem);

  const cities = countBy(venues.map((venue) => venue.city).filter(Boolean));
  const types = countBy(venues.map((venue) => venue.type).filter(Boolean));
  return {
    generatedAt: new Date().toISOString(),
    total: venues.length,
    venues,
    stats: {
      venues: venues.length,
      cities,
      types,
    },
  };
}

export function buildPublicDestinationRowsFromSessions(sessions) {
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
    .filter((bucket) => bucket.events >= PUBLIC_DESTINATION_MIN_EVENTS)
    .filter(isAllowedPublicDestination)
    .sort(destinationSort);
}

async function destinationRows(db) {
  const sessions = await publicCatalogSessions(db);
  return buildPublicDestinationRowsFromSessions(sessions);
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
          override.title as "overrideTitle",
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
          min(session."startsAt") filter (where ${ACTIVE_SESSION_SQL}) as "startsAt",
          count(distinct session.id) filter (where ${ACTIVE_SESSION_SQL})::int as "slotCount",
          min(e."priceFromRub") filter (where e."priceFromRub" >= $1) as "eventPriceFromRub",
          min(session."priceFromRub") filter (where ${ACTIVE_SESSION_SQL} and session."priceFromRub" >= $1) as "sessionPriceFromRub",
          min(primary_offer."priceRub") filter (where primary_offer."priceRub" >= $1) as "offerPriceRub",
          bool_or(
            primary_offer."widgetUrl" is not null
            or primary_offer."deeplinkUrl" is not null
            or (
              coalesce(source.code::text, primary_offer."sourceCode"::text, '') in ('TICKETSCLOUD', 'TEPLOHOD')
              and source_link."externalId" is not null
            )
          ) as "widgetReady"
        from "Event" e
        left join "City" city on city.id = e."primaryCityId"
        left join "Region" region on region.id = city."regionId"
        left join "Venue" venue on venue.id = e."venueId"
        left join "EventOverride" override on override."eventId" = e.id
        left join "EventSourceLink" source_link on source_link."eventId" = e.id
        left join "Source" source on source.id = source_link."sourceId"
        left join "EventSession" session on session."eventId" = e.id
        left join primary_offer on primary_offer."eventId" = e.id
        where e.status not in ('HIDDEN', 'DRAFT')
        group by
          e.id,
          source.name,
          source.code,
          source_link."externalId",
          primary_offer."sourceCode",
          override.id,
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
          ) as "priceFrom",
          (
            "widgetReady"
            and (
              coalesce("slotCount", 0) > 0
              or kind = 'OPEN_DATE'
              or "sourceStatus" = 'open_date'
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
            lower(regexp_replace(trim(coalesce(
              nullif(trim(${catalogGroupTitleSqlExpression()}), ''),
              trim(coalesce(venue, ''))
            )), '\\s+', ' ', 'g')),
            lower(regexp_replace(trim(coalesce(city, '')), '\\s+', ' ', 'g')),
            lower(regexp_replace(trim(coalesce(venue, '')), '\\s+', ' ', 'g'))
          ) as "groupKey"
        from normalized
        where "priceFrom" >= $1
          and "purchaseReady" = true
          and lower(coalesce("sourceStatus", '')) not in ('widget_blocked', 'paused', 'suspended', 'stopped', 'cancelled', 'canceled', 'draft', 'hidden')
          and (
            "startsAt" is not null
            or kind = 'OPEN_DATE'
            or "sourceStatus" = 'open_date'
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
    .filter((bucket) => bucket.events >= PUBLIC_DESTINATION_MIN_EVENTS)
    .filter(isAllowedPublicDestination)
    .sort(destinationSort);
}

function publicDestinationForCity(row) {
  const cityName = cleanDisplayName(row.city) || 'Не указан';

  if (STANDALONE_CITY_NAMES.has(cityName)) {
    return buildPublicDestinationRecord(row, cityName);
  }

  if (isPublicRegionName(cityName)) {
    return buildPublicDestinationRecord(row, cityName);
  }

  const mappedRegion = CITY_TO_REGION.get(cityName);
  if (mappedRegion) {
    return buildPublicDestinationRecord(row, mappedRegion);
  }

  if (row.cityIsDestination === false && row.regionTitle) {
    return buildPublicDestinationRecord(row, row.regionTitle);
  }

  const routed = routeCityToPublicDisplayName(cityName);
  return buildPublicDestinationRecord(row, routed);
}

export function publicDestinationFromSession(session) {
  const name = cleanDisplayName(session.destination) || cleanDisplayName(session.city) || 'Не указан';
  let type = session.destinationType === 'region' ? 'region' : 'city';
  if (type === 'city' && isPublicRegionName(name)) type = 'region';
  if (type === 'region' && STANDALONE_CITY_NAMES.has(name)) type = 'city';
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

function destinationSessionIndexKeys(session) {
  const destination = publicDestinationFromSession(session);
  const keys = new Set();
  const add = (value) => {
    const normalized = String(value || '').trim();
    if (!normalized) return;
    keys.add(normalized.toLowerCase());
    const canonical = canonicalCitySlug(normalized);
    if (canonical) keys.add(canonical.toLowerCase());
  };

  add(destination.id);
  add(destination.slug);
  add(destination.sourceSlug);
  add(destination.name);
  add(session.cityId);
  add(session.sourceCitySlug);
  add(session.city);

  return keys;
}

function buildDestinationSessionIndex(sessions) {
  const index = new Map();
  for (const session of sessions) {
    for (const key of destinationSessionIndexKeys(session)) {
      if (!index.has(key)) index.set(key, []);
      index.get(key).push(session);
    }
  }
  return index;
}

function buildVenueSessionIndex(sessions) {
  const index = new Map();
  const add = (key, session) => {
    if (!key) return;
    const normalized = String(key).toLowerCase();
    if (!index.has(normalized)) index.set(normalized, []);
    index.get(normalized).push(session);
  };

  for (const session of sessions) {
    add(session.venueId, session);
    add(session.venueSlug, session);
    if (session.venueSlug) add(canonicalCitySlug(session.venueSlug), session);
    const pierKey = canonicalSessionPierKey(session);
    if (pierKey) add(`pier:${pierKey}`, session);
  }

  return index;
}

function buildCatalogSlugIndex(sessions) {
  const index = new Map();
  const add = (key, session) => {
    if (!key) return;
    const normalized = String(key).toLowerCase();
    if (!index.has(normalized)) index.set(normalized, session);
  };

  for (const session of sessions) {
    add(session.id, session);
    add(session.slug, session);
    add(session.sourceSlug, session);
    if (session.sourceSlug) add(publicEventSlug(session.sourceSlug), session);
    if (session.slug) add(publicEventSlug(session.slug), session);
    for (const eventId of session.groupEventIds || []) add(eventId, session);
  }

  return index;
}

function collectVenueSessionLookupContexts(venue, mergedGroup) {
  const contexts = [];
  const seen = new Set();
  const add = (row) => {
    if (!row) return;
    const key = `${row.name || row.title || ''}|${row.address || ''}`;
    if (seen.has(key)) return;
    seen.add(key);
    contexts.push(row);
  };

  add(venue);
  add(mergedGroup);
  return contexts;
}

function pierKeysForVenueContexts(venueContexts = []) {
  const keys = new Set();
  for (const context of venueContexts) {
    const pierKey = canonicalPierLocationKey(context.name || context.title, context.address);
    if (pierKey) keys.add(pierKey);
  }
  return keys;
}

function sortVenueCatalogSessions(sessions) {
  return sessions.sort((a, b) => {
    const aTime = Date.parse(a.startsAt || '') || Number.POSITIVE_INFINITY;
    const bTime = Date.parse(b.startsAt || '') || Number.POSITIVE_INFINITY;
    return aTime - bTime || String(a.title || '').localeCompare(String(b.title || ''), 'ru');
  });
}

function lookupVenueCatalogSessions(venueIds, catalogSessions, venueContexts = []) {
  if (!venueIds?.length && !venueContexts.length) return [];

  const pierKeys = pierKeysForVenueContexts(venueContexts);
  const index = publicCatalogCache?.venueIndex;
  if (index) {
    const seen = new Set();
    const result = [];
    const collect = (session) => {
      if (!session || seen.has(session.id)) return;
      seen.add(session.id);
      result.push(session);
    };

    for (const venueId of venueIds || []) {
      for (const session of index.get(String(venueId).toLowerCase()) || []) collect(session);
    }
    for (const pierKey of pierKeys) {
      for (const session of index.get(`pier:${pierKey}`) || []) collect(session);
    }
    if (result.length) return sortVenueCatalogSessions(result);
  }

  const idSet = new Set(venueIds || []);
  const matched = catalogSessions.filter((session) => {
    if (idSet.has(session.venueId)) return true;
    const pierKey = canonicalSessionPierKey(session);
    return pierKey && pierKeys.has(pierKey);
  });
  return sortVenueCatalogSessions(matched);
}

function lookupCatalogSessionBySlug(slugOrId, catalogSessions = null) {
  const value = String(slugOrId || '').trim();
  if (!value) return null;

  const requestedSlug = publicEventSlug(value);
  const keys = [value, requestedSlug].filter(Boolean).map((key) => String(key).toLowerCase());
  const index = publicCatalogCache?.slugIndex;
  if (index) {
    for (const key of keys) {
      const hit = index.get(key);
      if (hit) return hit;
    }
  }

  const sessions = catalogSessions || publicCatalogCache?.sessions || [];
  return (
    sessions.find(
      (session) =>
        session.id === value ||
        session.slug === requestedSlug ||
        session.sourceSlug === value ||
        publicEventSlug(session.sourceSlug) === requestedSlug ||
        (session.groupEventIds || []).includes(value),
    ) || null
  );
}

export function lookupDestinationCatalogSessions(citySlugOrId, requestedSlug, catalogSessions) {
  const index = publicCatalogCache?.destinationIndex;
  if (index) {
    for (const key of [requestedSlug, String(citySlugOrId || '').toLowerCase(), canonicalCitySlug(citySlugOrId)].filter(Boolean)) {
      const hit = index.get(String(key).toLowerCase());
      if (hit?.length) return hit;
    }
  }

  return catalogSessions.filter((session) => matchesPublicDestinationPage(session, citySlugOrId, requestedSlug));
}

export function publicVenuesForSessionsFromHub(sessions, hubRows, limit) {
  const venueIds = new Set(sessions.map((session) => session.venueId).filter(Boolean));
  if (!venueIds.size) return [];
  return hubRows
    .filter((row) => (row.mergedVenueIds || [row.id]).some((id) => venueIds.has(id)))
    .slice(0, limit)
    .map(mapPublicVenueListItem);
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

export function destinationPrepositional(destination) {
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

export async function publicCatalogSessions(db, forceRefresh = false) {
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
      destinationIndex: buildDestinationSessionIndex(rows),
      venueIndex: buildVenueSessionIndex(rows),
      slugIndex: buildCatalogSlugIndex(rows),
      catalogFacets: buildCatalogFacets(rows.filter(sessionHasCoverImage)),
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
  const [result, pinnedResult] = await Promise.all([
    db.query(
    `
      with event_identity as (
        select distinct on (identity."eventId")
          identity."eventId",
          identity."sourceId",
          identity."externalId",
          identity."sourceUrl"
        from (
          select
            link."eventId",
            link."sourceId",
            link."externalId",
            link."sourceUrl",
            link."updatedAt",
            0 as priority
          from "ProviderLink" link
          where link."entityKind" = 'EVENT'
            and link."eventId" is not null

          union all

          select
            link."eventId",
            link."sourceId",
            link."externalId",
            link."sourceUrl",
            link."updatedAt",
            1 as priority
          from "EventSourceLink" link
        ) identity
        order by identity."eventId", identity.priority, identity."updatedAt" desc
      ),
      primary_offer as (
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
          identity."externalId",
          source.code as "sourceCode",
          source.name as "sourceName",
          coalesce(source.name, source.code::text, primary_offer."sourceCode"::text, '') as "sourceLabel",
          e.title,
          e.description,
          e.kind,
          e."sourceStatus",
          e."ageLimit",
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
          venue.address as "venueAddress",
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
          min(session."startsAt") filter (where ${ACTIVE_SESSION_SQL}) as "startsAt",
          min(session."priceFromRub") filter (where ${ACTIVE_SESSION_SQL} and session."priceFromRub" >= $1) as "sessionPriceFromRub",
          count(distinct session.id) filter (where ${ACTIVE_SESSION_SQL})::int as "slotCount",
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
        left join event_identity identity on identity."eventId" = e.id
        left join "Source" source on source.id = identity."sourceId"
        left join "EventOverride" override on override."eventId" = e.id
        left join "EventSession" session on session."eventId" = e.id
        left join primary_offer on primary_offer."eventId" = e.id
        where e.status not in ('HIDDEN', 'DRAFT')
        group by
          e.id,
          identity."externalId",
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
          venue.address,
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
            (
              "offerWidgetUrl" is not null
              or "offerDeeplinkUrl" is not null
              or (
                coalesce("sourceCode"::text, "offerSourceCode"::text, '') in ('TICKETSCLOUD', 'TEPLOHOD')
                and "externalId" is not null
              )
            )
            and (
              coalesce("slotCount", 0) > 0
              or kind = 'OPEN_DATE'
              or "sourceStatus" = 'open_date'
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
            lower(regexp_replace(trim(coalesce(
              nullif(trim(${catalogGroupTitleSqlExpression()}), ''),
              trim(coalesce(venue, ''))
            )), '\\s+', ' ', 'g')),
            lower(regexp_replace(trim(coalesce(city, '')), '\\s+', ' ', 'g')),
            lower(regexp_replace(trim(coalesce(venue, '')), '\\s+', ' ', 'g'))
          ) as "groupKey"
        from normalized
        where "priceFrom" >= $1
          and "purchaseReady" = true
          and lower(coalesce("sourceStatus", '')) not in ('widget_blocked', 'paused', 'suspended', 'stopped', 'cancelled', 'canceled', 'draft', 'hidden')
          and (
            "startsAt" is not null
            or kind = 'OPEN_DATE'
            or "sourceStatus" = 'open_date'
          )
      ),
      ranked as (
        select
          *,
          row_number() over (
            partition by "groupKey"
            order by case when lower(coalesce("sourceStatus", '')) in ('paused', 'suspended', 'stopped', 'cancelled', 'canceled', 'draft', 'hidden') then 1 else 0 end,
              case when kind = 'OPEN_DATE' or "sourceStatus" = 'open_date' then 1 else 0 end desc,
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
          max("priceFrom")::int as "priceTo",
          nullif(sum(coalesce("ticketsVacant", 0)), 0)::int as vacant,
          jsonb_agg(
            jsonb_build_object(
              'eventId', id,
              'startsAt', "startsAt",
              'externalId', "externalId",
              'sourceCode', "sourceCode",
              'sourceStatus', "sourceStatus",
              'offerSourceCode', "offerSourceCode",
              'offerWidgetUrl', "offerWidgetUrl",
              'offerDeeplinkUrl', "offerDeeplinkUrl",
              'vacant', "ticketsVacant"
            )
            order by case when lower(coalesce("sourceStatus", '')) in ('paused', 'suspended', 'stopped', 'cancelled', 'canceled', 'draft', 'hidden') then 1 else 0 end,
              "startsAt" asc nulls last
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
        rep."venueAddress",
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
        rep."ageLimit",
        rep."startsAt",
        rep.tags,
        rep.subcategories,
        grouped."groupKey",
        grouped."groupEventIds",
        grouped."groupedEventsCount",
        grouped."sessionCount",
        grouped."priceFrom",
        grouped."priceTo",
        rep."ticketsVacant" as vacant,
        grouped."upcomingSlots"
      from grouped
      join ranked rep on rep."groupKey" = grouped."groupKey" and rep.rank = 1
      order by rep."startsAt" asc nulls last, rep.title asc
    `,
    [MIN_DISPLAY_PRICE_RUB],
  ),
    db.query(`
      select distinct "eventId"
      from "LandingMatch"
      where coalesce(reasons->>'manualStatus', '') = 'PINNED'
    `),
  ]);

  const pinnedEventIds = new Set(pinnedResult.rows.map((row) => row.eventId));
  const sessions = result.rows.map((row) => mapGroupedPublicSession(row, pinnedEventIds));
  return dedupeCrossSourceCatalogSessions(regroupMappedPublicCatalogSessions(sessions));
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

function hasUpcomingOrOpenSchedule(row = {}) {
  if (String(row?.sourceStatus || '').toLowerCase() === 'widget') return true;
  if (isOpenDateCatalogRow(row)) return true;

  const now = Date.now();
  const startsAtMs = row?.startsAt ? Date.parse(String(row.startsAt)) : NaN;
  const endsAtMs = row?.endsAt ? Date.parse(String(row.endsAt)) : NaN;

  if (Number.isFinite(startsAtMs) && startsAtMs >= now - 15 * 60 * 1000) return true;

  if (Number.isFinite(startsAtMs) && Number.isFinite(endsAtMs) && startsAtMs < now && endsAtMs >= now) {
    const duration = endsAtMs - startsAtMs;
    if (duration <= 36 * 60 * 60 * 1000) return true;
    if (isWideLifetimeSession(row.startsAt, row.endsAt)) return false;
    const kind = String(row?.kind || '').toUpperCase();
    if (kind === 'RECURRING' || kind === 'SERIES') return true;
    return false;
  }

  return false;
}

function isWideLifetimeSession(startsAt, endsAt) {
  if (!startsAt || !endsAt) return false;
  const startMs = Date.parse(String(startsAt));
  const endMs = Date.parse(String(endsAt));
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return false;
  return endMs - startMs >= 36 * 60 * 60 * 1000;
}

function publicSessionScheduleLabels(row) {
  const timeZone = resolveCityTimeZone(row.city, row.destination);
  if (!isOpenDateCatalogRow(row)) {
    if (isWideLifetimeSession(row.startsAt, row.endsAt)) {
      return {
        startsAt: '',
        dateLabel: 'Даты в виджете',
        timeLabel: 'При покупке',
        timeBucket: 'day',
        timeZone,
      };
    }

    return {
      startsAt: normalizeStartsAt(row.startsAt) || '',
      dateLabel: formatDate(row.startsAt, timeZone),
      timeLabel: formatTime(row.startsAt, timeZone),
      timeBucket: timeBucket(row.startsAt, timeZone),
      timeZone,
    };
  }

  return {
    startsAt: '',
    dateLabel: 'Открытая дата',
    timeLabel: 'В виджете',
    timeBucket: 'day',
    timeZone,
  };
}

function buildLandingRuleEvent(row, tags, destination, category) {
  return {
    title: row.overrideTitle || row.title,
    category: category || 'unknown',
    sourceCategory: category || 'unknown',
    venue: formatPublicVenueTitle(row.venue) || 'Не указано',
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
  const direct = pickFirstUsableEventImageUrl(
    row.overrideImageUrl,
    row.imageUrl,
    row.venueHeroImageUrl,
    row.cityHeroImageUrl,
  );
  if (direct) return direct;

  const slug = row.citySlug || row.sourceCitySlug;
  if (!slug) return null;

  const imageSlug = CITY_CARD_IMAGE_ALIASES[slug] || slug;
  if (!CITY_CARD_IMAGE_SLUGS.has(imageSlug)) return null;
  return `/images/cities/${imageSlug}.png`;
}

function isPlaceholderEventImageUrl(imageUrl) {
  const raw = String(imageUrl || '').trim();
  if (!raw) return true;
  const lower = raw.toLowerCase();
  if (lower.includes('placeholder.gif')) return true;
  if (/api\.teplohod\.info\/v1\/image\?item=&/i.test(raw)) return true;
  return false;
}

function pickFirstUsableEventImageUrl(...candidates) {
  for (const candidate of candidates) {
    if (candidate && !isPlaceholderEventImageUrl(candidate)) return candidate;
  }
  return null;
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

function resolvePublicSessionDisplayCity(row) {
  const raw = cleanDisplayName(row.city);
  const canonical = canonicalizePublicCityName(raw);
  if (canonical && canonical !== 'Не указан') return canonical;

  const inferred = inferCityNameFromText(row.title, row.venue, row.venueAddress, ...(row.tags || []));
  if (inferred) return canonicalizePublicCityName(inferred) || inferred;

  if (raw && raw !== 'Не указан') return raw;
  return 'Не указан';
}

function resolvePublicSessionCity(row) {
  const inferred = inferCityNameFromText(row.title, row.venue, row.venueAddress, ...(row.tags || []));
  const raw = cleanDisplayName(row.city);
  const canonical = canonicalizePublicCityName(raw);

  if (inferred) return routeCityToPublicDisplayName(inferred);
  if (canonical) return routeCityToPublicDisplayName(canonical);
  if (raw && raw !== 'Не указан') return routeCityToPublicDisplayName(raw);
  return routeCityToPublicDisplayName(inferred || raw || 'Не указан');
}

export function mapGroupedPublicSession(row, pinnedEventIds = new Set()) {
  const tags = row.tags || [];
  const displayCity = resolvePublicSessionDisplayCity(row);
  const groupCity = resolvePublicSessionCity(row);
  const destination = publicDestinationForCity({ ...row, city: row.city || displayCity });
  const fallbackWidgetUrl = buildProviderWidgetUrl(row);
  const purchase = purchaseInfo(row);
  const purchaseUrl = purchase.url || fallbackWidgetUrl;
  const groupEventIds = (row.groupEventIds || [row.id]).slice(0, 12);
  const manualLandingStatus = groupEventIds.some((id) => pinnedEventIds.has(id)) ? 'PINNED' : null;
  const schedule = publicSessionScheduleLabels(row);
  const timeZone = schedule.timeZone || resolveCityTimeZone(displayCity, destination?.name);
  const upcomingSlots = (Array.isArray(row.upcomingSlots) ? row.upcomingSlots : [])
    .filter((slot) => slot?.startsAt)
    .slice(0, 12)
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
        dateLabel: formatDate(slot.startsAt, timeZone),
        timeLabel: formatTime(slot.startsAt, timeZone),
        purchaseUrl: slotPurchase.url || purchaseUrl,
        sourceStatus: slot.sourceStatus || row.sourceStatus || null,
        purchaseReady: slotPurchase.ready,
        vacant: slot.vacant ?? row.vacant ?? null,
      };
    });

  const ruleEvent = buildLandingRuleEvent({ ...row, city: displayCity }, tags, destination, row.category || 'unknown');
  const institutionContext = shouldResolveInstitutionFromTitle({ venueKind: row.venueKind, venue: row.venue })
    ? resolveContextInstitutionFromTitle(row.overrideTitle || row.title)
    : null;
  const session = {
    id: row.id,
    slug: publicEventSlug(row.slug),
    sourceSlug: row.slug,
    groupKey: publicEventGroupKey({ ...row, city: groupCity }),
    groupEventIds,
    groupedEventsCount: row.groupedEventsCount || 1,
    sessionCount: row.sessionCount || upcomingSlots.length || 1,
    upcomingSlots,
    title: resolveCatalogDisplayTitle(row.overrideTitle || row.title, row.venue),
    cityId: row.cityId,
    citySlug: destination.slug,
    sourceCitySlug: row.citySlug,
    city: displayCity,
    destination: destination.name,
    destinationType: destination.type,
    venueId: row.venueId,
    venueSlug: row.venueId ? publicVenueSlug(row.venueSlug, row.venue, row.venueId) : row.venueSlug,
    venue: formatPublicVenueTitle(row.venue) || 'Не указано',
    venueAddress: row.venueAddress || null,
    venueKind: row.venueKind || 'OTHER',
    institutionVenue: institutionContext?.displayName || null,
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
    timeZone,
    priceFrom: row.priceFrom,
    priceTo: row.priceTo ?? row.priceFrom,
    vacant: row.vacant,
    ageLimit: row.ageLimit ?? null,
    imageUrl: resolvePublicSessionImageUrl(row),
    description: publicListDescription(row),
  };

  return {
    ...session,
    landingSlugs: resolveLandingSlugsForSession(ruleEvent, { startsAt: row.startsAt, upcomingSlots }),
    manualLandingStatus,
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
        min(session."startsAt") filter (where ${ACTIVE_SESSION_SQL}) is not null
        or e.kind = 'OPEN_DATE'
        or e."sourceStatus" = 'open_date'
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
        venue: formatPublicVenueTitle(row.venue) || 'Не указано',
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
    .filter((row) => hasUpcomingOrOpenSchedule(row) && row.purchaseReady && Number.isFinite(row.priceFrom) && row.priceFrom >= MIN_DISPLAY_PRICE_RUB);
}

function parseCatalogAgeLimit(value) {
  if (value == null || value === '') return null;
  const match = String(value).match(/\d+/);
  if (!match) return null;
  const age = Number(match[0]);
  return Number.isFinite(age) ? age : null;
}

function matchesCatalogAgeLimit(session, ageMax) {
  const limit = parseCatalogAgeLimit(session.ageLimit);
  if (limit == null) return true;
  return limit <= ageMax;
}

function matchesCatalogDateRange(session, dateFrom, dateTo) {
  const from = dateFrom ? startOfLocalDay(new Date(dateFrom)) : null;
  const to = dateTo ? startOfLocalDay(new Date(dateTo)) : null;
  if (!from && !to) return true;
  if (isOpenDateCatalogRow(session)) return true;

  const startsAt = new Date(session.startsAt);
  if (!Number.isFinite(startsAt.getTime())) return false;
  const eventDay = startOfLocalDay(startsAt);
  if (from && eventDay < from) return false;
  if (to && eventDay > to) return false;
  return true;
}

function matchesCatalogPrice(session, minPrice, maxPrice) {
  const price = session.priceFrom;
  const min = Number(minPrice);
  const max = Number(maxPrice);
  const wantsFree = Number.isFinite(min) && min === 0 && Number.isFinite(max) && max === 0;
  if (wantsFree) return !Number.isFinite(price) || price <= 0;
  if (Number.isFinite(min) && min > 0 && (!Number.isFinite(price) || price < min)) return false;
  if (Number.isFinite(max) && max > 0 && (!Number.isFinite(price) || price > max)) return false;
  return true;
}

function matchesCatalogDate(session, dateFilter) {
  if (dateFilter === 'all') return true;
  if (isOpenDateCatalogRow(session)) return dateFilter === 'today' || dateFilter === 'tomorrow' || dateFilter === 'weekend';

  const startsAt = new Date(session.startsAt);
  if (!Number.isFinite(startsAt.getTime())) return false;

  const timeZone = session.timeZone || resolveSessionTimeZone(session);
  const diffDays = diffLocalDays(startsAt, new Date(), timeZone);
  if (diffDays == null) return false;

  if (dateFilter === 'today') return diffDays === 0;
  if (dateFilter === 'tomorrow') return diffDays === 1;
  if (dateFilter === 'weekend') return isLocalWeekend(startsAt, timeZone);
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
      venue: formatPublicVenueTitle(row.venue),
      city: row.city,
      category: row.sourceCategory,
      subcategories: row.subcategories,
    },
    tags,
    { name: row.destination || row.city },
    row.sourceCategory,
  );
  const schedule = publicSessionScheduleLabels(row);
  const timeZone = schedule.timeZone || resolveCityTimeZone(row.city, row.destination);
  const upcomingSlots = Array.isArray(row.upcomingSlots) && row.upcomingSlots.length
    ? row.upcomingSlots
    : row.startsAt
      ? [{
          eventId: row.id,
          startsAt: normalizeStartsAt(row.startsAt),
          dateLabel: formatDate(row.startsAt, timeZone),
          timeLabel: formatTime(row.startsAt, timeZone),
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
      dateLabel: slot.dateLabel || formatDate(slot.startsAt, timeZone),
      timeLabel: slot.timeLabel || formatTime(slot.startsAt, timeZone),
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
    venue: formatPublicVenueTitle(row.venue),
    venueAddress: row.venueAddress || null,
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
    timeZone,
    priceFrom: row.priceFrom,
    priceTo: row.priceTo ?? row.priceFrom,
    vacant: row.vacant,
    imageUrl: resolvePublicSessionImageUrl(row),
  };
}

function buildTicketscloudWidgetUrl(eventExternalId) {
  const token = process.env.TICKETSCLOUD_WIDGET_TOKEN || process.env.TC_WIDGET_TOKEN;
  if (!token || !eventExternalId) return null;

  const normalizedToken = token.startsWith('r:') ? token.slice(2) : token;
  const url = new URL(process.env.TICKETSCLOUD_WIDGET_BASE_URL || 'https://ticketscloud.com/v1/widgets/common');
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
  return (await publicVenueHubRows(db, 500)).slice(0, limit).map(mapPublicVenueListItem);
}

async function publicRelatedVenues(db, venueId, city, limit, hubRows = null) {
  if (!city) return [];
  const rows = hubRows || (await publicVenueHubRows(db, 500));
  const current = findMergedVenueGroup(rows, venueId);
  const currentTemplate = publicVenuePageTemplate(resolvePublicVenueKindFromRow(current || {}));
  return rows
    .filter((row) => row.city === city && isPublicVenueHub(row) && !venueGroupsOverlap(current, row))
    .filter((row) => publicVenuePageTemplate(resolvePublicVenueKindFromRow(row)) === currentTemplate)
    .slice(0, limit)
    .map(mapPublicVenueListItem);
}

async function publicVenuesForCity(db, city, limit) {
  if (!city) return [];
  return (await publicVenueHubRows(db, 500))
    .filter((row) => row.city === city)
    .slice(0, limit)
    .map(mapPublicVenueListItem);
}

async function publicVenuesForSessions(db, sessions, limit) {
  const venueIds = new Set(sessions.map((session) => session.venueId).filter(Boolean));
  if (!venueIds.size) return [];
  return (await publicVenueHubRows(db, 500))
    .filter((row) => (row.mergedVenueIds || [row.id]).some((id) => venueIds.has(id)))
    .slice(0, limit)
    .map(mapPublicVenueListItem);
}

async function resolvePublicEventId(db, eventSlugOrId, catalogSessions = null) {
  const value = String(eventSlugOrId || '').trim();
  if (!value) return null;
  const direct = await db.query('select id from "Event" where id = $1 or slug = $1 limit 1', [value]);
  if (direct.rows[0]?.id) return direct.rows[0].id;

  const tcPrefixMatch = value.match(/^tc-([a-f0-9]{24})-/i);
  if (tcPrefixMatch) {
    const tcId = tcPrefixMatch[1];
    const tcResult = await db.query('select id from "Event" where id = $1 or id = $2 limit 1', [tcId, `evt_${tcId}`]);
    if (tcResult.rows[0]?.id) return tcResult.rows[0].id;
  }

  const suffixMatch = value.match(/(?:^|-)([a-f0-9]{20,})$/i);
  if (suffixMatch) {
    const suffix = suffixMatch[1];
    const suffixResult = await db.query('select id from "Event" where id = $1 or id = $2 or slug = $1 or slug = $2 limit 1', [suffix, `evt_${suffix}`]);
    if (suffixResult.rows[0]?.id) return suffixResult.rows[0].id;
  }

  const requestedSlug = publicEventSlug(value);
  const fromCatalog = lookupCatalogSessionBySlug(value, catalogSessions);
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

function extractOpaqueIdSuffix(value) {
  const match = String(value || '').match(/(?:^|[-_])([a-f0-9]{20,})$/i);
  return match ? match[1].toLowerCase() : null;
}

function stripOpaqueVenueIdSuffix(slug) {
  const suffix = extractOpaqueIdSuffix(slug);
  if (!suffix) return slug;
  const trimmed = String(slug || '').replace(new RegExp(`[-_]${suffix}$`, 'i'), '');
  return trimmed || slug;
}

function dedupeVenueSlugSuffix(slug) {
  const parts = String(slug || '')
    .split('-')
    .filter(Boolean);
  if (parts.length < 2) return slug;
  if (parts[parts.length - 1] === parts[parts.length - 2]) {
    return parts.slice(0, -1).join('-');
  }
  return slug;
}

function buildPublicVenueSlug(title, id) {
  const titleSlug = publicCitySlug(title) || 'venue';
  const rawId = String(id || '').replace(/^venue_/, '');
  const idSlug = publicCitySlug(rawId) || rawId;
  if (!idSlug) return dedupeVenueSlugSuffix(titleSlug);
  if (titleSlug.endsWith(`-${idSlug}`)) return dedupeVenueSlugSuffix(titleSlug);
  return dedupeVenueSlugSuffix(`${titleSlug}-${idSlug}`);
}

export function publicVenueSlug(slug, title, id) {
  const raw = String(slug || '').trim();
  const normalized = publicCitySlug(raw);
  if (normalized && !/^[a-f0-9]{20,}$/i.test(normalized)) {
    return dedupeVenueSlugSuffix(stripOpaqueVenueIdSuffix(normalized));
  }
  if (title && id) return buildPublicVenueSlug(title, id);
  return dedupeVenueSlugSuffix(stripOpaqueVenueIdSuffix(normalized || raw));
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

export function buildPublicLandings(sessions) {
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
  const key = String(landingSlug || '').trim().toLowerCase().replace(/_/g, '-');
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

function moscowHourFromStartsAt(value, timeZone = DEFAULT_CITY_TIME_ZONE) {
  return localHourFromInstant(value, timeZone);
}

function slotMatchesMinHour(startsAt, minHour, includeStartsAtHourUntil = 0, timeZone = DEFAULT_CITY_TIME_ZONE) {
  const hour = moscowHourFromStartsAt(startsAt, timeZone);
  if (!Number.isFinite(hour)) return false;
  if (hour >= minHour) return true;
  return includeStartsAtHourUntil > 0 && hour < includeStartsAtHourUntil;
}

function sessionMatchesLandingSchedule(session, rule) {
  if (rule.minStartsAtHour == null) return true;
  const until = rule.includeStartsAtHourUntil ?? 0;
  const timeZone = session.timeZone || resolveSessionTimeZone(session);
  return collectSessionSlots(session).some((slot) => slotMatchesMinHour(slot.startsAt, rule.minStartsAtHour, until, timeZone));
}

function applyLandingScheduleToSession(session, rule) {
  if (rule.minStartsAtHour == null) return session;
  const until = rule.includeStartsAtHourUntil ?? 0;
  const timeZone = session.timeZone || resolveSessionTimeZone(session);
  const slots = collectSessionSlots(session)
    .filter((slot) => slotMatchesMinHour(slot.startsAt, rule.minStartsAtHour, until, timeZone))
    .map((slot) => ({
      eventId: slot.eventId || session.id,
      startsAt: normalizeStartsAt(slot.startsAt),
      dateLabel: slot.dateLabel || formatDate(slot.startsAt, timeZone),
      timeLabel: slot.timeLabel || formatTime(slot.startsAt, timeZone),
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
    timeBucket: timeBucket(primary.startsAt, timeZone),
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

  if (rule.requiredAnySubcategories?.length) {
    const subcategories = eventSubcategoriesForLanding(event, tags);
    const hit = rule.requiredAnySubcategories.find((label) => subcategories.includes(label));
    if (hit) reasons.push(`подкатегория: ${hit}`);
    else blockers.push(`нет подкатегории: ${rule.requiredAnySubcategories.join(' / ')}`);
  }

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
  const venueMatched = rule.venue ? event.venue === rule.venue : false;
  const matches = Boolean(hasTagSignal || hasKeywordSignal || hasRequiredSignal || venueMatched);
  return { matches, reasons: uniqueValues(reasons).slice(0, 10), blockers: [] };
}

function eventSubcategoriesForLanding(event, tags) {
  return uniqueValues([
    ...(event.subcategories || []),
    ...pickCatalogSubcategories({
      subcategories: event.subcategories || [],
      tags,
      category: event.category || event.sourceCategory || '',
    }),
  ]);
}

function collectFastLandingMatchReasons(event, rule, tags) {
  const reasons = [];

  if (rule.requiredAnySubcategories?.length) {
    const subcategories = eventSubcategoriesForLanding(event, tags);
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

const CYRILLIC_WORD_CHAR = /[a-z0-9а-яё]/i;

/** Подстрока с границей слова слева — «катер» не матчится внутри «екатеринбург». */
function keywordOccursInText(text, keyword) {
  const haystack = String(text || '').toLowerCase();
  const needle = String(keyword || '').toLowerCase();
  if (!haystack || !needle) return false;

  let from = 0;
  while (from <= haystack.length - needle.length) {
    const index = haystack.indexOf(needle, from);
    if (index === -1) return false;
    const before = index === 0 ? '' : haystack[index - 1];
    if (!before || !CYRILLIC_WORD_CHAR.test(before)) return true;
    from = index + 1;
  }
  return false;
}

function firstKeywordMatch(fields, keywords) {
  for (const keyword of keywords) {
    const field = fields.find((item) => keywordOccursInText(item.text, keyword));
    if (field) return { keyword, field: field.field };
  }
  return null;
}

function matchingKeywordMatches(fields, keywords) {
  const matches = [];
  const seen = new Set();
  for (const keyword of keywords) {
    const field = fields.find((item) => keywordOccursInText(item.text, keyword));
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

const PUBLIC_CATALOG_CATEGORIES = new Set([
  'экскурсии',
  'музеи и арт',
  'мероприятия',
  'активный отдых',
  'развлечения',
]);

const WATER_CATALOG_HINT_RE =
  /(водн(?:ые|ая)?\s+экскурси|речн(?:ая|ые)?|реч(?:ной|ная)\s+порт|теплоход|катер|яхт|лодк|причал|речные\s+прогулки)/i;
const BUS_CATALOG_LABEL_RE = /автобус/i;

function resolveCatalogTransportHint(session = {}) {
  const haystack = [
    session.title,
    session.venue,
    ...(session.subcategories || []),
    ...(session.tags || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (WATER_CATALOG_HINT_RE.test(haystack)) return 'water';
  if (BUS_CATALOG_LABEL_RE.test(haystack)) return 'bus';
  return null;
}

function isConflictingTransportCatalogLabel(label, transport) {
  if (!transport) return false;
  const lower = String(label || '').toLowerCase();
  if (transport === 'water') return BUS_CATALOG_LABEL_RE.test(lower);
  if (transport === 'bus') return WATER_CATALOG_HINT_RE.test(lower);
  return false;
}

function isCrossCategoryCatalogTag(tag, category) {
  const tagNorm = String(tag || '').trim().toLowerCase();
  const categoryNorm = String(category || '').trim().toLowerCase();
  if (!tagNorm || !categoryNorm) return false;
  if (tagNorm === categoryNorm) return false;
  return PUBLIC_CATALOG_CATEGORIES.has(tagNorm);
}

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
  if (isCrossCategoryCatalogTag(value, category)) return false;
  if (category && value.toLowerCase() === String(category).toLowerCase()) return false;
  return true;
}

export function pickCatalogSubcategories(session, limit = 4) {
  const category = session.category || session.sourceCategory || '';
  const transport = resolveCatalogTransportHint(session);
  const labels = [];
  const seen = new Set();

  for (const label of session.subcategories || []) {
    const value = String(label || '').trim();
    if (!isCatalogSubcategoryLabel(value, category) || seen.has(value)) continue;
    if (isConflictingTransportCatalogLabel(value, transport)) continue;
    seen.add(value);
    labels.push(value);
    if (labels.length >= limit) return labels;
  }

  for (const tag of session.tags || []) {
    const value = String(tag || '').trim();
    if (!isCatalogSubcategoryLabel(value, category) || seen.has(value)) continue;
    if (isConflictingTransportCatalogLabel(value, transport)) continue;
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

export function normalizeStartsAt(value) {
  const date = parseSessionStartsAt(value);
  if (!Number.isFinite(date.getTime())) return null;
  return date.toISOString();
}

export function formatDate(value, timeZone = SITE_TIME_ZONE) {
  const date = parseSessionStartsAt(value);
  if (!Number.isFinite(date.getTime())) return '';
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    weekday: 'short',
    timeZone,
  }).format(date);
}

export function formatTime(value, timeZone = SITE_TIME_ZONE) {
  const date = parseSessionStartsAt(value);
  if (!Number.isFinite(date.getTime())) return '';
  return new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  }).format(date);
}

export function timeBucket(value, timeZone = SITE_TIME_ZONE) {
  const date = parseSessionStartsAt(value);
  if (!Number.isFinite(date.getTime())) return 'night';
  const hour = localHourFromInstant(date, timeZone);
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
        count(session.id) filter (where ${ACTIVE_SESSION_SQL})::int as "futureSessionCount",
        min(session."startsAt") filter (where ${ACTIVE_SESSION_SQL}) as "nextStartsAt",
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

function mapPublicArticleRow(row) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt || null,
    coverImageUrl: row.coverImageUrl || null,
    city: row.city || null,
    citySlug: row.citySlug || null,
    publishedAt: row.publishedAt ? new Date(row.publishedAt).toISOString() : null,
    isIndexable: row.isIndexable !== false,
    seoTitle: row.seoTitle || row.title,
    seoDescription: row.seoDescription || row.excerpt || null,
  };
}

function mapPublicArticleDetail(row) {
  return {
    ...mapPublicArticleRow(row),
    content: row.content || '',
    seoH1: row.seoH1 || row.title,
    canonicalPath: row.canonicalPath || `/blog/${row.slug}`,
  };
}

export async function buildPublicArticlesList(db) {
  const { rows } = await db.query(`
    select
      a.id,
      a.slug,
      a.title,
      a.excerpt,
      a."coverImageUrl",
      a."publishedAt",
      a."isIndexable",
      a."seoTitle",
      a."seoDescription",
      c.title as city,
      c.slug as "citySlug"
    from "Article" a
    left join "City" c on c.id = a."cityId"
    where a.status = 'PUBLISHED'
      and coalesce(a."isIndexable", true) = true
    order by a."publishedAt" desc nulls last, a."updatedAt" desc
  `);
  return {
    generatedAt: new Date().toISOString(),
    total: rows.length,
    articles: rows.map(mapPublicArticleRow),
  };
}

export async function buildPublicArticlePage(db, slug) {
  const { rows } = await db.query(
    `
      select
        a.id,
        a.slug,
        a.title,
        a.excerpt,
        a.content,
        a."coverImageUrl",
        a."publishedAt",
        a."isIndexable",
        a."seoH1",
        a."seoTitle",
        a."seoDescription",
        a."canonicalPath",
        c.title as city,
        c.slug as "citySlug"
      from "Article" a
      left join "City" c on c.id = a."cityId"
      where a.slug = $1
        and a.status = 'PUBLISHED'
      limit 1
    `,
    [slug],
  );
  if (!rows[0]) return null;
  return {
    generatedAt: new Date().toISOString(),
    article: mapPublicArticleDetail(rows[0]),
  };
}

export async function buildAdminArticlesList(db) {
  const { rows } = await db.query(`
    select
      a.id,
      a.slug,
      a.status::text as status,
      a.title,
      a.excerpt,
      a."coverImageUrl",
      a."publishedAt",
      a."isIndexable",
      a."updatedAt",
      c.title as city
    from "Article" a
    left join "City" c on c.id = a."cityId"
    order by a."updatedAt" desc
  `);
  return {
    generatedAt: new Date().toISOString(),
    total: rows.length,
    rows: rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      status: String(row.status || 'DRAFT').toLowerCase(),
      title: row.title,
      excerpt: row.excerpt || '',
      coverImageUrl: row.coverImageUrl || null,
      city: row.city || null,
      publishedAt: row.publishedAt ? new Date(row.publishedAt).toISOString() : null,
      isIndexable: row.isIndexable !== false,
      updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : null,
    })),
  };
}

export async function buildAdminArticleDetail(db, articleId) {
  const { rows } = await db.query(
    `
      select
        a.*,
        c.title as city,
        c.slug as "citySlug"
      from "Article" a
      left join "City" c on c.id = a."cityId"
      where a.id = $1
      limit 1
    `,
    [articleId],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    slug: row.slug,
    status: String(row.status || 'DRAFT').toLowerCase(),
    title: row.title,
    excerpt: row.excerpt || '',
    content: row.content || '',
    coverImageUrl: row.coverImageUrl || null,
    cityId: row.cityId || null,
    city: row.city || null,
    citySlug: row.citySlug || null,
    seoH1: row.seoH1 || null,
    seoTitle: row.seoTitle || null,
    seoDescription: row.seoDescription || null,
    canonicalPath: row.canonicalPath || null,
    isIndexable: row.isIndexable !== false,
    publishedAt: row.publishedAt ? new Date(row.publishedAt).toISOString() : null,
    updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : null,
  };
}

function normalizeArticleStatus(value) {
  const normalized = String(value || 'DRAFT').trim().toUpperCase();
  const allowed = new Set(['DRAFT', 'REVIEW', 'PUBLISHED', 'HIDDEN']);
  return allowed.has(normalized) ? normalized : 'DRAFT';
}

export async function upsertAdminArticle(db, articleId, payload = {}) {
  const current = articleId ? await buildAdminArticleDetail(db, articleId) : null;
  const title = String(payload.title || current?.title || '').trim();
  if (!title) throw new Error('title_required');

  const slug =
    String(payload.slug || current?.slug || title)
      .trim()
      .toLowerCase()
      .replace(/ё/g, 'e')
      .replace(/[^a-z0-9а-я]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 120) || 'article';

  const status = normalizeArticleStatus(payload.status || current?.status);
  const excerpt = payload.excerpt ?? current?.excerpt ?? null;
  const content = payload.content ?? current?.content ?? null;
  const coverImageUrl = payload.coverImageUrl ?? current?.coverImageUrl ?? null;
  const cityId = payload.cityId ?? current?.cityId ?? null;
  const seoH1 = payload.seoH1 ?? current?.seoH1 ?? null;
  const seoTitle = payload.seoTitle ?? current?.seoTitle ?? title;
  const seoDescription = payload.seoDescription ?? current?.seoDescription ?? excerpt;
  const canonicalPath = payload.canonicalPath ?? current?.canonicalPath ?? `/blog/${slug}`;
  const isIndexable = payload.isIndexable ?? current?.isIndexable ?? status === 'PUBLISHED';
  const publishedAt =
    status === 'PUBLISHED'
      ? payload.publishedAt || current?.publishedAt || new Date().toISOString()
      : payload.publishedAt ?? current?.publishedAt ?? null;

  if (current) {
    const { rows } = await db.query(
      `
        update "Article"
        set
          slug = $2,
          status = $3::"ArticleStatus",
          title = $4,
          excerpt = $5,
          content = $6,
          "coverImageUrl" = $7,
          "cityId" = $8,
          "seoH1" = $9,
          "seoTitle" = $10,
          "seoDescription" = $11,
          "canonicalPath" = $12,
          "isIndexable" = $13,
          "publishedAt" = $14,
          "updatedAt" = now()
        where id = $1
        returning id
      `,
      [
        current.id,
        slug,
        status,
        title,
        excerpt,
        content,
        coverImageUrl,
        cityId,
        seoH1,
        seoTitle,
        seoDescription,
        canonicalPath,
        isIndexable,
        publishedAt,
      ],
    );
    return buildAdminArticleDetail(db, rows[0].id);
  }

  const id = `article_${randomUUID().replace(/-/g, '').slice(0, 24)}`;
  await db.query(
    `
      insert into "Article" (
        id, slug, status, title, excerpt, content, "coverImageUrl", "cityId",
        "seoH1", "seoTitle", "seoDescription", "canonicalPath", "isIndexable",
        "publishedAt", "createdAt", "updatedAt"
      )
      values (
        $1, $2, $3::"ArticleStatus", $4, $5, $6, $7, $8,
        $9, $10, $11, $12, $13,
        $14, now(), now()
      )
    `,
    [
      id,
      slug,
      status,
      title,
      excerpt,
      content,
      coverImageUrl,
      cityId,
      seoH1,
      seoTitle,
      seoDescription,
      canonicalPath,
      isIndexable,
      publishedAt,
    ],
  );
  return buildAdminArticleDetail(db, id);
}
