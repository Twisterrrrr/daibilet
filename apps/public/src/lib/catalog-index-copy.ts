import { cityToGenitive, cityToPrepositional } from '@/lib/city-declension';

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
