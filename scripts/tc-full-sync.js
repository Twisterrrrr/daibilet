const fs = require("fs");
const path = require("path");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
require("dotenv").config();

const rootDir = path.resolve(__dirname, "..");
const protoDir = path.join(rootDir, "vendor", "ticketscloud-proto");
const protoPath = path.join(protoDir, "service.proto");
const outDir = path.join(rootDir, "data", "ticketscloud");
const catalogPath = path.join(outDir, "catalog.public.json");
const summaryPath = path.join(outDir, "summary.public.json");
const { normalizeImportEventTitle } = require("./lib/event-title-normalize");

const endpoint = process.env.TICKETSCLOUD_GRPC_ENDPOINT || "simple.ticketscloud.com:443";
const token = process.env.TICKETSCLOUD_API_TOKEN || process.env.TICKETSCLOUD_API_KEY || process.env.TC_API_TOKEN;
const streamTimeoutMs = Number(process.env.TICKETSCLOUD_FULL_SYNC_TIMEOUT_MS || 360000);

if (!token) {
  console.error("Missing Ticketscloud token: set TICKETSCLOUD_API_TOKEN, TICKETSCLOUD_API_KEY, or TC_API_TOKEN");
  process.exit(1);
}

const packageDefinition = protoLoader.loadSync(protoPath, {
  includeDirs: [protoDir],
  keepCase: false,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const loaded = grpc.loadPackageDefinition(packageDefinition);
const client = new loaded.v2.Simple(endpoint, grpc.credentials.createSsl());

const metadata = new grpc.Metadata();
metadata.add("authorization", token);
metadata.add("preferred-language", "ru");

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const startedAt = Date.now();
  fs.mkdirSync(outDir, { recursive: true });

  console.log("Loading PUBLIC events...");
  const events = await streamAll("Events", { status: "PUBLIC" }, { progressEvery: 1000 });
  console.log(`Loaded ${events.length} PUBLIC events`);

  const categoryIds = unique(events.map((event) => event.category).filter(Boolean));
  const venueIds = unique(events.map((event) => event.venue).filter(Boolean));
  const tagIds = unique(events.flatMap((event) => event.tags || []).filter(Boolean));
  const metaIds = unique(events.map((event) => event.meta).filter(Boolean));

  console.log("Loading dictionaries...");
  const [categories, venues, tags, metaEvents] = await Promise.all([
    streamAll("Categories", { ids: categoryIds }),
    streamAll("Venues", { ids: venueIds }),
    streamAll("Tags", { ids: tagIds }),
    streamAll("MetaEvents", { ids: metaIds }),
  ]);

  const cityIds = unique(venues.map((venue) => venue.city).filter(Boolean));
  const cities = await streamAll("Cities", { ids: cityIds });

  const categoriesById = byId(categories);
  const venuesById = byId(venues);
  const tagsById = byId(tags);
  const citiesById = byId(cities);
  const metaEventsById = byId(metaEvents);

  console.log("Normalizing catalog...");
  const catalog = events.map((event) =>
    normalizeEvent(event, {
      categoriesById,
      venuesById,
      tagsById,
      citiesById,
      metaEventsById,
    })
  );

  const summary = buildSummary({
    endpoint,
    startedAt,
    catalog,
    dictionaries: { categories, venues, cities, tags, metaEvents },
  });

  fs.writeFileSync(catalogPath, JSON.stringify({ events: catalog }, null, 2));
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

  printSummary(summary);
  console.log(`Saved catalog to ${catalogPath}`);
  console.log(`Saved summary to ${summaryPath}`);
}

function normalizeEvent(event, dictionaries) {
  const { categoriesById, venuesById, tagsById, citiesById, metaEventsById } = dictionaries;
  const venue = venuesById.get(event.venue);
  const city = venue ? citiesById.get(String(venue.city)) : undefined;
  const category = categoriesById.get(event.category) || { id: event.category };
  const tags = (event.tags || []).map((id) => tagsById.get(id) || { id });
  const metaEvent = event.meta ? metaEventsById.get(event.meta) : undefined;
  const ticketPrices = extractTicketPricesRub(event);

  return {
    source: "ticketscloud",
    externalId: event.id,
    metaExternalId: event.meta || null,
    title: normalizeImportEventTitle(event.name),
    description: event.description,
    status: event.status,
    eventType: event.openDate ? "open_date" : event.meta ? "recurring" : "single",
    category: {
      id: category.id,
      name: category.name || null,
    },
    tags: tags.map((tag) => ({
      id: tag.id,
      categoryId: tag.category || null,
      name: tag.name || null,
      generic: Boolean(tag.generic),
    })),
    venue: venue
      ? {
          id: venue.id,
          name: venue.name,
          description: venue.description,
          city: city ? { id: city.id, name: city.name, timezone: city.timezone } : { id: venue.city },
          address: venue.address,
          coordinates: venue.coordinates,
          typeGuess: guessVenueType(venue, category, tags, event),
        }
      : { id: event.venue || null, typeGuess: "unknown" },
    metaEvent: metaEvent
      ? {
          id: metaEvent.id,
          name: metaEvent.name,
          firstStart: timestampToIso(metaEvent.firstStart),
          lastFinish: timestampToIso(metaEvent.lastFinish),
          imageUrl: metaEvent.media && (metaEvent.media.coverOriginal || metaEvent.media.cover || metaEvent.media.coverSmall),
        }
      : null,
    startsAt: timestampToIso(event.lifetime && event.lifetime.start),
    endsAt: timestampToIso(event.lifetime && event.lifetime.finish),
    ageLimit: event.ageRating,
    imageUrl: event.media && (event.media.coverOriginal || event.media.cover || event.media.coverSmall),
    ticketSets: (event.sets || []).map((set) => ({
      id: set.id,
      name: set.name,
      amount: set.amount,
      amountVacant: set.amountVacant,
      withSeats: set.withSeats,
      prices: (set.rules || [])
        .map((rule) => rule.simple && minorUnitsToRubles(rule.simple.price))
        .filter((price) => Number.isFinite(price)),
    })),
    ticketsAmount: event.ticketsAmount,
    ticketsAmountVacant: event.ticketsAmountVacant,
    priceFrom: ticketPrices.length ? Math.min(...ticketPrices) : null,
    raw: event,
  };
}

function buildSummary({ endpoint, startedAt, catalog, dictionaries }) {
  const venues = groupBy(catalog, (event) => event.venue.id || "unknown");
  const venueStats = Object.entries(venues)
    .map(([id, events]) => {
      const first = events[0];
      return {
        id,
        name: first.venue.name || null,
        city: first.venue.city && first.venue.city.name ? first.venue.city.name : null,
        address: first.venue.address || null,
        typeGuess: first.venue.typeGuess || "unknown",
        events: events.length,
        categories: countBy(events, (event) => event.category.name || event.category.id || "unknown"),
        eventTypes: countBy(events, (event) => event.eventType),
      };
    })
    .sort((a, b) => b.events - a.events || String(a.name).localeCompare(String(b.name)));

  const cityStats = Object.entries(groupBy(catalog, (event) => (event.venue.city && event.venue.city.name) || "unknown"))
    .map(([name, events]) => ({ name, events: events.length }))
    .sort((a, b) => b.events - a.events || a.name.localeCompare(b.name));

  const categoryStats = Object.entries(groupBy(catalog, (event) => event.category.name || event.category.id || "unknown"))
    .map(([name, events]) => ({ name, events: events.length }))
    .sort((a, b) => b.events - a.events || a.name.localeCompare(b.name));

  const tagStats = Object.entries(groupBy(catalog.flatMap((event) => event.tags), (tag) => tag.name || tag.id || "unknown"))
    .map(([name, tags]) => ({ name, events: tags.length }))
    .sort((a, b) => b.events - a.events || a.name.localeCompare(b.name));

  const venueTypeStats = Object.entries(groupBy(venueStats, (venue) => venue.typeGuess))
    .map(([type, venues]) => ({
      type,
      venues: venues.length,
      events: venues.reduce((sum, venue) => sum + venue.events, 0),
    }))
    .sort((a, b) => b.events - a.events || a.type.localeCompare(b.type));

  return {
    endpoint,
    requestedAt: new Date().toISOString(),
    elapsedSec: Number(((Date.now() - startedAt) / 1000).toFixed(1)),
    counts: {
      events: catalog.length,
      categories: dictionaries.categories.length,
      venues: dictionaries.venues.length,
      cities: dictionaries.cities.length,
      tags: dictionaries.tags.length,
      metaEvents: dictionaries.metaEvents.length,
    },
    categoryStats,
    cityStats,
    publicCityPages: cityStats.filter((city) => city.events >= 2),
    groupedSmallCities: cityStats.filter((city) => city.events < 2),
    eventTypeStats: Object.entries(countBy(catalog, (event) => event.eventType)).map(([type, events]) => ({ type, events })),
    venueTypeStats,
    topVenues: venueStats.slice(0, 50),
    tagStats: tagStats.slice(0, 100),
  };
}

function printSummary(summary) {
  console.log(JSON.stringify({
    counts: summary.counts,
    categoryStats: summary.categoryStats,
    topCities: summary.cityStats.slice(0, 20),
    eventTypeStats: summary.eventTypeStats,
    venueTypeStats: summary.venueTypeStats,
    topVenues: summary.topVenues.slice(0, 15),
  }, null, 2));
}

function streamAll(method, request, options = {}) {
  return new Promise((resolve, reject) => {
    const items = [];
    const stream = client[method](request, metadata);
    const deadline = setTimeout(() => {
      stream.cancel();
      reject(new Error(`${method} timed out after ${items.length} items`));
    }, streamTimeoutMs);

    stream.on("data", (item) => {
      items.push(item);
      if (options.progressEvery && items.length % options.progressEvery === 0) {
        console.log(`${method}: ${items.length}`);
      }
    });
    stream.on("error", (error) => {
      clearTimeout(deadline);
      reject(error);
    });
    stream.on("end", () => {
      clearTimeout(deadline);
      resolve(items);
    });
  });
}

function byId(items) {
  return new Map(items.map((item) => [String(item.id), item]));
}

function unique(values) {
  return [...new Set(values.map((value) => String(value)))];
}

function countBy(items, getKey) {
  return items.reduce((map, item) => {
    const key = getKey(item);
    map[key] = (map[key] || 0) + 1;
    return map;
  }, {});
}

function groupBy(items, getKey) {
  return items.reduce((map, item) => {
    const key = getKey(item);
    if (!map[key]) map[key] = [];
    map[key].push(item);
    return map;
  }, {});
}

function extractTicketPricesRub(event) {
  return (event.sets || [])
    .flatMap((set) => set.rules || [])
    .map((rule) => rule.simple && minorUnitsToRubles(rule.simple.price))
    .filter((price) => Number.isFinite(price));
}

function minorUnitsToRubles(value) {
  const minorUnits = Number(value);
  if (!Number.isFinite(minorUnits)) return null;
  return Math.round(minorUnits / 100);
}

function timestampToIso(timestamp) {
  if (!timestamp || timestamp.seconds == null) return null;
  const millis = Number(timestamp.seconds) * 1000 + Math.floor(Number(timestamp.nanos || 0) / 1000000);
  return new Date(millis).toISOString();
}

function guessVenueType(venue, category, tags, event) {
  const text = [venue.name, venue.description, venue.address, category.name, event.name, ...tags.map((tag) => tag.name)]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (matches(text, ["театр", "teatr"])) return "theater";
  if (matches(text, ["музей", "галере", "выстав"])) return "museum_art";
  if (matches(text, ["клуб", "club", "бар", "ресторан", "cafe", "кафе"])) return "club_restaurant";
  if (matches(text, ["концерт", "филармони", "зал", "дом музыки", "дк ", "дворец культуры"])) return "concert_hall";
  if (matches(text, ["причал", "набереж", "теплоход", "катер", "канал", "река"])) return "pier_water";
  if (matches(text, ["стадион", "арена", "спорт", "каток", "скалодром", "парк"])) return "sport_outdoor";
  if (matches(text, ["онлайн", "online"])) return "online";
  return "generic_location";
}

function matches(text, needles) {
  return needles.some((needle) => text.includes(needle));
}
