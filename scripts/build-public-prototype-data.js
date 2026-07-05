const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const catalog = JSON.parse(fs.readFileSync(path.join(rootDir, "data", "ticketscloud", "catalog.public.json"), "utf8")).events;
const routing = JSON.parse(fs.readFileSync(path.join(rootDir, "data", "ticketscloud", "city-routing.public.json"), "utf8"));
const summary = JSON.parse(fs.readFileSync(path.join(rootDir, "data", "ticketscloud", "summary.public.json"), "utf8"));

const outDir = path.join(rootDir, "apps", "public");
const outPath = path.join(outDir, "data.js");

const landingRules = [
  {
    slug: "spb-yards",
    title: "Дворы, парадные и коммуналки",
    subtitle: "Авторские прогулки по скрытому Петербургу",
    city: "Санкт-Петербург",
    chips: ["парадные", "коммуналки", "пешеходные"],
    tags: ["Дворы и парадные", "Экскурсия по парадным", "Экскурсия по коммуналкам", "Экскурсия по дворам", "Интерьерная"],
  },
  {
    slug: "river-cruises",
    title: "Речные прогулки",
    subtitle: "Теплоходы, катера, реки и каналы",
    chips: ["теплоход", "катер", "причалы"],
    tags: ["Водные экскурсии", "Реки и каналы", "На теплоходе", "Водная экскурсия", "На катере", "Теплоходные экскурсии"],
  },
  {
    slug: "bridges-night",
    title: "Разводные мосты",
    subtitle: "Ночные прогулки по Неве и каналам",
    city: "Санкт-Петербург",
    chips: ["ночные", "мосты", "теплоход"],
    tags: ["Разводные мосты", "Ночные"],
  },
  {
    slug: "new-year",
    title: "Отмечаем Новый год",
    subtitle: "Елки, шоу, концерты и праздничные программы",
    chips: ["декабрь", "детям", "шоу"],
    keywords: ["новогод", "новый год", "елка", "ёлка", "рождество"],
  },
  {
    slug: "salute-9-may",
    title: "Салют 9 мая",
    subtitle: "Лучшие точки обзора и экскурсии к Дню Победы",
    chips: ["9 мая", "салют", "праздник"],
    keywords: ["салют", "фейерверк", "день победы", "праздничн", "побед"],
    requiredAnyKeywords: ["салют", "фейерверк"],
    excludeKeywords: ["новогод", "ёлка", "елка", "рождеств"],
  },
  {
    slug: "standup",
    title: "Стендап и юмор",
    subtitle: "Комедийные шоу в барах и клубах",
    chips: ["stand up", "юмор", "вечер"],
    tags: ["Юмор", "Stand up", "Комедия", "Импровизация", "TV комики"],
  },
  {
    slug: "planetarium",
    title: "Планетарий 1",
    subtitle: "Мультимедийные шоу и концерты",
    venue: "Планетарий 1",
    chips: ["шоу", "концерты", "СПб"],
  },
  {
    slug: "moscow-dinner-boat",
    title: "Ужин на теплоходе в Москве",
    subtitle: "Страница готова к подключению inventory",
    city: "Москва",
    chips: ["ужин", "Москва-река", "вечер"],
    tags: ["На теплоходе", "Водная экскурсия"],
    keywords: ["ужин", "фуршет", "банкет", "ресторан"],
  },
  {
    slug: "bus-tours",
    title: "Автобусные обзорные экскурсии",
    subtitle: "Городские маршруты и обзорные программы",
    chips: ["автобус", "обзорная", "город"],
    keywords: ["автобус", "обзорн"],
    excludeTags: ["Водные экскурсии", "На теплоходе", "На катере", "Реки и каналы"],
  },
  {
    slug: "family-kids",
    title: "Детям и семьям",
    subtitle: "Ёлки, цирк, шоу и анимация для детей",
    chips: ["детям", "семья", "цирк"],
    tags: ["Детям", "Детская анимация", "Шоу для детей", "Цирк", "Детское шоу"],
    keywords: ["детск", "семейн", "цирк", "анимац"],
  },
  {
    slug: "concerts-genre",
    title: "Концерты",
    subtitle: "Рок, джаз, классика, эстрада и живые выступления",
    chips: ["рок", "джаз", "классика"],
    tags: ["Рок", "Джаз", "Классика", "Поп", "Эстрада", "Металл"],
    excludeTags: ["Юмор", "Stand up", "Комедия", "Импровизация"],
  },
  {
    slug: "moscow-museums",
    title: "Музеи и мастер-классы в Москве",
    subtitle: "Выставки, экскурсии и творческие занятия",
    city: "Москва",
    chips: ["музеи", "мастер-класс", "творчество"],
    tags: ["Музеи", "Мастер-класс", "Мастер-классы", "Выставки"],
    keywords: ["мастер-класс", "музе", "выставк"],
  },
  {
    slug: "active-sport",
    title: "Активный отдых и автоспорт",
    subtitle: "Дрифт, гонки и активные развлечения",
    chips: ["дрифт", "автоспорт", "активный"],
    tags: ["Автоспорт", "Дрифт", "Активный отдых"],
    keywords: ["дрифт", "автоспорт", "картинг"],
  },
];

const destinations = routing.destinationCards.map((item) => ({
  name: item.name,
  type: item.type,
  events: item.events,
  venues: item.venues,
  categories: item.categories.slice(0, 4),
}));

const cityToDestination = new Map();
for (const destination of routing.destinationCards) {
  if (destination.type === "city") {
    cityToDestination.set(destination.name, { name: destination.name, type: "city" });
  }
  for (const city of destination.cities || []) {
    cityToDestination.set(city.name, { name: destination.name, type: destination.type });
  }
}

const landings = landingRules.map((rule) => {
  const matched = catalog.filter((event) => matchesRule(event, rule));
  const prices = matched.map((event) => event.priceFrom).filter((price) => Number.isFinite(price) && price > 0);
  const imageEvent = matched.find((event) => event.imageUrl);
  return {
    slug: rule.slug,
    title: rule.title,
    subtitle: rule.subtitle,
    chips: rule.chips,
    events: matched.length,
    venues: new Set(matched.map((event) => event.venue?.id).filter(Boolean)).size,
    priceFrom: prices.length ? Math.min(...prices) : null,
    imageUrl: imageEvent ? imageEvent.imageUrl : null,
    strength: matched.length >= 100 ? "ready" : matched.length >= 20 ? "seed" : "capture",
  };
});

const sessions = selectSessions(catalog, 180).map((event) => {
  const allTags = (event.tags || []).map((tag) => tag.name).filter(Boolean);
  const category = event.category?.name || "Событие";
  return {
  id: event.externalId,
  landingSlugs: landingRules.filter((rule) => matchesRule(event, rule)).map((rule) => rule.slug),
  title: cleanTitle(event.title),
  city: event.venue?.city?.name || "Не указан",
  destination: getDestination(event.venue?.city?.name).name,
  destinationType: getDestination(event.venue?.city?.name).type,
  venue: event.venue?.name || "Не указано",
  venueKind: event.venue?.typeGuess || "other",
  category,
  subcategories: deriveCatalogSubcategories(allTags, category),
  tags: allTags.slice(0, 4),
  startsAt: event.startsAt,
  dateLabel: formatDate(event.startsAt),
  timeLabel: formatTime(event.startsAt),
  timeBucket: timeBucket(event.startsAt),
  priceFrom: event.priceFrom,
  vacant: event.ticketsAmountVacant,
  imageUrl: event.imageUrl,
};
});

const venues = summary.topVenues.slice(0, 36).map((venue) => ({
  id: venue.id,
  name: venue.name,
  city: venue.city,
  address: venue.address,
  type: venue.typeGuess,
  events: venue.events,
  categories: venue.categories,
}));

const publicData = {
  generatedAt: new Date().toISOString(),
  stats: {
    events: summary.counts.events,
    destinations: routing.destinationCards.length,
    venues: summary.counts.venues,
    landings: landings.length,
  },
  destinations,
  landings,
  sessions,
  venues,
};

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outPath, `window.PUBLIC_DATA = ${JSON.stringify(publicData, null, 2)};\n`);
console.log(`Wrote ${outPath}`);

function matchesRule(event, rule) {
  const tagNames = (event.tags || []).map((tag) => tag.name).filter(Boolean);
  const haystack = [event.title, event.description, event.venue?.name, ...tagNames].filter(Boolean).join(" ").toLowerCase();

  if (rule.city && event.venue?.city?.name !== rule.city) return false;
  if (rule.venue && event.venue?.name !== rule.venue) return false;
  if (rule.tags && !rule.tags.some((tag) => tagNames.includes(tag))) return false;
  if (rule.excludeTags && rule.excludeTags.some((tag) => tagNames.includes(tag))) return false;
  if (rule.keywords && !rule.keywords.some((keyword) => haystack.includes(keyword.toLowerCase()))) return false;

  return true;
}

function selectSessions(events, limit) {
  const now = Date.now();
  return events
    .filter((event) => {
      const time = Date.parse(event.startsAt);
      return Number.isFinite(time) && time >= now && event.priceFrom != null;
    })
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))
    .slice(0, limit);
}

const SITE_TIME_ZONE = "Europe/Moscow";

function parseSessionStartsAt(value) {
  if (value instanceof Date) return value;
  const raw = String(value || "").trim();
  if (!raw) return new Date(NaN);
  if (/[zZ]$/.test(raw) || /[+-]\d{2}(:\d{2}|\d{2})$/.test(raw)) {
    return new Date(raw.replace(/([+-]\d{2})(\d{2})$/, "$1:$2"));
  }
  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(raw)) {
    return new Date(`${raw.replace(" ", "T")}Z`);
  }
  return new Date(raw);
}

function formatDate(value) {
  const date = parseSessionStartsAt(value);
  if (!Number.isFinite(date.getTime())) return "";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    weekday: "short",
    timeZone: SITE_TIME_ZONE,
  }).format(date);
}

function formatTime(value) {
  const date = parseSessionStartsAt(value);
  if (!Number.isFinite(date.getTime())) return "";
  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: SITE_TIME_ZONE,
  }).format(date);
}

function timeBucket(value) {
  const date = parseSessionStartsAt(value);
  if (!Number.isFinite(date.getTime())) return "night";
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "numeric",
      hour12: false,
      timeZone: SITE_TIME_ZONE,
    })
      .formatToParts(date)
      .find((part) => part.type === "hour")?.value ?? 0,
  );
  if (hour >= 6 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "day";
  if (hour >= 17 && hour < 23) return "evening";
  return "night";
}

function isUtilityCatalogTag(tag) {
  const value = String(tag || "").trim();
  if (!value) return true;
  const lower = value.toLowerCase();
  if (/^(wc|туалет|кондиционер|аудиосистема|аудиогид|wi-?fi|бар|кафе|парковка)$/.test(lower)) return true;
  if (/^\d+\s*(минут|мин\.?|час|часа|часов)\b/i.test(lower)) return true;
  if (/^(теплоход|катер|яхт|судно|лодк)\s*:/i.test(lower)) return true;
  if (/^причал\b/i.test(lower)) return true;
  if (value.length > 42) return true;
  return false;
}

function deriveCatalogSubcategories(tags, category) {
  return tags
    .filter((tag) => {
      const lower = String(tag || '').toLowerCase();
      if (isUtilityCatalogTag(tag)) return false;
      if (/^(можно|нельзя|разрешено|запрещено)(?:\s|$)/i.test(lower)) return false;
      if (/коляск|велосипед|животн|сво[ейё]м?\s+алкогол|сво[ейё]й?\s+ед/i.test(lower)) return false;
      if (/отдельн/i.test(lower) && /столик/i.test(lower)) return false;
      return tag.toLowerCase() !== String(category || '').toLowerCase();
    })
    .slice(0, 3);
}

function cleanTitle(title) {
  return String(title || "").replace(/\s+/g, " ").trim();
}

function getDestination(cityName) {
  return cityToDestination.get(cityName) || { name: cityName || "Не указано", type: "city" };
}
