'use client';

import Link from 'next/link';
import { ArrowRight, Grid3X3, List, Table2 } from 'lucide-react';

import { EventCard } from '@/components/EventCard';
import { EventCardHorizontal } from '@/components/EventCardHorizontal';
import type { PublicCatalogListItemDto } from '@daibilet/contracts/public';
import { trackCatalogBannerClick } from '@/lib/catalog-analytics';
import { catalogItemHasLiveSignal } from '@/lib/event-card-badges';
import { resolveEventCardFallbackImage, resolveEventCardPrimaryImage } from '@/lib/event-card-image';
import { formatMoneyRange, formatPriceFrom } from '@/lib/format';
import { formatShowcaseSessionDate, MIN_DISPLAY_PRICE_RUB } from '@/lib/event-card-meta';
import { resolveEventCardDestinationLabel } from '@/lib/event-location';
import { eventHref, sessionVenueHref } from '@/lib/routes';
import type { CatalogViewMode } from '@/lib/catalog-view-mode';
import {
  CATALOG_INTERSTITIAL_EVERY,
  catalogInterstitialsForCity,
  type CatalogInterstitial,
} from '@/lib/catalog-interstitials';
import { collapseCatalogComboFamilies } from '@/lib/home-showcase-sections';
import { IMAGE_SIZES, CardSafeImage } from '@/components/SafeImage.client';

type CatalogResultsProps = {
  items: PublicCatalogListItemDto[];
  viewMode: CatalogViewMode;
  onViewModeChange: (mode: CatalogViewMode) => void;
  clearHref?: string;
  city?: string | null;
  /** Current catalog sort - used for zero-fetch «Сейчас в городе» strip. */
  sort?: string | null;
  /** Date/category/q/etc. active - keep filter-reset primary, city hubs secondary. */
  hasExtraFilters?: boolean;
};

const CATALOG_EMPTY_CITY_HUBS = [
  { slug: 'saint-petersburg', name: 'Санкт-Петербург' },
  { slug: 'kazan', name: 'Казань' },
  { slug: 'sochi', name: 'Сочи' },
] as const;

function normalizeCityKey(value: string | null | undefined): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[\s\-]+/g, ' ');
}

function isCurrentEmptyHubCity(
  city: string | null | undefined,
  hub: (typeof CATALOG_EMPTY_CITY_HUBS)[number],
): boolean {
  const key = normalizeCityKey(city);
  if (!key) return false;
  if (key === normalizeCityKey(hub.name) || key === hub.slug) return true;
  if (hub.slug === 'saint-petersburg') {
    return key.includes('петербург') || key === 'спб' || key === 'питер';
  }
  return false;
}

type CatalogGridEntry =
  | { kind: 'event'; session: PublicCatalogListItemDto }
  | { kind: 'banner'; banner: CatalogInterstitial };

function buildCatalogGridEntries(
  items: PublicCatalogListItemDto[],
  city?: string | null,
): CatalogGridEntry[] {
  const banners = catalogInterstitialsForCity(city);
  if (!banners.length || items.length < CATALOG_INTERSTITIAL_EVERY) {
    return items.map((session) => ({ kind: 'event' as const, session }));
  }

  const entries: CatalogGridEntry[] = [];
  let bannerIndex = 0;
  items.forEach((session, index) => {
    entries.push({ kind: 'event', session });
    if ((index + 1) % CATALOG_INTERSTITIAL_EVERY === 0 && bannerIndex < banners.length) {
      entries.push({ kind: 'banner', banner: banners[bannerIndex]! });
      bannerIndex += 1;
    }
  });
  return entries;
}

function CatalogInterstitialBanner({ banner }: { banner: CatalogInterstitial }) {
  return (
    <li className="col-span-full">
      <Link
        href={banner.href}
        onClick={() => trackCatalogBannerClick(banner.id)}
        className="group relative flex max-h-[11.5rem] flex-row items-center justify-between gap-3 overflow-hidden rounded-card border border-slate-200/70 bg-[#F8F9FA] px-4 py-3.5 transition hover:border-primary/20 hover:bg-primary/[0.05] sm:max-h-none sm:gap-4 sm:px-6 sm:pb-6 sm:pt-7"
      >
        <span className="absolute left-3 top-2.5 rounded-md bg-white px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-primary-700 ring-1 ring-slate-200/80 sm:left-4 sm:top-3 sm:text-xs">
          {banner.eyebrow}
        </span>
        <div className="min-w-0 flex-1 pt-4 sm:pt-5">
          <h3 className="line-clamp-2 font-display text-base font-bold leading-snug tracking-tight text-graphite sm:line-clamp-none sm:text-2xl">
            {banner.title}
          </h3>
          <p className="mt-1 hidden max-w-2xl text-sm leading-6 text-graphite-muted sm:mt-2 sm:block">
            {banner.description}
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 self-center rounded-xl bg-white px-3 py-2 text-xs font-semibold text-primary-700 ring-1 ring-slate-200/80 transition group-hover:ring-primary/30 sm:gap-2 sm:px-4 sm:py-2.5 sm:text-sm">
          <span className="max-w-[7.5rem] truncate sm:max-w-none">{banner.cta}</span>
          <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={1.75} />
        </span>
      </Link>
    </li>
  );
}

export function CatalogResults({
  items,
  viewMode,
  onViewModeChange: _onViewModeChange,
  clearHref = '/events',
  city,
  sort,
  hasExtraFilters = false,
}: CatalogResultsProps) {
  const catalogItems = collapseCatalogComboFamilies(items);
  if (!catalogItems.length) {
    const cityName = String(city || '').trim();
    const cityScoped = Boolean(cityName) && cityName.toLowerCase() !== 'all';
    const hubTiles = cityScoped
      ? CATALOG_EMPTY_CITY_HUBS.filter((hub) => !isCurrentEmptyHubCity(cityName, hub))
      : [];
    const cityEmptyPrimary = cityScoped && !hasExtraFilters;

    return (
      <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center sm:p-10">
        {cityEmptyPrimary ? (
          <>
            <p className="text-lg font-semibold text-slate-800">
              В г. {cityName} сейчас нет активных событий. Посмотреть афишу в других городах?
            </p>
            {hubTiles.length ? (
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {hubTiles.map((hub) => (
                  <Link
                    key={hub.slug}
                    href={`/cities/${hub.slug}`}
                    className="inline-flex min-h-[3.25rem] items-center justify-center rounded-2xl bg-primary-600 px-4 text-base font-semibold text-white transition hover:bg-primary-700"
                  >
                    {hub.name}
                  </Link>
                ))}
              </div>
            ) : null}
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <Link
                href={clearHref}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:border-primary-300 hover:text-primary-700"
              >
                Сбросить фильтры
              </Link>
              <Link
                href="/podborki"
                className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:border-primary-300 hover:text-primary-700"
              >
                Подборки
              </Link>
            </div>
          </>
        ) : (
          <>
            <p className="text-lg font-semibold text-slate-800">Сейчас по этим фильтрам событий нет</p>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Сбросьте поиск или посмотрите ТОП популярных - речные прогулки и подборки города.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <Link
                href={clearHref}
                className="inline-flex h-10 items-center justify-center rounded-xl bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700"
              >
                Сбросить фильтры
              </Link>
              <Link
                href="/rechnye-progulki"
                className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:border-primary-300 hover:text-primary-700"
              >
                Речные прогулки
              </Link>
              <Link
                href="/podborki"
                className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:border-primary-300 hover:text-primary-700"
              >
                Подборки
              </Link>
            </div>
            {cityScoped && hubTiles.length ? (
              <div className="mt-6">
                <p className="text-sm font-medium text-slate-600">Или афиша других городов:</p>
                <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                  {hubTiles.map((hub) => (
                    <Link
                      key={hub.slug}
                      href={`/cities/${hub.slug}`}
                      className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:border-primary-300 hover:text-primary-700"
                    >
                      {hub.name}
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    );
  }

  const liveRailItems = pickLiveRailItems(catalogItems, sort);
  // Owner 2026-08-13: temporarily hide «Сейчас выбирают» / «Популярное сейчас» rail on /events.
  const SHOW_CATALOG_LIVE_RAIL = false;
  const showLiveRail = SHOW_CATALOG_LIVE_RAIL && liveRailItems.length >= 3 && viewMode === 'cards';
  // Keep «Сейчас выбирают» / «Популярное сейчас» from mirroring the first page of cards 1:1.
  const listItems = showLiveRail
    ? catalogItems.filter((item) => !liveRailItems.some((rail) => rail.id === item.id))
    : catalogItems;
  const gridEntries = viewMode === 'cards' ? buildCatalogGridEntries(listItems, city) : null;

  return (
    <>
      {showLiveRail ? (
        <CatalogLiveRail items={liveRailItems} popularSort={sort === 'popular'} />
      ) : null}
      {viewMode === 'list' ? (
        <>
          <ul className="mt-4 grid grid-cols-1 gap-4 sm:hidden">
            {listItems.map((session) => (
              <li key={`${session.id}-${session.startsAt}`}>
                <EventCard session={session} compact />
              </li>
            ))}
          </ul>
          <ul className="mt-4 hidden space-y-4 sm:block sm:space-y-5">
            {listItems.map((session) => (
              <li key={`${session.id}-${session.startsAt}`}>
                <EventCardHorizontal session={session} />
              </li>
            ))}
          </ul>
        </>
      ) : viewMode === 'table' ? (
        <CatalogTable items={listItems} />
      ) : (
        <ul className="catalog-card-grid mt-4">
          {gridEntries!.map((entry) =>
            entry.kind === 'banner' ? (
              <CatalogInterstitialBanner key={`banner-${entry.banner.id}`} banner={entry.banner} />
            ) : (
              <li key={`${entry.session.id}-${entry.session.startsAt}`}>
                <EventCard session={entry.session} compact />
              </li>
            ),
          )}
        </ul>
      )}
    </>
  );
}

function pickLiveRailItems(
  items: PublicCatalogListItemDto[],
  sort?: string | null,
): PublicCatalogListItemDto[] {
  if (sort === 'popular') {
    return items.slice(0, 6);
  }
  return items.filter((item) => catalogItemHasLiveSignal(item)).slice(0, 6);
}

function CatalogLiveRail({
  items,
  popularSort,
}: {
  items: PublicCatalogListItemDto[];
  popularSort: boolean;
}) {
  return (
    <section className="mt-4 w-full" aria-label={popularSort ? 'Популярное сейчас' : 'Сейчас выбирают'}>
      <div className="mb-2 flex w-full items-baseline justify-between gap-3">
        <h2 className="font-display text-sm font-bold text-graphite sm:text-base">
          {popularSort ? 'Популярное сейчас' : 'Сейчас выбирают'}
        </h2>
        <p className="text-[11px] text-graphite-muted sm:text-xs">По афише города</p>
      </div>
      <ul className="flex w-full gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-3.5 md:overflow-visible">
        {items.map((session) => {
          const href = eventHref(session);
          const coverSrc =
            resolveEventCardPrimaryImage(session) ||
            resolveEventCardFallbackImage(session) ||
            session.imageUrl;
          const hasPrice =
            typeof session.priceFrom === 'number' && session.priceFrom >= MIN_DISPLAY_PRICE_RUB;
          return (
            <li
              key={`live-${session.id}-${session.startsAt}`}
              className="w-[9.5rem] shrink-0 snap-start sm:w-44 md:min-w-0 md:w-auto md:flex-1"
            >
              <Link
                href={href}
                className="group block h-full overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition hover:border-slate-200 hover:shadow-md"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-surface-muted">
                  <CardSafeImage
                    src={coverSrc}
                    alt={session.title}
                    fill
                    sizes={IMAGE_SIZES.eventCard}
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    fallback={
                      <div className="flex h-full w-full items-center justify-center bg-surface-muted text-graphite-muted">
                        ·
                      </div>
                    }
                  />
                </div>
                <div className="space-y-1 p-2.5">
                  <p className="line-clamp-2 text-xs font-semibold leading-snug text-graphite sm:text-sm">
                    {session.title}
                  </p>
                  {hasPrice ? (
                    <p className="text-[11px] font-bold text-primary-700 sm:text-xs">
                      {formatPriceFrom(session.priceFrom)}
                    </p>
                  ) : null}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function ViewModeToggle({
  mode,
  onChange,
}: {
  mode: CatalogViewMode;
  onChange: (mode: CatalogViewMode) => void;
}) {
  return (
    <div
      className="inline-flex h-10 shrink-0 items-center overflow-hidden rounded-lg bg-slate-100 p-0.5 ring-1 ring-slate-200/80"
      role="radiogroup"
      aria-label="Вид каталога"
    >
      <ViewModeButton
        active={mode === 'cards'}
        mobileActive={mode === 'list'}
        label="Карточки"
        onClick={() => onChange('cards')}
      >
        <Grid3X3 className="h-5 w-5" aria-hidden />
      </ViewModeButton>
      <ViewModeButton
        active={mode === 'list'}
        label="Список"
        onClick={() => onChange('list')}
        className="hidden sm:grid"
      >
        <List className="h-5 w-5" aria-hidden />
      </ViewModeButton>
      <ViewModeButton active={mode === 'table'} label="Таблица" onClick={() => onChange('table')}>
        <Table2 className="h-5 w-5" aria-hidden />
      </ViewModeButton>
    </div>
  );
}

function ViewModeButton({
  active,
  mobileActive = false,
  label,
  onClick,
  className = '',
  children,
}: {
  active: boolean;
  mobileActive?: boolean;
  label: string;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`grid h-9 w-9 place-items-center rounded-md transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
        active
          ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200'
          : 'text-slate-500 hover:bg-white/70 hover:text-slate-800'
      } ${
        mobileActive && !active
          ? 'max-sm:bg-white max-sm:text-slate-900 max-sm:shadow-sm max-sm:ring-1 max-sm:ring-slate-200'
          : ''
      } ${className}`}
    >
      {children}
    </button>
  );
}

function CatalogTable({ items }: { items: PublicCatalogListItemDto[] }) {
  return (
    <div className="mt-4 overflow-auto rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[980px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500">
            <th className="px-4 py-3 font-semibold">Событие</th>
            <th className="px-4 py-3 font-semibold">Категория</th>
            <th className="px-4 py-3 font-semibold">Город</th>
            <th className="px-4 py-3 font-semibold">Дата</th>
            <th className="px-4 py-3 font-semibold">Цена</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {items.map((session) => {
            const cityLabel = resolveEventCardDestinationLabel(session);
            const venueLink = sessionVenueHref(session);
            return (
              <tr key={`${session.id}-${session.startsAt}`} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="min-w-[280px] px-4 py-3 align-top">
                  <Link href={eventHref(session)} className="font-semibold text-slate-950 hover:text-primary-700">
                    {session.title}
                  </Link>
                  {session.venue ? (
                    venueLink ? (
                      <Link href={venueLink} className="mt-1 block text-xs text-slate-500 hover:text-primary-700">
                        {session.venue}
                      </Link>
                    ) : (
                      <div className="mt-1 text-xs text-slate-500">{session.venue}</div>
                    )
                  ) : null}
                </td>
                <td className="px-4 py-3 align-top text-slate-600">{session.category || '—'}</td>
                <td className="px-4 py-3 align-top text-slate-600">
                  {session.citySlug ? (
                    <Link href={`/cities/${session.citySlug}`} className="hover:text-primary-700">
                      {cityLabel}
                    </Link>
                  ) : (
                    cityLabel || '—'
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3 align-top text-slate-700">{formatShowcaseSessionDate(session)}</td>
                <td className="whitespace-nowrap px-4 py-3 align-top font-semibold text-slate-950">
                  {typeof session.priceFrom === 'number' && session.priceFrom >= MIN_DISPLAY_PRICE_RUB
                    ? formatMoneyRange(session.priceFrom, session.priceTo)
                    : '—'}
                </td>
                <td className="px-4 py-3 align-top">
                  <Link
                    href={eventHref(session)}
                    className="inline-flex min-h-9 items-center justify-center rounded-full bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700"
                  >
                    Купить
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
