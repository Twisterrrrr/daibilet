import { cityToGenitive, inCityPrepositional } from '@/lib/city-declension';
import { formatLandingTodayParts } from '@/lib/datetime';

/**
 * SEO title city hub (standalone): именительный падеж + «на сегодня, {date}».
 * Пример: «Санкт-Петербург: афиша, экскурсии и билеты на сегодня, 19 июля | Дайбилет»
 */
export function buildCityHubSeoTitle(
  cityName: string,
  reference: Date = new Date(),
): string {
  const name = String(cityName || '').trim() || 'Город';
  const { short } = formatLandingTodayParts(reference);
  return `${name}: афиша, экскурсии и билеты на сегодня, ${short} | Дайбилет`;
}

/** То же без суффикса бренда — для `pageTitle()` / layout template. */
export function buildCityHubSeoTitleCore(
  cityName: string,
  reference: Date = new Date(),
): string {
  return buildCityHubSeoTitle(cityName, reference).replace(/\s*\|\s*Дайбилет\s*$/i, '');
}

/**
 * Meta description / on-page H2 core: длинные запросы в родительном падеже.
 * Пример: «Афиша, экскурсии и билеты Санкт-Петербурга»
 */
export function buildCityHubSeoPhrase(cityName: string): string {
  const name = String(cityName || '').trim() || 'города';
  return `Афиша, экскурсии и билеты ${cityToGenitive(name)}`;
}

/** Fallback meta description, если в CMS нет seoDescription. */
export function buildCityHubSeoDescription(cityName: string): string {
  const name = String(cityName || '').trim() || 'городе';
  const inCity = inCityPrepositional(name);
  return `${buildCityHubSeoPhrase(name)}. События, музеи и активности ${inCity}: выбор по датам, площадкам и категориям. Билеты онлайн на Дайбилете.`;
}
