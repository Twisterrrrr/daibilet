const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const catalog = JSON.parse(fs.readFileSync(path.join(rootDir, "data", "ticketscloud", "catalog.public.json"), "utf8")).events;
const summary = JSON.parse(fs.readFileSync(path.join(rootDir, "data", "ticketscloud", "summary.public.json"), "utf8"));
const routing = JSON.parse(fs.readFileSync(path.join(rootDir, "data", "ticketscloud", "city-routing.public.json"), "utf8"));

const outDir = path.join(rootDir, "apps", "admin");
const outPath = path.join(outDir, "data.js");

const categoryMapping = [
  ["Экскурсии", "экскурсии", "уточнять по тегам", "review"],
  ["Шоу", "мероприятия", "шоу", "auto"],
  ["Концерты", "мероприятия", "концерты", "auto"],
  ["Музеи", "музеи и арт", "мастер-классы / музеи", "review"],
  ["Детям", "сквозной признак", "тег: детям", "review"],
  ["Театры", "мероприятия", "театр", "auto"],
  ["Фестивали", "мероприятия", "фестивали", "auto"],
  ["Развитие", "музеи и арт", "лекции / мастер-классы", "review"],
  ["Спорт", "активный отдых", "спорт", "auto"],
  ["Вечеринки", "мероприятия", "вечеринки", "auto"],
];

const categoryCounts = new Map(summary.categoryStats.map((item) => [item.name, item.events]));
const mappingRows = categoryMapping.map(([source, target, subcategory, mode]) => ({
  source,
  target,
  subcategory,
  mode,
  events: categoryCounts.get(source) || 0,
}));

const moderationEvents = catalog
  .map((event) => {
    const reasons = reviewReasons(event);
    return {
      id: event.externalId,
      title: event.title,
      sourceCategory: event.category?.name || "unknown",
      proposedCategory: proposeCategory(event),
      city: event.venue?.city?.name || "Не указан",
      destination: getDestination(event.venue?.city?.name),
      venue: event.venue?.name || "Не указано",
      venueKind: event.venue?.typeGuess || "other",
      eventType: event.eventType,
      startsAt: event.startsAt,
      priceFrom: event.priceFrom,
      vacant: event.ticketsAmountVacant,
      imageUrl: event.imageUrl || null,
      reasons,
      severity: reasons.length > 2 ? "high" : reasons.length ? "medium" : "low",
      status: reasons.length ? "needs_review" : "ready",
    };
  })
  .filter((event) => event.status === "needs_review")
  .sort((a, b) => severityRank(b.severity) - severityRank(a.severity) || Date.parse(a.startsAt) - Date.parse(b.startsAt))
  .slice(0, 160);

const eventRows = catalog
  .map((event) => {
    const reasons = reviewReasons(event);
    const tagNames = (event.tags || []).map((tag) => tag.name).filter(Boolean);
    const landingHits = buildLandingHits(event);
    return {
      id: event.externalId,
      source: "Ticketscloud",
      title: event.title,
      sourceCategory: event.category?.name || "unknown",
      proposedCategory: proposeCategory(event),
      city: event.venue?.city?.name || "Не указан",
      destination: getDestination(event.venue?.city?.name),
      venue: event.venue?.name || "Не указано",
      venueKind: event.venue?.typeGuess || "other",
      eventType: event.eventType,
      startsAt: event.startsAt,
      ageLimit: event.ageLimit || null,
      priceFrom: event.priceFrom,
      vacant: event.ticketsAmountVacant,
      hasImage: Boolean(event.imageUrl),
      tags: tagNames.slice(0, 5),
      landingHits,
      reasons,
      severity: reasons.length > 2 ? "high" : reasons.length ? "medium" : "low",
      readiness: buildReadiness(event, reasons),
      offerStatus: buildOfferStatus(event),
      status: reasons.length ? "needs_review" : "ready",
    };
  })
  .sort((a, b) => {
    if (a.status !== b.status) return a.status === "needs_review" ? -1 : 1;
    return severityRank(b.severity) - severityRank(a.severity) || Date.parse(a.startsAt || 0) - Date.parse(b.startsAt || 0);
  });

const readyEventsCount = eventRows.filter((event) => event.readiness === "ready").length;
const reviewEventsCount = eventRows.filter((event) => event.status === "needs_review").length;

const venueRows = summary.topVenues.slice(0, 80).map((venue) => {
  const recommendation = venueRecommendation(venue);
  return {
    id: venue.id,
    name: venue.name,
    city: venue.city,
    address: venue.address,
    sourceType: venue.typeGuess,
    proposedKind: recommendation.kind,
    pageStatus: recommendation.pageStatus,
    reason: recommendation.reason,
    events: venue.events,
    categories: Object.entries(venue.categories).map(([name, events]) => ({ name, events })),
  };
});

const duplicateCandidates = findDuplicateVenues(summary.topVenues).slice(0, 12);

const landingRows = buildLandingRows(catalog);

const adminData = {
  generatedAt: new Date().toISOString(),
  importJob: {
    source: "Ticketscloud",
    status: "success",
    mode: "PUBLIC full sync",
    events: summary.counts.events,
    categories: summary.counts.categories,
    venues: summary.counts.venues,
    cities: summary.counts.cities,
    tags: summary.counts.tags,
    metaEvents: summary.counts.metaEvents,
  },
  metrics: {
    events: summary.counts.events,
    readyEvents: readyEventsCount,
    reviewEvents: reviewEventsCount,
    venues: summary.counts.venues,
    landingRules: landingRows.length,
    destinations: routing.destinationCards.length,
  },
  mappingRows,
  eventRows,
  moderationEvents,
  venueRows,
  duplicateCandidates,
  destinationRows: routing.destinationCards,
  landingRows,
};

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outPath, `window.ADMIN_DATA = ${JSON.stringify(adminData, null, 2)};\n`);
console.log(`Wrote ${outPath}`);

function reviewReasons(event) {
  const reasons = [];
  if (!event.imageUrl) reasons.push("нет изображения");
  if (!event.priceFrom || event.priceFrom <= 50) reasons.push("проверить цену");
  if (event.category?.name === "Детям") reasons.push("детям как сквозной признак");
  if (event.category?.name === "Экскурсии" && !hasAnyTag(event, ["Водные экскурсии", "Пешеходная экскурсия", "Автобусные туры"])) {
    reasons.push("уточнить подкатегорию экскурсии");
  }
  if (event.venue?.typeGuess === "generic_location") reasons.push("типизировать площадку");
  if (/памятник|место сбора|метро|экскурсия/i.test(event.venue?.name || "")) reasons.push("точка встречи, не площадка");
  if (!event.venue?.city?.name) reasons.push("не указан город");
  if (!event.startsAt && event.eventType !== "open_date") reasons.push("нет даты");
  return reasons;
}

function buildReadiness(event, reasons) {
  if (reasons.length > 2) return "blocked";
  if (reasons.length) return "review";
  if (!event.priceFrom || !event.startsAt) return "review";
  return "ready";
}

function buildOfferStatus(event) {
  if (!event.priceFrom) return "нет цены";
  if (event.status !== "PUBLIC") return "не опубликовано у источника";
  return "TC widget";
}

function buildLandingHits(event) {
  const rules = [
    { slug: "rechnye-progulki", title: "Речные прогулки", tags: ["Водные экскурсии", "Реки и каналы", "На теплоходе", "Водная экскурсия", "На катере", "Теплоходные экскурсии"] },
    { slug: "razvodnye-mosty", title: "Разводные мосты", tags: ["Разводные мосты", "Ночные"] },
    { slug: "spb-paradnye", title: "Дворы и парадные", city: "Санкт-Петербург", tags: ["Дворы и парадные", "Экскурсия по парадным", "Экскурсия по коммуналкам"] },
    { slug: "standup", title: "Стендап", tags: ["Юмор", "Stand up", "Комедия", "Импровизация"] },
    { slug: "novyy-god", title: "Новый год", keywords: ["новогод", "новый год", "ёлка", "елка"] },
    { slug: "uzhin-teplohod-msk", title: "Ужин на теплоходе", city: "Москва", tags: ["На теплоходе", "Водная экскурсия"], keywords: ["ужин", "банкет", "фуршет"] },
    { slug: "avtobusnye-obzornye", title: "Автобусные обзорные", keywords: ["автобус", "обзорн"] },
  ];
  return rules.filter((rule) => landingMatch(event, rule)).map((rule) => rule.title).slice(0, 3);
}

function proposeCategory(event) {
  const source = event.category?.name;
  if (source === "Концерты" || source === "Театры" || source === "Шоу" || source === "Фестивали" || source === "Вечеринки") {
    return "мероприятия";
  }
  if (source === "Музеи" || source === "Развитие") return "музеи и арт";
  if (source === "Спорт") return "активный отдых";
  if (source === "Экскурсии") return "экскурсии";
  if (source === "Детям") return "развлечения / тег детям";
  return "не определено";
}

function hasAnyTag(event, tags) {
  const names = new Set((event.tags || []).map((tag) => tag.name));
  return tags.some((tag) => names.has(tag));
}

function severityRank(value) {
  return { low: 1, medium: 2, high: 3 }[value] || 0;
}

function venueRecommendation(venue) {
  const name = `${venue.name || ""} ${venue.address || ""}`.toLowerCase();
  if (/памятник|место сбора|метро/.test(name)) {
    return { kind: "meeting_point", pageStatus: "none", reason: "точка встречи экскурсии" };
  }
  if (venue.typeGuess === "pier_water") {
    return { kind: "pier", pageStatus: venue.events >= 10 ? "candidate" : "none", reason: "причал, нужна дедупликация" };
  }
  if (venue.typeGuess === "museum_art") {
    return { kind: "museum_art_space", pageStatus: "candidate", reason: "музей/арт-пространство" };
  }
  if (venue.typeGuess === "theater") {
    return { kind: "theater", pageStatus: "candidate", reason: "театральная площадка" };
  }
  if (venue.typeGuess === "concert_hall") {
    return { kind: "concert_hall", pageStatus: venue.events >= 5 ? "candidate" : "none", reason: "концертная площадка" };
  }
  if (venue.typeGuess === "club_restaurant") {
    return { kind: "club_bar_restaurant", pageStatus: venue.events >= 5 ? "candidate" : "none", reason: "клуб/бар/ресторан" };
  }
  if (venue.typeGuess === "sport_outdoor") {
    return { kind: "sport_activity_space", pageStatus: "candidate", reason: "спорт/активность" };
  }
  if (venue.events >= 100) {
    return { kind: "other", pageStatus: "candidate", reason: "много событий, нужна ручная проверка" };
  }
  return { kind: "other", pageStatus: "none", reason: "нет признаков для страницы" };
}

function findDuplicateVenues(venues) {
  const groups = new Map();
  for (const venue of venues) {
    const key = normalizeVenueKey(venue);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(venue);
  }
  return [...groups.values()]
    .filter((items) => items.length > 1)
    .map((items) => ({
      key: normalizeVenueKey(items[0]),
      events: items.reduce((sum, item) => sum + item.events, 0),
      venues: items.map((item) => ({ id: item.id, name: item.name, city: item.city, address: item.address, events: item.events })),
    }))
    .sort((a, b) => b.events - a.events);
}

function normalizeVenueKey(venue) {
  return `${venue.city || ""} ${venue.address || venue.name || ""}`
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/ё/g, "е")
    .replace(/[^а-яa-z0-9]+/g, " ")
    .replace(/\b(дом|д|лит|литера|корпус|к)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function buildLandingRows(events) {
  const rules = [
    { slug: "rechnye-progulki", title: "Речные прогулки", tags: ["Водные экскурсии", "Реки и каналы", "На теплоходе", "Водная экскурсия", "На катере", "Теплоходные экскурсии"] },
    { slug: "razvodnye-mosty", title: "Разводные мосты", tags: ["Разводные мосты", "Ночные"] },
    { slug: "spb-paradnye", title: "Дворы и парадные", city: "Санкт-Петербург", tags: ["Дворы и парадные", "Экскурсия по парадным", "Экскурсия по коммуналкам"] },
    { slug: "standup", title: "Стендап и юмор", tags: ["Юмор", "Stand up", "Комедия", "Импровизация"] },
    { slug: "novyy-god", title: "Отмечаем Новый год", keywords: ["новогод", "новый год", "ёлка", "елка"] },
    { slug: "uzhin-teplohod-msk", title: "Ужин на теплоходе в Москве", city: "Москва", tags: ["На теплоходе", "Водная экскурсия"], keywords: ["ужин", "банкет", "фуршет"] },
    { slug: "avtobusnye-obzornye", title: "Автобусные обзорные экскурсии", keywords: ["автобус", "обзорн"] },
  ];

  return rules.map((rule) => {
    const matched = events.filter((event) => landingMatch(event, rule));
    const prices = matched.map((event) => event.priceFrom).filter((price) => Number.isFinite(price) && price > 0);
    return {
      slug: rule.slug,
      title: rule.title,
      events: matched.length,
      venues: new Set(matched.map((event) => event.venue?.id).filter(Boolean)).size,
      priceFrom: prices.length ? Math.min(...prices) : null,
      status: matched.length >= 100 ? "ready" : matched.length > 0 ? "seed" : "empty",
    };
  });
}

function landingMatch(event, rule) {
  const tagNames = (event.tags || []).map((tag) => tag.name).filter(Boolean);
  const text = [event.title, event.description, event.venue?.name, ...tagNames].filter(Boolean).join(" ").toLowerCase();
  if (rule.city && event.venue?.city?.name !== rule.city) return false;
  if (rule.tags && !rule.tags.some((tag) => tagNames.includes(tag))) return false;
  if (rule.keywords && !rule.keywords.some((keyword) => text.includes(keyword.toLowerCase()))) return false;
  return true;
}

function getDestination(cityName) {
  const cityDestination = routing.destinationCards.find((item) => item.type === "city" && item.name === cityName);
  if (cityDestination) return cityDestination.name;
  const regionDestination = routing.destinationCards.find((item) => (item.cities || []).some((city) => city.name === cityName));
  return regionDestination ? regionDestination.name : cityName || "Не указано";
}
