const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { createRequire } = require("module");

const rootDir = path.resolve(__dirname, "..");
loadRootEnv(rootDir);

const requireFromDbPackage = createRequire(path.join(rootDir, "packages", "db", "package.json"));
const { Pool } = requireFromDbPackage("pg");
const { syncProviderLinksForSource } = require("./lib/provider-link-sync");
const { EVENT_UPSERT_STATUS, EVENT_UPSERT_SLUG } = require("./lib/event-import-guard");

const fixturesDir = path.resolve(process.env.TEP_FIXTURES_DIR || path.join(rootDir, "data", "teplohod", "fixtures"));
const eventsPath = path.join(fixturesDir, "events-compact.json");
const citiesPath = path.join(fixturesDir, "cities.json");
const manifestPath = path.join(fixturesDir, "manifest.json");
const connectionString = process.env.DATABASE_URL || "postgresql://daibilet:daibilet@127.0.0.1:5437/daibilet";
const pool = new Pool({ connectionString, max: 3 });

const MIN_DISPLAY_PRICE_RUB = 100;
const TEPL0HOD_SOURCE_ID = "src_teplohod";

const CATEGORY_MAP = new Map([
  ["Речные прогулки", { categoryId: "cat_excursions", subcategoryId: "sub_excursions_water" }],
  ["Экскурсии", { categoryId: "cat_excursions", subcategoryId: "sub_excursions_tours" }],
  ["Смотровые площадки", { categoryId: "cat_entertainment", subcategoryId: "sub_entertainment_fun" }],
  ["Банкеты", { categoryId: "cat_events", subcategoryId: "sub_events_show" }],
]);

async function main() {
  const startedAt = new Date();
  const { events, cities } = await loadTeplohodSnapshot();
  const manifest = fs.existsSync(manifestPath) ? readJson(manifestPath) : {};
  const cityById = new Map(cities.map((city) => [Number(city.id), city.name]));

  const client = await pool.connect();
  const syncId = `sync_tep_${Date.now()}`;
  const stats = {
    sourceEvents: events.length,
    sourceCities: cities.length,
    importedEvents: 0,
    sessions: 0,
    offers: 0,
    tags: 0,
    venues: 0,
    openDateEvents: 0,
    withoutEventTimes: 0,
    missingFromCatalog: 0,
    providerLinks: 0,
  };
  const importedExternalIds = new Set();

  try {
    await client.query("BEGIN");
    await ensureSource(client);
    await ensureSubcategories(client);

    const beforeResult = await client.query(
      `select count(*)::int as count from "EventSourceLink" where "sourceId" = $1`,
      [TEPL0HOD_SOURCE_ID],
    );
    stats.eventsBefore = beforeResult.rows[0]?.count ?? 0;

    await client.query(
      `
        insert into "SourceSyncRun" (id, "sourceId", status, mode, "startedAt", stats)
        values ($1, $2, 'RUNNING', $3, $4, $5::jsonb)
      `,
      [syncId, TEPL0HOD_SOURCE_ID, "fixture compact JSON import", startedAt.toISOString(), JSON.stringify({ manifest })],
    );

    const existingTeplohodEvents = await client.query(
      `
        select "eventId"
        from "EventSourceLink"
        where "sourceId" = $1
      `,
      [TEPL0HOD_SOURCE_ID],
    );
    const existingEventIds = existingTeplohodEvents.rows.map((row) => row.eventId);
    if (existingEventIds.length) {
      await client.query('delete from "EventTag" where "eventId" = any($1)', [existingEventIds]);
      await client.query('delete from "EventSession" where "eventId" = any($1)', [existingEventIds]);
      await client.query('delete from "EventOffer" where "eventId" = any($1) and "sourceCode" = $2', [existingEventIds, "TEPLOHOD"]);
    }

    for (const sourceEvent of events) {
      const externalId = String(sourceEvent.id);
      importedExternalIds.add(externalId);
      const places = Array.isArray(sourceEvent.eventPlaces) ? sourceEvent.eventPlaces : [];
      const primaryPlace = places[0] || {};
      const cityName =
        cityById.get(Number(primaryPlace.city_id)) ||
        cityFromAddress(primaryPlace.address) ||
        cityFromTitle(sourceEvent.title) ||
        "Не указан";
      const cityId = await upsertCity(client, cityName, primaryPlace.city_id);
      const venueId = await upsertVenue(client, sourceEvent, primaryPlace, cityId);
      if (venueId) stats.venues += 1;

      const eventTimes = Array.isArray(sourceEvent.eventTimes) ? sourceEvent.eventTimes : [];
      const tickets = Array.isArray(sourceEvent.eventTickets) ? sourceEvent.eventTickets : [];
      const features = Array.isArray(sourceEvent.eventFeatures) ? sourceEvent.eventFeatures : [];
      const ticketPrices = tickets.map((ticket) => money(ticket.price)).filter((price) => price != null && price >= MIN_DISPLAY_PRICE_RUB);
      const priceFromRub = ticketPrices.length ? Math.min(...ticketPrices) : null;
      const taxonomy = resolveTaxonomy(sourceEvent);
      const hasOpenDate = Boolean(sourceEvent.openDate);
      const eventKind = hasOpenDate
        ? "OPEN_DATE"
        : !eventTimes.length
          ? "RECURRING"
          : eventTimes.length === 1
            ? "SINGLE"
            : "RECURRING";
      if (eventKind === "OPEN_DATE") stats.openDateEvents += 1;
      if (!eventTimes.length) stats.withoutEventTimes += 1;

      const sessionVacantValues = eventTimes
        .map((item) => intOrNull(item.available_tickets))
        .filter((value) => value != null);
      const ticketsVacant = sessionVacantValues.length ? Math.min(...sessionVacantValues) : null;

      const eventId = await upsertEvent(client, {
        id: `evt_tep_${externalId}`,
        title: cleanTitle(sourceEvent.title) || "Событие Teplohod",
        slug: slugify(`${sourceEvent.title || "teplohod"}-${externalId}`),
        description: sourceEvent.description || null,
        kind: eventKind,
        status: statusFor(sourceEvent, priceFromRub, eventTimes),
        sourceStatus: hasOpenDate ? "open_date" : "active",
        imageUrl: firstImage(sourceEvent.images),
        priceFromRub,
        ticketsVacant,
        cityId,
        venueId,
        categoryId: taxonomy.categoryId,
        primarySubcategoryId: taxonomy.subcategoryId,
      });
      stats.importedEvents += 1;

      await upsertRawRecord(client, externalId, sourceEvent);
      await upsertSourceLink(client, eventId, externalId);
      await refreshSubcategory(client, eventId, taxonomy.subcategoryId);

      for (const tagTitle of eventTags(sourceEvent, features)) {
        const tagId = await upsertTag(client, tagTitle);
        await client.query(
          'insert into "EventTag" ("eventId", "tagId") values ($1, $2) on conflict ("eventId", "tagId") do nothing',
          [eventId, tagId],
        );
        stats.tags += 1;
      }

      const defaultPurchaseUrl = teplohodPurchaseUrl(externalId);
      for (const [ticketIndex, ticket] of tickets.entries()) {
        const priceRub = money(ticket.price);
        await client.query(
          `
            insert into "EventOffer" (id, "eventId", "sourceCode", title, "priceRub", "deeplinkUrl", payload, active)
            values ($1, $2, 'TEPLOHOD', $3, $4, $5, $6::jsonb, true)
            on conflict (id) do update set
              title = excluded.title,
              "priceRub" = excluded."priceRub",
              "deeplinkUrl" = excluded."deeplinkUrl",
              payload = excluded.payload,
              active = excluded.active
          `,
          [
            `offer_tep_${externalId}_${ticket.id}`,
            eventId,
            cleanTitle(ticket.title) || "Билет Teplohod",
            priceRub,
            defaultPurchaseUrl,
            JSON.stringify({ source: "teplohod", eventId: externalId, ticket, sortOrder: ticketIndex }),
          ],
        );
        stats.offers += 1;
      }

      if (!tickets.length && priceFromRub != null) {
        await client.query(
          `
            insert into "EventOffer" (id, "eventId", "sourceCode", title, "priceRub", "deeplinkUrl", payload, active)
            values ($1, $2, 'TEPLOHOD', $3, $4, $5, $6::jsonb, true)
            on conflict (id) do update set
              title = excluded.title,
              "priceRub" = excluded."priceRub",
              "deeplinkUrl" = excluded."deeplinkUrl",
              payload = excluded.payload,
              active = excluded.active
          `,
          [`offer_tep_${externalId}`, eventId, "Билет Teplohod", priceFromRub, defaultPurchaseUrl, JSON.stringify({ source: "teplohod", eventId: externalId })],
        );
        stats.offers += 1;
      }

      for (const eventTime of eventTimes) {
        const startsAt = parseTeplohodDate(eventTime.datetime);
        const ticketsVacant = intOrNull(eventTime.available_tickets);
        await client.query(
          `
            insert into "EventSession" (id, "eventId", "startsAt", "endsAt", "sourceStatus", "priceFromRub", "ticketsVacant", "externalId")
            values ($1, $2, $3, $4, 'active', $5, $6, $7)
            on conflict (id) do update set
              "startsAt" = excluded."startsAt",
              "endsAt" = excluded."endsAt",
              "sourceStatus" = excluded."sourceStatus",
              "priceFromRub" = excluded."priceFromRub",
              "ticketsVacant" = excluded."ticketsVacant",
              "externalId" = excluded."externalId"
          `,
          [
            `sess_tep_${eventTime.id}`,
            eventId,
            startsAt,
            startsAt && sourceEvent.duration ? addMinutes(startsAt, Number(sourceEvent.duration)) : null,
            priceFromRub,
            ticketsVacant,
            String(eventTime.id),
          ],
        );
        stats.sessions += 1;
      }

      if (!eventTimes.length && hasOpenDate) {
        const startsAt = rollingOpenDateStartsAt(sourceEvent.openDate);
        if (startsAt) {
          await client.query(
            `
              insert into "EventSession" (id, "eventId", "startsAt", "endsAt", "sourceStatus", "priceFromRub", "ticketsVacant", "externalId")
              values ($1, $2, $3, $4, 'open_date', $5, $6, $7)
              on conflict (id) do update set
                "startsAt" = excluded."startsAt",
                "endsAt" = excluded."endsAt",
                "sourceStatus" = excluded."sourceStatus",
                "priceFromRub" = excluded."priceFromRub",
                "ticketsVacant" = excluded."ticketsVacant",
                "externalId" = excluded."externalId"
            `,
            [
              `sess_tep_open_${externalId}`,
              eventId,
              startsAt,
              sourceEvent.duration ? addMinutes(startsAt, Number(sourceEvent.duration)) : null,
              priceFromRub,
              ticketsVacant,
              `open_${externalId}`,
            ],
          );
          stats.sessions += 1;
        }
      }
    }

    const missingResult = await client.query(
      `
        select count(*)::int as count
        from "EventSourceLink"
        where "sourceId" = $1
          and "externalId" <> all($2::text[])
      `,
      [TEPL0HOD_SOURCE_ID, [...importedExternalIds]],
    );
    stats.missingFromCatalog = missingResult.rows[0]?.count ?? 0;

    const providerLinkStats = await syncProviderLinksForSource(client, TEPL0HOD_SOURCE_ID);
    stats.providerLinks = providerLinkStats.total;

    const afterResult = await client.query(
      `select count(*)::int as count from "EventSourceLink" where "sourceId" = $1`,
      [TEPL0HOD_SOURCE_ID],
    );
    stats.eventsAfter = afterResult.rows[0]?.count ?? 0;
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
    console.log(JSON.stringify(stats, null, 2));
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
    await pool.end();
  }
}

async function ensureSource(client) {
  await client.query(
    `
      insert into "Source" (id, code, name, enabled, "createdAt", "updatedAt")
      values ($1, 'TEPLOHOD', 'Teplohod.info', true, now(), now())
      on conflict (code) do update set
        name = excluded.name,
        enabled = excluded.enabled,
        "updatedAt" = excluded."updatedAt"
    `,
    [TEPL0HOD_SOURCE_ID],
  );
}

async function ensureSubcategories(client) {
  const rows = [
    ["sub_excursions_water", "cat_excursions", "vodnye-ekskursii", "Водные экскурсии", 10],
    ["sub_excursions_bus", "cat_excursions", "avtobusnye-ekskursii", "Автобусные экскурсии", 20],
    ["sub_excursions_tours", "cat_excursions", "tury-i-poezdki", "Туры и поездки", 40],
    ["sub_events_show", "cat_events", "shou", "Шоу", 30],
    ["sub_entertainment_fun", "cat_entertainment", "razvlekatelnye-centry", "Развлекательные центры", 30],
  ];
  for (const row of rows) {
    await client.query(
      `
        insert into "Subcategory" (id, "categoryId", slug, title, position)
        values ($1, $2, $3, $4, $5)
        on conflict (slug) do update set
          title = excluded.title,
          position = excluded.position,
          "categoryId" = excluded."categoryId"
      `,
      row,
    );
  }
}

async function upsertCity(client, cityName, sourceCityId) {
  const slug = slugify(cityName);
  const result = await client.query(
    `
      insert into "City" (id, slug, title, "sourceTitle", "isDestination")
      values ($1, $2, $3, $3, true)
      on conflict (slug) do update set
        title = excluded.title,
        "sourceTitle" = coalesce("City"."sourceTitle", excluded."sourceTitle"),
        "isDestination" = true
      returning id
    `,
    [`city_tep_${sourceCityId || slug}`, slug, cityName],
  );
  return result.rows[0].id;
}

async function upsertVenue(client, event, place, cityId) {
  const venueTitle = cleanTitle(place.name) || cleanTitle(event.place) || "Место отправления Teplohod";
  const externalPlaceId = place.id || event.id;
  const slug = slugify(`${venueTitle}-${externalPlaceId}`);
  const latitude = floatOrNull(place.lat);
  const longitude = floatOrNull(place.lng);
  const result = await client.query(
    `
      insert into "Venue" (id, slug, title, description, "shortDescription", "heroImageUrl", "cityId", address, latitude, longitude, kind, "pageStatus", "createdAt", "updatedAt")
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'PIER', 'CANDIDATE', now(), now())
      on conflict (slug) do update set
        title = excluded.title,
        description = coalesce(excluded.description, "Venue".description),
        "shortDescription" = coalesce(excluded."shortDescription", "Venue"."shortDescription"),
        "heroImageUrl" = coalesce("Venue"."heroImageUrl", excluded."heroImageUrl"),
        "cityId" = excluded."cityId",
        address = excluded.address,
        latitude = excluded.latitude,
        longitude = excluded.longitude,
        kind = excluded.kind,
        "pageStatus" = case when "Venue"."pageStatus" = 'PUBLISHED' then "Venue"."pageStatus" else excluded."pageStatus" end,
        "updatedAt" = now()
      returning id
    `,
    [
      `venue_tep_${externalPlaceId}`,
      slug,
      venueTitle,
      place.description || null,
      cleanTitle(event.place) || null,
      firstImage(event.images),
      cityId,
      place.address || null,
      latitude,
      longitude,
    ],
  );

  const venueId = result.rows[0].id;
  await client.query(
    `
      insert into "VenueAlias" (id, "venueId", "sourceCode", "externalId", title, address)
      values ($1, $2, 'TEPLOHOD', $3, $4, $5)
      on conflict (id) do update set
        "venueId" = excluded."venueId",
        title = excluded.title,
        address = excluded.address
    `,
    [`venue_alias_tep_${externalPlaceId}`, venueId, String(externalPlaceId), venueTitle, place.address || null],
  );
  return venueId;
}

async function upsertEvent(client, event) {
  const result = await client.query(
    `
      insert into "Event" (
        id, title, slug, description, kind, status, "sourceStatus", "imageUrl", "priceFromRub", "ticketsVacant",
        "primaryCityId", "venueId", "categoryId", "primarySubcategoryId", "createdAt", "updatedAt"
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, now(), now())
      on conflict (id) do update set
        title = excluded.title,
        ${EVENT_UPSERT_SLUG},
        description = excluded.description,
        kind = excluded.kind,
        ${EVENT_UPSERT_STATUS},
        "sourceStatus" = excluded."sourceStatus",
        "imageUrl" = excluded."imageUrl",
        "priceFromRub" = excluded."priceFromRub",
        "ticketsVacant" = excluded."ticketsVacant",
        "primaryCityId" = excluded."primaryCityId",
        "venueId" = excluded."venueId",
        "categoryId" = excluded."categoryId",
        "primarySubcategoryId" = excluded."primarySubcategoryId",
        "updatedAt" = now()
      returning id
    `,
    [
      event.id,
      event.title,
      event.slug,
      event.description,
      event.kind,
      event.status,
      event.sourceStatus,
      event.imageUrl,
      event.priceFromRub,
      event.ticketsVacant,
      event.cityId,
      event.venueId,
      event.categoryId,
      event.primarySubcategoryId,
    ],
  );
  return result.rows[0].id;
}

async function upsertRawRecord(client, externalId, payload) {
  const payloadText = JSON.stringify(payload);
  await client.query(
    `
      insert into "RawImportRecord" (id, "sourceId", "entityType", "externalId", payload, "payloadHash", "importedAt")
      values ($1, $2, 'event', $3, $4::jsonb, $5, now())
      on conflict ("sourceId", "entityType", "externalId") do update set
        payload = excluded.payload,
        "payloadHash" = excluded."payloadHash",
        "importedAt" = excluded."importedAt"
    `,
    [`raw_tep_event_${externalId}`, TEPL0HOD_SOURCE_ID, externalId, payloadText, sha256(payloadText)],
  );
}

async function upsertSourceLink(client, eventId, externalId) {
  await client.query(
    `
      insert into "EventSourceLink" (id, "eventId", "sourceId", "externalId", "sourceUrl", "updatedAt")
      values ($1, $2, $3, $4, $5, now())
      on conflict ("sourceId", "externalId") do update set
        "eventId" = excluded."eventId",
        "sourceUrl" = excluded."sourceUrl",
        "updatedAt" = excluded."updatedAt"
    `,
    [`link_tep_${externalId}`, eventId, TEPL0HOD_SOURCE_ID, externalId, teplohodPurchaseUrl(externalId)],
  );
}

async function refreshSubcategory(client, eventId, subcategoryId) {
  if (!subcategoryId) return;
  await client.query(
    `
      insert into "EventSubcategory" ("eventId", "subcategoryId", "isPrimary")
      values ($1, $2, true)
      on conflict ("eventId", "subcategoryId") do update set "isPrimary" = true
    `,
    [eventId, subcategoryId],
  );
}

async function upsertTag(client, title) {
  const slug = slugify(title);
  const result = await client.query(
    `
      insert into "Tag" (id, slug, title)
      values ($1, $2, $3)
      on conflict (slug) do update set title = excluded.title
      returning id
    `,
    [`tag_tep_${slug}`, slug, title],
  );
  return result.rows[0].id;
}

function resolveTaxonomy(sourceEvent) {
  if (isBusTourEvent(sourceEvent)) {
    return { categoryId: "cat_excursions", subcategoryId: "sub_excursions_bus" };
  }
  if (isWaterEvent(sourceEvent)) {
    return { categoryId: "cat_excursions", subcategoryId: "sub_excursions_water" };
  }
  const defaultTaxonomy = CATEGORY_MAP.get(sourceEvent.category) || CATEGORY_MAP.get("Речные прогулки");
  return defaultTaxonomy;
}

function isBusTourEvent(event) {
  const haystack = [event.title, event.place, stripHtml(event.description), event.category]
    .map((value) => String(value || ""))
    .join(" ")
    .toLowerCase();
  if (/автобус|hop[\s-]?on|hop[\s-]?off|двухэтажн|city tour|citysightseeing|city sightseeing|сити[\s-]?тур|yutong|mercedes|hyundai/.test(haystack)) {
    return true;
  }
  if (/туристическ(?:ий|ого)?\s+транспорт/.test(haystack)) return true;
  return false;
}

function isWaterEvent(event) {
  if (isBusTourEvent(event)) return false;
  if (event.category === "Речные прогулки") return true;
  const haystack = [event.place, event.title, stripHtml(event.description), event.category]
    .map((value) => String(value || ""))
    .join(" ")
    .toLowerCase();
  if (/теплоход|катер|яхт|причал|пароход|судно|речн|канал|нева|москва-река|прогулк/.test(haystack)) return true;
  return false;
}

function stripHtml(value) {
  return String(value || "").replace(/<[^>]+>/g, " ");
}

function eventTags(event, features) {
  const placeTag = event.place
    ? `${isWaterEvent(event) ? "Теплоход" : "Площадка"}: ${cleanTitle(event.place)}`
    : null;
  return uniqueValues([
    event.category,
    placeTag,
    isWaterEvent(event) ? "Речные прогулки" : null,
    isWaterEvent(event) ? "Водные экскурсии" : null,
    isBusTourEvent(event) ? "Автобусные туры" : null,
    event.duration ? `${event.duration} минут` : null,
    ...(features || []).map((feature) => cleanTitle(feature.title)).filter(Boolean),
  ]).slice(0, 24);
}

function statusFor(event, priceFromRub, eventTimes) {
  if (!firstImage(event.images)) return "REVIEW";
  if (priceFromRub == null) return "REVIEW";
  if (!event.openDate && !eventTimes.length) return "READY";
  return "READY";
}

function parseDateOnly(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const [, year, month, day] = match;
  return new Date(Number(year), Number(month) - 1, Number(day));
}

function moscowCalendarDay(date = new Date()) {
  const msk = new Date(date.getTime() + 3 * 3600000);
  return {
    y: msk.getUTCFullYear(),
    mo: msk.getUTCMonth(),
    d: msk.getUTCDate(),
    h: msk.getUTCHours(),
  };
}

function mskInstantAtLocalTime(year, month, day, hour, minute = 0) {
  return new Date(Date.UTC(year, month, day, hour - 3, minute, 0)).toISOString();
}

function rollingOpenDateStartsAt(openDate) {
  const now = new Date();
  const { y, mo, d, h } = moscowCalendarDay(now);
  let year = y;
  let month = mo;
  let day = d;

  if (h >= 11) {
    const nextDay = new Date(Date.UTC(y, mo, d + 1));
    year = nextDay.getUTCFullYear();
    month = nextDay.getUTCMonth();
    day = nextDay.getUTCDate();
  }

  if (openDate && typeof openDate === "object") {
    const from = parseDateOnly(openDate.date_from);
    const to = parseDateOnly(openDate.date_to);
    if (to) {
      const rangeEnd = new Date(to);
      rangeEnd.setHours(23, 59, 59, 999);
      if (now > rangeEnd) return null;
    }
    if (from && now < from) {
      const startDay = moscowCalendarDay(from);
      return mskInstantAtLocalTime(startDay.y, startDay.mo, startDay.d, 11);
    }
  }

  return mskInstantAtLocalTime(year, month, day, 11);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

async function loadTeplohodSnapshot() {
  const apiUrl = String(process.env.TEP_API_URL || "").replace(/\/+$/, "");
  if (!apiUrl) {
    return {
      events: readJson(eventsPath),
      cities: readJson(citiesPath),
    };
  }

  const [events, cities] = await Promise.all([
    fetchTeplohodJson(`${apiUrl}/events`),
    fetchTeplohodJson(`${apiUrl}/cities`),
  ]);

  return {
    events: Array.isArray(events) ? events : [],
    cities: Array.isArray(cities) ? cities : [],
  };
}

async function fetchTeplohodJson(url) {
  const headers = {};
  const userAgent = process.env.TEP_USER_AGENT || process.env.TEPLOHOD_USER_AGENT;
  if (userAgent) headers['User-Agent'] = userAgent;

  const response = await fetch(url, { headers });
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error(
        `Teplohod API ${url}: HTTP ${response.status} — запрос должен идти с сервера из allowlist (токен не требуется)`,
      );
    }
    throw new Error(`Teplohod API ${url} returned HTTP ${response.status}`);
  }
  return response.json();
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

function firstImage(images) {
  return Array.isArray(images) && images.length ? images[0] : null;
}

function money(input) {
  const value = Number(input);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value);
}

function floatOrNull(input) {
  const value = Number(input);
  return Number.isFinite(value) ? value : null;
}

function intOrNull(input) {
  const value = Number(input);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.trunc(value);
}

function parseTeplohodDate(value) {
  if (!value) return null;
  const normalized = String(value).replace(/([+-]\d{2})(\d{2})$/, "$1:$2");
  const date = new Date(normalized);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function addMinutes(value, minutes) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()) || !Number.isFinite(minutes)) return null;
  return new Date(date.getTime() + minutes * 60000).toISOString();
}

const KNOWN_IMPORT_CITIES = [
  "Нижний Новгород",
  "Санкт-Петербург",
  "Ростов-на-Дону",
  "Екатеринбург",
  "Красноярск",
  "Новосибирск",
  "Калининград",
  "Москва",
  "Казань",
  "Самара",
  "Волгоград",
  "Ярославль",
  "Владимир",
  "Пермь",
  "Тверь",
  "Сочи",
  "Тула",
].sort((a, b) => b.length - a.length);

function cityFromAddress(address) {
  return cityFromText(address);
}

function cityFromTitle(title) {
  return cityFromText(title);
}

function cityNameStem(city) {
  const compact = city.toLowerCase().replace(/[^а-яё]/g, "");
  if (!compact) return "";
  if (compact.length <= 5) return compact;
  return compact.slice(0, Math.max(5, compact.length - 2));
}

function cityFromText(value) {
  const haystack = String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ");
  if (!haystack) return null;

  for (const city of KNOWN_IMPORT_CITIES) {
    const needle = city.toLowerCase();
    if (haystack.includes(needle)) return city;
    const stem = cityNameStem(city);
    if (stem.length >= 4 && haystack.includes(stem)) return city;
  }

  const match = haystack.match(/(?:^|\s)г\.?\s*([а-яё][а-яё\s-]{2,40})/i);
  if (!match) return null;

  const fragment = match[1].trim().replace(/["«»]/g, "");
  for (const city of KNOWN_IMPORT_CITIES) {
    const normalized = city.toLowerCase();
    if (normalized.startsWith(fragment) || fragment.startsWith(normalized.slice(0, 6))) return city;
  }

  return null;
}

function teplohodPurchaseUrl(eventId) {
  const baseUrl = process.env.TEP_WIDGET_BASE_URL || "https://teplohod.info";
  return `${baseUrl.replace(/\/+$/, "")}/event/${encodeURIComponent(eventId)}`;
}

function cleanTitle(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .trim();
}

function slugify(input) {
  return String(input || "item")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/ё/g, "e")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zа-я0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120) || "item";
}

function uniqueValues(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
