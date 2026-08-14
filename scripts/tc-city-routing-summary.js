const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const summaryPath = path.join(rootDir, "data", "ticketscloud", "summary.public.json");
const catalogPath = path.join(rootDir, "data", "ticketscloud", "catalog.public.json");
const routingPath = path.join(rootDir, "data", "geo", "city-routing.ru.json");
const outPath = path.join(rootDir, "data", "ticketscloud", "city-routing.public.json");

const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8")).events;
const routing = JSON.parse(fs.readFileSync(routingPath, "utf8"));

const standaloneSet = new Set(routing.standaloneCities);
const cityToRegion = routing.cityToRegion || {};

const destinationMap = new Map();
const needsRouting = [];

for (const event of catalog) {
  const cityName = event.venue && event.venue.city && event.venue.city.name;
  if (!cityName) {
    addToDestination(destinationMap, "unknown", "unknown", event);
    continue;
  }

  if (standaloneSet.has(cityName)) {
    addToDestination(destinationMap, cityName, "city", event);
  } else if (cityToRegion[cityName]) {
    addToDestination(destinationMap, cityToRegion[cityName], "region", event, cityName);
  } else {
    addToDestination(destinationMap, "needs_routing", "unknown", event, cityName);
  }
}

for (const city of summary.cityStats) {
  if (!standaloneSet.has(city.name) && !cityToRegion[city.name]) {
    needsRouting.push(city);
  }
}

const destinationCards = [...destinationMap.values()]
  .filter((destination) => destination.type !== "unknown")
  .map(finalizeDestination)
  .sort(destinationSort);

const standaloneCities = destinationCards.filter((destination) => destination.type === "city");
const regionPages = destinationCards.filter((destination) => destination.type === "region");

const result = {
  requestedAt: new Date().toISOString(),
  sourceSummary: path.relative(rootDir, summaryPath),
  sourceCatalog: path.relative(rootDir, catalogPath),
  routingConfig: path.relative(rootDir, routingPath),
  destinationCards,
  standaloneCities,
  regionPages,
  needsRouting,
};

fs.writeFileSync(outPath, JSON.stringify(result, null, 2));

console.log(`Destination cards: ${destinationCards.length}`);
console.log(destinationCards.map((item) => `${item.name}: ${item.events} events, ${item.venues} venues (${item.type})`).join("\n"));
console.log("");
console.log(`Standalone city pages: ${standaloneCities.length}`);
console.log(`Region pages: ${regionPages.length}`);
if (needsRouting.length) {
  console.log("");
  console.log(`Needs routing: ${needsRouting.length}`);
  console.log(needsRouting.map((city) => `${city.name}: ${city.events}`).join("\n"));
}
console.log(`Saved city routing to ${outPath}`);

function addToDestination(map, name, type, event, originalCityName) {
  if (!map.has(name)) {
    map.set(name, {
      name,
      type,
      sortGroup: getSortGroup(name, type),
      events: 0,
      venueIds: new Set(),
      cities: new Map(),
      categories: new Map(),
    });
  }
  const bucket = map.get(name);
  bucket.events += 1;
  if (event.venue && event.venue.id) bucket.venueIds.add(event.venue.id);
  if (originalCityName) {
    bucket.cities.set(originalCityName, (bucket.cities.get(originalCityName) || 0) + 1);
  }
  const categoryName = event.category && event.category.name ? event.category.name : "unknown";
  bucket.categories.set(categoryName, (bucket.categories.get(categoryName) || 0) + 1);
}

function finalizeDestination(destination) {
  return {
    name: destination.name,
    type: destination.type,
    sortGroup: destination.sortGroup,
    events: destination.events,
    venues: destination.venueIds.size,
    cities: [...destination.cities.entries()]
      .map(([name, events]) => ({ name, events }))
      .sort((a, b) => b.events - a.events || a.name.localeCompare(b.name)),
    categories: [...destination.categories.entries()]
      .map(([name, events]) => ({ name, events }))
      .sort((a, b) => b.events - a.events || a.name.localeCompare(b.name)),
  };
}

function destinationSort(a, b) {
  if (a.sortGroup !== b.sortGroup) return a.sortGroup.localeCompare(b.sortGroup);
  if (a.type !== b.type) return a.type === "city" ? -1 : 1;
  return b.events - a.events || a.name.localeCompare(b.name);
}

function getSortGroup(name, type) {
  const groups = {
    "Москва": "01-moscow",
    "Московская область": "01-moscow",
    "Санкт-Петербург": "02-spb",
    "Ленинградская область": "02-spb",
    "Казань": "03-kazan",
    "Республика Татарстан": "03-kazan",
    "Краснодар": "04-krasnodar",
    "Краснодарский край": "04-krasnodar",
    "Красноярск": "05-krasnoyarsk",
    "Красноярский край": "05-krasnoyarsk",
    "Абакан": "06-khakasia",
    "Республика Хакасия": "06-khakasia",
    "Ульяновск": "07-ulyanovsk",
    "Ульяновская область": "07-ulyanovsk",
  };
  return groups[name] || `90-${type}-${name}`;
}
