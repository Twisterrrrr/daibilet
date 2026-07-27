const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { createRequire } = require("module");

const rootDir = path.resolve(__dirname, "..");
loadRootEnv(rootDir);

const { syncProviderLinksForSource } = require("./lib/provider-link-sync");
const { EVENT_UPSERT_STATUS, EVENT_UPSERT_SLUG } = require("./lib/event-import-guard");
const { normalizeImportEventTitle } = require("./lib/event-title-normalize");
const { ENTERTAINMENT_DISCO_TAXONOMY, isDiscoOrPartyEvent } = require("./lib/event-taxonomy");

const requireFromDbPackage = createRequire(path.join(rootDir, "packages", "db", "package.json"));
const { Pool } = requireFromDbPackage("pg");

const catalogPath = path.join(rootDir, "data", "ticketscloud", "catalog.public.json");
const summaryPath = path.join(rootDir, "data", "ticketscloud", "summary.public.json");
const connectionString = process.env.DATABASE_URL || "postgresql://daibilet:daibilet@127.0.0.1:5437/daibilet";
const pool = new Pool({ connectionString, max: 3 });

const TICKETSCLOUD_SOURCE_ID = "src_ticketscloud";

const CATEGORIES = [
  ["cat_excursions", "ekskursii", "Экскурсии", 10],
  ["cat_museums_art", "muzei-i-art", "Музеи и арт", 20],
  ["cat_events", "meropriyatiya", "Мероприятия", 30],
  ["cat_active", "aktivnyy-otdyh", "Активный отдых", 40],
  ["cat_entertainment", "razvlecheniya", "Развлечения", 50],
];

const SOURCE_CATEGORY_TO_CATEGORY = new Map([
  ["Экскурсии", "cat_excursions"],
  ["Музеи", "cat_museums_art"],
  ["Развитие", "cat_museums_art"],
  ["Концерты", "cat_events"],
  ["Шоу", "cat_events"],
  ["Театры", "cat_events"],
  ["Фестивали", "cat_events"],
  ["Вечеринки", "cat_events"],
  ["Спорт", "cat_active"],
  ["Детям", "cat_entertainment"],
]);

async function main() {
  if (!fs.existsSync(catalogPath)) {
    throw new Error(`Missing catalog file: ${catalogPath}. Run npm run tc:full-sync first.`);
  }

  const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8")).events || [];
  const summary = fs.existsSync(summaryPath) ? JSON.parse(fs.readFileSync(summaryPath, "utf8")) : null;
  const stats = await importCatalogEvents(catalog, {
    mode: "catalog JSON upsert import",
    summary,
    skipMissingFromCatalog: false,
    endPool: true,
  });
  console.log(JSON.stringify(stats, null, 2));
}

/**
 * Upsert normalized catalog events into Postgres (same path as full import).
 * @param {object[]} catalog
 * @param {{ mode?: string, summary?: object|null, skipMissingFromCatalog?: boolean, endPool?: boolean }} options
 */
async function importCatalogEvents(catalog, options = {}) {
  const startedAt = new Date();
  const client = await pool.connect();
  const syncId = `sync_tc_${Date.now()}`;
  const importedExternalIds = new Set();
  const skipMissingFromCatalog = Boolean(options.skipMissingFromCatalog);
  const summary = options.summary ?? null;

  const stats = {
    sourceEvents: catalog.length,
    importedEvents: 0,
    sessions: 0,
    offers: 0,
    tags: 0,
    venues: 0,
    cities: 0,
    offersWithWidgetUrl: 0,
    eventsWithoutWidgetUrl: 0,
    missingFromCatalog: 0,
    providerLinks: 0,
  };

  try {
    await client.query("BEGIN");
    await ensureSource(client);
    await ensureCategories(client);

    const beforeResult = await client.query(
      `select count(*)::int as count from "EventSourceLink" where "sourceId" = $1`,
      [TICKETSCLOUD_SOURCE_ID],
    );
    stats.eventsBefore = beforeResult.rows[0]?.count ?? 0;

    await client.query(
      `
        insert into "SourceSyncRun" (id, "sourceId", status, mode, "startedAt", stats)
        values ($1, $2, 'RUNNING', $3, $4, $5::jsonb)
      `,
      [
        syncId,
        TICKETSCLOUD_SOURCE_ID,
        options.mode || "catalog JSON upsert import",
        startedAt.toISOString(),
        JSON.stringify({ summaryCounts: summary?.counts || null, skipMissingFromCatalog }),
      ],
    );

    const importedEventIds = [];
    for (const event of catalog) {
      importedExternalIds.add(String(event.externalId));
      const rowStats = await importCatalogEvent(client, event, summary);
      if (rowStats.eventId) importedEventIds.push(rowStats.eventId);
      stats.importedEvents += 1;
      stats.sessions += rowStats.sessions;
      stats.offers += rowStats.offers;
      stats.tags += rowStats.tags;
      if (rowStats.venue) stats.venues += 1;
      if (rowStats.city) stats.cities += 1;
      if (rowStats.hasWidgetUrl) stats.offersWithWidgetUrl += 1;
      else stats.eventsWithoutWidgetUrl += 1;
    }

    if (!skipMissingFromCatalog) {
      const missingResult = await client.query(
        `
          select count(*)::int as count
          from "EventSourceLink"
          where "sourceId" = $1
            and "externalId" <> all($2::text[])
        `,
        [TICKETSCLOUD_SOURCE_ID, [...importedExternalIds]],
      );
      stats.missingFromCatalog = missingResult.rows[0]?.count ?? 0;
    }

    const providerLinkStats = await syncProviderLinksForSource(
      client,
      TICKETSCLOUD_SOURCE_ID,
      skipMissingFromCatalog ? { eventIds: importedEventIds } : undefined,
    );
    stats.providerLinks = providerLinkStats.total;
    stats.providerLinksFiltered = Boolean(skipMissingFromCatalog);

    const afterResult = await client.query(
      `select count(*)::int as count from "EventSourceLink" where "sourceId" = $1`,
      [TICKETSCLOUD_SOURCE_ID],
    );
    stats.eventsAfter = afterResult.rows[0]?.count ?? 0;
    stats.newEvents = Math.max(0, stats.eventsAfter - stats.eventsBefore);
    stats.durationMs = Date.now() - startedAt.getTime();

    await client.query(
      `
        update "SourceSyncRun"
        set status = 'SUCCESS', "finishedAt" = $2, stats = $3::jsonb
        where id = $1
      `,
      [syncId, new Date().toISOString(), JSON.stringify(stats)],
    );
    await client.query("COMMIT");
    return stats;
  } catch (error) {
    await client.query("ROLLBACK");
    try {
      await pool.query(
        `
          update "SourceSyncRun"
          set status = 'FAILED', "finishedAt" = $2, error = $3
          where id = $1
        `,
        [syncId, new Date().toISOString(), error instanceof Error ? error.stack || error.message : String(error)],
      );
    } catch {
      // Ignore sync status write failures after rollback.
    }
    throw error;
  } finally {
    client.release();
    if (options.endPool !== false) {
      await pool.end();
    }
  }
}

async function importCatalogEvent(client, event, summary) {
  const rowStats = { eventId: null, sessions: 0, offers: 0, tags: 0, venue: false, city: false, hasWidgetUrl: false };
  const externalId = String(event.externalId);
  const eventId = id("evt", externalId);
  rowStats.eventId = eventId;
  const venue = event.venue || {};
  const city = venue.city || {};
  const cityId = city.id ? id("city", city.id) : null;
  const venueId = venue.id ? id("venue", venue.id) : null;
  const categoryId = resolveCatalogCategoryId(event);
  const kind = eventKind(event.eventType);
  const priceFromRub = money(event.priceFrom);
  const ticketsVacant = intOrNull(event.ticketsAmountVacant);
  const status =
    event.imageUrl && (priceFromRub || priceFromRub === 0) && (event.startsAt || kind === "OPEN_DATE") ? "READY" : "REVIEW";
  const widgetUrl = buildTicketscloudWidgetUrl(externalId);

  let resolvedCityId = cityId;
  if (cityId && city.name) {
    const citySlug = slugify(city.name);
    const cityResult = await client.query(
      `
        insert into "City" (id, slug, title, "sourceTitle", "isDestination")
        values ($1, $2, $3, $3, true)
        on conflict (slug) do update set
          title = excluded.title,
          "sourceTitle" = coalesce("City"."sourceTitle", excluded."sourceTitle"),
          "isDestination" = true
        returning id
      `,
      [cityId, citySlug, city.name],
    );
    resolvedCityId = cityResult.rows[0]?.id || cityId;
    rowStats.city = true;
  }

  let resolvedVenueId = venueId;
  if (venueId) {
    const venueEvents =
      summary?.topVenues?.find((item) => item.id === venue.id)?.events || 0;
    const venueSlug = slugify(`${venue.name || "venue"}-${venue.id}`);
    const existingBySlug = await client.query(`select id from "Venue" where slug = $1 limit 1`, [venueSlug]);
    const targetVenueId = existingBySlug.rows[0]?.id || venueId;
    const venueResult = await client.query(
      `
        insert into "Venue" (
          id, slug, title, description, "cityId", address, latitude, longitude, kind, "pageStatus", "createdAt", "updatedAt"
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now(), now())
        on conflict (id) do update set
          title = excluded.title,
          description = coalesce(excluded.description, "Venue".description),
          "cityId" = excluded."cityId",
          address = excluded.address,
          latitude = excluded.latitude,
          longitude = excluded.longitude,
          kind = case
            when "Venue".kind in ('MUSEUM_ART_SPACE', 'THEATER', 'CONCERT_HALL', 'CLUB_BAR_RESTAURANT', 'ATTRACTION')
            then "Venue".kind
            else excluded.kind
          end,
          "pageStatus" = case when "Venue"."pageStatus" = 'PUBLISHED' then "Venue"."pageStatus" else excluded."pageStatus" end,
          "updatedAt" = now()
        returning id
      `,
      [
        targetVenueId,
        venueSlug,
        venue.name || "Площадка без названия",
        venue.description || null,
        resolvedCityId,
        venue.address || null,
        venue.coordinates?.latitude ?? null,
        venue.coordinates?.longitude ?? null,
        venueKind(venue.typeGuess),
        venuePageStatus(venue.typeGuess, venueEvents),
      ],
    );
    resolvedVenueId = venueResult.rows[0]?.id || targetVenueId;
    rowStats.venue = true;
  }

  const tagLinks = [];
  for (const tag of event.tags || []) {
    if (!tag.id || !tag.name) continue;
    const tagId = id("tag", tag.id);
    await client.query(
      `
        insert into "Tag" (id, slug, title)
        values ($1, $2, $3)
        on conflict (id) do update set title = excluded.title
      `,
      [tagId, slugify(`${tag.name}-${tag.id}`), tag.name],
    );
    tagLinks.push({ eventId, tagId });
  }

  await client.query(
    `
      insert into "Event" (
        id, title, slug, description, kind, status, "sourceStatus", "ageLimit", "imageUrl",
        "priceFromRub", "ticketsVacant", "primaryCityId", "venueId", "categoryId", "createdAt", "updatedAt"
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, now(), now())
      on conflict (id) do update set
        title = excluded.title,
        ${EVENT_UPSERT_SLUG},
        description = excluded.description,
        kind = excluded.kind,
        ${EVENT_UPSERT_STATUS},
        "sourceStatus" = excluded."sourceStatus",
        "ageLimit" = excluded."ageLimit",
        "imageUrl" = excluded."imageUrl",
        "priceFromRub" = excluded."priceFromRub",
        "ticketsVacant" = excluded."ticketsVacant",
        "primaryCityId" = excluded."primaryCityId",
        "venueId" = excluded."venueId",
        "categoryId" = excluded."categoryId",
        "updatedAt" = now()
    `,
    [
      eventId,
      normalizeImportEventTitle(event.title) || "Событие без названия",
      buildEventSlug(event.title || "event", externalId),
      event.description || null,
      kind,
      status,
      event.status || null,
      event.ageLimit || null,
      event.imageUrl || null,
      priceFromRub,
      ticketsVacant,
      resolvedCityId,
      resolvedVenueId,
      categoryId,
    ],
  );

  for (const link of tagLinks) {
    await client.query(
      `
        insert into "EventTag" ("eventId", "tagId")
        values ($1, $2)
        on conflict ("eventId", "tagId") do nothing
      `,
      [link.eventId, link.tagId],
    );
    rowStats.tags += 1;
  }

  const payloadText = JSON.stringify(event.raw || event);
  await client.query(
    `
      insert into "RawImportRecord" (id, "sourceId", "entityType", "externalId", payload, "payloadHash", "importedAt")
      values ($1, $2, 'event', $3, $4::jsonb, $5, now())
      on conflict ("sourceId", "entityType", "externalId") do update set
        payload = excluded.payload,
        "payloadHash" = excluded."payloadHash",
        "importedAt" = excluded."importedAt"
      where "RawImportRecord"."payloadHash" is distinct from excluded."payloadHash"
    `,
    [`raw_tc_event_${externalId}`, TICKETSCLOUD_SOURCE_ID, externalId, payloadText, sha256(payloadText)],
  );

  await client.query(
    `
      insert into "EventSourceLink" (id, "eventId", "sourceId", "externalId", "metaExternalId", "sourceUrl", "updatedAt")
      values ($1, $2, $3, $4, $5, $6, now())
      on conflict ("sourceId", "externalId") do update set
        "eventId" = excluded."eventId",
        "metaExternalId" = excluded."metaExternalId",
        "sourceUrl" = excluded."sourceUrl",
        "updatedAt" = excluded."updatedAt"
    `,
    [
      id("link", externalId),
      eventId,
      TICKETSCLOUD_SOURCE_ID,
      externalId,
      event.metaExternalId || null,
      buildTicketscloudWidgetUrl(externalId),
    ],
  );

  if (event.startsAt || event.endsAt) {
    await client.query(
      `
        insert into "EventSession" (
          id, "eventId", "startsAt", "endsAt", "sourceStatus", "priceFromRub", "ticketsVacant", "externalId"
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8)
        on conflict (id) do update set
          "startsAt" = excluded."startsAt",
          "endsAt" = excluded."endsAt",
          "sourceStatus" = excluded."sourceStatus",
          "priceFromRub" = excluded."priceFromRub",
          "ticketsVacant" = excluded."ticketsVacant",
          "externalId" = excluded."externalId"
      `,
      [
        id("sess", externalId),
        eventId,
        event.startsAt || null,
        event.endsAt || null,
        event.status || null,
        priceFromRub,
        ticketsVacant,
        externalId,
      ],
    );
    rowStats.sessions += 1;
  }

  await upsertTicketscloudOffers(client, {
    eventId,
    externalId,
    event,
    priceFromRub,
    widgetUrl,
    rowStats,
  });

  return rowStats;
}

async function upsertTicketscloudOffers(client, { eventId, externalId, event, priceFromRub, widgetUrl, rowStats }) {
  const ticketSets = Array.isArray(event.ticketSets) ? event.ticketSets : [];
  const namedSets = ticketSets
    .map((set, index) => {
      const prices = (set.prices || []).filter((price) => Number.isFinite(price) && price >= 100);
      if (!prices.length) return null;
      const setId = set.id != null ? String(set.id) : String(index);
      return {
        setId,
        title: String(set.name || "Билет").trim() || "Билет",
        priceRub: Math.min(...prices),
        sortOrder: index,
      };
    })
    .filter(Boolean);

  if (namedSets.length) {
    await client.query(
      `
        update "EventOffer"
        set active = false
        where "eventId" = $1
          and lower(coalesce(title, '')) like '%ticketscloud widget%'
      `,
      [eventId],
    );

    for (const set of namedSets) {
      await client.query(
        `
          insert into "EventOffer" (
            id, "eventId", "sourceCode", title, "priceRub", "widgetUrl", payload, active
          )
          values ($1, $2, 'TICKETSCLOUD', $3, $4, $5, $6::jsonb, true)
          on conflict (id) do update set
            title = excluded.title,
            "priceRub" = excluded."priceRub",
            "widgetUrl" = excluded."widgetUrl",
            payload = excluded.payload,
            active = excluded.active
        `,
        [
          id("offer", `${externalId}_${set.setId}`),
          eventId,
          set.title,
          set.priceRub,
          widgetUrl,
          JSON.stringify({
            source: "ticketscloud",
            externalId,
            setId: set.setId,
            sortOrder: set.sortOrder,
          }),
        ],
      );
      rowStats.offers += 1;
    }

    rowStats.hasWidgetUrl = Boolean(widgetUrl);
    return;
  }

  if (priceFromRub == null) return;

  await client.query(
    `
      insert into "EventOffer" (
        id, "eventId", "sourceCode", title, "priceRub", "widgetUrl", payload, active
      )
      values ($1, $2, 'TICKETSCLOUD', $3, $4, $5, $6::jsonb, true)
      on conflict (id) do update set
        title = excluded.title,
        "priceRub" = excluded."priceRub",
        "widgetUrl" = excluded."widgetUrl",
        payload = excluded.payload,
        active = excluded.active
    `,
    [
      id("offer", externalId),
      eventId,
      "Ticketscloud widget",
      priceFromRub,
      widgetUrl,
      JSON.stringify({ source: "ticketscloud", externalId }),
    ],
  );
  rowStats.offers += 1;
  rowStats.hasWidgetUrl = Boolean(widgetUrl);
}

async function ensureSource(client) {
  await client.query(
    `
      insert into "Source" (id, code, name, enabled, "createdAt", "updatedAt")
      values ($1, 'TICKETSCLOUD', 'Ticketscloud', true, now(), now())
      on conflict (code) do update set
        name = excluded.name,
        enabled = excluded.enabled,
        "updatedAt" = excluded."updatedAt"
    `,
    [TICKETSCLOUD_SOURCE_ID],
  );
}

async function ensureCategories(client) {
  for (const [categoryId, slug, title, position] of CATEGORIES) {
    await client.query(
      `
        insert into "Category" (id, slug, title, position)
        values ($1, $2, $3, $4)
        on conflict (slug) do update set
          title = excluded.title,
          position = excluded.position
      `,
      [categoryId, slug, title, position],
    );
  }
}

function buildTicketscloudWidgetUrl(eventExternalId) {
  const token = process.env.TICKETSCLOUD_WIDGET_TOKEN || process.env.TC_WIDGET_TOKEN;
  if (!token || !eventExternalId) return null;
  const normalizedToken = token.startsWith("r:") ? token : `r:${token}`;
  const url = new URL(process.env.TICKETSCLOUD_WIDGET_BASE_URL || "https://ticketscloud.org/v1/widgets/common");
  url.searchParams.set("token", normalizedToken);
  url.searchParams.set("event", eventExternalId);
  return url.toString();
}

function loadRootEnv(projectRoot) {
  const envPath = path.join(projectRoot, ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, "");
    if (key && process.env[key] == null) process.env[key] = value;
  }
}

function id(prefix, raw) {
  return `${prefix}_${String(raw).replace(/[^a-zA-Z0-9_]+/g, "_").slice(0, 80)}`;
}

function money(input) {
  const value = Number(input);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value);
}

function intOrNull(input) {
  const value = Number(input);
  if (!Number.isFinite(value)) return null;
  return Math.trunc(value);
}

function eventKind(input) {
  if (input === "single") return "SINGLE";
  if (input === "open_date") return "OPEN_DATE";
  return "RECURRING";
}

function venueKind(input) {
  return (
    {
      club_restaurant: "CLUB_BAR_RESTAURANT",
      pier_water: "PIER",
      museum_art: "MUSEUM_ART_SPACE",
      theater: "THEATER",
      concert_hall: "CONCERT_HALL",
      sport_outdoor: "SPORT_ACTIVITY_SPACE",
      generic_location: "MEETING_POINT",
    }[input] || "OTHER"
  );
}

function venuePageStatus(input, events) {
  if (input === "generic_location") return "NONE";
  if (events >= 5 || ["pier_water", "museum_art", "theater", "concert_hall"].includes(input)) return "CANDIDATE";
  return "NONE";
}

function resolveCatalogCategoryId(event) {
  if (isDiscoOrPartyEvent(event)) return ENTERTAINMENT_DISCO_TAXONOMY.categoryId;
  return SOURCE_CATEGORY_TO_CATEGORY.get(event.category?.name) || "cat_events";
}

function slugify(input) {
  return (
    String(input || "item")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/ё/g, "e")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zа-я0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 120) || "item"
  );
}

/** Keep externalId suffix inside 120-char slug budget (plain slugify can truncate it away). */
function buildEventSlug(title, externalId) {
  const idPart = slugify(externalId).slice(0, 40) || "event";
  const maxTitle = Math.max(16, 120 - idPart.length - 1);
  const titlePart = slugify(title || "event").slice(0, maxTitle) || "event";
  return `${titlePart}-${idPart}`.slice(0, 120);
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

module.exports = {
  importCatalogEvent,
  importCatalogEvents,
  TICKETSCLOUD_SOURCE_ID,
};

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
