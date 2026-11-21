import { resolveSessionTime } from '@/lib/datetime';

type TimeChipSlotLike = { startsAt?: string | null; timeLabel?: string | null };
type TimeChipSessionLike = {
  startsAt?: string | null;
  timeLabel?: string | null;
  upcomingSlots?: ReadonlyArray<TimeChipSlotLike> | null;
};

export type ScheduleTimeChip = { key: string; label: string };

const MAX_TIME_CHIPS = 8;

function chipMinutes(label: string): number | null {
  const match = /^(\d{1,2}):(\d{2})/.exec(label);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function normalizeTimeChipLabel(label: string): string {
  return label.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Time-of-day chips for landing schedule rows («Ближайшие сеансы»).
 *
 * The row renders clock times only, so the same time coming from different
 * dates (or duplicate session copies) is a copy of one slot, not a new one:
 * dedupe by normalized time label and keep slots with different times.
 * Chips are ordered ascending by HH:mm; labels without a clock time go last.
 */
export function collectScheduleTimeChips(
  sessions: readonly TimeChipSessionLike[],
): ScheduleTimeChip[] {
  const byLabel = new Map<string, { key: string; label: string; minutes: number | null; order: number }>();
  for (const item of sessions) {
    const slots =
      item.upcomingSlots && item.upcomingSlots.length
        ? item.upcomingSlots
        : item.timeLabel || item.startsAt
          ? [{ startsAt: item.startsAt, timeLabel: item.timeLabel }]
          : [];
    for (const slot of slots) {
      const label = normalizeTimeChipLabel(String(slot.timeLabel || resolveSessionTime(item, slot) || ''));
      if (!label || byLabel.has(label)) continue;
      byLabel.set(label, { key: label, label, minutes: chipMinutes(label), order: byLabel.size });
    }
  }
  return [...byLabel.values()]
    .sort((a, b) => {
      if (a.minutes === null && b.minutes === null) return a.order - b.order;
      if (a.minutes === null) return 1;
      if (b.minutes === null) return -1;
      if (a.minutes !== b.minutes) return a.minutes - b.minutes;
      return a.order - b.order;
    })
    .slice(0, MAX_TIME_CHIPS)
    .map(({ key, label }) => ({ key, label }));
}