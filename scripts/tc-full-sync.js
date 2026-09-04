const fs = require("fs");
const path = require("path");
require("dotenv").config();

const { fetchNormalizedCatalog } = require("./lib/tc-catalog-fetch");

const rootDir = path.resolve(__dirname, "..");
const outDir = path.join(rootDir, "data", "ticketscloud");
const catalogPath = path.join(outDir, "catalog.public.json");
const summaryPath = path.join(outDir, "summary.public.json");

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const startedAt = Date.now();
  fs.mkdirSync(outDir, { recursive: true });

  const { catalog, endpoint, dictionaries, byStatus } = await fetchNormalizedCatalog({
    // PUBLIC alone leaves stale cards when TC moves an event to STAND_BY
    // (sales stopped) - we never re-fetched those ids. Import both.
    statuses: ["PUBLIC", "STAND_BY"],
    progressEvery: 1000,
  });

  console.log("Normalizing catalog...");
  const summary = buildSummary({
    endpoint,
    startedAt,
    catalog,
    dictionaries,
    byStatus,
  });

  fs.writeFileSync(catalogPath, JSON.stringify({ events: catalog }, null, 2));
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

  printSummary(summary);
  console.log(`Saved catalog to ${catalogPath}`);
  console.log(`Saved summary to ${summaryPath}`);
}

function buildSummary({ endpoint, startedAt, catalog, dictionaries, byStatus }) {
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

  const statusStats = Object.entries(countBy(catalog, (event) => String(event.status || "unknown").toUpperCase()))
    .map(([status, events]) => ({ status, events }))
    .sort((a, b) => b.events - a.events || a.status.localeCompare(b.status));

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
      byFetchStatus: byStatus || null,
    },
    statusStats,
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
    statusStats: summary.statusStats,
    categoryStats: summary.categoryStats,
    topCities: summary.cityStats.slice(0, 20),
    eventTypeStats: summary.eventTypeStats,
    venueTypeStats: summary.venueTypeStats,
    topVenues: summary.topVenues.slice(0, 15),
  }, null, 2));
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
