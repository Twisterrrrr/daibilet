import type { PublicSessionDto } from '@daibilet/contracts/public';

/**
 * Dinner-specific helpers extracted from LandingPageView for reuse
 * in DinnerScheduleSection and other dinner-related components.
 */

/** Extract menu type label from session metadata. */
export function extractMenuLabel(session: PublicSessionDto): string | null {
  const text = [session.title, session.category, ...(session.tags || []), ...(session.subcategories || [])]
    .join(' ')
    .toLowerCase();
  if (/фуршет/i.test(text)) return 'Фуршет';
  if (/сет-?меню|дегустац|set-?menu/i.test(text)) return 'Сет-меню';
  return null;
}

/** Extract dinner format label from session tags. */
export function extractFormatLabel(tags: string[]): string {
  const text = (tags || []).join(' ').toLowerCase();
  if (/vip/i.test(text)) return 'VIP';
  if (/романт/i.test(text)) return 'Романтика';
  if (/корпоратив/i.test(text)) return 'Корпоратив';
  return 'Стандарт';
}

/** Build CSS grid template class for dinner schedule columns. */
export function dinnerScheduleGridClass(showMenuColumn: boolean, showFormatColumn: boolean): string {
  const titleFr = showMenuColumn && showFormatColumn ? '1.8fr'
    : showMenuColumn || showFormatColumn ? '2.1fr' : '2.4fr';
  const parts = [titleFr];
  if (showMenuColumn) parts.push('0.7fr');
  parts.push(showMenuColumn && showFormatColumn ? '0.6fr' : '0.65fr');
  parts.push('0.55fr');
  if (showFormatColumn) parts.push('0.6fr');
  parts.push('auto');
  return `md:grid-cols-[${parts.join('_')}]`;
}

type MenuFilter = 'all' | 'set' | 'buffet';

/** Check if session matches a menu filter. */
export function matchesMenuFilter(session: PublicSessionDto, menu: MenuFilter): boolean {
  if (menu === 'all') return true;
  const text = [session.title, session.category, ...(session.tags || []), ...(session.subcategories || [])]
    .join(' ')
    .toLowerCase();
  if (menu === 'set') return /сет-?меню|set-?menu|дегустац/i.test(text);
  if (menu === 'buffet') return /фуршет|buffet/i.test(text);
  return true;
}

/** Collect available menu facets from sessions. */
export function collectDinnerMenuFacets(sessions: PublicSessionDto[]): Array<{ value: Exclude<MenuFilter, 'all'>; label: string }> {
  const facets: Array<{ value: Exclude<MenuFilter, 'all'>; label: string }> = [
    { value: 'set', label: 'Сет-меню' },
    { value: 'buffet', label: 'Фуршет' },
  ];
  return facets.filter((facet) => {
    const count = sessions.filter((session) => matchesMenuFilter(session, facet.value)).length;
    return count > 0 && count < sessions.length;
  });
}
