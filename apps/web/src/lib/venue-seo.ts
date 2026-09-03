import { formatLandingTodayParts } from '@/lib/datetime';
import { pageTitle } from '@/lib/seo-meta';

/**
 * SEO title venue/location:
 * «{Площадка} в {Город}: афиша и билеты на сегодня, {date} | Дайбилет».
 * Живая дата (MSK), как у city hubs. City adds local commercial intent.
 */
export function buildVenueSeoTitle(
  venueName: string,
  reference: Date = new Date(),
  city?: string | null,
): string {
  const name = pageTitle(String(venueName || '').trim() || 'Площадка');
  const cityLabel = String(city || '').trim();
  const withGeo =
    cityLabel && cityLabel !== 'Не указан' && !name.toLowerCase().includes(cityLabel.toLowerCase())
      ? `${name} в ${cityLabel}`
      : name;
  const { short } = formatLandingTodayParts(reference);
  return `${withGeo}: афиша и билеты на сегодня, ${short} | Дайбилет`;
}

/** Без суффикса бренда - для layout title template `%s | Дайбилет`. */
export function buildVenueSeoTitleCore(
  venueName: string,
  reference: Date = new Date(),
  city?: string | null,
): string {
  return buildVenueSeoTitle(venueName, reference, city).replace(/\s*\|\s*Дайбилет\s*$/i, '');
}

/**
 * Кастомный seoTitle из CMS используем только если там уже есть «на сегодня»
 * (редактор явно задал freshness). Иначе - живой шаблон.
 */
export function resolveVenueSeoTitle(
  venue: {
    name?: string | null;
    title?: string | null;
    seoTitle?: string | null;
    city?: string | null;
  },
  reference: Date = new Date(),
): { core: string; full: string } {
  const displayName = String(venue.name || venue.title || 'Площадка').trim() || 'Площадка';
  const custom = String(venue.seoTitle || '').trim();
  if (custom && /на сегодня/i.test(custom)) {
    const full = /\|?\s*Дайбилет\s*$/i.test(custom) ? custom : `${pageTitle(custom)} | Дайбилет`;
    return { core: pageTitle(full), full };
  }
  return {
    core: buildVenueSeoTitleCore(displayName, reference, venue.city),
    full: buildVenueSeoTitle(displayName, reference, venue.city),
  };
}
