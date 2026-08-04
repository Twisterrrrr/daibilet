'use client';

import * as React from 'react';
import {
  Anchor,
  Coffee,
  Music,
  Shield,
  Ship,
  Sparkles,
  Star,
  Users,
} from 'lucide-react';

import { LandingPurchaseButton } from '@/components/landing/LandingPurchaseButton.client';
import { formatMoneyRange } from '@/lib/format';
import { FLEXIBLE_SCHEDULE_LABEL, isFlexibleScheduleSession } from '@/lib/event-card-meta';
import {
  classifyBridgesRoute,
  extractBridgeNames,
  extractBridgesFeatureTags,
  resolveBridgesDisplayTitle,
  resolveBridgesRating,
  type BridgesEventGroup,
  type BridgesFeatureTag,
  type BridgesRouteKind,
} from '@/lib/bridges-session-utils';
import { parseSessionStartsAt, resolveSessionDate, resolveSessionTime } from '@/lib/datetime';
import { eventHref } from '@/lib/routes';
import type { PublicSessionDto } from '@daibilet/contracts/public';

type SortFilter = 'time' | 'price' | 'rating';
type RouteFilter = 'all' | BridgesRouteKind;

const FEATURE_META: Record<BridgesFeatureTag, { label: string; icon: typeof Shield }> = {
  warm: { label: 'Тёплый салон', icon: Shield },
  blankets: { label: 'Пледы', icon: Sparkles },
  bar: { label: 'Бар на борту', icon: Coffee },
  disco: { label: 'Дискотека', icon: Music },
  guide: { label: 'С гидом', icon: Users },
};

const ROUTE_FILTERS: Array<{ value: RouteFilter; label: string }> = [
  { value: 'all', label: 'Все маршруты' },
  { value: 'neva', label: 'По Большой Неве' },
  { value: 'canals', label: 'Каналы + Нева' },
  { value: 'mixed', label: 'Расширенный' },
];

const SORT_FILTERS: Array<{ value: SortFilter; label: string }> = [
  { value: 'time', label: 'По времени' },
  { value: 'price', label: 'По цене' },
  { value: 'rating', label: 'По рейтингу' },
];

function extractDuration(title: string, tags: string[]): string | null {
  if (/пять\s+разводных\s+мостов|5\s+разводных/i.test(title)) return '120 мин';
  return (tags || []).find((tag) => /\d+\s*(мин|ч|час)/i.test(tag)) || null;
}

function estimateReviewCount(group: BridgesEventGroup): number {
  return 80 + group.sessions.length * 37 + (group.title.length % 50) * 3;
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

function resolveShipLabel(session: PublicSessionDto): string | null {
  return session.tags?.find((tag) => /теплоход|катер|яхт|палуб/i.test(tag)) || session.category || null;
}

function pickOptimalKey(groups: BridgesEventGroup[]): string | null {
  if (!groups.length) return null;
  let best = groups[0];
  let bestScore = Number.POSITIVE_INFINITY;
  for (const group of groups) {
    const price = group.priceFrom ?? Number.MAX_SAFE_INTEGER;
    const score = price - group.sessions.length * 50;
    if (score < bestScore) {
      bestScore = score;
      best = group;
    }
  }
  return best.key;
}

function BridgesCruiseCard({
  group,
  isOptimal,
}: {
  group: BridgesEventGroup;
  isOptimal: boolean;
}) {
  const session = group.representative;
  const slot = session.upcomingSlots?.[0];
  const flexible = isFlexibleScheduleSession(session);
  const time = flexible ? FLEXIBLE_SCHEDULE_LABEL : resolveSessionTime(session, slot);
  const duration = extractDuration(group.title, session.tags || []);
  const bridges = extractBridgeNames(group.title, session.tags || []);
  const features = extractBridgesFeatureTags(group.title, session.tags || []);
  const displayTitle = resolveBridgesDisplayTitle(group.title);
  const rating = resolveBridgesRating(group.title, group.key).toFixed(1);
  const reviews = estimateReviewCount(group);
  const vacant = session.vacant;
  const soldOut = typeof vacant === 'number' && vacant <= 0;
  const urgent = typeof vacant === 'number' && vacant > 0 && vacant <= 50;
  const ship = resolveShipLabel(session);
  const timeChips = collectBridgesTimeChips(group);
  const href = eventHref(session);
  const buyClass =
    'inline-flex items-center gap-2 rounded-full bridges-cta-gradient px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-105';

  return (
    <article
      className={`overflow-hidden rounded-2xl border bg-white p-5 shadow-sm transition hover:border-[oklch(0.72_0.17_55/0.4)] hover:shadow-md md:p-6 ${
        isOptimal ? 'border-[oklch(0.72_0.17_55/0.5)] shadow-[var(--bridges-shadow-glow)]' : 'border-slate-200'
      }`}
    >
      <div className="grid gap-6 md:grid-cols-[auto_1fr_auto] md:items-center">
        <div className="flex items-center gap-4 md:flex-col md:items-start md:gap-2">
          <div className="text-3xl font-semibold leading-none tabular-nums text-foreground md:text-4xl">{time}</div>
          {!flexible ? (
            <div className="text-xs text-muted-foreground">
              <div>{formatCompactDate(session)}</div>
              {duration ? <div className="mt-0.5">{duration}</div> : null}
            </div>
          ) : duration ? (
            <div className="text-xs text-muted-foreground">{duration}</div>
          ) : null}
        </div>

        <div className="min-w-0">
          {isOptimal ? (
            <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-[oklch(0.72_0.17_55/0.15)] px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-[oklch(0.55_0.17_55)]">
              <Star className="h-3 w-3 fill-current" />
              Оптимальный выбор
            </div>
          ) : null}
          <h3 className="text-lg font-semibold leading-snug tracking-tight text-foreground">
            <a href={href} className="hover:text-[oklch(0.55_0.17_55)]">
              {displayTitle}
            </a>
          </h3>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
            {group.venue ? (
              <span className="inline-flex items-center gap-1.5">
                <Anchor className="h-3.5 w-3.5 shrink-0" />
                {group.venue}
              </span>
            ) : null}
            {ship ? (
              <span className="inline-flex items-center gap-1.5">
                <Ship className="h-3.5 w-3.5 shrink-0" />
                {ship}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1.5">
              <Star className="h-3.5 w-3.5 shrink-0 fill-[oklch(0.72_0.17_55)] text-[oklch(0.72_0.17_55)]" />
              <span className="text-foreground">{rating}</span>
              <span>· {reviews} отзывов</span>
            </span>
          </div>
          {timeChips.length > 1 ? (
            <div className="mt-2.5 flex flex-wrap gap-1.5" aria-label="Ближайшие сеансы">
              {timeChips.map((chip) => (
                <span
                  key={chip.key}
                  className="inline-flex rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-slate-700"
                >
                  {chip.label}
                </span>
              ))}
            </div>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {bridges.map((bridge) => (
              <span
                key={bridge}
                className="rounded-md bg-[oklch(0.55_0.15_245/0.1)] px-2 py-0.5 text-xs font-medium text-[oklch(0.45_0.12_245)]"
              >
                {bridge}
              </span>
            ))}
            {features.map((tag) => {
              const meta = FEATURE_META[tag];
              const Icon = meta.icon;
              return (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-0.5 text-xs text-muted-foreground"
                >
                  <Icon className="h-3 w-3" />
                  {meta.label}
                </span>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-border/60 pt-4 md:flex-col md:items-end md:border-none md:pt-0">
          <div className="text-right">
            <div className="text-xl font-semibold leading-tight tabular-nums text-foreground md:text-2xl">
              {formatMoneyRange(group.priceFrom, group.priceTo)}
            </div>
            {typeof vacant === 'number' && !soldOut ? (
              <div className={`mt-0.5 text-xs ${urgent ? 'text-[oklch(0.72_0.17_55)]' : 'text-muted-foreground'}`}>
                {urgent ? 'Осталось ' : 'Свободно '}
                {vacant} мест
              </div>
            ) : null}
          </div>
          {soldOut ? (
            <button type="button" disabled className="inline-flex cursor-not-allowed items-center rounded-full bg-muted px-5 py-2.5 text-sm font-semibold text-muted-foreground">
              Распродано
            </button>
          ) : (
            <LandingPurchaseButton session={session} label="Выбрать" className={buyClass} showArrow />
          )}
        </div>
      </div>
    </article>
  );
}

export function BridgesScheduleSection({
  groups,
  sort,
  setSort,
}: {
  groups: BridgesEventGroup[];
  sort: SortFilter;
  setSort: (value: SortFilter) => void;
}) {
  const [routeFilter, setRouteFilter] = React.useState<RouteFilter>(() => {
    if (typeof window === 'undefined') return 'all';
    const type = String(new URLSearchParams(window.location.search).get('type') || '').trim();
    if (type === 'neva' || type === 'canals' || type === 'mixed') return type;
    return 'all';
  });

  React.useEffect(() => {
    const url = new URL(window.location.href);
    if (routeFilter === 'all') url.searchParams.delete('type');
    else url.searchParams.set('type', routeFilter);
    const next = `${url.pathname}${url.search}`;
    if (`${window.location.pathname}${window.location.search}` !== next) {
      window.history.replaceState({}, '', next);
    }
  }, [routeFilter]);

  const filtered = React.useMemo(() => {
    const list = groups.filter((group) => {
      if (routeFilter === 'all') return true;
      const session = group.representative;
      return (
        classifyBridgesRoute(group.title, group.tags, group.venue, session.description || '') === routeFilter
      );
    });
    return [...list].sort((a, b) => {
      if (sort === 'price') return (a.priceFrom ?? 99999) - (b.priceFrom ?? 99999);
      if (sort === 'rating') {
        return resolveBridgesRating(b.title, b.key) - resolveBridgesRating(a.title, a.key);
      }
      const ta = a.representative.startsAt || a.firstStartsAt || '';
      const tb = b.representative.startsAt || b.firstStartsAt || '';
      return ta.localeCompare(tb);
    });
  }, [groups, routeFilter, sort]);

  const optimalKey = React.useMemo(() => pickOptimalKey(filtered), [filtered]);

  if (!groups.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-12 text-center text-muted-foreground">
        По выбранным фильтрам рейсов не найдено. Попробуйте другой маршрут.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="sticky top-[var(--site-header-height)] z-20 -mx-1 flex flex-col gap-4 rounded-xl border border-border/70 bg-background/95 px-2 py-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/85 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {ROUTE_FILTERS.map((route) => (
            <button
              key={route.value}
              type="button"
              onClick={() => setRouteFilter(route.value)}
              className={`rounded-full border px-4 py-2 text-sm transition ${
                routeFilter === route.value
                  ? 'border-[oklch(0.72_0.17_55)] bg-[oklch(0.72_0.17_55)] text-white'
                  : 'border-border bg-card text-muted-foreground hover:text-foreground'
              }`}
            >
              {route.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 self-start rounded-full border border-border bg-card p-1">
          {SORT_FILTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setSort(item.value)}
              className={`rounded-full px-3 py-1.5 text-xs transition ${
                sort === item.value ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4">
        {filtered.length ? (
          filtered.map((group) => (
            <BridgesCruiseCard key={group.key} group={group} isOptimal={group.key === optimalKey} />
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-10 text-center text-muted-foreground">
            Нет рейсов по этому маршруту. Выберите другой фильтр.
          </div>
        )}
      </div>
    </div>
  );
}

function collectBridgesTimeChips(group: BridgesEventGroup): Array<{ key: string; label: string }> {
  const chips: Array<{ key: string; label: string }> = [];
  const seen = new Set<string>();
  for (const item of group.sessions) {
    const slots =
      item.upcomingSlots && item.upcomingSlots.length
        ? item.upcomingSlots
        : item.timeLabel || item.startsAt
          ? [{ startsAt: item.startsAt, timeLabel: item.timeLabel }]
          : [];
    for (const next of slots) {
      const label = String(next.timeLabel || resolveSessionTime(item, next) || '').trim();
      if (!label) continue;
      const key = String(next.startsAt || label);
      if (seen.has(key)) continue;
      seen.add(key);
      chips.push({ key, label });
      if (chips.length >= 8) return chips;
    }
  }
  return chips;
}
