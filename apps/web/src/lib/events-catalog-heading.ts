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
 * Visible H1 for `/events` (not document title).
 * Category + city → «Экскурсии в Санкт-Петербурге». Date/price/etc. stay in removable chips, not H1/subtitle.
 * Subtitle only for the empty hub (no city yet); filtered views use chips instead of marketing copy.
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
      subtitle: '',
      filtered,
    };
  }

  if (category && cityIn) {
    return {
      title: `${category} ${cityIn}`,
      subtitle: '',
      filtered,
    };
  }

  if (category) {
    return {
      title: category,
      subtitle: '',
      filtered,
    };
  }

  if (cityIn) {
    return {
      title: `Афиша событий ${cityIn}`,
      subtitle: '',
      filtered,
    };
  }

  if (dateLabel) {
    return {
      title: 'Афиша событий',
      subtitle: '',
      filtered: true,
    };
  }

  return {
    title: 'Афиша событий',
    subtitle: 'Сначала выберите город - покажем только актуальную афишу',
    filtered: false,
  };
}
