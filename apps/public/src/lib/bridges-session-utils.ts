import { FLEXIBLE_SCHEDULE_LABEL, isFlexibleScheduleSession, isOpenDate } from '@/lib/event-card-meta';
import {
  parseSessionStartsAt,
  resolveSessionDate,
  resolveSessionTime,
} from '@/lib/datetime';
import { eventHref } from '@/routes';
import type { PublicSession } from '@/types';

export type BridgesScheduleRow = {
  key: string;
  title: string;
  venue: string;
  priceFrom: number | null;
  timeLabel: string;
  dateLabel: string;
  duration: string | null;
  bridgeHint: string | null;
  href: string;
  badges: string[];
  score: number;
};

export type BridgesEventGroup = {
  key: string;
  title: string;
  venue: string;
  tags: string[];
  representative: PublicSession;
  sessions: PublicSession[];
  priceFrom?: number | null;
  firstStartsAt?: string | null;
};

function extractDuration(tags: string[]): string | null {
  return (tags || []).find((tag) => /\d+\s*(мин|ч|час)/i.test(tag)) || null;
}

function extractBridgeHint(title: string, tags: string[]): string | null {
  const fromTitle = title.match(/(\d+)\s*развод/i) || title.match(/(\d+)\s*мост/i);
  if (fromTitle) return `${fromTitle[1]} мостов`;
  const tag = (tags || []).find((item) => /мост/i.test(item));
  return tag || null;
}

function sessionBadges(session: PublicSession): string[] {
  const text = [session.title, ...(session.tags || [])].join(' ').toLowerCase();
  const badges: string[] = [];
  if (/гид|экскурсовод|audio|аудио/i.test(text)) badges.push('С гидом');
  if (/открыт|палуб/i.test(text)) badges.push('Открытая палуба');
  if (/перв/i.test(text) || /дворцов|троиц/i.test(text)) badges.push('Классика');
  if (/пять|5\s*мост|пяти/i.test(text)) badges.push('5 мостов');
  return badges.slice(0, 3);
}

function groupScore(group: BridgesEventGroup): number {
  const price = group.priceFrom ?? 99999;
  const sessions = group.sessions.length;
  const title = group.title.toLowerCase();
  let bonus = 0;
  if (/дворцов|троиц|пять|5\s*мост/i.test(title)) bonus += 40;
  if (/гид|экскурсовод/i.test(title)) bonus += 10;
  return price - sessions * 30 - bonus;
}

export function mapBridgesGroups(groups: BridgesEventGroup[]): BridgesScheduleRow[] {
  return groups.map((group) => {
    const session = group.representative;
    const slot = session.upcomingSlots?.[0];
    const flexible = isFlexibleScheduleSession(session);
    return {
      key: group.key,
      title: group.title,
      venue: group.venue,
      priceFrom: group.priceFrom ?? null,
      timeLabel: flexible ? FLEXIBLE_SCHEDULE_LABEL : resolveSessionTime(session, slot),
      dateLabel: flexible ? '' : resolveSessionDate(session, slot),
      duration: extractDuration(session.tags),
      bridgeHint: extractBridgeHint(group.title, session.tags),
      href: eventHref(session),
      badges: sessionBadges(session),
      score: groupScore(group),
    };
  });
}

export function pickFeaturedBridgesRows(rows: BridgesScheduleRow[], limit = 5): BridgesScheduleRow[] {
  const withTime = rows.filter((row) => row.timeLabel && row.timeLabel !== FLEXIBLE_SCHEDULE_LABEL);
  const byTime = [...withTime].sort((a, b) => a.timeLabel.localeCompare(b.timeLabel));
  const cheapest = [...rows].sort((a, b) => (a.priceFrom ?? 99999) - (b.priceFrom ?? 99999))[0];
  const best = [...rows].sort((a, b) => a.score - b.score)[0];

  const picked = new Map<string, BridgesScheduleRow>();
  for (const row of byTime.slice(0, 3)) picked.set(row.key, row);
  if (cheapest) picked.set(cheapest.key, cheapest);
  if (best) picked.set(best.key, best);

  return [...picked.values()].slice(0, limit);
}

export function pickComparisonRows(rows: BridgesScheduleRow[], limit = 8): BridgesScheduleRow[] {
  return [...rows]
    .sort((a, b) => {
      const ta = a.timeLabel.match(/^\d{2}:\d{2}/)?.[0] || '99:99';
      const tb = b.timeLabel.match(/^\d{2}:\d{2}/)?.[0] || '99:99';
      return ta.localeCompare(tb) || (a.priceFrom ?? 99999) - (b.priceFrom ?? 99999);
    })
    .slice(0, limit);
}

export function filterUpcomingBridgeGroups(groups: BridgesEventGroup[]): BridgesEventGroup[] {
  const now = Date.now();
  return groups.filter((group) => {
    const session = group.representative;
    if (isOpenDate(session)) return true;
    if (!session.startsAt) return false;
    return parseSessionStartsAt(session.startsAt).getTime() >= now - 6 * 60 * 60 * 1000;
  });
}
