'use client';

import * as React from 'react';
import { MapPin, Star } from 'lucide-react';
import { LandingPurchaseButton } from '@/components/landing/LandingPurchaseButton.client';
import { formatMoneyRange } from '@/lib/format';
import { FLEXIBLE_SCHEDULE_LABEL, isFlexibleScheduleSession } from '@/lib/event-card-meta';
import { parseSessionStartsAt, resolveSessionDate, resolveSessionTime } from '@/lib/datetime';
import { eventHref } from '@/lib/routes';
import type { PublicSessionDto } from '@daibilet/contracts/public';

type SortFilter = 'time' | 'price' | 'rating';
export type BusEventGroup = {
  key: string; title: string; sessions: PublicSessionDto[];
  representative: PublicSessionDto; priceFrom: number | null;
  priceTo: number | null; venue: string | null; vacant: number | null;
};

const SORT_FILTERS: Array<{ value: SortFilter; label: string }> = [
  { value: 'price', label: 'По цене' },
  { value: 'rating', label: 'По рейтингу' },
  { value: 'time', label: 'По времени' },
];

function extractDuration(tags: string[]): string | null {
  return (tags || []).find((tag) => /\d+\s*(мин|ч|час)/i.test(tag)) || null;
}
function formatCompactDate(session: PublicSessionDto): string {
  const slot = session.upcomingSlots?.[0];
  const raw = slot?.startsAt || session.startsAt;
  if (!raw) return resolveSessionDate(session, slot);
  const date = parseSessionStartsAt(raw);
  const weekday = new Intl.DateTimeFormat('ru-RU', { weekday: 'short' }).format(date).replace('.', '');
  const dayMonth = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(date).replace('.', '');
  return `${weekday}, ${dayMonth}`;
}
function pickOptimalKey(groups: BusEventGroup[]): string | null {
  if (!groups.length) return null;
  let best = groups[0]; let bestScore = Number.POSITIVE_INFINITY;
  for (const group of groups) {
    const price = group.priceFrom ?? Number.MAX_SAFE_INTEGER;
    const score = price - group.sessions.length * 50;
    if (score < bestScore) { bestScore = score; best = group; }
  }
  return best.key;
}
function BusTourCard({ group, isOptimal }: { group: BusEventGroup; isOptimal: boolean }) {
  const session = group.representative;
  const slot = session.upcomingSlots?.[0];
  const flexible = isFlexibleScheduleSession(session);
  const time = flexible ? FLEXIBLE_SCHEDULE_LABEL : resolveSessionTime(session, slot);
  const duration = extractDuration(session.tags || []);
  const vacant = session.vacant;
  const soldOut = typeof vacant === 'number' && vacant <= 0;
  const href = eventHref(session);
  const buyClass = 'inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90';
  return (
    <article className={`rounded-2xl border bg-white p-4 shadow-sm transition hover:border-primary/25 hover:shadow-md md:p-5 ${isOptimal ? 'border-primary/40 shadow-md' : 'border-slate-200'}`}>
      <div className="grid gap-4 md:grid-cols-[auto_1fr_auto] md:items-center">
        <div className="flex items-center gap-3 md:flex-col md:items-start md:gap-1">
          <div className="text-2xl font-bold tabular-nums text-foreground md:text-3xl">{time}</div>
          {!flexible ? <div className="text-xs text-muted-foreground"><div>{formatCompactDate(session)}</div>{duration ? <div className="mt-0.5">{duration}</div> : null}</div> : duration ? <div className="text-xs text-muted-foreground">{duration}</div> : null}
        </div>
        <div className="min-w-0">
          {isOptimal ? <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-primary"><Star className="h-3 w-3 fill-current" /> Оптимальный выбор</div> : null}
          <h3 className="text-base font-semibold leading-snug text-foreground md:text-lg"><a href={href} className="hover:text-primary">{group.title}</a></h3>
          {group.venue ? <div className="mt-1.5 flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="h-3.5 w-3.5 shrink-0" />{group.venue}</div> : null}
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-border/60 pt-3 md:flex-col md:items-end md:border-none md:pt-0">
          <div className="text-right">
            <div className="text-lg font-semibold tabular-nums text-foreground md:text-xl">{formatMoneyRange(group.priceFrom, group.priceTo)}</div>
            {typeof vacant === 'number' && !soldOut ? <div className="mt-0.5 text-xs text-muted-foreground">Свободно {vacant} мест</div> : null}
          </div>
          {soldOut ? <button type="button" disabled className="inline-flex cursor-not-allowed items-center rounded-lg bg-muted px-5 py-2.5 text-sm font-semibold text-muted-foreground">Распродано</button> : <LandingPurchaseButton session={session} label="Выбрать" className={buyClass} showArrow />}
        </div>
      </div>
    </article>
  );
}
export function BusScheduleSection({ groups }: { groups: BusEventGroup[]; sort?: SortFilter; setSort?: (value: SortFilter) => void }) {
  const optimalKey = pickOptimalKey(groups);
  return (
    <div className="space-y-3">
      {groups.map((group) => <BusTourCard key={group.key} group={group} isOptimal={group.key === optimalKey} />)}
    </div>
  );
}
