import type { Metadata } from 'next';

import { buildShareMetadata, pageTitle } from '@/lib/seo-meta';

export const EVENTS_CATALOG_TITLE = 'Афиша событий - экскурсии и билеты';
export const EVENTS_CATALOG_DESCRIPTION =
  'Афиша событий Дайбилет: фильтры по городу, дате и формату. Более чем в 100 городах России.';

const DATE_TITLE_LABELS: Record<string, string> = {
  today: 'Сегодня',
  tomorrow: 'Завтра',
  weekend: 'На выходных',
  evening: 'Вечером',
};

function firstParam(value: string | string[] | undefined): string {
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value) && value[0]) return String(value[0]).trim();
  return '';
}

function normalizeCategoryLabel(raw: string): string {
  let value = String(raw || '').trim();
  try {
    value = decodeURIComponent(value.replace(/\+/g, ' ')).trim();
  } catch {
    value = value.replace(/\+/g, ' ').trim();
  }
  if (!value) return '';
  // Типичная опечатка в отчётах / старых ссылках
  if (/^меропроприятия$/i.test(value)) return 'Мероприятия';
  return value;
}

function dateTitleLabel(raw: string): string {
  const key = raw.trim().toLowerCase();
  if (DATE_TITLE_LABELS[key]) return DATE_TITLE_LABELS[key];
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  return raw;
}

/**
 * Title / description для `/events` и query-фильтров.
 * Без бренда в конце - его добавит layout template `%s | Дайбилет`.
 */
export function buildEventsCatalogMetaParts(input: {
  category?: string | null;
  date?: string | null;
  city?: string | null;
  q?: string | null;
  from?: string | null;
  to?: string | null;
}): { title: string; description: string; filtered: boolean } {
  const category = normalizeCategoryLabel(String(input.category || ''));
  const date = String(input.date || '').trim();
  const city = String(input.city || '').trim();
  const q = String(input.q || '').trim();
  const from = String(input.from || '').trim();
  const to = String(input.to || '').trim();

  const filtered = Boolean(category || date || city || q || from || to);
  if (!filtered) {
    return {
      title: EVENTS_CATALOG_TITLE,
      description: EVENTS_CATALOG_DESCRIPTION,
      filtered: false,
    };
  }

  const chunks: string[] = [];
  if (category) chunks.push(category);
  else chunks.push('Афиша событий');

  if (city) chunks.push(city);

  const dateBit = date
    ? dateTitleLabel(date)
    : from || to
      ? [from, to].filter(Boolean).join(' - ')
      : '';
  if (dateBit) chunks.push(dateBit);

  if (q) chunks.push(`«${q}»`);

  const title = `${chunks.join(' - ')} - билеты онлайн`;
  const descriptionParts = [
    category ? `Подборка: ${category}` : 'Афиша событий',
    city ? `город ${city}` : null,
    dateBit ? dateBit.toLowerCase() : null,
    q ? `поиск «${q}»` : null,
  ].filter(Boolean);

  return {
    title,
    description: `${descriptionParts.join(', ')}. Более чем в 100 городах России.`,
    filtered: true,
  };
}

export function buildEventsCatalogMetadata(
  searchParams: Record<string, string | string[] | undefined> | URLSearchParams,
): Metadata {
  const raw =
    searchParams instanceof URLSearchParams
      ? Object.fromEntries(searchParams.entries())
      : searchParams;

  const parts = buildEventsCatalogMetaParts({
    category: firstParam(raw.category),
    date: firstParam(raw.date),
    city: firstParam(raw.city),
    q: firstParam(raw.q),
    from: firstParam(raw.from) || firstParam(raw.dateFrom),
    to: firstParam(raw.to) || firstParam(raw.dateTo),
  });

  const cleanTitle = pageTitle(parts.title);
  const shareTitle = `${cleanTitle} | Дайбилет`;

  return {
    title: cleanTitle,
    description: parts.description,
    alternates: { canonical: '/events' },
    // Query-фильтры - UX-срезы одной афиши; индекс только канон `/events`.
    robots: parts.filtered ? { index: false, follow: true } : { index: true, follow: true },
    ...buildShareMetadata({
      title: shareTitle,
      description: parts.description,
      path: '/events',
    }),
  };
}
