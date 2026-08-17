import { cityToGenitive, cityToPrepositional } from './city-declension.ts';

/**
 * H1 / lead for `/events` and `/places` city hubs (header picker = city).
 *
 * Child-city on a region hub (`/cities/{region}?city=ramenskoe`) is later, not this chrome:
 * H1 locator «Раменское, Московская область • Ближайшие события»,
 * title «Афиша Раменского: … {year} | Дайбилет», lead «куда сходить…»,
 * canonical without query + noindex. Do not invent `/cities/ramenskoe` here.
 */

const EVENTS_H1_TYPES = 'экскурсии, концерты, театр и музеи';

export function eventsCatalogH1(input: {
  cityName?: string | null;
  q?: string | null;
  category?: string | null;
}): string {
  const q = String(input.q || '').trim();
  const category = String(input.category || '').trim();
  if (q) return `Результаты поиска: «${q}»`;
  if (category) return `События: ${category}`;
  const city = String(input.cityName || '').trim();
  if (city) return `Афиша событий в ${cityToPrepositional(city)}: ${EVENTS_H1_TYPES}`;
  return `Афиша событий: ${EVENTS_H1_TYPES}`;
}

export function eventsCatalogLead(input: {
  cityName?: string | null;
  q?: string | null;
  category?: string | null;
}): string {
  const q = String(input.q || '').trim();
  const category = String(input.category || '').trim();
  const city = String(input.cityName || '').trim();
  const prep = city ? cityToPrepositional(city) : '';
  if (q) return prep ? `Подборка по запросу в ${prep}` : 'Подборка по запросу';
  if (category) {
    return prep ? `Афиша в категории «${category}» - ${prep}` : `Афиша в категории «${category}»`;
  }
  if (prep) {
    return 'Официальные билеты без наценки. Выберите дату - покажем, что интересного рядом.';
  }
  return 'Сначала выберите город - покажем только актуальную афишу';
}

export function placesCatalogH1(cityName?: string | null): string {
  const city = String(cityName || '').trim();
  if (!city) return 'Места и достопримечательности';
  return `Места и достопримечательности ${cityToGenitive(city)}`;
}

export function placesCatalogLead(cityName?: string | null): string {
  const city = String(cityName || '').trim();
  if (city) {
    return 'Смотрите, что открыто прямо сейчас, и складывайте места в один маршрут по городу.';
  }
  return 'Смотрите, что открыто прямо сейчас, и складывайте места в один маршрут.';
}

/** Eyebrow: count as fact + city when scoped. Never «N городов» once a city is chosen. */
export function catalogIndexEyebrow(countLabel: string, cityName?: string | null): string {
  const city = String(cityName || '').trim();
  if (city) return `${countLabel} · ${city}`;
  return countLabel;
}
