import { cityToGenitive, cityToPrepositional } from './city-declension.ts';

/**
 * SEO title/description для region hub (`type=region`).
 * City hub остаётся на P.2d (`buildCityHubSeoTitle`).
 */

export function buildRegionHubSeoTitle(regionName: string): string {
  const name = String(regionName || '').trim() || 'Регион';
  return `${name}: куда съездить и что посмотреть, загородный отдых | Дайбилет`;
}

export function buildRegionHubSeoTitleCore(regionName: string): string {
  return buildRegionHubSeoTitle(regionName).replace(/\s*\|\s*Дайбилет\s*$/i, '');
}

export function buildRegionHubSeoDescription(regionName: string): string {
  const name = String(regionName || '').trim() || 'регионе';
  return `Список событий, площадок и популярных городов в ${name} для загородного отдыха и поездок выходного дня.`;
}

export function buildRegionHubH1(regionName: string): string {
  const name = String(regionName || '').trim() || 'регионе';
  return `Мероприятия и загородный отдых в ${name}`;
}

/**
 * Ручной родительный для CTR-title спутников. Не полный морфодвижок:
 * неизвестный город → cityToGenitive (хабы + эвристика).
 */
const CHILD_CITY_TITLE_GENITIVE: Record<string, string> = {
  Раменское: 'Раменского',
  Выборг: 'Выборга',
};

export function childCityTitleGenitive(cityName: string): string {
  const name = String(cityName || '').trim();
  if (!name) return 'города';
  return CHILD_CITY_TITLE_GENITIVE[name] || cityToGenitive(name);
}

/**
 * H1 / search label (locator). Без «Афиша» - она уже в title.
 * «Раменское, Московская область • Ближайшие события».
 */
export function buildChildCityScopeLabel(cityName: string, regionName: string): string {
  const city = String(cityName || '').trim() || 'Город';
  const region = String(regionName || '').trim() || 'регион';
  return `${city}, ${region} • Ближайшие события`;
}

/**
 * Child SERP title. Бренд как в layout/`pageTitle`: «Дайбилет».
 * На `?city=` region hub: этот title + noindex + canonical без query.
 * Indexed document без query остаётся на buildRegionHubSeoTitle.
 */
export function buildChildCityScopeSeoTitle(
  cityName: string,
  reference: Date = new Date(),
): string {
  const year = reference.getFullYear();
  return `Афиша ${childCityTitleGenitive(cityName)}: главные события и мероприятия ${year} | Дайбилет`;
}

export function buildChildCityScopeSeoTitleCore(
  cityName: string,
  reference: Date = new Date(),
): string {
  return buildChildCityScopeSeoTitle(cityName, reference).replace(/\s*\|\s*Дайбилет\s*$/i, '');
}

/**
 * Лид под H1: intent, не вопрос-H1. Вопрос «куда сходить» живёт здесь.
 */
export function buildChildCityScopeLead(cityName: string, regionName: string): string {
  const city = String(cityName || '').trim() || 'городе';
  const region = String(regionName || '').trim() || 'регионе';
  return `Ищете, куда сходить в выходные? Мы собрали все актуальные события, выставки и концерты в ${cityToPrepositional(city)} и ближайших населенных пунктах ${cityToGenitive(region)}.`;
}

export function buildRegionSystemBrief(regionName: string): string {
  const name = String(regionName || '').trim() || 'регионе';
  return `События и загородный отдых в ${name}. Выбирайте города и площадки для поездок выходного дня.`;
}
