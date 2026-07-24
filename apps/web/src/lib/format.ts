const MIN_DISPLAY_PRICE_RUB = 100;

export function formatNumber(value: number): string {
  return value.toLocaleString('ru-RU');
}

export function formatMoneyRange(from?: number | null, to?: number | null): string {
  if (!from || from < MIN_DISPLAY_PRICE_RUB) return 'Цена уточняется';
  const min = Math.round(from);
  const max = to && to >= MIN_DISPLAY_PRICE_RUB ? Math.round(to) : min;
  if (max > min) return `${formatNumber(min)} – ${formatNumber(max)} ₽`;
  return `${formatNumber(min)} ₽`;
}

export function formatPriceFrom(value?: number | null): string {
  if (typeof value !== 'number' || value < MIN_DISPLAY_PRICE_RUB) return 'Цена уточняется';
  return `от ${formatNumber(value)} ₽`;
}

export function pluralEvents(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 19) return `${formatNumber(count)} событий`;
  if (mod10 === 1) return `${formatNumber(count)} событие`;
  if (mod10 >= 2 && mod10 <= 4) return `${formatNumber(count)} события`;
  return `${formatNumber(count)} событий`;
}

export function pluralCities(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 19) return `${formatNumber(count)} городов`;
  if (mod10 === 1) return `${formatNumber(count)} город`;
  if (mod10 >= 2 && mod10 <= 4) return `${formatNumber(count)} города`;
  return `${formatNumber(count)} городов`;
}

export function pluralVenues(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 19) return `${formatNumber(count)} площадок`;
  if (mod10 === 1) return `${formatNumber(count)} площадка`;
  if (mod10 >= 2 && mod10 <= 4) return `${formatNumber(count)} площадки`;
  return `${formatNumber(count)} площадок`;
}

export function pluralGuides(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 19) return `${formatNumber(count)} статей`;
  if (mod10 === 1) return `${formatNumber(count)} статья`;
  if (mod10 >= 2 && mod10 <= 4) return `${formatNumber(count)} статьи`;
  return `${formatNumber(count)} статей`;
}

export function roundStatToTen(value?: number | null): number {
  const count = Math.max(0, Math.round(value || 0));
  if (count === 0) return 0;
  const rounded = Math.round(count / 10) * 10;
  return rounded > 0 ? rounded : 10;
}

export function formatStatCount(value?: number | null, plusThreshold = 500): string {
  const count = Math.max(0, Math.round(value || 0));
  if (count >= plusThreshold) return `${formatNumber(count)}+`;
  return formatNumber(count);
}

export function isMeaningfulStatCount(value?: number | null, min = 10): boolean {
  return Math.round(value || 0) >= min;
}

export function formatMoney(value?: number | null): string {
  if (!value || value <= 0) return '—';
  return `от ${formatNumber(Math.round(value))}\u00a0₽`;
}
