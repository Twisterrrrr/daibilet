/** Horizontal date-rail day cards for /events catalog (client-side local calendar). */

export type CatalogDateRailDayChip = {
  kind: 'day';
  iso: string;
  /** СЕГ / ЗАВ / пн…вс */
  weekday: string;
  dayNum: number;
  /** авг / сен */
  monthShort: string;
  isWeekend: boolean;
  label: string;
  shortLabel: string;
};

export type CatalogDateRailPresetChip = {
  kind: 'preset';
  value: 'all' | 'today' | 'tomorrow' | 'weekend';
  label: string;
  shortLabel: string;
};

export type CatalogDateRailChip = CatalogDateRailDayChip | CatalogDateRailPresetChip;

/** Mobile / tablet: scrollable day strip length. */
export const CATALOG_DATE_RAIL_DAYS_TABLET = 14;
/** Desktop baseline before measure fills the rail. */
export const CATALOG_DATE_RAIL_DAYS_DESKTOP = 14;
/** Upper bound when measuring how many day chips fit across the grid width. */
export const CATALOG_DATE_RAIL_DAYS_DESKTOP_MAX = 45;

const WEEKDAY_SHORT = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'] as const;
const MONTH_SHORT = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'] as const;
const MONTH_LONG = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
] as const;

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Local calendar YYYY-MM-DD (browser TZ). */
export function toLocalIsoDay(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function addLocalDays(base: Date, days: number): Date {
  return new Date(base.getFullYear(), base.getMonth(), base.getDate() + days);
}

function parseLocalIsoDay(iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function buildDayChip(day: Date, today: Date): CatalogDateRailDayChip {
  const iso = toLocalIsoDay(day);
  const todayIso = toLocalIsoDay(today);
  const tomorrowIso = toLocalIsoDay(addLocalDays(today, 1));
  const dow = day.getDay();
  const isWeekend = dow === 0 || dow === 6;
  let weekday = WEEKDAY_SHORT[dow]!;
  if (iso === todayIso) weekday = 'сег';
  else if (iso === tomorrowIso) weekday = 'зав';
  const dayNum = day.getDate();
  const monthShort = MONTH_SHORT[day.getMonth()]!;
  return {
    kind: 'day',
    iso,
    weekday,
    dayNum,
    monthShort,
    isWeekend,
    label: `${weekday} ${dayNum} ${monthShort}`,
    shortLabel: `${weekday} ${dayNum}`,
  };
}

export type BuildCatalogDateRailOptions = {
  /**
   * Legacy strip for region pages: Любая / Сегодня / Завтра / Выходные + days from +2.
   * Catalog uses day cards from today (default).
   */
  includePresets?: boolean;
};

/**
 * Day cards starting today (СЕГ/ЗАВ + calendar days), or legacy presets + days from +2.
 */
export function buildCatalogDateRailChips(
  now = new Date(),
  upcomingDays = CATALOG_DATE_RAIL_DAYS_TABLET,
  options: BuildCatalogDateRailOptions = {},
): CatalogDateRailChip[] {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (options.includePresets) {
    const chips: CatalogDateRailChip[] = [
      { kind: 'preset', value: 'all', label: 'Любая дата', shortLabel: 'Любая' },
      { kind: 'preset', value: 'today', label: 'Сегодня', shortLabel: 'Сегодня' },
      { kind: 'preset', value: 'tomorrow', label: 'Завтра', shortLabel: 'Завтра' },
      { kind: 'preset', value: 'weekend', label: 'На выходных', shortLabel: 'Выходные' },
    ];
    for (let offset = 2; offset < 2 + upcomingDays; offset += 1) {
      chips.push(buildDayChip(addLocalDays(today, offset), today));
    }
    return chips;
  }

  const days: CatalogDateRailDayChip[] = [];
  for (let offset = 0; offset < upcomingDays; offset += 1) {
    days.push(buildDayChip(addLocalDays(today, offset), today));
  }
  return days;
}

export function isIsoInCatalogDateRange(
  iso: string,
  filters: { from?: string; to?: string },
): boolean {
  if (!filters.from) return false;
  const to = filters.to || filters.from;
  return iso >= filters.from && iso <= to;
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
  if (filters.date) return false;
  return isIsoInCatalogDateRange(chip.iso, filters);
}

/**
 * Rail click: first day → single; second different day → range; click inside range → that day;
 * click same single day again → clear.
 */
export function nextCatalogDateRailSelection(
  current: { from?: string; to?: string },
  clickedIso: string,
): { from?: string; to?: string } {
  const from = current.from;
  const to = current.to || current.from;

  if (!from || !to) {
    return { from: clickedIso, to: clickedIso };
  }

  const single = from === to;

  if (!single && clickedIso >= from && clickedIso <= to) {
    return { from: clickedIso, to: clickedIso };
  }

  if (single && clickedIso === from) {
    return {};
  }

  if (single) {
    return clickedIso < from
      ? { from: clickedIso, to: from }
      : { from, to: clickedIso };
  }

  return { from: clickedIso, to: clickedIso };
}

/** «26 августа» / «26 августа — 3 сентября» for filter chips. */
export function formatCatalogDateRangeLabel(from?: string, to?: string): string | null {
  if (!from) return null;
  const end = to || from;
  const startDate = parseLocalIsoDay(from);
  const endDate = parseLocalIsoDay(end);
  if (!startDate || !endDate) return null;

  const left = `${startDate.getDate()} ${MONTH_LONG[startDate.getMonth()]}`;
  if (from === end) return left;
  const right = `${endDate.getDate()} ${MONTH_LONG[endDate.getMonth()]}`;
  return `${left} — ${right}`;
}
