import { formatLandingTodayParts } from '@/lib/datetime';
import { pageTitle } from '@/lib/seo-meta';

/**
 * SEO title venue/location: «{Площадка}: афиша и билеты на сегодня, {date} | Дайбилет».
 * Живая дата (MSK), как у city hubs.
 */
export function buildVenueSeoTitle(venueName: string, reference: Date = new Date()): string {
  const name = pageTitle(String(venueName || '').trim() || 'Площадка');
  const { short } = formatLandingTodayParts(reference);
  return `${name}: афиша и билеты на сегодня, ${short} | Дайбилет`;
}

/** Без суффикса бренда - для layout title template `%s | Дайбилет`. */
export function buildVenueSeoTitleCore(venueName: string, reference: Date = new Date()): string {
  return buildVenueSeoTitle(venueName, reference).replace(/\s*\|\s*Дайбилет\s*$/i, '');
}

/**
 * Кастомный seoTitle из CMS используем только если там уже есть «на сегодня»
 * (редактор явно задал freshness). Иначе - живой шаблон.
 */
export function resolveVenueSeoTitle(
  venue: { name?: string | null; title?: string | null; seoTitle?: string | null },
  reference: Date = new Date(),
): { core: string; full: string } {
  const displayName = String(venue.name || venue.title || 'Площадка').trim() || 'Площадка';
  const custom = String(venue.seoTitle || '').trim();
  if (custom && /на сегодня/i.test(custom)) {
    const full = /\|?\s*Дайбилет\s*$/i.test(custom) ? custom : `${pageTitle(custom)} | Дайбилет`;
    return { core: pageTitle(full), full };
  }
  return {
    core: buildVenueSeoTitleCore(displayName, reference),
    full: buildVenueSeoTitle(displayName, reference),
  };
}
