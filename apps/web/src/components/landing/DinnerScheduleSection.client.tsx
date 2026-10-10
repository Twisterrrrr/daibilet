'use client';

import * as React from 'react';
import { Clock, MapPin, Ship, Star, Users } from 'lucide-react';
import { LandingPurchaseButton } from '@/components/landing/LandingPurchaseButton.client';
import { LandingEmptyState } from '@/components/landing/LandingEmptyState.client';
import { LandingCardBadgeRow } from '@/components/landing/LandingCardBadgeRow';
import { formatMoneyRange } from '@/lib/format';
import { resolveSessionTime } from '@/lib/datetime';
import { eventHref } from '@/lib/routes';
import { deriveLandingCardBadges } from '@/lib/landing-card-badges';
import type { PublicSessionDto } from '@daibilet/contracts/public';

export type DinnerEventGroup = {
  key: string; title: string; sessions: PublicSessionDto[];
  representative: PublicSessionDto; priceFrom: number | null;
  priceTo: number | null; venue: string | null; vacant: number | null;
};

import { extractMenuLabel, extractFormatLabel, dinnerScheduleGridClass } from '@/lib/dinner-helpers';
import { formatShipSecondaryLabel, resolveCruiseDisplayTitle } from '@/lib/cruise-display-title';
import { formatLandingBuyPrice } from '@/lib/format';
import { resolveEventCardLocationLabel } from '@/lib/event-location';

const MIN_DISPLAY_PRICE_RUB = 100;

function DinnerRow({ group, isOptimal, showMenuColumn, showFormatColumn }: {
  group: DinnerEventGroup; isOptimal: boolean; showMenuColumn: boolean; showFormatColumn: boolean;
}) {
  const session = group.representative;
  const slot = session.upcomingSlots?.[0];
  const time = resolveSessionTime(session, slot);
  const cruise = resolveCruiseDisplayTitle({ title: group.title, tags: session.tags });
  const shipName = formatShipSecondaryLabel(cruise.shipName);
  const displayTitle = cruise.excursionTitle;
  const menu = extractMenuLabel(session);
  const format = extractFormatLabel(session.tags);
  const badges = deriveLandingCardBadges(session);
  const href = eventHref(session);
  const priceLabel = typeof group.priceFrom === 'number' && group.priceFrom >= MIN_DISPLAY_PRICE_RUB
    ? formatLandingBuyPrice(group.priceFrom, group.priceTo) : 'Купить';
  const vacant = session.vacant ?? group.vacant;
  const soldOut = typeof vacant === 'number' && vacant <= 0;
  const buyClass = 'inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90';

  return (
    <div className={`grid items-center gap-4 rounded-xl border bg-white px-5 py-3 transition hover:border-primary/25 ${dinnerScheduleGridClass(showMenuColumn, showFormatColumn)} ${isOptimal ? 'border-primary/40 shadow-md' : 'border-slate-200'}`}>
      <div className="min-w-0">
        <a href={href} className="text-sm font-semibold leading-tight text-foreground hover:text-primary">{displayTitle}</a>
        {shipName ? <p className="mt-0.5 text-xs text-muted-foreground">{shipName}</p> : null}
        <LandingCardBadgeRow badges={badges} />
      </div>
      {showMenuColumn ? <span className="text-xs text-muted-foreground">{menu || '—'}</span> : null}
      <span className="text-sm font-semibold tabular-nums text-foreground">{priceLabel}</span>
      <span className="text-sm text-muted-foreground">{time}</span>
      {showFormatColumn ? <span className="text-xs text-muted-foreground">{format}</span> : null}
      <div className="flex items-center justify-end gap-2">
        {typeof vacant === 'number' && !soldOut ? (
          <span className="text-xs text-muted-foreground"><Users className="inline h-3 w-3" /> {vacant}</span>
        ) : null}
        {soldOut ? (
          <button type="button" disabled className="rounded-lg bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground">Распродано</button>
        ) : (
          <LandingPurchaseButton session={session} label="Купить" className={buyClass} />
        )}
      </div>
    </div>
  );
}

export function DinnerScheduleSection({ groups, emptyKind = 'filtered', cityName, onReset }: {
  groups: DinnerEventGroup[];
  emptyKind?: 'zero' | 'filtered';
  cityName?: string | null;
  onReset?: () => void;
}) {
  if (!groups.length) {
    return <LandingEmptyState kind={emptyKind} cityName={cityName} onReset={onReset} />;
  }
  const menuHits = groups.filter((g) => extractMenuLabel(g.representative)).length;
  const showMenuColumn = menuHits >= Math.max(1, Math.ceil(groups.length / 2));
  const formatLabels = groups.map((g) => extractFormatLabel(g.representative.tags));
  const showFormatColumn = formatLabels.some((f) => f !== 'Стандарт');
  const desktopGrid = dinnerScheduleGridClass(showMenuColumn, showFormatColumn);

  return (
    <>
      <div className={`mb-2 hidden items-center gap-4 px-5 py-2 md:grid ${desktopGrid}`}>
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Прогулка</span>
        {showMenuColumn ? <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Меню</span> : null}
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Цена</span>
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Время</span>
        {showFormatColumn ? <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Формат</span> : null}
        <span />
      </div>
      <div className="space-y-2">
        {groups.map((group, index) => (
          <DinnerRow key={group.key} group={group} isOptimal={index === 0} showMenuColumn={showMenuColumn} showFormatColumn={showFormatColumn} />
        ))}
      </div>
    </>
  );
}
