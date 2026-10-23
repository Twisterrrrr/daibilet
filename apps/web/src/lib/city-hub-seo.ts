import { inCityPrepositional } from './city-declension.ts';
import { formatLandingTodayParts } from './datetime.ts';

/** SEO title for travel intent: sights and ideas for exploring the city. */
export function buildCityHubSeoTitle(
  cityName: string,
  _reference: Date = new Date(),
): string {
  const name = String(cityName || '').trim() || 'Город';
  const { short } = formatLandingTodayParts(_reference);
  return `${name}: зачем ехать, что посмотреть, ближайшие события на сегодня, ${short} | Дайбилет`;
}

/** То же без суффикса бренда — для `pageTitle()` / layout template. */
export function buildCityHubSeoTitleCore(
  cityName: string,
  reference: Date = new Date(),
): string {
  return buildCityHubSeoTitle(cityName, reference).replace(/\s*\|\s*Дайбилет\s*$/i, '');
}

/**
 * Meta description / on-page H2 core: city exploration, attractions and events.
 */
export function buildCityHubSeoPhrase(cityName: string): string {
  const name = String(cityName || '').trim() || 'города';
  return `Что посмотреть ${inCityPrepositional(name)}: главные достопримечательности, места и экскурсии`;
}

/** Fallback meta description, если в CMS нет seoDescription. */
export function buildCityHubSeoDescription(
  cityName: string,
  _reference: Date = new Date(),
): string {
  const name = String(cityName || '').trim() || 'городе';
  const inCity = inCityPrepositional(name);
  return `${buildCityHubSeoPhrase(name)}. Гид по главным местам ${inCity}, маршруты на день, музеи и события. Выбирайте, куда сходить, и покупайте билеты онлайн на Дайбилете.`;
}
