import {
  expandSessionPurchaseVariants,
  listPurchasableSessionVariants,
  pickPurchasableTcSession,
  pickRepresentativeSession,
} from '@/lib/event-purchase';
import type { PublicSessionDto } from '@daibilet/contracts/public';

/** `'all'` or local calendar day `YYYY-MM-DD`. */
export type VenueDateFilter = 'all' | (string & {});

export type VenueDateRailChip =
  | { kind: 'all'; label: string; shortLabel: string }
  | { kind: 'day'; iso: string; weekday: string; dayNum: string; label: string };

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
      const variants = listPurchasableSessionVariants(groupSessions);
      const representative = pickRepresentativeSession(groupSessions) || groupSessions[0];
      const prices = variants.map((session) => session.priceFrom).filter((price): price is number => Number.isFinite(price));
      const vacantValues = variants.map((session) => session.vacant).filter((vacant): vacant is number => Number.isFinite(vacant));

      return {
        key,
        title: representative.title,
        category: representative.category,
        tags: representative.tags || [],
        representative,
        sessions: groupSessions,
        visibleSlots: variants.slice(0, 4),
        priceFrom: prices.length ? Math.min(...prices) : null,
        vacant: Number.isFinite(representative.vacant) ? representative.vacant : vacantValues.length ? Math.min(...vacantValues) : null,
        firstStartsAt: representative.startsAt,
        hasSlotsOnSelectedDate: true,
      };
    })
    .sort((a, b) => new Date(a.firstStartsAt || 0).getTime() - new Date(b.firstStartsAt || 0).getTime());
}

function applyDateFilterToGroup(group: VenueEventGroup, targetDate: string | null): VenueEventGroup {
  const variants = listPurchasableSessionVariants(group.sessions);

  if (!targetDate) {
    const representative = pickRepresentativeSession(group.sessions) || group.representative;
    return {
      ...group,
      representative,
      visibleSlots: variants.slice(0, 4),
      firstStartsAt: representative.startsAt,
      hasSlotsOnSelectedDate: true,
    };
  }

  const matchingSlots = variants.filter((session) => sessionDateKey(session) === targetDate);
  if (matchingSlots.length) {
    const representative = pickPurchasableTcSession(matchingSlots) || matchingSlots[0];
    return {
      ...group,
      representative,
      visibleSlots: matchingSlots.slice(0, 4),
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
    visibleSlots: nextVariants.length ? nextVariants.slice(0, 4) : variants.slice(0, 1),
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
