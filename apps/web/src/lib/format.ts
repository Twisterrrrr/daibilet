const MIN_DISPLAY_PRICE_RUB = 100;

export function formatNumber(value: number): string {
  return value.toLocaleString('ru-RU');
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
