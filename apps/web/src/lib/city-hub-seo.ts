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
