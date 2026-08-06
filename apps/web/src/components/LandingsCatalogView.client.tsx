'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, Sparkles } from 'lucide-react';

import { CityPicker } from '@/components/CityPicker.client';
import { ExpandableBlurb } from '@/components/ExpandableBlurb.client';
import { HeroLayout } from '@/components/HeroLayout';
import { IMAGE_SIZES, SafeImage } from '@/components/SafeImage.client';
import { LandingDirectionCard } from '@/components/LandingDirectionCard.client';
import { ScrollRail } from '@/components/ScrollRail.client';
import { useSelectedCityOptional } from '@/components/SelectedCityProvider.client';
import { buildCatalogPresetHref } from '@/lib/catalog-links';
import { CATALOG_PRESETS } from '@/lib/catalog-presets';
import { formatNumber, formatPriceFrom, pluralEvents } from '@/lib/format';
import { resolveLandingCardImage } from '@/lib/landing-images';
import {
  landingCategoryHref,
  landingMatchesBoundCity,
  mergePodborkiCityCatalogItems,
  resolveLandingBoundCitySlug,
} from '@/lib/landing-routes';
import { resolveLandingCityName } from '@/lib/landing-city';
import {
  PODBORKI_BENTO_GRID_CLASS,
  podborkiBentoCellClass,
  podborkiBentoSpan,
} from '@/lib/podborki-bento';
import {
  groupPodborkiByCategory,
  type PodborkiCatalogItem,
  type PodborkiCategoryMeta,
} from '@/lib/podborki-categories';
import { pickPodborkiFeatured, pickPodborkiTrending } from '@/lib/podborki-hero';
import {
  filterPodborkiByMood,
  PODBORKI_MOODS,
  type PodborkiMoodId,
} from '@/lib/podborki-moods';
import type { PublicDestinationDto } from '@daibilet/contracts/public';

const PODBORKI_SEO_TEXT =
  'Подборки Дайбилет собирают готовые маршруты и события по типу, аудитории и сезону: речные прогулки, автобусные обзоры, музеи, стендап, семейные программы и праздничные даты. В каждой карточке видно число актуальных сеансов и цену от, чтобы сразу перейти к билетам без долгого поиска по афише. Фильтр города в шапке сужает каталог под ваш маршрут, а быстрые чипы помогают начать с настроения - с детьми, бюджетно, на воде или культурно.';

const EMPTY_CITY_COPY = {
  title: 'Пока готовых подборок по выбранному городу еще нет',
  hint: 'Город уже в афише, а подборка еще на разогреве - загляните позже или смените город в шапке.',
} as const;

function seasonalBannerText(month = new Date().getMonth()): string | null {
  if (month === 11 || month === 0) return 'Зимой удобнее брать готовые планы: каток, музеи и вечерние программы без долгого выбора.';
  if (month >= 5 && month <= 7) return 'Летом в приоритете речные прогулки, крыши и длинные вечерние маршруты.';
  if (month === 4) return 'Май - сезон салютов, прогулок и коротких городских маршрутов на выходные.';
  if (month >= 8 && month <= 9) return 'Осенью хорошо заходят музеи, театры и камерные вечерние подборки.';
  return 'Готовые планы под повод: вечер, выходные или поездка в новый город.';
}

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
  if (typeof item.priceFrom === 'number' && item.priceFrom === 0) return ' · Бесплатно';
  if (typeof item.priceFrom === 'number' && item.priceFrom > 0) {
    return ` · ${formatPriceFrom(item.priceFrom)}`;
  }
  return '';
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
  const router = useRouter();
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
  const pickerValue = citySlug === 'all' ? 'all' : cityName;
  const seasonText = seasonalBannerText();
  const citySelected = citySlug !== 'all';
  const apiCityParam = citySelected
    ? (cityName !== 'all' ? cityName : citySlug)
    : '';

  const [cityScopedItems, setCityScopedItems] = useState<PodborkiCatalogItem[] | null>(null);
  const [cityCatalogLoading, setCityCatalogLoading] = useState(false);
  const [activeMood, setActiveMood] = useState<PodborkiMoodId | null>(null);

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
        setCityScopedItems(initialItems.filter((item) => landingMatchesBoundCity(item.slug, citySlug)));
      })
      .finally(() => {
        if (!controller.signal.aborted) setCityCatalogLoading(false);
      });

    return () => controller.abort();
  }, [apiCityParam, citySelected, citySlug, initialItems]);

  const cityItems = useMemo(() => {
    if (!citySelected) return initialItems;
    if (cityScopedItems) return cityScopedItems;
    return initialItems.filter((item) => landingMatchesBoundCity(item.slug, citySlug));
  }, [cityScopedItems, citySelected, citySlug, initialItems]);

  const items = useMemo(() => filterPodborkiByMood(cityItems, activeMood), [activeMood, cityItems]);

  const featured = pickPodborkiFeatured(items);
  const trending = pickPodborkiTrending(items, featured?.slug, 3);
  const featuredImage = featured ? resolveLandingCardImage(featured.slug) : null;
  const featuredHref = featured
    ? landingCategoryHref(featured.slug, citySelected ? citySlug : undefined)
    : '/events';
  const featuredBoundName = featured
    ? resolveLandingCityName(resolveLandingBoundCitySlug(featured.slug) || '')
    : null;
  const featuredCityName =
    featuredBoundName || (citySelected ? resolveLandingCityName(citySlug) : null);

  const sections = groupPodborkiByCategory(items, categories.length ? categories : undefined);

  const popularRail = useMemo(() => {
    return [...items].sort((a, b) => b.events - a.events).slice(0, 8);
  }, [items]);

  const displayCityLabel =
    citySelected
      ? resolveLandingCityName(citySlug) || (cityName !== 'all' ? cityName : null)
      : null;

  const handleCityChange = (value: string) => {
    if (value === 'all') {
      router.push('/podborki');
      return;
    }
    const next = cities.find((item) => item.name === value);
    const slug = next?.slug || value;
    router.push(`/podborki?city=${encodeURIComponent(slug)}`);
  };

  const toggleMood = (id: PodborkiMoodId) => {
    setActiveMood((prev) => (prev === id ? null : id));
  };

  return (
    <>
      <HeroLayout
        variant="minimal"
        breadcrumbs={[{ label: 'Главная', href: '/' }, { label: 'Подборки' }]}
        title="Готовые планы на вечер и выходные"
        description="Подборки под настроение: для двоих, с детьми, бюджетно или культурно - сразу к билетам."
      >
        {seasonText ? (
          <p className="mt-4 hidden max-w-2xl rounded-2xl bg-sky-50 px-4 py-3 text-sm leading-relaxed text-slate-700 ring-1 ring-sky-100 md:block">
            {seasonText}
          </p>
        ) : null}

        <ScrollRail
          className="mt-5"
          viewportClassName="flex flex-nowrap gap-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Настроение"
        >
          {PODBORKI_MOODS.map((mood) => {
            const active = activeMood === mood.id;
            return (
              <button
                key={mood.id}
                type="button"
                data-rail-item
                onClick={() => toggleMood(mood.id)}
                aria-pressed={active}
                className={
                  active
                    ? 'inline-flex shrink-0 rounded-full bg-primary-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition'
                    : 'inline-flex shrink-0 rounded-full bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50 hover:text-primary-700'
                }
              >
                {mood.label}
              </button>
            );
          })}
        </ScrollRail>

        {sections.length ? (
          <ScrollRail
            className="mt-4"
            viewportClassName="flex flex-nowrap gap-2 pb-0.5"
            aria-label="Категории подборок"
          >
            {sections.map((section) => (
              <a
                key={section.slug}
                href={`#podborki-${section.slug}`}
                data-rail-item
                className="inline-flex shrink-0 items-center rounded-full bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
              >
                {section.title}
                <span className="ml-1.5 text-xs font-medium text-white/70">{section.items.length}</span>
              </a>
            ))}
          </ScrollRail>
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
              className="group relative flex min-h-[14rem] h-full overflow-hidden rounded-2xl bg-slate-900 text-white shadow-sm ring-1 ring-slate-900/10 sm:min-h-[16rem]"
            >
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
              {featuredCityName ? (
                <span className="absolute left-3 top-3 z-[2] inline-flex items-center rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-slate-900 shadow-sm backdrop-blur-md">
                  {featuredCityName}
                </span>
              ) : null}
              <div className="relative z-10 mt-auto flex w-full flex-col gap-2 p-5">
                <span className="text-xs font-semibold uppercase tracking-wider text-sky-200">Избранная подборка</span>
                <span className="font-display text-2xl font-extrabold leading-tight text-white sm:text-3xl">{featured.title}</span>
                <span className="text-sm text-white/80">
                  {pluralEvents(featured.events)}
                  {featuredPriceLine(featured)}
                  {featured.subtitle ? ` · ${featured.subtitle}` : ''}
                </span>
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-white">
                  Смотреть
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>
          ) : (
            <div className="flex min-h-[12rem] h-full items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 text-center text-sm text-slate-500">
              {cityCatalogLoading
                ? 'Подбираем подборки по городу…'
                : citySelected
                  ? EMPTY_CITY_COPY.title
                  : activeMood
                    ? 'Нет подборок под это настроение - снимите фильтр или выберите другое.'
                    : 'Подборки скоро появятся'}
            </div>
          )}

          {trending.length ? (
            <div className="flex h-full min-h-[14rem] flex-col justify-center self-stretch rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm sm:min-h-[16rem]">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">В тренде</p>
              <ul className="w-full space-y-2">
                {trending.map((item, index) => {
                  const boundName = resolveLandingCityName(resolveLandingBoundCitySlug(item.slug) || '');
                  const badgeName = boundName || (citySelected ? resolveLandingCityName(citySlug) : null);
                  return (
                    <li key={item.slug}>
                      <Link
                        href={landingCategoryHref(item.slug, citySelected ? citySlug : undefined)}
                        className="flex items-start gap-2.5 rounded-xl px-2.5 py-2 transition hover:bg-slate-50"
                      >
                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                          {index + 1}
                        </span>
                        <span className="min-w-0">
                          <span className="flex flex-wrap items-center gap-1.5">
                            <span className="truncate text-sm font-semibold text-slate-900">{item.title}</span>
                            {badgeName ? (
                              <span className="inline-flex shrink-0 rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-semibold text-primary-800">
                                {badgeName}
                              </span>
                            ) : null}
                          </span>
                          <span className="text-xs text-slate-500">{pluralEvents(item.events)}</span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </div>
      </HeroLayout>

      <div className="container-page bg-slate-50 py-10 sm:py-12">
        <section>
          <h2 className="font-display text-xl font-bold text-slate-900">Быстрые подборки</h2>
          <ScrollRail className="mt-3" viewportClassName="flex flex-nowrap gap-2 pb-0.5" aria-label="Быстрые подборки">
            {CATALOG_PRESETS.map((preset) => (
              <Link
                key={preset.slug}
                href={buildCatalogPresetHref(preset.slug, citySelected ? citySlug : undefined)}
                data-rail-item
                className="inline-flex shrink-0 items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary-700"
              >
                {preset.label}
              </Link>
            ))}
          </ScrollRail>
        </section>

        <section className="mt-12">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h2 className="font-display flex items-center gap-2 text-xl font-bold text-slate-900">
                <Sparkles className="h-5 w-5 text-primary" />
                Каталог подборок
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Речные прогулки, развод мостов, стендап и тематические списки - выберите город для актуального
                набора.
              </p>
            </div>
            <div className="w-full shrink-0 sm:w-auto sm:min-w-[220px]">
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <CityPicker
                  cities={cities}
                  value={pickerValue}
                  onChange={handleCityChange}
                  variant="compact"
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {sections.length ? (
            <div className="mt-8 space-y-10">
              {sections.map((section) => (
                <div key={section.slug} id={`podborki-${section.slug}`} className="scroll-mt-24">
                  <div className="mb-3 flex items-end justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-display text-lg font-bold text-slate-900">{section.title}</h3>
                      {section.subtitle ? (
                        <p className="mt-0.5 text-sm text-slate-500">{section.subtitle}</p>
                      ) : null}
                    </div>
                    <span className="shrink-0 text-xs font-medium text-slate-400">
                      {section.items.length}
                    </span>
                  </div>
                  <ul className={PODBORKI_BENTO_GRID_CLASS}>
                    {section.items.map((landing) => {
                      const span = podborkiBentoSpan(landing);
                      return (
                        <li key={landing.slug} className={podborkiBentoCellClass(span)}>
                          <LandingDirectionCard
                            landing={landing}
                            citySlug={citySlug}
                            showFilterCityBadge={citySelected}
                            featured={span === 2}
                          />
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white py-12 text-center">
              <p className="text-lg text-slate-600">
                {cityCatalogLoading
                  ? 'Подбираем подборки по городу…'
                  : citySelected
                    ? EMPTY_CITY_COPY.title
                    : activeMood
                      ? 'Нет подборок под это настроение'
                      : 'Популярные запросы скоро появятся'}
              </p>
              <p className="mt-1 text-sm text-slate-400">
                {cityCatalogLoading
                  ? 'Считаем события в выбранном городе'
                  : citySelected
                    ? EMPTY_CITY_COPY.hint
                    : activeMood
                      ? 'Снимите фильтр настроения или выберите другое'
                      : 'Пока доступны быстрые фильтры выше'}
              </p>
              {activeMood ? (
                <button
                  type="button"
                  onClick={() => setActiveMood(null)}
                  className="mt-4 inline-flex rounded-full bg-primary-600 px-4 py-2 text-sm font-semibold text-white"
                >
                  Сбросить настроение
                </button>
              ) : null}
            </div>
          )}
        </section>

        {popularRail.length >= 3 ? (
          <section className="mt-14">
            <h2 className="font-display text-xl font-bold text-slate-900">
              {displayCityLabel ? `Популярно в ${displayCityLabel}` : 'Популярно сейчас'}
            </h2>
            <ScrollRail
              className="mt-4"
              viewportClassName="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              aria-label={displayCityLabel ? `Популярно в ${displayCityLabel}` : 'Популярно сейчас'}
            >
              {popularRail.map((landing) => (
                <div
                  key={`popular-${landing.slug}`}
                  data-rail-item
                  className="w-[min(16.5rem,calc(100%-1.5rem))] shrink-0 snap-start sm:w-[17rem]"
                >
                  <LandingDirectionCard
                    landing={landing}
                    citySlug={citySlug}
                    showFilterCityBadge={citySelected}
                  />
                </div>
              ))}
            </ScrollRail>
          </section>
        ) : null}

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
