const DATES = new Set(['dec24to31', 'dec31', 'jan1', 'jan1to14', 'weekend', 'holidays']);
const PRICES = new Set(['free', 'under1000', 'under2000', 'over2000', 'over5000', 'over10000']);
const SORTS = new Set(['date', 'price', 'price-desc']);

export type NewYearPreviewQuery = {
  city?: string;
  region?: string;
  date?: string;
  price?: string;
  format?: string;
  q?: string;
  sort?: string;
  lowStock: boolean;
  offset: number;
};

export class InvalidNewYearPreviewQuery extends Error {}

function one(params: URLSearchParams, key: string): string | null {
  const values = params.getAll(key);
  if (values.length > 1) throw new InvalidNewYearPreviewQuery(`duplicate_${key}`);
  return values[0] ?? null;
}

function shortText(params: URLSearchParams, key: string, maxLength: number): string | undefined {
  const value = one(params, key)?.trim();
  if (!value) return undefined;
  if (value.length > maxLength) throw new InvalidNewYearPreviewQuery(`invalid_${key}`);
  return value;
}

function validCustomDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value < '2026-12-01' || value > '2027-01-14') return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function parseNewYearPreviewQuery(params: URLSearchParams): NewYearPreviewQuery {
  const date = shortText(params, 'date', 20);
  if (date && date !== 'all' && !DATES.has(date) && !validCustomDate(date)) {
    throw new InvalidNewYearPreviewQuery('invalid_date');
  }
  const price = shortText(params, 'price', 20);
  if (price && price !== 'all' && !PRICES.has(price)) throw new InvalidNewYearPreviewQuery('invalid_price');
  const sort = shortText(params, 'sort', 20);
  if (sort && !SORTS.has(sort)) throw new InvalidNewYearPreviewQuery('invalid_sort');
  const lowStockValue = one(params, 'lowStock');
  if (lowStockValue !== null && lowStockValue !== '0' && lowStockValue !== '1') {
    throw new InvalidNewYearPreviewQuery('invalid_lowStock');
  }
  const offsetValue = one(params, 'offset');
  const offset = offsetValue === null ? 0 : /^\d+$/.test(offsetValue) ? Number(offsetValue) : NaN;
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > 100_000) throw new InvalidNewYearPreviewQuery('invalid_offset');

  return {
    city: shortText(params, 'city', 100),
    region: shortText(params, 'region', 100),
    date: date || undefined,
    price: price || undefined,
    format: shortText(params, 'format', 100),
    q: shortText(params, 'q', 120),
    sort: sort || undefined,
    lowStock: lowStockValue === '1',
    offset,
  };
}
