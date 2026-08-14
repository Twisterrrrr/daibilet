/** Horizontal date-rail chips for /events catalog (client-side local calendar). */

export type CatalogDateRailChip =
  | { kind: 'preset'; value: 'all' | 'today' | 'tomorrow' | 'weekend'; label: string; shortLabel: string }
  | { kind: 'day'; iso: string; label: string; shortLabel: string; weekday: string };

const WEEKDAY_SHORT = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'] as const;

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Local calendar YYYY-MM-DD (browser TZ). */
export function toLocalIsoDay(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function addLocalDays(base: Date, days: number): Date {
  const next = new Date(base.getFullYear(), base.getMonth(), base.getDate() + days);
  return next;
}

/**
 * Preset chips + next N calendar days (skip today/tomorrow - covered by presets).
 * Day chips start from day+2 so the rail stays swipeable without duplicating Сегодня/Завтра.
 */
export function buildCatalogDateRailChips(now = new Date(), upcomingDays = 7): CatalogDateRailChip[] {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const chips: CatalogDateRailChip[] = [
    { kind: 'preset', value: 'all', label: 'Любая дата', shortLabel: 'Любая' },
    { kind: 'preset', value: 'today', label: 'Сегодня', shortLabel: 'Сегодня' },
    { kind: 'preset', value: 'tomorrow', label: 'Завтра', shortLabel: 'Завтра' },
    { kind: 'preset', value: 'weekend', label: 'На выходных', shortLabel: 'Выходные' },
  ];

  for (let offset = 2; offset < 2 + upcomingDays; offset += 1) {
    const day = addLocalDays(today, offset);
    const iso = toLocalIsoDay(day);
    const weekday = WEEKDAY_SHORT[day.getDay()]!;
    chips.push({
      kind: 'day',
      iso,
      weekday,
      label: `${weekday} ${day.getDate()}`,
      shortLabel: `${weekday} ${day.getDate()}`,
    });
  }

  return chips;
}

export function isDateRailChipActive(
  chip: CatalogDateRailChip,
  filters: { date?: string; from?: string; to?: string },
): boolean {
  const hasRange = Boolean(filters.from || filters.to);
  if (chip.kind === 'preset') {
    if (chip.value === 'all') return !hasRange && !filters.date;
    return !hasRange && filters.date === chip.value;
  }
  return Boolean(filters.from && filters.to === filters.from && filters.from === chip.iso);
}
