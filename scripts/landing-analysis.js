const fs = require("fs");

const catalog = JSON.parse(fs.readFileSync("data/ticketscloud/catalog.public.json", "utf8")).events;

const themes = [
  {
    key: "spb-yards",
    title: "Петербург: дворы, парадные и коммуналки",
    city: "Санкт-Петербург",
    tags: ["Дворы и парадные", "Экскурсия по парадным", "Экскурсия по коммуналкам", "Экскурсия по дворам", "Интерьерная"],
  },
  {
    key: "spb-water",
    title: "Петербург: реки, каналы и теплоходы",
    city: "Санкт-Петербург",
    tags: ["Водные экскурсии", "Реки и каналы", "На теплоходе", "Водная экскурсия", "На катере", "Теплоходные экскурсии"],
  },
  {
    key: "spb-bridges-night",
    title: "Петербург: разводные мосты и ночные прогулки",
    city: "Санкт-Петербург",
    tags: ["Разводные мосты", "Ночные"],
  },
  {
    key: "standup-humor",
    title: "Стендап и юмор",
    tags: ["Юмор", "Stand up", "Комедия", "Импровизация", "TV комики"],
  },
  {
    key: "planetarium",
    title: "Планетарий 1: шоу и концерты",
    venue: "Планетарий 1",
  },
  {
    key: "concerts",
    title: "Концерты по жанрам",
    categories: ["Концерты"],
  },
  {
    key: "museums-workshops",
    title: "Музеи, выставки и мастер-классы",
    tags: ["Мастер-класс", "Выставки", "Искусство", "Творчество"],
    categoriesAny: ["Музеи"],
  },
  {
    key: "kids-family",
    title: "Детям и семейный досуг",
    tags: ["Детская анимация", "Шоу для детей", "Шоу фонтанов, лазерное шоу, детский спектакль"],
    categoriesAny: ["Детям"],
  },
  {
    key: "active-extreme",
    title: "Активный отдых и автоспорт",
    tags: ["Автоспорт", "Дрифт", "Активный отдых"],
    categoriesAny: ["Спорт"],
  },
  {
    key: "moscow-museums",
    title: "Москва: музеи и мастер-классы",
    city: "Москва",
    categories: ["Музеи"],
  },
  {
    key: "kazan-concerts",
    title: "Казань: концерты",
    city: "Казань",
    categories: ["Концерты"],
  },
  {
    key: "next-14-days",
    title: "Ближайшие 14 дней",
    dateWindowDays: 14,
  },
];

const result = themes.map((theme) => {
  const events = catalog.filter((event) => matchesTheme(event, theme));
  const prices = events.map((event) => event.priceFrom).filter((price) => Number.isFinite(price) && price > 0);
  const dates = events
    .map((event) => Date.parse(event.startsAt))
    .filter(Number.isFinite)
    .sort((a, b) => a - b);

  return {
    key: theme.key,
    title: theme.title,
    events: events.length,
    cities: topValues(events, (event) => event.venue?.city?.name, 8),
    venues: topValues(events, (event) => event.venue?.name, 8),
    categories: topValues(events, (event) => event.category?.name, 8),
    tags: topValues(events.flatMap((event) => event.tags || []), (tag) => tag.name, 10),
    priceFrom: prices.length ? Math.min(...prices) : null,
    nextDate: dates.length ? new Date(dates[0]).toISOString() : null,
  };
});

console.log(JSON.stringify(result, null, 2));

function matchesTheme(event, theme) {
  const tagNames = (event.tags || []).map((tag) => tag.name).filter(Boolean);

  if (theme.city && event.venue?.city?.name !== theme.city) return false;
  if (theme.venue && event.venue?.name !== theme.venue) return false;
  if (theme.categories && !theme.categories.includes(event.category?.name)) return false;

  const categoryMatch = theme.categoriesAny && theme.categoriesAny.includes(event.category?.name);
  const tagMatch = theme.tags && theme.tags.some((tag) => tagNames.includes(tag));
  if (theme.categoriesAny || theme.tags) {
    if (!categoryMatch && !tagMatch) return false;
  }

  if (theme.dateWindowDays) {
    const date = Date.parse(event.startsAt);
    if (!Number.isFinite(date)) return false;
    const now = Date.now();
    if (date < now || date > now + theme.dateWindowDays * 86400000) return false;
  }

  return true;
}

function topValues(items, getValue, limit) {
  const counts = new Map();
  for (const item of items) {
    const value = getValue(item);
    if (!value) continue;
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, events]) => ({ name, events }))
    .sort((a, b) => b.events - a.events || a.name.localeCompare(b.name))
    .slice(0, limit);
}
