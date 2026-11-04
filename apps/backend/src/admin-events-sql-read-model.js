/**
 * SQL read-model for admin Events list (Tasktracker 0.5.8).
 * Pages groups in Postgres (LIMIT/OFFSET + filters) instead of
 * loading the full lean catalog into JS → group → slice.
 *
 * Group key must stay in sync with adminEventGroupKey() in dto.js:
 *   normalize(source)|normalize(title)|normalize(city)|normalize(venue)
 */

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

/** Matches formatPublicVenueTitle() — strip trailing "(lat, lng)". */
const VENUE_TITLE_SQL = `coalesce(
  nullif(
    trim(
      regexp_replace(
        coalesce(venue.title, ''),
        '\\s*\\(\\s*-?\\d+(?:\\.\\d+)?\\s*,\\s*-?\\d+(?:\\.\\d+)?\\s*\\)\\s*$',
        ''
      )
    ),
    ''
  ),
  'Не указано'
)`;

/** Matches publicSourceLabel() + sourceName fallback used in eventRows mapping. */
const SOURCE_LABEL_SQL = `coalesce(
  nullif(trim(source.name), ''),
  case
    when upper(coalesce(source.code::text, offer."sourceCode"::text, '')) ~ '(TC|TICKETSCLOUD)' then 'Ticketscloud'
    when upper(coalesce(source.code::text, offer."sourceCode"::text, '')) like '%TEPLOHOD%' then 'Teplohod.info'
    else nullif(upper(coalesce(source.code::text, offer."sourceCode"::text, '')), '')
  end,
  'Источник'
)`;

const CITY_LABEL_SQL = `coalesce(nullif(trim(city.title), ''), 'Не указан')`;

/** normalizeGroupPart in SQL: trim → lower → collapse whitespace. */
function normalizePartSql(expr) {
  return `lower(trim(regexp_replace(coalesce(${expr}, ''), '\\s+', ' ', 'g')))`;
}

export function adminEventGroupKeySql(mode = 'join') {
  if (mode === 'atom') {
    return [
      normalizePartSql('atom."sourceLabel"'),
      normalizePartSql('atom.title'),
      normalizePartSql('atom."cityLabel"'),
      normalizePartSql('atom."venueLabel"'),
    ].join(` || '|' || `);
  }
  return [
    normalizePartSql(SOURCE_LABEL_SQL),
    normalizePartSql('e.title'),
    normalizePartSql(CITY_LABEL_SQL),
    normalizePartSql(VENUE_TITLE_SQL),
  ].join(` || '|' || `);
}

/** JS twin of adminEventGroupKey for unit tests / parity checks. */
export function buildAdminEventGroupKey(parts = {}) {
  const normalize = (value) =>
    String(value || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');
  const formatVenue = (value) => {
    if (value == null) return value;
    return String(value)
      .replace(/\s*\(\s*-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?\s*\)\s*$/u, '')
      .trim();
  };
  const source =
    parts.sourceName ||
    publicSourceLabel(parts.sourceCode || parts.offerSourceCode) ||
    'Источник';
  const city = parts.city || 'Не указан';
  const venue = formatVenue(parts.venue) || parts.venue || 'Не указано';
  return [normalize(source), normalize(parts.title), normalize(city), normalize(venue)].join('|');
}

function publicSourceLabel(sourceCode) {
  const normalized = String(sourceCode || '').toUpperCase();
  if (normalized.includes('TC') || normalized.includes('TICKETSCLOUD')) return 'Ticketscloud';
  if (normalized.includes('TEPLOHOD')) return 'Teplohod.info';
  return normalized || null;
}

function clampNumber(value, min, max, fallback) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(num)));
}

const SQL_PAGE_CACHE_TTL_MS = Number(process.env.ADMIN_EVENTS_SQL_CACHE_TTL_MS || 45_000);
const sqlPageCache = new Map();
const sqlPageInflight = new Map();

function sqlPageCacheKey(searchParams) {
  const keys = ['limit', 'page', 'q', 'view', 'category', 'source', 'readiness'];
  return keys.map((key) => `${key}=${String(searchParams.get(key) || '')}`).join('&');
}

export function invalidateAdminEventsSqlReadModelCache() {
  sqlPageCache.clear();
  sqlPageInflight.clear();
}

/**
 * List a page of admin event groups from SQL.
 * Returns eventIds for the page (all siblings) + totals/facets/launch metrics.
 *
 * Readiness/canPublish in SQL are approximations for filter/metrics;
 * hydrated page rows still use exact JS readiness (groupAdminEventRows).
 */
export async function queryAdminEventGroupsPage(db, searchParams = new URLSearchParams()) {
  const cacheKey = sqlPageCacheKey(searchParams);
  const now = Date.now();
  const cached = sqlPageCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return { ...cached.value, cacheHit: true };
  }
  const inflight = sqlPageInflight.get(cacheKey);
  if (inflight) {
    const value = await inflight;
    return { ...value, cacheHit: true };
  }

  const buildPromise = queryAdminEventGroupsPageUncached(db, searchParams);
  sqlPageInflight.set(cacheKey, buildPromise);
  try {
    const value = await buildPromise;
    sqlPageCache.set(cacheKey, {
      expiresAt: Date.now() + Math.max(5_000, SQL_PAGE_CACHE_TTL_MS),
      value,
    });
    // Bound cache size (filter variants).
    if (sqlPageCache.size > 64) {
      const oldest = sqlPageCache.keys().next().value;
      sqlPageCache.delete(oldest);
    }
    return { ...value, cacheHit: false };
  } finally {
    sqlPageInflight.delete(cacheKey);
  }
}

async function queryAdminEventGroupsPageUncached(db, searchParams) {
  const limit = clampNumber(searchParams.get('limit'), 1, 500, 80);
  const page = clampNumber(searchParams.get('page'), 1, 100000, 1);
  const query = String(searchParams.get('q') || '').trim().toLowerCase();
  const view = searchParams.get('view') || 'all';
  const sourceCategory = searchParams.get('category') || 'all';
  const sourceFilter = String(searchParams.get('source') || 'all').toUpperCase();
  const readiness = searchParams.get('readiness') || 'all';

  const params = [];
  const push = (value) => {
    params.push(value);
    return `$${params.length}`;
  };

  const whereParts = ['true'];
  if (sourceFilter !== 'ALL') {
    whereParts.push(`upper(coalesce(g."sourceCode", '')) = ${push(sourceFilter)}`);
  }
  if (sourceCategory !== 'all') {
    whereParts.push(`g."proposedCategory" = ${push(sourceCategory)}`);
  }
  if (readiness !== 'all') {
    whereParts.push(`g.readiness = ${push(readiness)}`);
  }
  if (query) {
    whereParts.push(`g."searchText" like ${push(`%${query}%`)}`);
  }
  if (view === 'needs_attention') {
    whereParts.push(`g.readiness in ('review', 'blocked')`);
  } else if (view === 'ready_publish') {
    whereParts.push(`g.readiness = 'ready' and g."canPublish" = true`);
  } else if (view === 'purchase_blocked') {
    whereParts.push(`g."purchaseReady" = false`);
  } else if (view === 'no_image') {
    whereParts.push(`g."hasImage" = false`);
  } else if (view === 'landing_match') {
    // LandingMatch rows are the durable signal; rule-engine hits still appear on hydrated rows.
    whereParts.push(`g."landingMatched" = true`);
  }

  const whereSql = whereParts.join('\n        and ');
  const offset = (page - 1) * limit;
  const limitParam = push(limit);
  const offsetParam = push(offset);

  const result = await db.query(
    `
    with primary_offer as (
      select distinct on (offer."eventId")
        offer."eventId",
        offer."sourceCode",
        offer."priceRub",
        offer."widgetUrl",
        offer."deeplinkUrl"
      from "EventOffer" offer
      where offer.active = true
      order by
        offer."eventId",
        (offer."priceRub" >= ${MIN_DISPLAY_PRICE_RUB}) desc nulls last,
        offer."priceRub" asc nulls last
    ),
    event_atom as (
      select
        e.id,
        e.title,
        e."categoryId",
        e."primarySubcategoryId",
        length(trim(coalesce(override.description, e.description, override."shortDescription", '')))::int
          as "descriptionLength",
        ${SOURCE_LABEL_SQL} as "sourceLabel",
        coalesce(source.code::text, offer."sourceCode"::text) as "sourceCode",
        ${CITY_LABEL_SQL} as "cityLabel",
        ${VENUE_TITLE_SQL} as "venueLabel",
        coalesce(nullif(trim(cat.title), ''), 'не определено') as "proposedCategory",
        (coalesce(override."imageUrl", e."imageUrl") is not null) as "hasImage",
        (
          nullif(trim(offer."widgetUrl"), '') is not null
          or nullif(trim(offer."deeplinkUrl"), '') is not null
          or (
            (
              upper(coalesce(source.code::text, offer."sourceCode"::text, '')) like '%TEPLOHOD%'
              or upper(coalesce(source.code::text, offer."sourceCode"::text, '')) ~ '(TC|TICKETSCLOUD)'
            )
            and nullif(trim(source_link."externalId"), '') is not null
          )
        ) as "purchaseReady",
        (
          upper(coalesce(e.kind::text, '')) = 'OPEN_DATE'
          or bool_or(${ACTIVE_SESSION_SQL})
        ) as "hasFutureSession",
        min(session."startsAt") filter (where ${ACTIVE_SESSION_SQL}) as "nextStartsAt",
        min(session."startsAt") as "startsAt",
        least(
          case when e."priceFromRub" >= ${MIN_DISPLAY_PRICE_RUB} then e."priceFromRub" end,
          min(session."priceFromRub") filter (where session."priceFromRub" >= ${MIN_DISPLAY_PRICE_RUB}),
          case when offer."priceRub" >= ${MIN_DISPLAY_PRICE_RUB} then offer."priceRub" end
        ) as "priceFrom",
        e."venueId",
        exists (select 1 from "EventSubcategory" es where es."eventId" = e.id) as "hasSubcategory",
        exists (select 1 from "LandingMatch" lm where lm."eventId" = e.id) as "landingMatched"
      from "Event" e
      left join "Category" cat on cat.id = e."categoryId"
      left join "City" city on city.id = e."primaryCityId"
      left join "Venue" venue on venue.id = e."venueId"
      left join "EventSourceLink" source_link on source_link."eventId" = e.id
      left join "Source" source on source.id = source_link."sourceId"
      left join "EventOverride" override on override."eventId" = e.id
      left join "EventSession" session on session."eventId" = e.id
      left join primary_offer offer on offer."eventId" = e.id
      group by
        e.id,
        override.id,
        source.code,
        source.name,
        source_link."externalId",
        offer."sourceCode",
        offer."priceRub",
        offer."widgetUrl",
        offer."deeplinkUrl",
        cat.title,
        city.title,
        venue.title
    ),
    event_scored as (
      select
        atom.*,
        ${adminEventGroupKeySql('atom')} as "groupKey",
        (
          (not atom."hasFutureSession")::int
          + (not atom."purchaseReady")::int
          + (atom."priceFrom" is null)::int
          + (atom."categoryId" is null)::int
          + (atom."primarySubcategoryId" is null and not atom."hasSubcategory")::int
          + (
            atom."venueId" is null
            and lower(atom."venueLabel") in ('не указано', 'не указан', 'unknown', '')
          )::int
        ) as "highIssueCount",
        (
          (atom."descriptionLength" < 120)::int
          + (not atom."hasImage")::int
        ) as "mediumIssueCount"
      from event_atom atom
    ),
    group_future as (
      select
        scored."groupKey",
        bool_or(scored."hasFutureSession") as "groupHasFuture"
      from event_scored scored
      group by scored."groupKey"
    ),
    event_corrected as (
      select
        scored.*,
        gf."groupHasFuture",
        scored."highIssueCount"
          - case
              when gf."groupHasFuture" and not scored."hasFutureSession" then 1
              else 0
            end as "correctedHighIssues"
      from event_scored scored
      join group_future gf on gf."groupKey" = scored."groupKey"
    ),
    groups_ready as (
      select
        ec."groupKey",
        array_agg(ec.id order by ec."nextStartsAt" asc nulls last, ec.id) as "eventIds",
        min(ec."nextStartsAt") as "nextStartsAt",
        min(ec."startsAt") as "startsAt",
        (array_agg(ec.title order by ec."nextStartsAt" asc nulls last, ec.id))[1] as title,
        (array_agg(ec."sourceLabel" order by ec."nextStartsAt" asc nulls last, ec.id))[1] as "sourceLabel",
        (array_agg(ec."sourceCode" order by ec."nextStartsAt" asc nulls last, ec.id))[1] as "sourceCode",
        (array_agg(ec."cityLabel" order by ec."nextStartsAt" asc nulls last, ec.id))[1] as "cityLabel",
        (array_agg(ec."venueLabel" order by ec."nextStartsAt" asc nulls last, ec.id))[1] as "venueLabel",
        (array_agg(ec."proposedCategory" order by ec."nextStartsAt" asc nulls last, ec.id))[1] as "proposedCategory",
        bool_or(ec."hasImage") as "hasImage",
        bool_or(ec."purchaseReady") as "purchaseReady",
        bool_or(ec."hasFutureSession") as "hasFutureSession",
        bool_or(ec."landingMatched") as "landingMatched",
        min(ec."priceFrom") as "priceFrom",
        max(ec."correctedHighIssues") as "groupHighIssues",
        max(ec."mediumIssueCount") as "groupMediumIssues",
        lower(
          concat_ws(
            ' ',
            (array_agg(ec.title order by ec."nextStartsAt" asc nulls last, ec.id))[1],
            array_to_string(array_agg(ec.id), ' '),
            (array_agg(ec."cityLabel" order by ec."nextStartsAt" asc nulls last, ec.id))[1],
            (array_agg(ec."venueLabel" order by ec."nextStartsAt" asc nulls last, ec.id))[1],
            (array_agg(ec."proposedCategory" order by ec."nextStartsAt" asc nulls last, ec.id))[1],
            (array_agg(ec."sourceLabel" order by ec."nextStartsAt" asc nulls last, ec.id))[1],
            (array_agg(ec."sourceCode" order by ec."nextStartsAt" asc nulls last, ec.id))[1]
          )
        ) as "searchText",
        case
          when max(ec."correctedHighIssues") > 0 then 'blocked'
          when max(ec."mediumIssueCount") > 0 then 'review'
          else 'ready'
        end as readiness,
        (
          min(ec."priceFrom") is not null
          and bool_or(ec."purchaseReady")
          and bool_or(ec."hasFutureSession")
          and lower((array_agg(ec."venueLabel" order by ec."nextStartsAt" asc nulls last, ec.id))[1])
            not in ('не указано', 'не указан', '', 'unknown')
          and lower((array_agg(ec."cityLabel" order by ec."nextStartsAt" asc nulls last, ec.id))[1])
            not in ('не указан', '', 'unknown')
          and max(ec."correctedHighIssues") = 0
        ) as "canPublish",
        coalesce(min(ec."nextStartsAt"), min(ec."startsAt")) as "sortStartsAt"
      from event_corrected ec
      group by ec."groupKey"
    ),
    filtered as (
      select g.*
      from groups_ready g
      where ${whereSql}
    ),
    page as (
      select *
      from filtered
      order by "sortStartsAt" asc nulls last, title asc
      limit ${limitParam} offset ${offsetParam}
    )
    select
      (select count(*)::int from "Event") as "sourceCount",
      (select count(*)::int from groups_ready) as "groupedEvents",
      (select count(*)::int from filtered) as total,
      coalesce(
        (
          select json_agg(json_build_object(
            'groupKey', p."groupKey",
            'eventIds', p."eventIds"
          ) order by p."sortStartsAt" asc nulls last, p.title asc)
          from page p
        ),
        '[]'::json
      ) as "pageGroups",
      coalesce((
        select array_agg(distinct x order by x) from (
          select "proposedCategory" as x from groups_ready where "proposedCategory" is not null
        ) cats
      ), '{}') as categories,
      coalesce((
        select array_agg(distinct x order by x) from (
          select "sourceCode" as x from groups_ready where nullif(trim(coalesce("sourceCode", '')), '') is not null
        ) srcs
      ), '{}') as sources,
      json_build_object(
        'groupedEvents', (select count(*)::int from groups_ready),
        'readyForSales', (
          select count(*)::int from groups_ready
          where "purchaseReady" = true
            and "priceFrom" is not null
            and "hasFutureSession" = true
        ),
        'readyForSeo', (
          select count(*)::int from groups_ready
          where readiness = 'ready' and "canPublish" = true
        ),
        'needsAttention', (
          select count(*)::int from groups_ready
          where readiness in ('review', 'blocked')
        ),
        'priceBlocked', (
          select count(*)::int from groups_ready where "priceFrom" is null
        ),
        'purchaseBlocked', (
          select count(*)::int from groups_ready where "purchaseReady" = false
        ),
        'noImage', (
          select count(*)::int from groups_ready where "hasImage" = false
        ),
        'landingMatched', (
          select count(*)::int from groups_ready where "landingMatched" = true
        )
      ) as launch
    `,
    params,
  );

  const row = result.rows[0] || {};
  const pageGroups = Array.isArray(row.pageGroups)
    ? row.pageGroups
    : typeof row.pageGroups === 'string'
      ? JSON.parse(row.pageGroups)
      : [];
  const eventIds = [];
  for (const group of pageGroups) {
    for (const id of group.eventIds || []) {
      if (id) eventIds.push(id);
    }
  }

  const total = Number(row.total || 0);
  const pages = Math.max(1, Math.ceil(total / Math.max(1, limit)));
  const safePage = Math.min(page, pages);
  const launch = typeof row.launch === 'string' ? JSON.parse(row.launch) : row.launch || {};

  return {
    page: safePage,
    pages,
    limit,
    total,
    eventIds,
    pageGroups,
    categories: row.categories || [],
    sources: (row.sources || []).filter(Boolean).sort(),
    sourceCount: Number(row.sourceCount || 0),
    groupedEvents: Number(row.groupedEvents || 0),
    launch: {
      groupedEvents: Number(launch.groupedEvents || 0),
      readyForSales: Number(launch.readyForSales || 0),
      readyForSeo: Number(launch.readyForSeo || 0),
      needsAttention: Number(launch.needsAttention || 0),
      priceBlocked: Number(launch.priceBlocked || 0),
      purchaseBlocked: Number(launch.purchaseBlocked || 0),
      noImage: Number(launch.noImage || 0),
      landingMatched: Number(launch.landingMatched || 0),
      source: 'admin_event_groups_sql',
    },
    readModel: 'sql_group_page',
    rowsLoaded: eventIds.length,
  };
}

/** Lightweight launch metrics for dashboard (no full catalog in RAM). */
export async function queryAdminLaunchMetricsSql(db) {
  const result = await queryAdminEventGroupsPage(db, new URLSearchParams('limit=1&page=1'));
  return result.launch;
}
