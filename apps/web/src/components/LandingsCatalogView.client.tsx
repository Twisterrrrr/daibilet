'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Sparkles } from 'lucide-react';

import { CityPicker } from '@/components/CityPicker.client';
import { HeroLayout } from '@/components/HeroLayout';
import { IMAGE_SIZES, SafeImage } from '@/components/SafeImage.client';
import { LandingDirectionCard } from '@/components/LandingDirectionCard.client';
import { buildCatalogPresetHref, buildCatalogTagHref } from '@/lib/catalog-links';
import { CATALOG_PRESETS } from '@/lib/catalog-presets';
import { formatNumber, pluralEvents } from '@/lib/format';
import { resolveLandingCardImage } from '@/lib/landing-images';
import { landingCategoryHref } from '@/lib/landing-routes';
import { pickPodborkiFeatured, pickPodborkiTrending } from '@/lib/podborki-hero';
import type { PublicDestinationDto } from '@daibilet/contracts/public';

type LandingCatalogItem = {
  slug: string;
  title: string;
  subtitle: string;
  events: number;
  priceFrom?: number | null;
  layoutVariant?: string | null;
};

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
  items,
  city,
  cities,
  tags,
  totalEvents,
}: {
  items: LandingCatalogItem[];
  city: string;
  cities: PublicDestinationDto[];
  tags: Array<{ name: string; events: number }>;
  totalEvents: number;
}) {
  const router = useRouter();
  const citySlug = resolveCitySlug(cities, city);
  const cityName = resolveCityName(cities, city);
  const pickerValue = citySlug === 'all' ? 'all' : cityName;

  const featured = pickPodborkiFeatured(items);
  const trending = pickPodborkiTrending(items, featured?.slug, 3);
  const featuredImage = featured ? resolveLandingCardImage(featured.slug) : null;
  const featuredHref = featured
    ? landingCategoryHref(featured.slug, citySlug !== 'all' ? citySlug : undefined)
    : '/events';

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
        title="Подборки событий"
        description="Готовые списки под настроение и повод: вечер, выходные, бюджет или редкие премьеры."
      >
        {/* Featured + trending: equal-height row inside HeroLayout max-w-5xl (same axis as H1). */}
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
              <div className="relative z-10 mt-auto flex w-full flex-col gap-2 p-5">
                <span className="text-xs font-semibold uppercase tracking-wider text-sky-200">Избранная подборка</span>
                <span className="font-display text-2xl font-extrabold leading-tight sm:text-3xl">{featured.title}</span>
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
            <div className="flex min-h-[12rem] h-full items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white text-sm text-slate-400">
              Подборки скоро появятся
            </div>
          )}

          {trending.length ? (
            <div className="flex h-full min-h-[14rem] flex-col self-stretch rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:min-h-[16rem]">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">В тренде</p>
              <ul className="space-y-2">
                {trending.map((item, index) => (
                  <li key={item.slug}>
                    <Link
                      href={landingCategoryHref(item.slug, citySlug !== 'all' ? citySlug : undefined)}
                      className="flex items-start gap-2 rounded-xl px-2 py-1.5 transition hover:bg-slate-50"
                    >
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                        {index + 1}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-slate-900">{item.title}</span>
                        <span className="text-xs text-slate-500">{pluralEvents(item.events)}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </HeroLayout>

      <div className="container-page bg-slate-50 py-10 sm:py-12">
        <section>
          <h2 className="font-display text-xl font-bold text-slate-900">Быстрые подборки</h2>
          <div className="mt-3 flex flex-nowrap gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {CATALOG_PRESETS.map((preset) => (
              <Link
                key={preset.slug}
                href={buildCatalogPresetHref(preset.slug, citySlug !== 'all' ? citySlug : undefined)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary-700"
              >
                <span className="text-base leading-none" aria-hidden>
                  {preset.emoji}
                </span>
                {preset.label}
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h2 className="font-display flex items-center gap-2 text-xl font-bold text-slate-900">
                <Sparkles className="h-5 w-5 text-primary" />
                Популярные запросы
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Речные прогулки, развод мостов, стендап, автобусные экскурсии и тематические подборки - выберите город
                для актуального списка.
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
          {items.length ? (
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((landing) => (
                <LandingDirectionCard key={landing.slug} landing={landing} citySlug={citySlug} />
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white py-12 text-center">
              <p className="text-lg text-slate-500">
                {citySlug === 'all'
                  ? 'Популярные запросы скоро появятся'
                  : `В ${cityName} пока нет подборок с событиями`}
              </p>
              <p className="mt-1 text-sm text-slate-400">
                {citySlug === 'all'
                  ? 'Пока доступны быстрые фильтры и теги ниже'
                  : 'Попробуйте другой город или смотрите каталог целиком'}
              </p>
            </div>
          )}
        </section>

        {tags.length ? (
          <section className="mt-12">
            <h2 className="font-display text-xl font-bold text-slate-900">По тегам</h2>
            <p className="mt-1 text-sm text-slate-500">Уточните тему - откроется тематическая подборка или каталог</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Link
                  key={tag.name}
                  href={buildCatalogTagHref(tag.name, citySlug !== 'all' ? citySlug : undefined)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-primary/40 hover:text-primary-700"
                >
                  #{tag.name}
                  <span className="text-xs text-slate-400">{formatNumber(tag.events)}</span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

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
