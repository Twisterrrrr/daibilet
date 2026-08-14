import type { Metadata } from 'next';

import { cityToNominative, cityToPrepositional } from './city-declension.ts';
import {
  EVENTS_HUB_DESCRIPTION,
  INDEX_FOLLOW_ROBOTS,
  buildShareMetadata,
  canonicalHref,
  ensureSeoDescription,
  eventsCityDescriptionFallback,
  pageTitle,
} from './seo-meta.ts';

export const EVENTS_CATALOG_TITLE = 'Афиша событий - экскурсии и билеты';
export const EVENTS_CATALOG_DESCRIPTION = EVENTS_HUB_DESCRIPTION;
export const EVENTS_HUB_PATH = '/events';

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
  const cityLabel = city && /[а-яё]/i.test(cityToNominative(city)) ? cityToNominative(city) : '';
  const cityPrep = cityLabel ? cityToPrepositional(cityLabel) : '';
  const cityFallback = eventsCityDescriptionFallback(cityPrep);

  if (!filtered) {
    return {
      title: EVENTS_CATALOG_TITLE,
      description: ensureSeoDescription(EVENTS_CATALOG_DESCRIPTION, EVENTS_HUB_DESCRIPTION),
      filtered: false,
    };
  }

  const chunks: string[] = [];
  if (category) chunks.push(category);
  else chunks.push('Афиша событий');

  if (city) chunks.push(cityLabel || city);

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
    cityLabel || city ? `город ${cityLabel || city}` : null,
    dateBit ? dateBit.toLowerCase() : null,
    q ? `поиск «${q}»` : null,
  ].filter(Boolean);

  const filteredDescription = `${descriptionParts.join(', ')}. Более чем в 100 городах России.`;

  return {
    title,
    description: ensureSeoDescription(filteredDescription, cityFallback),
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
  const description = ensureSeoDescription(parts.description, EVENTS_HUB_DESCRIPTION);

  return {
    title: cleanTitle,
    description,
    alternates: { canonical: canonicalHref(EVENTS_HUB_PATH) },
    // Query-фильтры - UX-срезы одной афиши; канон чистый `/events`, не `/`.
    robots: INDEX_FOLLOW_ROBOTS,
    ...buildShareMetadata({
      title: shareTitle,
      description,
      path: EVENTS_HUB_PATH,
    }),
  };
}
