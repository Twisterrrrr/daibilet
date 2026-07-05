const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const catalogPath = path.join(rootDir, "data", "ticketscloud", "catalog.public.json");
const summaryPath = path.join(rootDir, "data", "ticketscloud", "summary.public.json");
const outDir = path.join(rootDir, "data", "db");
const outPath = path.join(outDir, "ticketscloud-seed.sql");

const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8")).events;
const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
const now = new Date().toISOString();
const existingCitySlugMap = loadExistingCitySlugMap();

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

const CATEGORY_TITLE_BY_ID = new Map(CATEGORIES.map(([categoryId, , title]) => [categoryId, title]));

const PUBLIC_CATALOG_CATEGORIES = new Set([
  "экскурсии",
  "музеи и арт",
  "мероприятия",
  "активный отдых",
  "развлечения",
]);

function isCrossCategoryCatalogTag(tag, category) {
  const tagNorm = String(tag || "").trim().toLowerCase();
  const categoryNorm = String(category || "").trim().toLowerCase();
  if (!tagNorm || !categoryNorm) return false;
  if (tagNorm === categoryNorm) return false;
  return PUBLIC_CATALOG_CATEGORIES.has(tagNorm);
}

const sql = [];
const cities = new Map();
const venues = new Map();
const tags = new Map();
const events = new Map();
const sessions = [];
const offers = [];
const eventTags = new Set();
const sourceLinks = [];
const eventsWithNamedOffers = new Set();
const usedEventSlugs = new Set();
const citySlugToCanonicalId = new Map(Object.entries(existingCitySlugMap));
const tcRawCityIdToCanonical = new Map();

for (const event of catalog) {
  const eventId = id("evt", event.externalId);
  const venue = event.venue || {};
  const city = venue.city || {};
  const cityId = registerCity(city);
  const venueId = venue.id ? id("venue", venue.id) : null;
  const categoryId = SOURCE_CATEGORY_TO_CATEGORY.get(event.category?.name) || "cat_events";
  const kind = eventKind(event.eventType);
  const priceFromRub = money(event.priceFrom);
  const ticketsVacant = intOrNull(event.ticketsAmountVacant);
  const status = event.imageUrl && (priceFromRub || priceFromRub === 0) && (event.startsAt || kind === "OPEN_DATE") ? "READY" : "REVIEW";
  const ticketSetOffers = buildTicketSetOffers(event, eventId);
  if (ticketSetOffers.length) {
    offers.push(...ticketSetOffers);
    eventsWithNamedOffers.add(eventId);
  } else if (priceFromRub != null) {
    offers.push({
      id: id("offer", event.externalId),
      eventId,
      sourceCode: "TICKETSCLOUD",
      title: "Ticketscloud widget",
      priceRub: priceFromRub,
      payload: JSON.stringify({ source: "ticketscloud", externalId: event.externalId }),
      active: true,
    });
  }

  if (venueId) {
    venues.set(venueId, {
      id: venueId,
      slug: slugify(`${venue.name || "venue"}-${venue.id}`),
      title: venue.name || "Площадка без названия",
      description: venue.description || null,
      cityId,
      address: venue.address || null,
      latitude: venue.coordinates?.latitude ?? null,
      longitude: venue.coordinates?.longitude ?? null,
      kind: venueKind(venue.typeGuess),
      pageStatus: venuePageStatus(venue.typeGuess, summary.topVenues?.find((item) => item.id === venue.id)?.events || 0),
    });
  }

  for (const tag of event.tags || []) {
    if (!tag.id || !tag.name) continue;
    const categoryTitle = CATEGORY_TITLE_BY_ID.get(categoryId) || "";
    if (isCrossCategoryCatalogTag(tag.name, categoryTitle)) continue;
    const tagId = id("tag", tag.id);
    tags.set(tagId, {
      id: tagId,
      slug: slugify(`${tag.name}-${tag.id}`),
      title: tag.name,
    });
    eventTags.add(`${eventId}\t${tagId}`);
  }

  events.set(eventId, {
    id: eventId,
    title: event.title || "Событие без названия",
    slug: uniqueEventSlug(`tc-${event.externalId}`, event.title),
    description: event.description || null,
    kind,
    status,
    sourceStatus: event.status || null,
    ageLimit: event.ageLimit || null,
    imageUrl: event.imageUrl || null,
    priceFromRub,
    ticketsVacant,
    primaryCityId: cityId,
    venueId,
    categoryId,
  });

  sourceLinks.push({
    id: id("link", event.externalId),
    eventId,
    sourceId: "src_ticketscloud",
    externalId: event.externalId,
    metaExternalId: event.metaExternalId || null,
  });

  if (event.startsAt || event.endsAt) {
    sessions.push({
      id: id("sess", event.externalId),
      eventId,
      startsAt: event.startsAt || null,
      endsAt: event.endsAt || null,
      sourceStatus: event.status || null,
      priceFromRub,
      ticketsVacant,
      externalId: event.externalId,
    });
  }
}

sql.push("-- Generated by scripts/db-build-tc-seed-sql.js");
sql.push("BEGIN;");
sql.push(`INSERT INTO "Source" ("id","code","name","enabled","createdAt","updatedAt") VALUES (${q("src_ticketscloud")}, 'TICKETSCLOUD', ${q("Ticketscloud")}, true, ${q(now)}, ${q(now)}) ON CONFLICT ("code") DO UPDATE SET "name"=EXCLUDED."name","enabled"=EXCLUDED."enabled","updatedAt"=EXCLUDED."updatedAt";`);
sql.push(`INSERT INTO "SourceSyncRun" ("id","sourceId","status","mode","startedAt","finishedAt","stats") VALUES (${q(`sync_tc_${Date.now()}`)}, ${q("src_ticketscloud")}, 'SUCCESS', ${q("PUBLIC full sync JSON seed")}, ${q(summary.requestedAt || now)}, ${q(now)}, ${json(summary.counts || {})});`);

insertRows("Category", ["id", "slug", "title", "position"], CATEGORIES.map(([categoryId, slug, title, position]) => ({ id: categoryId, slug, title, position })), ["slug"]);
insertRows("City", ["id", "slug", "title", "sourceTitle", "isDestination"], [...cities.values()], ["slug"]);
insertRows("Venue", ["id", "slug", "title", "description", "cityId", "address", "latitude", "longitude", "kind", "pageStatus", "createdAt", "updatedAt"], [...venues.values()].map((row) => ({ ...row, createdAt: now, updatedAt: now })), ["id"]);
insertRows("Tag", ["id", "slug", "title"], [...tags.values()], ["id"]);
insertRows("Event", ["id", "title", "slug", "description", "kind", "status", "sourceStatus", "ageLimit", "imageUrl", "priceFromRub", "ticketsVacant", "primaryCityId", "venueId", "categoryId", "createdAt", "updatedAt"], [...events.values()].map((row) => ({ ...row, createdAt: now, updatedAt: now })), ["id"]);
insertRows("EventSourceLink", ["id", "eventId", "sourceId", "externalId", "metaExternalId", "updatedAt"], sourceLinks.map((row) => ({ ...row, updatedAt: now })), ["sourceId", "externalId"]);
insertRows("EventSession", ["id", "eventId", "startsAt", "endsAt", "sourceStatus", "priceFromRub", "ticketsVacant", "externalId"], sessions, ["id"]);
insertRows("EventOffer", ["id", "eventId", "sourceCode", "title", "priceRub", "payload", "active"], offers, ["id"]);
if (eventsWithNamedOffers.size) {
  sql.push(
    `DELETE FROM "EventOffer" WHERE "sourceCode" = 'TICKETSCLOUD' AND lower(title) LIKE '%ticketscloud widget%' AND "eventId" IN (${[...eventsWithNamedOffers].map((value) => q(value)).join(",")});`,
  );
}
insertRows("EventTag", ["eventId", "tagId"], [...eventTags].map((value) => {
  const [eventId, tagId] = value.split("\t");
  return { eventId, tagId };
}), ["eventId", "tagId"]);

sql.push(`
DELETE FROM "EventTag" et
USING "Tag" t, "Event" e, "Category" c
WHERE et."tagId" = t.id
  AND et."eventId" = e.id
  AND e."categoryId" = c.id
  AND lower(trim(t.title)) IN ('экскурсии', 'музеи и арт', 'мероприятия', 'активный отдых', 'развлечения')
  AND lower(trim(t.title)) <> lower(trim(c.title));
`);

sql.push("COMMIT;");

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outPath, `${sql.join("\n")}\n`, "utf8");
console.log(`Wrote ${outPath}`);
console.log(`Events: ${events.size}, venues: ${venues.size}, cities: ${cities.size}, tags: ${tags.size}, sessions: ${sessions.length}, offers: ${offers.length}`);

function buildTicketSetOffers(event, eventId) {
  const rows = [];
  const seen = new Set();

  for (const [setIndex, set] of (event.ticketSets || []).entries()) {
    const title = String(set?.name || "").trim() || "Билет";
    const prices = Array.isArray(set?.prices) ? set.prices : [];
    for (const [priceIndex, rawPrice] of prices.entries()) {
      const priceRub = money(rawPrice);
      if (priceRub == null) continue;
      const dedupeKey = `${title.toLowerCase()}|${priceRub}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      rows.push({
        id: id("offer", `${event.externalId}_${set.id || setIndex}_${priceIndex}`),
        eventId,
        sourceCode: "TICKETSCLOUD",
        title,
        priceRub,
        payload: JSON.stringify({
          source: "ticketscloud",
          externalId: event.externalId,
          setId: set.id || null,
          sortOrder: setIndex * 100 + priceIndex,
        }),
        active: true,
      });
    }
  }

  return rows;
}

function insertRows(table, columns, rows, conflictColumns) {
  if (!rows.length) return;
  const batchSize = 400;
  for (let index = 0; index < rows.length; index += batchSize) {
    const batch = rows.slice(index, index + batchSize);
    const values = batch.map((row) => `(${columns.map((column) => value(row[column])).join(",")})`).join(",\n");
    const conflict = conflictColumns.map((column) => `"${column}"`).join(",");
    const updateColumns = columns.filter((column) => !conflictColumns.includes(column) && column !== "id");
    const update = updateColumns.length
      ? ` DO UPDATE SET ${updateColumns.map((column) => `"${column}"=EXCLUDED."${column}"`).join(",")}`
      : " DO NOTHING";
    sql.push(`INSERT INTO "${table}" (${columns.map((column) => `"${column}"`).join(",")}) VALUES\n${values}\nON CONFLICT (${conflict})${update};`);
  }
}

function value(input) {
  if (input == null) return "NULL";
  if (typeof input === "number") return Number.isFinite(input) ? String(input) : "NULL";
  if (typeof input === "boolean") return input ? "true" : "false";
  if (typeof input === "string" && isEnumValue(input)) return `'${input}'`;
  return q(input);
}

function json(input) {
  return `${q(JSON.stringify(input))}::jsonb`;
}

function q(input) {
  return `'${String(input).replace(/'/g, "''")}'`;
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
  return {
    club_restaurant: "CLUB_BAR_RESTAURANT",
    pier_water: "PIER",
    museum_art: "MUSEUM_ART_SPACE",
    theater: "THEATER",
    concert_hall: "CONCERT_HALL",
    sport_outdoor: "SPORT_ACTIVITY_SPACE",
    generic_location: "MEETING_POINT",
  }[input] || "OTHER";
}

function venuePageStatus(input, events) {
  if (input === "generic_location") return "NONE";
  if (events >= 5 || ["pier_water", "museum_art", "theater", "concert_hall"].includes(input)) return "CANDIDATE";
  return "NONE";
}

function registerCity(city) {
  if (!city?.id || !city?.name) return null;
  const rawId = id("city", city.id);
  if (tcRawCityIdToCanonical.has(rawId)) return tcRawCityIdToCanonical.get(rawId);

  const slug = slugify(city.name);
  const canonicalId = citySlugToCanonicalId.get(slug) || existingCitySlugMap[slug] || rawId;
  citySlugToCanonicalId.set(slug, canonicalId);
  tcRawCityIdToCanonical.set(rawId, canonicalId);

  if (!cities.has(canonicalId)) {
    cities.set(canonicalId, {
      id: canonicalId,
      slug,
      title: city.name,
      sourceTitle: city.name,
      isDestination: true,
    });
  }

  return canonicalId;
}

function loadExistingCitySlugMap() {
  const raw = process.env.EXISTING_CITY_SLUG_MAP || "";
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
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

function uniqueEventSlug(externalId, title) {
  const candidates = [
    slugify(`${externalId}-${title || "event"}`),
    slugify(String(externalId || "event")),
  ];
  for (const candidate of candidates) {
    if (!usedEventSlugs.has(candidate)) {
      usedEventSlugs.add(candidate);
      return candidate;
    }
  }
  let index = 2;
  while (index < 1000) {
    const candidate = slugify(`${externalId}-${index}`);
    if (!usedEventSlugs.has(candidate)) {
      usedEventSlugs.add(candidate);
      return candidate;
    }
    index += 1;
  }
  const fallback = slugify(`${externalId}-${Date.now()}`);
  usedEventSlugs.add(fallback);
  return fallback;
}

function isEnumValue(input) {
  return [
    "TICKETSCLOUD",
    "TEPLOHOD",
    "MANUAL",
    "SINGLE",
    "RECURRING",
    "OPEN_DATE",
    "DRAFT",
    "REVIEW",
    "READY",
    "PUBLISHED",
    "HIDDEN",
    "VENUE",
    "MUSEUM_ART_SPACE",
    "THEATER",
    "CONCERT_HALL",
    "CLUB_BAR_RESTAURANT",
    "PIER",
    "MEETING_POINT",
    "OUTDOOR_LOCATION",
    "SPORT_ACTIVITY_SPACE",
    "ATTRACTION",
    "ONLINE",
    "OTHER",
    "NONE",
    "CANDIDATE",
  ].includes(input);
}
