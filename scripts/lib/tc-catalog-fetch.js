/**
 * Shared Ticketscloud gRPC fetch + normalize for full sync and on-demand --ids.
 */
const path = require("path");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const { normalizeImportEventTitle } = require("./event-title-normalize");

const rootDir = path.resolve(__dirname, "../..");
const protoDir = path.join(rootDir, "vendor", "ticketscloud-proto");
const protoPath = path.join(protoDir, "service.proto");

function resolveToken() {
  return process.env.TICKETSCLOUD_API_TOKEN || process.env.TICKETSCLOUD_API_KEY || process.env.TC_API_TOKEN;
}

function createTicketscloudClient() {
  const token = resolveToken();
  if (!token) {
    throw new Error("Missing Ticketscloud token: set TICKETSCLOUD_API_TOKEN, TICKETSCLOUD_API_KEY, or TC_API_TOKEN");
  }

  const endpoint = process.env.TICKETSCLOUD_GRPC_ENDPOINT || "simple.ticketscloud.com:443";
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

  return { client, metadata, endpoint };
}

function streamAll(client, metadata, method, request, options = {}) {
  const streamTimeoutMs = Number(options.timeoutMs || process.env.TICKETSCLOUD_FULL_SYNC_TIMEOUT_MS || 360000);
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

/**
 * @param {{ ids?: string[], status?: string, progressEvery?: number, timeoutMs?: number }} options
 * @returns {Promise<{ catalog: object[], endpoint: string, requestedIds: string[], missingIds: string[] }>}
 */
async function fetchNormalizedCatalog(options = {}) {
  const { client, metadata, endpoint } = createTicketscloudClient();
  const requestedIds = unique((options.ids || []).map(String).filter(Boolean));
  const status = options.status || "PUBLIC";

  const eventsRequest = requestedIds.length ? { ids: requestedIds } : { status };
  const progressEvery = options.progressEvery ?? (requestedIds.length ? 0 : 1000);

  const label = requestedIds.length
    ? `Loading events by ids (${requestedIds.length})...`
    : `Loading ${status} events...`;
  console.log(label);

  const events = await streamAll(client, metadata, "Events", eventsRequest, {
    progressEvery,
    timeoutMs: options.timeoutMs,
  });
  console.log(`Loaded ${events.length} events`);

  const categoryIds = unique(events.map((event) => event.category).filter(Boolean));
  const venueIds = unique(events.map((event) => event.venue).filter(Boolean));
  const tagIds = unique(events.flatMap((event) => event.tags || []).filter(Boolean));
  const metaIds = unique(events.map((event) => event.meta).filter(Boolean));

  console.log("Loading dictionaries...");
  const stream = (method, request) => streamAll(client, metadata, method, request, { timeoutMs: options.timeoutMs });
  const [categories, venues, tags, metaEvents] = await Promise.all([
    categoryIds.length ? stream("Categories", { ids: categoryIds }) : [],
    venueIds.length ? stream("Venues", { ids: venueIds }) : [],
    tagIds.length ? stream("Tags", { ids: tagIds }) : [],
    metaIds.length ? stream("MetaEvents", { ids: metaIds }) : [],
  ]);

  const cityIds = unique(venues.map((venue) => venue.city).filter(Boolean));
  const cities = cityIds.length ? await stream("Cities", { ids: cityIds }) : [];

  const categoriesById = byId(categories);
  const venuesById = byId(venues);
  const tagsById = byId(tags);
  const citiesById = byId(cities);
  const metaEventsById = byId(metaEvents);

  const catalog = events.map((event) =>
    normalizeEvent(event, {
      categoriesById,
      venuesById,
      tagsById,
      citiesById,
      metaEventsById,
    }),
  );

  const loadedIds = new Set(catalog.map((event) => String(event.externalId)));
  const missingIds = requestedIds.filter((id) => !loadedIds.has(id));

  return {
    catalog,
    endpoint,
    dictionaries: { categories, venues, cities, tags, metaEvents },
    requestedIds,
    missingIds,
  };
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

function byId(items) {
  return new Map(items.map((item) => [String(item.id), item]));
}

function unique(values) {
  return [...new Set(values.map((value) => String(value)))];
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

module.exports = {
  fetchNormalizedCatalog,
  normalizeEvent,
  resolveToken,
};
