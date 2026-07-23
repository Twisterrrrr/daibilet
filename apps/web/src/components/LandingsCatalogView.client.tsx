'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';

import { CityPicker } from '@/components/CityPicker.client';
import { LandingDirectionCard } from '@/components/LandingDirectionCard.client';
import { SectionPageHero } from '@/components/PageBreadcrumbs';
import { buildCatalogPresetHref, buildCatalogTagHref } from '@/lib/catalog-links';
import { CATALOG_PRESETS } from '@/lib/catalog-presets';
import { formatNumber } from '@/lib/format';
import type { PublicDestinationDto } from '@daibilet/contracts/public';

type LandingCatalogItem = {
  slug: string;
  title: string;
  subtitle: string;
  events: number;
  priceFrom?: number | null;
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
      <SectionPageHero
        breadcrumbs={[{ label: 'Главная', href: '/' }, { label: 'Подборки' }]}
        title="Подборки событий"
        description="Готовые списки под настроение и повод: вечер, выходные, бюджет или редкие премьеры."
      />

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
            <p className="mt-1 text-sm text-slate-500">
              Уточните тему - откроется тематическая подборка или каталог
            </p>
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
          Всего в каталоге{' '}
          <span className="font-semibold text-slate-900">{formatNumber(totalEvents)}</span> событий. Ищите подходящее
          по фильтрам в{' '}
          <Link href="/events" className="font-medium text-primary-600 hover:text-primary-700">
            каталоге
          </Link>
          .
        </p>
      </div>
    </>
  );
}
