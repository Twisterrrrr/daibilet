import {
  compareSessionsByStartsAt,
  expandSessionPurchaseVariants,
  isSessionPurchaseBlocked,
  listPurchasableSessionVariants,
  pickPurchasableTcSession,
  pickRepresentativeSession,
} from '@/lib/event-purchase';
import type { PublicSessionDto } from '@daibilet/contracts/public';

/**
 * Venue playbill rows = catalog sessions on the page, not TC upcomingSlots siblings.
 * Expanding slots invents ghost evenings (e.g. Syutkin 21:00) that are not venue sessions.
 */
function listVenuePlaybillCatalogSessions(
  sessions: PublicSessionDto[],
): PublicSessionDto[] {
  return [...sessions]
    .filter((session) => !isSessionPurchaseBlocked(session))
    .sort(compareSessionsByStartsAt);
}

/** `'all'` or local calendar day `YYYY-MM-DD`. */
export type VenueDateFilter = 'all' | (string & {});

/** `'all'` or local calendar month `YYYY-MM` (venue playbill rail). */
export type VenueMonthFilter = 'all' | (string & {});

export type VenueDateRailChip =
  | { kind: 'all'; label: string; shortLabel: string }
  | { kind: 'day'; iso: string; weekday: string; dayNum: string; label: string };

export type VenueMonthRailChip =
  | { kind: 'all'; label: string; shortLabel: string }
  | { kind: 'month'; iso: string; label: string; shortLabel: string };

export type VenueEventGroup = {
  key: string;
  title: string;
  category: string;
  tags: string[];
  representative: PublicSessionDto;
  sessions: PublicSessionDto[];
  visibleSlots: PublicSessionDto[];
  priceFrom?: number | null;
  vacant?: number | null;
  firstStartsAt?: string | null;
  hasSlotsOnSelectedDate: boolean;
};

const WEEKDAY_SHORT = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'] as const;

export function buildVenueDateOptions(sessions: PublicSessionDto[]) {
  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);
  const todayKey = dateKey(today);
  const tomorrowKey = dateKey(tomorrow);
  const keys = sessions
    .flatMap((session) => expandSessionPurchaseVariants(session))
    .map((session) => sessionDateKey(session))
    .filter((key): key is string => Boolean(key))
    .sort();
  const uniqueKeys = Array.from(new Set(keys));
  const availableDates = uniqueKeys.filter((key) => key >= todayKey);
  const futureKey = availableDates[0] || uniqueKeys[0] || null;
  const smartDate = uniqueKeys.includes(todayKey)
    ? todayKey
    : uniqueKeys.includes(tomorrowKey)
      ? tomorrowKey
      : futureKey;

  return {
    todayKey,
    tomorrowKey,
    smartDate,
    hasToday: uniqueKeys.includes(todayKey),
    hasTomorrow: uniqueKeys.includes(tomorrowKey),
    /** Upcoming (incl. today) days that actually have purchasable departures. */
    availableDates,
    allAvailableDates: uniqueKeys,
  };
}

/** Compact rail chips: optional «Любая» + days with tickets (catalog-date-chip shape). */
export function buildVenueDateRailChips(
  availableDates: string[],
  options?: { includeAll?: boolean; maxDays?: number },
): VenueDateRailChip[] {
  const includeAll = options?.includeAll !== false;
  const maxDays = options?.maxDays ?? 21;
  const chips: VenueDateRailChip[] = [];
  if (includeAll) {
    chips.push({ kind: 'all', label: 'Любая дата', shortLabel: 'Любая' });
  }
  for (const iso of availableDates.slice(0, maxDays)) {
    const date = new Date(`${iso}T12:00:00`);
    if (!Number.isFinite(date.getTime())) continue;
    const weekday = WEEKDAY_SHORT[date.getDay()] || '';
    const dayNum = String(date.getDate());
    chips.push({
      kind: 'day',
      iso,
      weekday,
      dayNum,
      label: `${weekday} ${dayNum}`,
    });
  }
  return chips;
}

const MONTH_LABELS_RU = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
] as const;

/** Unique `YYYY-MM` keys from day ISO list, chronological. */
export function buildVenueAvailableMonths(availableDates: string[]): string[] {
  const months: string[] = [];
  const seen = new Set<string>();
  for (const iso of availableDates) {
    const month = iso.slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(month) || seen.has(month)) continue;
    seen.add(month);
    months.push(month);
  }
  return months;
}

/**
 * Default month for venue playbill: current calendar month if it has tickets,
 * else the nearest upcoming month with tickets.
 */
export function resolveVenueSmartMonth(availableMonths: string[], now = new Date()): string | null {
  if (!availableMonths.length) return null;
  const current = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  if (availableMonths.includes(current)) return current;
  const upcoming = availableMonths.find((month) => month >= current);
  return upcoming || availableMonths[0] || null;
}

/** Month chips for venue playbill (not used on /events). */
export function buildVenueMonthRailChips(
  availableMonths: string[],
  options?: { includeAll?: boolean },
): VenueMonthRailChip[] {
  const includeAll = options?.includeAll === true;
  const chips: VenueMonthRailChip[] = [];
  if (includeAll) {
    chips.push({ kind: 'all', label: 'Любой месяц', shortLabel: 'Любой' });
  }
  for (const iso of availableMonths) {
    const [y, m] = iso.split('-').map(Number);
    if (!y || !m) continue;
    const label = MONTH_LABELS_RU[m - 1] || iso;
    chips.push({
      kind: 'month',
      iso,
      label,
      shortLabel: label,
    });
  }
  return chips;
}

export function sessionMonthKey(session: Pick<PublicSessionDto, 'startsAt'>): string | null {
  const date = new Date(session.startsAt || '');
  if (!Number.isFinite(date.getTime())) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function nextMonthKey(monthKey: string): string | null {
  const match = /^(\d{4})-(\d{2})$/.exec(monthKey);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!year || !month) return null;
  const next = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };
  return `${next.y}-${String(next.m).padStart(2, '0')}`;
}

function applyMonthFilterToGroup(group: VenueEventGroup, monthKey: string): VenueEventGroup {
  const variants = listVenuePlaybillCatalogSessions(group.sessions);
  const matchingSlots = variants.filter((session) => sessionMonthKey(session) === monthKey);
  if (matchingSlots.length) {
    const representative = pickPurchasableTcSession(matchingSlots) || matchingSlots[0]!;
    return {
      ...group,
      representative,
      // One playbill row per catalog session (distinct TC events already on the venue page).
      visibleSlots: matchingSlots,
      firstStartsAt: representative.startsAt,
      hasSlotsOnSelectedDate: true,
    };
  }
  return {
    ...group,
    visibleSlots: [],
    hasSlotsOnSelectedDate: false,
  };
}

export type VenuePlaybillEntry = {
  key: string;
  title: string;
  category: string;
  session: PublicSessionDto;
};

/** Flatten grouped program into one playbill row per catalog session. */
export function expandVenuePlaybillEntries(groups: VenueEventGroup[]): VenuePlaybillEntry[] {
  const entries: VenuePlaybillEntry[] = [];
  const seen = new Set<string>();

  for (const group of groups) {
    const slots =
      group.visibleSlots.length > 0
        ? group.visibleSlots
        : listVenuePlaybillCatalogSessions(group.sessions);
    const list = slots.length ? slots : [group.representative];
    for (const session of list) {
      const dedupe = `${session.id}|${session.startsAt || ''}|${String(session.timeLabel || '').trim()}`;
      if (seen.has(dedupe)) continue;
      seen.add(dedupe);
      entries.push({
        key: `${group.key}:${dedupe}`,
        title: group.title || session.title || session.eventTitle || '',
        category: group.category || session.category || '',
        session,
      });
    }
  }

  return entries.sort(
    (a, b) =>
      new Date(a.session.startsAt || 0).getTime() - new Date(b.session.startsAt || 0).getTime(),
  );
}

/**
 * Month playbill: events of selected month; if fewer than `minPrimary`,
 * append the next month's events as spillover (separate section in UI).
 */
export function buildVenueProgramMonthView(
  sessions: PublicSessionDto[],
  monthFilter: VenueMonthFilter,
  options?: { minPrimary?: number },
): {
  primaryMonth: string | null;
  spilloverMonth: string | null;
  primary: VenueEventGroup[];
  spillover: VenueEventGroup[];
} {
  const minPrimary = options?.minPrimary ?? 5;
  const allGroups = groupVenueSessions(sessions);

  if (monthFilter === 'all') {
    return {
      primaryMonth: null,
      spilloverMonth: null,
      primary: allGroups.map((group) => applyDateFilterToGroup(group, null)),
      spillover: [],
    };
  }

  const primary = allGroups
    .map((group) => applyMonthFilterToGroup(group, monthFilter))
    .filter((group) => group.hasSlotsOnSelectedDate);

  let spillover: VenueEventGroup[] = [];
  let spilloverMonth: string | null = null;
  if (primary.length < minPrimary) {
    spilloverMonth = nextMonthKey(monthFilter);
    if (spilloverMonth) {
      spillover = allGroups
        .map((group) => applyMonthFilterToGroup(group, spilloverMonth!))
        .filter((group) => group.hasSlotsOnSelectedDate);
    }
  }

  return {
    primaryMonth: monthFilter,
    spilloverMonth: spillover.length ? spilloverMonth : null,
    primary,
    spillover,
  };
}

export function formatVenueMonthLabel(monthKey: string | null | undefined): string {
  if (!monthKey || !/^\d{4}-\d{2}$/.test(monthKey)) return '';
  const m = Number(monthKey.slice(5, 7));
  return MONTH_LABELS_RU[m - 1] || monthKey;
}

export function buildVenueProgramGroups(
  sessions: PublicSessionDto[],
  dateFilter: VenueDateFilter,
  smartDate: string | null,
): VenueEventGroup[] {
  const allGroups = groupVenueSessions(sessions);
  if (dateFilter === 'all') {
    return allGroups.map((group) => applyDateFilterToGroup(group, null));
  }

  const target = /^\d{4}-\d{2}-\d{2}$/.test(dateFilter) ? dateFilter : smartDate;
  return allGroups.map((group) => applyDateFilterToGroup(group, target));
}

export function countVisibleVenueSlots(groups: VenueEventGroup[]): number {
  return groups.reduce((total, group) => total + group.visibleSlots.length, 0);
}

function groupVenueSessions(sessions: PublicSessionDto[]): VenueEventGroup[] {
  const groups = new Map<string, PublicSessionDto[]>();

  for (const session of sessions) {
    const key = session.groupKey || [session.title, session.category, session.venue].map(normalizeKey).join('|');
    const list = groups.get(key) || [];
    list.push(session);
    groups.set(key, list);
  }

  return Array.from(groups.entries())
    .map(([key, groupSessions]) => {
      const variants = listVenuePlaybillCatalogSessions(groupSessions);
      const representative =
        pickPurchasableTcSession(groupSessions) ||
        pickRepresentativeSession(groupSessions) ||
        groupSessions[0];
      const prices = variants.map((session) => session.priceFrom).filter((price): price is number => Number.isFinite(price));
      const vacantValues = variants.map((session) => session.vacant).filter((vacant): vacant is number => Number.isFinite(vacant));

      return {
        key,
        title: representative.title,
        category: representative.category,
        tags: representative.tags || [],
        representative,
        sessions: groupSessions,
        visibleSlots: variants,
        priceFrom: prices.length ? Math.min(...prices) : null,
        vacant: Number.isFinite(representative.vacant) ? representative.vacant : vacantValues.length ? Math.min(...vacantValues) : null,
        firstStartsAt: representative.startsAt,
        hasSlotsOnSelectedDate: true,
      };
    })
    .sort((a, b) => new Date(a.firstStartsAt || 0).getTime() - new Date(b.firstStartsAt || 0).getTime());
}

function applyDateFilterToGroup(group: VenueEventGroup, targetDate: string | null): VenueEventGroup {
  // Day rail (piers / multi-departure): still expand upcomingSlots on the same event.
  const variants = listPurchasableSessionVariants(group.sessions);

  if (!targetDate) {
    const representative = pickRepresentativeSession(group.sessions) || group.representative;
    return {
      ...group,
      representative,
      visibleSlots: variants,
      firstStartsAt: representative.startsAt,
      hasSlotsOnSelectedDate: true,
    };
  }

  const matchingSlots = variants.filter((session) => sessionDateKey(session) === targetDate);
  if (matchingSlots.length) {
    const representative = pickPurchasableTcSession(matchingSlots) || matchingSlots[0]!;
    return {
      ...group,
      representative,
      visibleSlots: matchingSlots,
      firstStartsAt: representative.startsAt,
      hasSlotsOnSelectedDate: true,
    };
  }

  const fallback = pickRepresentativeSession(group.sessions) || group.representative;
  const nextVariants = variants.filter((session) => {
    const key = sessionDateKey(session);
    return key && key >= targetDate;
  });
  const nextSlot = nextVariants[0] || fallback;

  return {
    ...group,
    representative: nextSlot,
    visibleSlots: nextVariants.length ? nextVariants : variants.slice(0, 1),
    firstStartsAt: nextSlot.startsAt,
    hasSlotsOnSelectedDate: false,
  };
}

function sessionDateKey(session: Pick<PublicSessionDto, 'startsAt'>) {
  const date = new Date(session.startsAt || '');
  if (!Number.isFinite(date.getTime())) return null;
  return dateKey(startOfDay(date));
}

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function normalizeKey(value: string) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

export function formatShortDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(date);
}

export function formatHumanDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', weekday: 'short' }).format(date);
}
