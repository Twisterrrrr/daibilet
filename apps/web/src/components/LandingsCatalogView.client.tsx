'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowRight } from 'lucide-react';

import { ExpandableBlurb } from '@/components/ExpandableBlurb.client';
import { HeroLayout } from '@/components/HeroLayout';
import { IMAGE_SIZES, SafeImage } from '@/components/SafeImage.client';
import { LandingDirectionCard } from '@/components/LandingDirectionCard.client';
import { ScrollRail } from '@/components/ScrollRail.client';
import { useSelectedCityOptional } from '@/components/SelectedCityProvider.client';
import { formatNumber, formatPriceFrom, pluralEvents } from '@/lib/format';
import { resolveLandingCardImage } from '@/lib/landing-images';
import {
  landingCategoryHref,
  landingMatchesCatalogCity,
  mergePodborkiCityCatalogItems,
} from '@/lib/landing-routes';
import {
  PODBORKI_BENTO_GRID_CLASS,
  podborkiBentoCellClass,
  podborkiBentoSpan,
} from '@/lib/podborki-bento';
import {
  groupPodborkiByCategory,
  resolvePodborkiCategorySlug,
  type PodborkiCatalogItem,
  type PodborkiCategoryMeta,
  type PodborkiCategorySlug,
} from '@/lib/podborki-categories';
import { pickPodborkiFeatured, pickPodborkiTrending } from '@/lib/podborki-hero';
import {
  filterPodborkiByTag,
  PODBORKI_CATEGORY_TAGS,
  PODBORKI_MOODS,
  type PodborkiTagId,
  type PodborkiTagMeta,
} from '@/lib/podborki-moods';
import type { PublicDestinationDto } from '@daibilet/contracts/public';

const PODBORKI_SEO_TEXT =
  'Подборки Дайбилет собирают готовые маршруты и события по типу, аудитории и сезону: речные прогулки, автобусные обзоры, музеи, стендап, семейные программы и праздничные даты. В каждой карточке видно число актуальных сеансов и цену от, чтобы сразу перейти к билетам без долгого поиска по афише. Фильтр города в шапке сужает каталог под ваш маршрут.';

const EMPTY_CITY_COPY = {
  title: 'Пока готовых подборок по выбранному городу еще нет',
  hint: 'Город уже в афише, а подборка еще на разогреве - загляните позже или смените город в шапке.',
} as const;

/** Soft tags on the default «Все» tab (moods across the whole city catalog). */
const PODBORKI_ALL_TAB_TAGS: readonly PodborkiTagMeta[] = PODBORKI_MOODS.map((mood) => ({
  id: mood.id,
  label: mood.label,
}));

const TRENDING_LIMIT = 5;

function resolveCitySlug(cities: PublicDestinationDto[], filter: string): string {
  if (!filter || filter === 'all') return 'all';
  const bySlug = cities.find((item) => item.slug === filter || item.sourceSlug === filter);
  if (bySlug?.slug) return bySlug.slug;
  const byName = cities.find((item) => item.name.toLowerCase() === filter.toLowerCase());
  return byName?.slug || filter;
}

function resolveCityName(cities: PublicDestinationDto[], filter: string): string {
  if (!filter || filter === 'all') return 'all';
  const bySlug = cities.find((item) => item.slug === filter || item.sourceSlug === filter);
  if (bySlug?.name) return bySlug.name;
  const byName = cities.find((item) => item.name.toLowerCase() === filter.toLowerCase());
  return byName?.name || filter;
}

function featuredPriceLine(item: PodborkiCatalogItem): string {
  if (typeof item.priceFrom === 'number' && item.priceFrom === 0) return 'Бесплатно';
  if (typeof item.priceFrom === 'number' && item.priceFrom > 0) {
    return formatPriceFrom(item.priceFrom);
  }
  return '';
}

function featuredMetaLine(item: PodborkiCatalogItem): string {
  const parts = [pluralEvents(item.events)];
  const price = featuredPriceLine(item);
  if (price) parts.push(price);
  return parts.join(' · ');
}

export function LandingsCatalogView({
  items: initialItems,
  city: initialCity,
  cities,
  categories,
  totalEvents,
}: {
  items: PodborkiCatalogItem[];
  city: string;
  cities: PublicDestinationDto[];
  categories: PodborkiCategoryMeta[];
  totalEvents: number;
}) {
  const urlSearchParams = useSearchParams();
  const selectedCity = useSelectedCityOptional();
  const urlCity = urlSearchParams.get('city')?.trim() || '';

  const headerCityFilter =
    selectedCity?.cityReady && selectedCity.cityValue !== 'all'
      ? selectedCity.selectedDestination?.slug ||
        selectedCity.selectedDestination?.sourceSlug ||
        selectedCity.cityValue
      : '';

  const cityRaw = urlCity && urlCity !== 'all' ? urlCity : headerCityFilter || initialCity || 'all';
  const citySlug = resolveCitySlug(cities, cityRaw === 'all' ? 'all' : cityRaw);
  const cityName = resolveCityName(cities, cityRaw === 'all' ? 'all' : cityRaw);
  const citySelected = citySlug !== 'all';
  const apiCityParam = citySelected
    ? (cityName !== 'all' ? cityName : citySlug)
    : '';

  const [cityScopedItems, setCityScopedItems] = useState<PodborkiCatalogItem[] | null>(null);
  const [cityCatalogLoading, setCityCatalogLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<PodborkiCategorySlug | null>(null);
  const [activeTag, setActiveTag] = useState<PodborkiTagId | null>(null);

  useEffect(() => {
    if (!citySelected || !apiCityParam) {
      setCityScopedItems(null);
      setCityCatalogLoading(false);
      return;
    }

    const controller = new AbortController();
    setCityCatalogLoading(true);
    const params = new URLSearchParams({ city: apiCityParam });

    fetch(`/api/public/landings-catalog?${params}`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then(
        (
          payload: {
            items?: Array<{
              slug: string;
              title: string;
              subtitle?: string | null;
              events: number;
              priceFrom?: number | null;
            }>;
          } | null,
        ) => {
          if (!payload?.items) return;
          const metaBySlug = new Map(initialItems.map((item) => [item.slug, item]));
          const mapped: PodborkiCatalogItem[] = payload.items.map((item) => {
            const meta = metaBySlug.get(item.slug);
            return {
              slug: item.slug,
              title: item.title,
              subtitle: item.subtitle ?? meta?.subtitle ?? null,
              events: item.events,
              priceFrom: item.priceFrom ?? meta?.priceFrom ?? null,
              layoutVariant: meta?.layoutVariant ?? null,
              categorySlug: meta?.categorySlug ?? null,
            };
          });
          setCityScopedItems(mergePodborkiCityCatalogItems(initialItems, mapped, citySlug));
        },
      )
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        // Keep multi-city landings (concerts/standup/…) visible; do not collapse to city-bound only.
        setCityScopedItems(
          initialItems.filter((item) => landingMatchesCatalogCity(item.slug, citySlug, { events: item.events })),
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setCityCatalogLoading(false);
      });

    return () => controller.abort();
  }, [apiCityParam, citySelected, citySlug, initialItems]);

  const cityItems = useMemo(() => {
    if (!citySelected) return initialItems;
    if (cityScopedItems) return cityScopedItems;
    // While city catalog loads: show multi+bound landings allowed for this city (not bound-only).
    return initialItems.filter((item) => landingMatchesCatalogCity(item.slug, citySlug, { events: item.events }));
  }, [cityScopedItems, citySelected, citySlug, initialItems]);

  const categoryMeta = categories.length ? categories : undefined;
  const sections = useMemo(
    () => groupPodborkiByCategory(cityItems, categoryMeta),
    [categoryMeta, cityItems],
  );

  // Default tab is «Все» (null). Never auto-pick the first sense-block:
  // with Moscow City Day, «Сезонное» floats first and only has 1-3 landings,
  // which emptied the grid and left «В тренде» with a single row.
  useEffect(() => {
    setActiveCategory((prev) => {
      if (prev == null) return null;
      if (sections.some((section) => section.slug === prev)) return prev;
      return null;
    });
  }, [sections]);

  const resolvedCategory =
    activeCategory && sections.some((s) => s.slug === activeCategory) ? activeCategory : null;

  const categoryTags: readonly PodborkiTagMeta[] = resolvedCategory
    ? PODBORKI_CATEGORY_TAGS[resolvedCategory]
    : PODBORKI_ALL_TAB_TAGS;

  useEffect(() => {
    setActiveTag(null);
  }, [resolvedCategory]);

  const categoryItems = useMemo(() => {
    if (!resolvedCategory) return cityItems;
    return cityItems.filter(
      (item) => resolvePodborkiCategorySlug(item.slug, item.categorySlug) === resolvedCategory,
    );
  }, [cityItems, resolvedCategory]);

  const items = useMemo(
    () => filterPodborkiByTag(categoryItems, activeTag),
    [activeTag, categoryItems],
  );

  // Hero roles always come from the full city catalog so «В тренде» stays 3-5
  // even when a narrow tab (e.g. Сезонное) is selected. Grid still follows tab+tag.
  const featured = pickPodborkiFeatured(cityItems);
  const trending = pickPodborkiTrending(cityItems, featured?.slug, TRENDING_LIMIT);
  const featuredImage = featured ? resolveLandingCardImage(featured.slug, citySelected ? citySlug : null) : null;
  const featuredHref = featured
    ? landingCategoryHref(featured.slug, citySelected ? citySlug : undefined)
    : '/events';

  const gridItems = useMemo(() => {
    // Only drop the featured tile (already huge above). Trending stays in the grid
    // so the catalog still lists every landing for the city / active tab.
    if (!featured) return items;
    return items.filter((item) => item.slug !== featured.slug);
  }, [featured, items]);

  const activeSection = sections.find((section) => section.slug === resolvedCategory) ?? null;
  const allTabCount = cityItems.length;

  const toggleTag = (id: PodborkiTagId) => {
    setActiveTag((prev) => (prev === id ? null : id));
  };

  return (
    <>
      <HeroLayout
        variant="minimal"
        breadcrumbs={[{ label: 'Главная', href: '/' }, { label: 'Подборки' }]}
        title="Готовые планы на вечер и выходные"
        description="Подборки под настроение: для двоих, с детьми, бюджетно или культурно - сразу к билетам."
      >
        {sections.length ? (
          <div className="mt-5 space-y-3">
            <ScrollRail
              viewportClassName="flex flex-nowrap gap-2 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              aria-label="Категории подборок"
            >
              <button
                type="button"
                data-rail-item
                onClick={() => setActiveCategory(null)}
                aria-pressed={resolvedCategory == null}
                className={
                  resolvedCategory == null
                    ? 'inline-flex shrink-0 items-center rounded-full bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition'
                    : 'inline-flex shrink-0 items-center rounded-full bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50'
                }
              >
                Все
                <span
                  className={
                    resolvedCategory == null
                      ? 'ml-1.5 text-xs font-medium text-white/70'
                      : 'ml-1.5 text-xs font-medium text-slate-400'
                  }
                >
                  {allTabCount}
                </span>
              </button>
              {sections.map((section) => {
                const active = section.slug === resolvedCategory;
                return (
                  <button
                    key={section.slug}
                    type="button"
                    data-rail-item
                    onClick={() => setActiveCategory(section.slug)}
                    aria-pressed={active}
                    className={
                      active
                        ? 'inline-flex shrink-0 items-center rounded-full bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition'
                        : 'inline-flex shrink-0 items-center rounded-full bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50'
                    }
                  >
                    {section.title}
                    <span
                      className={
                        active
                          ? 'ml-1.5 text-xs font-medium text-white/70'
                          : 'ml-1.5 text-xs font-medium text-slate-400'
                      }
                    >
                      {section.items.length}
                    </span>
                  </button>
                );
              })}
            </ScrollRail>

            {categoryTags.length ? (
              <ScrollRail
                viewportClassName="flex flex-nowrap gap-2 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                aria-label="Фильтры подборки"
              >
                {categoryTags.map((tag) => {
                  const active = activeTag === tag.id;
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      data-rail-item
                      onClick={() => toggleTag(tag.id)}
                      aria-pressed={active}
                      className={
                        active
                          ? 'inline-flex shrink-0 items-center rounded-full bg-slate-200 px-3 py-1.5 text-sm font-medium text-slate-900 transition'
                          : 'inline-flex shrink-0 items-center rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-200/80 hover:text-slate-800'
                      }
                    >
                      {tag.label}
                    </button>
                  );
                })}
              </ScrollRail>
            ) : null}
          </div>
        ) : null}

        <div
          className={
            trending.length
              ? 'mt-6 grid w-full items-stretch gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(14rem,1fr)] lg:gap-5'
              : 'mt-6'
          }
        >
          {featured ? (
            <Link
              href={featuredHref}
              className="group flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-900/10"
            >
              <div className="relative flex min-h-[14rem] flex-1 flex-col justify-end overflow-hidden bg-slate-900 sm:min-h-[16rem]">
                {featuredImage ? (
                  <SafeImage
                    src={featuredImage}
                    alt=""
                    fill
                    priority
                    sizes={IMAGE_SIZES.landingBanner}
                    className="object-cover transition-transform duration-700 group-hover:scale-[1.08]"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-primary-700 via-sky-700 to-cyan-950" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-900/35 to-transparent" />
                <div className="relative z-10 flex flex-col gap-3 p-5">
                  <span className="font-display text-2xl font-extrabold leading-tight text-white sm:text-3xl">
                    {featured.title}
                  </span>
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-white">
                    Смотреть
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                  </span>
                </div>
              </div>
              <p className="mt-auto shrink-0 px-3 py-2 text-xs text-slate-500">
                {featuredMetaLine(featured)}
              </p>
            </Link>
          ) : (
            <div className="flex min-h-[12rem] h-full items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 text-center text-sm text-slate-500">
              {cityCatalogLoading
                ? 'Подбираем подборки по городу…'
                : citySelected
                  ? EMPTY_CITY_COPY.title
                  : activeTag
                    ? 'Нет подборок под этот фильтр - снимите тег или выберите другой.'
                    : 'Подборки скоро появятся'}
            </div>
          )}

          {trending.length ? (
            <div className="flex h-full min-h-[14rem] flex-col justify-center self-stretch rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm sm:min-h-[16rem]">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">В тренде</p>
              <ul className="w-full space-y-2">
                {trending.map((item, index) => (
                  <li key={item.slug}>
                    <Link
                      href={landingCategoryHref(item.slug, citySelected ? citySlug : undefined)}
                      className="flex items-start gap-2.5 rounded-xl px-2.5 py-2 transition hover:bg-slate-50"
                    >
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                        {index + 1}
                      </span>
                      <span className="min-w-0">
                        <span className="truncate text-sm font-semibold text-slate-900">{item.title}</span>
                        <span className="block text-xs text-slate-500">{pluralEvents(item.events)}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </HeroLayout>

      <div className="container-page bg-slate-50 py-8 sm:py-10">
        {gridItems.length ? (
          <section>
            {activeSection?.subtitle ? (
              <p className="mb-4 text-sm text-slate-500">{activeSection.subtitle}</p>
            ) : null}
            <ul className={PODBORKI_BENTO_GRID_CLASS}>
              {gridItems.map((landing) => {
                const span = podborkiBentoSpan(landing);
                return (
                  <li key={landing.slug} className={podborkiBentoCellClass(span)}>
                    <LandingDirectionCard
                      landing={landing}
                      citySlug={citySlug}
                      featured={span === 2}
                    />
                  </li>
                );
              })}
            </ul>
          </section>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-12 text-center">
            <p className="text-lg text-slate-600">
              {cityCatalogLoading
                ? 'Подбираем подборки по городу…'
                : activeTag
                  ? 'Нет подборок под этот фильтр'
                  : resolvedCategory && items.length > 0
                    ? 'Подборки этой категории уже в блоке выше'
                    : citySelected && !cityItems.length
                      ? EMPTY_CITY_COPY.title
                      : 'Популярные запросы скоро появятся'}
            </p>
            <p className="mt-1 text-sm text-slate-400">
              {cityCatalogLoading
                ? 'Считаем события в выбранном городе'
                : activeTag
                  ? 'Снимите тег или выберите другой'
                  : resolvedCategory && items.length > 0
                    ? 'Или откройте вкладку «Все», чтобы увидеть полный каталог'
                    : citySelected && !cityItems.length
                      ? EMPTY_CITY_COPY.hint
                      : 'Пока доступны фильтры выше'}
            </p>
            {activeTag || resolvedCategory ? (
              <button
                type="button"
                onClick={() => {
                  setActiveTag(null);
                  setActiveCategory(null);
                }}
                className="mt-4 inline-flex rounded-full bg-primary-600 px-4 py-2 text-sm font-semibold text-white"
              >
                {activeTag ? 'Сбросить фильтр' : 'Показать все подборки'}
              </button>
            ) : null}
          </div>
        )}

        <div className="mt-12 rounded-2xl border border-slate-200 bg-white px-4 py-5 shadow-sm sm:px-6">
          <h2 className="font-display text-base font-bold text-slate-900 sm:text-lg">
            Как выбирать подборку на Дайбилете
          </h2>
          <ExpandableBlurb
            text={PODBORKI_SEO_TEXT}
            className="mt-2 text-sm leading-relaxed text-slate-600"
            clampClassName="line-clamp-3 md:line-clamp-none"
            moreLabel="Развернуть"
            lessLabel="Свернуть"
            buttonClassName="mt-2 text-sm font-semibold text-primary-700 underline-offset-2 hover:underline md:hidden"
          />
        </div>

        <p className="mt-8 text-sm text-slate-500">
          Всего в каталоге <span className="font-semibold text-slate-900">{formatNumber(totalEvents)}</span> событий. Ищите
          подходящее по фильтрам в{' '}
          <Link href="/events" className="font-medium text-primary-600 hover:text-primary-700">
            каталоге
          </Link>
          .
        </p>
      </div>
    </>
  );
}
