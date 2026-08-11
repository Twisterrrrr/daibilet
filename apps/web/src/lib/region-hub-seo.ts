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

export function buildRegionSystemBrief(regionName: string): string {
  const name = String(regionName || '').trim() || 'регионе';
  return `События и загородный отдых в ${name}. Выбирайте города и площадки для поездок выходного дня.`;
}
