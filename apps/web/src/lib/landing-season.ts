/**
 * Calendar off-season for seasonal landings (Europe/Moscow).
 * Keep landing pages 200; hide from /podborki catalog + hero pins.
 * Mirror of apps/backend/src/landing-rules.ts - keep windows in sync.
 */

export function isLandingOffSeason(slug: string, now = new Date()): boolean {
  const key = String(slug || '')
    .trim()
    .toLowerCase()
    .replace(/_/g, '-');
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Moscow',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(now);
  const month = Number(parts.find((part) => part.type === 'month')?.value || 0);
  const day = Number(parts.find((part) => part.type === 'day')?.value || 0);

  if (key === 'salute-9-may') {
    return !(month === 4 || (month === 5 && day <= 15));
  }
  if (key === 'moscow-city-day') {
    return !(month === 8 || month === 9);
  }
  if (key === 'new-year') {
    if (month === 11 && day >= 15) return false;
    if (month === 12) return false;
    if (month === 1 && day <= 15) return false;
    return true;
  }
  return false;
}

export function buildOffSeasonLandingSlugs(now = new Date()): Set<string> {
  return new Set(
    ['salute-9-may', 'moscow-city-day', 'new-year'].filter((slug) => isLandingOffSeason(slug, now)),
  );
}

export function filterInSeasonLandings<T extends { slug: string }>(
  items: T[],
  now = new Date(),
): T[] {
  const off = buildOffSeasonLandingSlugs(now);
  if (!off.size) return items;
  return items.filter((item) => !off.has(item.slug));
}
