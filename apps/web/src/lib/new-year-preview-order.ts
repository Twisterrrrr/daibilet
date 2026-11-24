export type NewYearPreviewOrder = 'date' | 'price' | 'price-desc';

export type NewYearPreviewOrderItem = {
  id: string;
  groupKey?: string | null;
  eventPageSlug?: string | null;
  city?: string | null;
  title?: string | null;
  priceFrom?: number | null;
  upcomingSlots?: Array<{ startsAt?: string | null }>;
};

export function newYearPreviewEventKey(event: NewYearPreviewOrderItem): string {
  return event.groupKey || [event.eventPageSlug || '', event.id, event.city || '', event.title || '', event.upcomingSlots?.[0]?.startsAt || ''].join(':');
}

function eventTime(event: NewYearPreviewOrderItem): number {
  const value = event.upcomingSlots?.[0]?.startsAt;
  if (!value) return Number.MAX_SAFE_INTEGER;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : Number.MAX_SAFE_INTEGER;
}

function compareStableKey(a: NewYearPreviewOrderItem, b: NewYearPreviewOrderItem): number {
  const left = newYearPreviewEventKey(a);
  const right = newYearPreviewEventKey(b);
  return left < right ? -1 : left > right ? 1 : 0;
}

export function sortNewYearPreviewEvents<T extends NewYearPreviewOrderItem>(events: T[], sort: NewYearPreviewOrder = 'date'): T[] {
  return [...events].sort((a, b) => {
    if (sort === 'price' || sort === 'price-desc') {
      const left = typeof a.priceFrom === 'number' ? a.priceFrom : null;
      const right = typeof b.priceFrom === 'number' ? b.priceFrom : null;
      if (left !== right) {
        if (left === null) return 1;
        if (right === null) return -1;
        return sort === 'price' ? left - right : right - left;
      }
    }
    const byDate = eventTime(a) - eventTime(b);
    return byDate || compareStableKey(a, b);
  });
}

export function appendUniqueNewYearPreviewEvents<T extends NewYearPreviewOrderItem>(current: T[], next: T[]): T[] {
  const seen = new Set(current.map(newYearPreviewEventKey));
  const appended = next.filter((event) => {
    const key = newYearPreviewEventKey(event);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return [...current, ...appended];
}

export function getNewYearPreviewPage<T>(items: T[], total: number, offset: number, limit: number) {
  const safeOffset = Math.max(0, Math.min(Math.trunc(offset), total));
  const pageItems = items.slice(safeOffset, safeOffset + limit);
  const nextOffset = safeOffset + pageItems.length;
  return {
    items: pageItems,
    total,
    offset: safeOffset,
    nextOffset,
    limit,
    hasMore: nextOffset < total,
  };
}
