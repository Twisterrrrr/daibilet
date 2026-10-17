import { cityToPrepositional } from '@/lib/city-declension';
import { pageTitle } from '@/lib/seo-meta';

/**
 * SEO title venue/location:
 * «{Площадка} в {Город}: афиша и билеты | Дайбилет».
 *
 * Без «на сегодня» и живой даты: в отличие от city hub / лендингов, афиша
 * конкретной площадки может быть пустой в отдельно взятый день — тайтл не
 * должен обещать события, которых нет (несоответствие обещания в TITLE и
 * содержимого страницы поисковики оценивают хуже нейтрального заголовка).
 * City adds local commercial intent.
 */
export function buildVenueSeoTitle(venueName: string, city?: string | null): string {
  const name = pageTitle(String(venueName || '').trim() || 'Площадка');
  const cityLabel = String(city || '').trim();
  const citySpecified = Boolean(cityLabel) && cityLabel !== 'Не указан';
  // city в DTO — именительный («Москва»), в названии площадки город может быть
  // уже упомянут в любой форме («…в Москве») — проверяем обе, иначе дубль.
  const cityPrep = citySpecified ? cityToPrepositional(cityLabel) : '';
  const lower = name.toLowerCase();
  const cityMentioned =
    citySpecified &&
    (lower.includes(cityLabel.toLowerCase()) || lower.includes(cityPrep.toLowerCase()));
  const withGeo = citySpecified && !cityMentioned ? `${name} в ${cityPrep}` : name;
  return `${withGeo}: афиша и билеты | Дайбилет`;
}

/** Без суффикса бренда - для layout title template `%s | Дайбилет`. */
export function buildVenueSeoTitleCore(venueName: string, city?: string | null): string {
  return buildVenueSeoTitle(venueName, city).replace(/\s*\|\s*Дайбилет\s*$/i, '');
}

/**
 * Кастомный seoTitle из CMS используем только если там уже есть «на сегодня»
 * (редактор явно задал freshness и сам отвечает за такое обещание). Иначе -
 * шаблон без живой даты.
 */
export function resolveVenueSeoTitle(venue: {
  name?: string | null;
  title?: string | null;
  seoTitle?: string | null;
  city?: string | null;
}): { core: string; full: string } {
  const displayName = String(venue.name || venue.title || 'Площадка').trim() || 'Площадка';
  const custom = String(venue.seoTitle || '').trim();
  if (custom && /на сегодня/i.test(custom)) {
    const full = /\|?\s*Дайбилет\s*$/i.test(custom) ? custom : `${pageTitle(custom)} | Дайбилет`;
    return { core: pageTitle(full), full };
  }
  return {
    core: buildVenueSeoTitleCore(displayName, venue.city),
    full: buildVenueSeoTitle(displayName, venue.city),
  };
}
