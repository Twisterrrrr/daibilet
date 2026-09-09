import { displayCatalogLabel } from './catalog-labels.ts';
import { inCityPrepositional } from './city-declension.ts';

export type EventsCatalogHeadingInput = {
  q?: string | null;
  category?: string | null;
  cityName?: string | null;
  /** Human date label already resolved (Сегодня / 12 сентября / …). */
  dateLabel?: string | null;
};

export type EventsCatalogHeading = {
  title: string;
  subtitle: string;
  /** True when query/category/city/date slice the hub. */
  filtered: boolean;
};

/**
 * Visible H1/subtitle for `/events` (not document title).
 * City lands in the H1 when known - never only as a weak subtitle dash after category.
 */
export function buildEventsCatalogHeading(input: EventsCatalogHeadingInput): EventsCatalogHeading {
  const q = String(input.q || '').trim();
  const category = displayCatalogLabel(String(input.category || '').trim());
  const cityName = String(input.cityName || '').trim();
  const dateLabel = String(input.dateLabel || '').trim();
  const cityIn = cityName ? inCityPrepositional(cityName) : '';
  const filtered = Boolean(q || category || cityName || dateLabel);

  if (q) {
    return {
      title: `Результаты поиска: «${q}»`,
      subtitle: cityIn ? `Подборка по запросу ${cityIn}` : 'Подборка по запросу',
      filtered,
    };
  }

  if (category && cityIn) {
    return {
      title: dateLabel ? `${category} ${cityIn}, ${dateLabel}` : `${category} ${cityIn}`,
      subtitle: 'Билеты и расписание - выбирайте по дате и интересам',
      filtered,
    };
  }

  if (category) {
    return {
      title: dateLabel ? `${category}, ${dateLabel}` : category,
      subtitle: 'Укажите город в шапке - покажем только локальную афишу',
      filtered,
    };
  }

  if (cityIn) {
    return {
      title: dateLabel ? `Афиша ${cityIn}, ${dateLabel}` : `Афиша событий ${cityIn}`,
      subtitle: 'Билеты и расписание - выбирайте по дате и интересам',
      filtered,
    };
  }

  if (dateLabel) {
    return {
      title: `Афиша на ${dateLabel.toLowerCase()}`,
      subtitle: 'Сначала выберите город - покажем только актуальную афишу',
      filtered: true,
    };
  }

  return {
    title: 'Афиша событий',
    subtitle: 'Сначала выберите город - покажем только актуальную афишу',
    filtered: false,
  };
}
