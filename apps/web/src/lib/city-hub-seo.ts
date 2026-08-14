import {
  cityToGenitive,
  cityToPrepositional,
  inCityPrepositional,
  isSeoExpansionCity,
} from '@/lib/city-declension';
import { formatLandingTodayParts } from '@/lib/datetime';
import { listingSeoYear } from '@/lib/seo-listing-meta';

/**
 * SEO title city hub (standalone).
 * Казань/Екб: `Афиша {City_Род} {Год} - куда сходить, купить билеты на события в {City_Пр}`
 * Остальные: именительный + «на сегодня, {date}».
 */
export function buildCityHubSeoTitle(
  cityName: string,
  reference: Date = new Date(),
): string {
  const name = String(cityName || '').trim() || 'Город';
  if (isSeoExpansionCity(name)) {
    const year = listingSeoYear(reference);
    const gen = cityToGenitive(name);
    const prep = cityToPrepositional(name);
    return `Афиша ${gen} ${year} - куда сходить, купить билеты на события в ${prep}`;
  }
  const { short } = formatLandingTodayParts(reference);
  return `${name}: афиша, экскурсии и билеты на сегодня, ${short} | Дайбилет`;
}

/** То же без суффикса бренда — для `pageTitle()` / layout template. */
export function buildCityHubSeoTitleCore(
  cityName: string,
  reference: Date = new Date(),
): string {
  const full = buildCityHubSeoTitle(cityName, reference);
  if (isSeoExpansionCity(cityName)) return full;
  return full.replace(/\s*\|\s*Дайбилет\s*$/i, '');
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
export function buildCityHubSeoDescription(
  cityName: string,
  reference: Date = new Date(),
): string {
  const name = String(cityName || '').trim() || 'городе';
  if (isSeoExpansionCity(name)) {
    const gen = cityToGenitive(name);
    const year = listingSeoYear(reference);
    return (
      `Все развлечения, экскурсии и концерты ${gen} в одном месте. ` +
      `Актуальное расписание на ${year} год, цены на билеты и лучшие места. ` +
      `Спланируйте свой досуг с Daibilet.ru!`
    );
  }
  const inCity = inCityPrepositional(name);
  return `${buildCityHubSeoPhrase(name)}. События, музеи и активности ${inCity}: выбор по датам, площадкам и категориям. Билеты онлайн на Дайбилете.`;
}
