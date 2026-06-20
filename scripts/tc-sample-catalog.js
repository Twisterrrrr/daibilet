const fs = require("fs");
const path = require("path");
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
require("dotenv").config();

const rootDir = path.resolve(__dirname, "..");
const protoDir = path.join(rootDir, "vendor", "ticketscloud-proto");
const protoPath = path.join(protoDir, "service.proto");
const outDir = path.join(rootDir, "data", "samples");
const outPath = path.join(outDir, "ticketscloud-catalog.sample.json");

const endpoint = process.env.TICKETSCLOUD_GRPC_ENDPOINT || "simple.ticketscloud.com:443";
const token = process.env.TICKETSCLOUD_API_TOKEN || process.env.TICKETSCLOUD_API_KEY || process.env.TC_API_TOKEN;
const limit = Number(process.argv[2] || process.env.TICKETSCLOUD_SAMPLE_LIMIT || 20);

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
  const events = await streamLimited("Events", { status: "PUBLIC" }, limit);

  const categoryIds = unique(events.map((event) => event.category).filter(Boolean));
  const venueIds = unique(events.map((event) => event.venue).filter(Boolean));
  const tagIds = unique(events.flatMap((event) => event.tags || []).filter(Boolean));

  const [categories, venues, tags] = await Promise.all([
    streamAll("Categories", { ids: categoryIds }),
    streamAll("Venues", { ids: venueIds }),
    streamAll("Tags", { ids: tagIds }),
  ]);

  const cityIds = unique(venues.map((venue) => venue.city).filter(Boolean));
  const cities = await streamAll("Cities", { ids: cityIds });

  const byId = (items) => new Map(items.map((item) => [String(item.id), item]));
  const categoriesById = byId(categories);
  const venuesById = byId(venues);
  const tagsById = byId(tags);
  const citiesById = byId(cities);

  const normalized = events.map((event) => {
    const venue = venuesById.get(event.venue);
    const city = venue ? citiesById.get(String(venue.city)) : undefined;
    const ticketPrices = (event.sets || [])
      .flatMap((set) => set.rules || [])
      .map((rule) => rule.simple && minorUnitsToRubles(rule.simple.price))
      .filter((price) => Number.isFinite(price));

    return {
      externalId: event.id,
      title: event.name,
      description: event.description,
      status: event.status,
      eventType: event.openDate ? "open_date" : event.meta ? "recurring" : "single",
      category: categoriesById.get(event.category) || { id: event.category },
      tags: (event.tags || []).map((id) => tagsById.get(id) || { id }),
      venue: venue
        ? {
            id: venue.id,
            name: venue.name,
            city: city ? { id: city.id, name: city.name, timezone: city.timezone } : { id: venue.city },
            address: venue.address,
            coordinates: venue.coordinates,
          }
        : { id: event.venue },
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
  });

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    outPath,
    JSON.stringify(
      {
        endpoint,
        requestedAt: new Date().toISOString(),
        counts: {
          events: events.length,
          categories: categories.length,
          venues: venues.length,
          cities: cities.length,
          tags: tags.length,
        },
        normalized,
        dictionaries: {
          categories,
          venues,
          cities,
          tags,
        },
      },
      null,
      2
    )
  );

  console.log(`Loaded ${events.length} events`);
  console.log(`Resolved ${categories.length} categories, ${venues.length} venues, ${cities.length} cities, ${tags.length} tags`);
  for (const item of normalized.slice(0, 10)) {
    console.log(
      [
        item.externalId,
        item.title,
        `city=${item.venue.city && item.venue.city.name ? item.venue.city.name : "-"}`,
        `category=${item.category.name || item.category.id || "-"}`,
        `type=${item.eventType}`,
        `priceFrom=${item.priceFrom ?? "-"}`,
        `vacant=${item.ticketsAmountVacant ?? "-"}`,
      ].join(" | ")
    );
  }
  console.log(`Saved sample to ${outPath}`);
}

function streamLimited(method, request, maxItems) {
  return new Promise((resolve, reject) => {
    const items = [];
    const stream = client[method](request, metadata);
    const deadline = setTimeout(() => {
      stream.cancel();
      reject(new Error(`${method} timed out after ${items.length} items`));
    }, 45000);

    stream.on("data", (item) => {
      items.push(item);
      if (items.length >= maxItems) {
        stream.cancel();
      }
    });
    stream.on("error", (error) => {
      clearTimeout(deadline);
      if (error.code === grpc.status.CANCELLED && items.length >= maxItems) {
        resolve(items);
        return;
      }
      reject(error);
    });
    stream.on("end", () => {
      clearTimeout(deadline);
      resolve(items);
    });
  });
}

function streamAll(method, request) {
  return new Promise((resolve, reject) => {
    const items = [];
    const stream = client[method](request, metadata);
    const deadline = setTimeout(() => {
      stream.cancel();
      reject(new Error(`${method} timed out after ${items.length} items`));
    }, 45000);

    stream.on("data", (item) => items.push(item));
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

function unique(values) {
  return [...new Set(values.map((value) => String(value)))];
}

function timestampToIso(timestamp) {
  if (!timestamp || timestamp.seconds == null) return null;
  const millis = Number(timestamp.seconds) * 1000 + Math.floor(Number(timestamp.nanos || 0) / 1000000);
  return new Date(millis).toISOString();
}

function minorUnitsToRubles(value) {
  const minorUnits = Number(value);
  if (!Number.isFinite(minorUnits)) return null;
  return Math.round(minorUnits / 100);
}
