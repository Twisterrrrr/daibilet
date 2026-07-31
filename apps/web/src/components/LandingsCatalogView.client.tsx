'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, Sparkles } from 'lucide-react';

import { CityPicker } from '@/components/CityPicker.client';
import { HeroLayout } from '@/components/HeroLayout';
import { IMAGE_SIZES, SafeImage } from '@/components/SafeImage.client';
import { LandingDirectionCard } from '@/components/LandingDirectionCard.client';
import { ScrollRail } from '@/components/ScrollRail.client';
import { useSelectedCityOptional } from '@/components/SelectedCityProvider.client';
import { buildCatalogPresetHref } from '@/lib/catalog-links';
import { CATALOG_PRESETS } from '@/lib/catalog-presets';
import { formatNumber, pluralEvents } from '@/lib/format';
import { resolveLandingCardImage } from '@/lib/landing-images';
import {
  landingCategoryHref,
  landingMatchesBoundCity,
  mergePodborkiCityCatalogItems,
  resolveLandingBoundCitySlug,
} from '@/lib/landing-routes';
import { resolveLandingCityName } from '@/lib/landing-city';
import {
  groupPodborkiByCategory,
  type PodborkiCatalogItem,
  type PodborkiCategoryMeta,
} from '@/lib/podborki-categories';
import { pickPodborkiFeatured, pickPodborkiTrending } from '@/lib/podborki-hero';
import { balancedTileGridClass } from '@/lib/balanced-tile-grid';
import type { PublicDestinationDto } from '@daibilet/contracts/public';

const MOOD_CHIPS: Array<{ label: string; href: string }> = [
  { label: 'С детьми', href: landingCategoryHref('family-kids') },
  { label: 'Для двоих', href: '/events?q=романт&sort=popular' },
  { label: 'Бюджетно', href: buildCatalogPresetHref('cheap') },
  { label: 'Культура', href: landingCategoryHref('exhibitions') },
  { label: 'На воде', href: landingCategoryHref('river-cruises') },
];

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
  // landings-catalog scopes by session.city / destination (RU name) or citySlug aliases
  // like moskva / sankt-peterburg - not SEO latin moscow / saint-petersburg.
  const apiCityParam = citySelected
    ? (cityName !== 'all' ? cityName : citySlug)
    : '';

  const [cityScopedItems, setCityScopedItems] = useState<PodborkiCatalogItem[] | null>(null);
  const [cityCatalogLoading, setCityCatalogLoading] = useState(false);

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
        // Fallback: city-bound only until next successful fetch.
        setCityScopedItems(initialItems.filter((item) => landingMatchesBoundCity(item.slug, citySlug)));
      })
      .finally(() => {
        if (!controller.signal.aborted) setCityCatalogLoading(false);
      });

    return () => controller.abort();
  }, [apiCityParam, citySelected, citySlug, initialItems]);

  // While city catalog loads: city-bound only (avoid flash of full national list).
  const items = useMemo(() => {
    if (!citySelected) return initialItems;
    if (cityScopedItems) return cityScopedItems;
    return initialItems.filter((item) => landingMatchesBoundCity(item.slug, citySlug));
  }, [cityScopedItems, citySelected, citySlug, initialItems]);

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

  const handleCityChange = (value: string) => {
    if (value === 'all') {
      router.push('/podborki');
      return;
    }
    const next = cities.find((item) => item.name === value);
    const slug = next?.slug || value;
    router.push(`/podborki?city=${encodeURIComponent(slug)}`);
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
          <p className="mt-4 max-w-2xl rounded-2xl bg-sky-50 px-4 py-3 text-sm leading-relaxed text-slate-700 ring-1 ring-sky-100">
            {seasonText}
          </p>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Настроение">
          {MOOD_CHIPS.map((chip) => (
            <Link
              key={chip.label}
              href={chip.href}
              className="inline-flex rounded-full bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50 hover:text-primary-700"
            >
              {chip.label}
            </Link>
          ))}
        </div>

        {/* Featured + trending: full container-page width, equal-height row. */}
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
                  className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-950" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-900/35 to-transparent" />
              {featuredCityName ? (
                <span className="absolute left-3 top-3 z-[2] inline-flex items-center rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-slate-900 shadow-sm backdrop-blur-sm">
                  {featuredCityName}
                </span>
              ) : null}
              <div className="relative z-10 mt-auto flex w-full flex-col gap-2 p-5">
                <span className="text-xs font-semibold uppercase tracking-wider text-sky-200">Избранная подборка</span>
                <span className="font-display text-2xl font-extrabold leading-tight text-white sm:text-3xl">{featured.title}</span>
                <span className="text-sm text-white/80">
                  {pluralEvents(featured.events)}
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
                <div key={section.slug}>
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
                  {/* Мобилка/планшет: горизонтальный скролл; lg+: сетка без обрезки */}
                  <ScrollRail
                    className="-mx-4 sm:mx-0 lg:hidden"
                    viewportClassName="flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:px-0"
                    aria-label={section.title}
                  >
                    {section.items.map((landing) => (
                      <div
                        key={landing.slug}
                        data-rail-item
                        className="w-[min(18rem,calc(100%-0.875rem))] shrink-0 snap-start sm:w-[17.5rem]"
                      >
                        <LandingDirectionCard
                          landing={landing}
                          citySlug={citySlug}
                          showFilterCityBadge={citySelected}
                        />
                      </div>
                    ))}
                  </ScrollRail>
                  <ul
                    className={`hidden gap-3 lg:grid ${balancedTileGridClass(section.items.length, {
                      lg: 3,
                      xl: 4,
                    })}`}
                  >
                    {section.items.map((landing) => (
                      <li key={landing.slug}>
                        <LandingDirectionCard
                          landing={landing}
                          citySlug={citySlug}
                          showFilterCityBadge={citySelected}
                        />
                      </li>
                    ))}
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
                    : 'Популярные запросы скоро появятся'}
              </p>
              <p className="mt-1 text-sm text-slate-400">
                {cityCatalogLoading
                  ? 'Считаем события в выбранном городе'
                  : citySelected
                    ? EMPTY_CITY_COPY.hint
                    : 'Пока доступны быстрые фильтры выше'}
              </p>
            </div>
          )}
        </section>

        <p className="mt-12 text-sm text-slate-500">
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
