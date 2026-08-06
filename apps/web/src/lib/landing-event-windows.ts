import { canonicalLandingSlug } from '@/lib/landing-constants';
import { SITE_TIME_ZONE } from '@/lib/datetime';

export type LandingEventWindow = {
  /** Inclusive start (local calendar day). */
  start: Date;
  /** Inclusive end (local calendar day). */
  end: Date;
  /** Short label for UI chips / titles, e.g. «9 мая». */
  label: string;
  /** True when the window is a single calendar day. */
  singleDay: boolean;
};

type MonthDay = { month: number; day: number };

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function atLocalDay(year: number, monthIndex: number, day: number): Date {
  return new Date(year, monthIndex, day);
}

function formatRuDayMonth(date: Date, timeZone = SITE_TIME_ZONE): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    timeZone,
  }).format(date);
}

function formatRuRangeLabel(start: Date, end: Date, timeZone = SITE_TIME_ZONE): string {
  if (startOfLocalDay(start).getTime() === startOfLocalDay(end).getTime()) {
    return formatRuDayMonth(start, timeZone);
  }
  const sameMonth =
    start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  if (sameMonth) {
    const dayStart = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', timeZone }).format(start);
    const dayEnd = formatRuDayMonth(end, timeZone);
    return `${dayStart}-${dayEnd}`;
  }
  return `${formatRuDayMonth(start, timeZone)} - ${formatRuDayMonth(end, timeZone)}`;
}

/** First Saturday of September (Moscow City Day convention). */
export function resolveMoscowCityDaySaturday(from = new Date()): Date {
  const year = from.getFullYear();
  const candidates = [year, year + 1].map((y) => {
    const first = atLocalDay(y, 8, 1);
    const dow = first.getDay(); // 0 Sun … 6 Sat
    const delta = (6 - dow + 7) % 7;
    return atLocalDay(y, 8, 1 + delta);
  });
  const today = startOfLocalDay(from).getTime();
  return candidates.find((d) => startOfLocalDay(d).getTime() >= today) || candidates[candidates.length - 1]!;
}

/**
 * Cross-year New Year window: 24 Dec – 14 Jan.
 * If `from` is after 14 Jan, returns next season (Dec this year → Jan next).
 */
export function resolveNewYearEventWindow(from = new Date()): LandingEventWindow {
  const y = from.getFullYear();
  const m = from.getMonth();
  const d = from.getDate();
  // Jan 1–14 → window started previous Dec 24
  if (m === 0 && d <= 14) {
    const start = atLocalDay(y - 1, 11, 24);
    const end = atLocalDay(y, 0, 14);
    return {
      start,
      end,
      label: formatRuRangeLabel(start, end),
      singleDay: false,
    };
  }
  // Before Dec 24 → upcoming season this year
  const start = atLocalDay(y, 11, 24);
  const end = atLocalDay(y + 1, 0, 14);
  // After Jan 14 and before Dec 24: still point at upcoming Dec–Jan
  if (m < 11 || (m === 11 && d < 24)) {
    return {
      start,
      end,
      label: formatRuRangeLabel(start, end),
      singleDay: false,
    };
  }
  // Dec 24–31
  return {
    start,
    end,
    label: formatRuRangeLabel(start, end),
    singleDay: false,
  };
}

export function resolveSaluteMay9Window(from = new Date()): LandingEventWindow {
  const thisYear = atLocalDay(from.getFullYear(), 4, 9);
  const start =
    startOfLocalDay(from).getTime() <= thisYear.getTime()
      ? thisYear
      : atLocalDay(from.getFullYear() + 1, 4, 9);
  return {
    start,
    end: start,
    label: formatRuDayMonth(start),
    singleDay: true,
  };
}

/** Valentine: 14 Feb ± 5 days → 9–19 Feb. */
export function resolveValentineWindow(from = new Date()): LandingEventWindow {
  const y = from.getFullYear();
  const thisStart = atLocalDay(y, 1, 9);
  const thisEnd = atLocalDay(y, 1, 19);
  const today = startOfLocalDay(from).getTime();
  if (today <= thisEnd.getTime()) {
    return {
      start: thisStart,
      end: thisEnd,
      label: formatRuRangeLabel(thisStart, thisEnd),
      singleDay: false,
    };
  }
  const start = atLocalDay(y + 1, 1, 9);
  const end = atLocalDay(y + 1, 1, 19);
  return {
    start,
    end,
    label: formatRuRangeLabel(start, end),
    singleDay: false,
  };
}

/** Moscow City Day: first Saturday of September ±1 day (Fri–Sun festival). */
export function resolveMoscowCityDayWindow(from = new Date()): LandingEventWindow {
  const saturday = resolveMoscowCityDaySaturday(from);
  const start = atLocalDay(saturday.getFullYear(), saturday.getMonth(), saturday.getDate() - 1);
  const end = atLocalDay(saturday.getFullYear(), saturday.getMonth(), saturday.getDate() + 1);
  return {
    start,
    end,
    label: formatRuRangeLabel(start, end),
    singleDay: false,
  };
}

function slugKey(slug: string): string {
  return canonicalLandingSlug(slug);
}

/**
 * Calendar window for holiday/seasonal landings.
 * Returns null for evergreen category landings (no date binding).
 */
export function resolveLandingEventWindow(
  landingSlug: string,
  from = new Date(),
): LandingEventWindow | null {
  const key = slugKey(landingSlug);
  if (key === 'salute-9-may' || key.includes('salute') || key.includes('9-may') || key.includes('9-maya')) {
    return resolveSaluteMay9Window(from);
  }
  if (key === 'new-year' || key.includes('new-year') || key.includes('novyj-god')) {
    return resolveNewYearEventWindow(from);
  }
  if (
    key === 'moscow-city-day' ||
    key.includes('city-day') ||
    key.includes('den-goroda')
  ) {
    return resolveMoscowCityDayWindow(from);
  }
  if (
    key.includes('valentine') ||
    key.includes('valentines') ||
    key.includes('vlyublen') ||
    key.includes('14-feb') ||
    key.includes('den-vlyublennyh')
  ) {
    return resolveValentineWindow(from);
  }
  return null;
}

export function isDateInsideLandingWindow(
  date: Date,
  window: LandingEventWindow,
): boolean {
  const t = startOfLocalDay(date).getTime();
  return t >= startOfLocalDay(window.start).getTime() && t <= startOfLocalDay(window.end).getTime();
}

export function isSessionInsideLandingWindow(
  startsAt: string | Date | null | undefined,
  window: LandingEventWindow | null,
  timeZone: string = SITE_TIME_ZONE,
): boolean {
  if (!window) return true;
  if (startsAt == null || startsAt === '') return false;
  const raw = typeof startsAt === 'string' ? startsAt : startsAt.toISOString();
  // Interpret session instant in site TZ calendar day
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(raw));
  const y = Number(parts.find((p) => p.type === 'year')?.value);
  const m = Number(parts.find((p) => p.type === 'month')?.value);
  const d = Number(parts.find((p) => p.type === 'day')?.value);
  if (!y || !m || !d) return false;
  return isDateInsideLandingWindow(new Date(y, m - 1, d), window);
}

/** SEO/UI date phrase: use window label when today is outside the holiday window. */
export function resolveLandingTitleDateShort(
  landingSlug: string,
  referenceDate: Date = new Date(),
  timeZone: string = SITE_TIME_ZONE,
): { short: string; useTodayWord: boolean; window: LandingEventWindow | null } {
  const window = resolveLandingEventWindow(landingSlug, referenceDate);
  if (!window) {
    const short = new Intl.DateTimeFormat('ru-RU', {
      day: 'numeric',
      month: 'long',
      timeZone,
    }).format(referenceDate);
    return { short, useTodayWord: true, window: null };
  }
  if (isDateInsideLandingWindow(referenceDate, window)) {
    return {
      short: formatRuDayMonth(referenceDate, timeZone),
      useTodayWord: true,
      window,
    };
  }
  return {
    short: window.label,
    useTodayWord: false,
    window,
  };
}

/** Enumerate local calendar days in the window (cap for UI chips). */
export function listLandingWindowDays(
  window: LandingEventWindow,
  maxDays = 31,
): Date[] {
  const days: Date[] = [];
  let cursor = startOfLocalDay(window.start);
  const end = startOfLocalDay(window.end).getTime();
  while (cursor.getTime() <= end && days.length < maxDays) {
    days.push(new Date(cursor));
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1);
  }
  return days;
}

/** @internal helper for tests / future month-day configs */
export function monthDay(month: number, day: number): MonthDay {
  return { month, day };
}
