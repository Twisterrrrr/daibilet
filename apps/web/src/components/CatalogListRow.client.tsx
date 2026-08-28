'use client';

import Link from 'next/link';

import type { PublicCatalogListItemDto } from '@daibilet/contracts/public';
import { trackProductCardClick } from '@/lib/catalog-analytics';
import {
  formatShowcasePriceLabel,
  isOpenDate,
  MIN_DISPLAY_PRICE_RUB,
  resolveSessionTimeZoneForSession,
} from '@/lib/event-card-meta';
import { formatSessionTime, parseSessionStartsAt } from '@/lib/datetime';
import { eventHref } from '@/lib/routes';

function formatListRowSchedule(session: PublicCatalogListItemDto): string {
  if (isOpenDate(session)) return 'Открытая дата';
  const timeZone = resolveSessionTimeZoneForSession(session);
  const d = parseSessionStartsAt(session.startsAt);
  if (Number.isNaN(d.getTime())) {
    return [session.dateLabel, session.timeLabel].filter(Boolean).join(', ') || 'Дата уточняется';
  }
  const dayMonth = new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    timeZone,
  }).format(d);
  const time = formatSessionTime(session.startsAt, session.timeLabel, timeZone);
  const venue = String(session.venue || '').trim();
  const schedule = time && time !== '—' ? `${dayMonth}, ${time}` : dayMonth;
  return venue ? `${schedule} · ${venue}` : schedule;
}

/** Compact list row (Lovable mobile «в линию»). */
export function CatalogListRow({ session }: { session: PublicCatalogListItemDto }) {
  const href = eventHref(session);
  const price =
    typeof session.priceFrom === 'number' && session.priceFrom >= MIN_DISPLAY_PRICE_RUB
      ? formatShowcasePriceLabel(session.priceFrom, session.priceTo)
      : null;

  return (
    <Link
      href={href}
      onClick={() => trackProductCardClick({ eventId: session.id, source: 'catalog-list-row' })}
      className="group flex items-start justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-3.5 transition hover:border-primary/25 hover:bg-slate-50/80"
    >
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 font-display text-[15px] font-bold leading-snug text-graphite group-hover:text-primary-700">
          {session.title}
        </p>
        <p className="mt-1 line-clamp-2 text-xs leading-snug text-graphite-muted">{formatListRowSchedule(session)}</p>
      </div>
      {price ? (
        <p className="shrink-0 pt-0.5 text-sm font-bold tabular-nums text-primary-700">{price}</p>
      ) : null}
    </Link>
  );
}
