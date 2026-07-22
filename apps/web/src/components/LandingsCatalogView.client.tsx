'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Sparkles } from 'lucide-react';

import { CityPicker } from '@/components/CityPicker.client';
import { SectionPageHero } from '@/components/PageBreadcrumbs';
import { IMAGE_SIZES, SafeImage } from '@/components/SafeImage.client';
import { buildCatalogPresetHref, buildCatalogTagHref } from '@/lib/catalog-links';
import { CATALOG_PRESETS } from '@/lib/catalog-presets';
import { formatNumber, formatPriceFrom, pluralEvents } from '@/lib/format';
import { resolveLandingCardImage } from '@/lib/landing-images';
import { landingCategoryHref } from '@/lib/landing-routes';
import type { PublicDestinationDto } from '@daibilet/contracts/public';

type LandingCatalogItem = {
  slug: string;
  title: string;
  subtitle: string;
  events: number;
  priceFrom?: number | null;
};

const LANDING_EMOJI: Record<string, string> = {
  'river-cruises': '🚢',
  'bus-tours': '🚌',
  'river-party': '🎉',
  'bridges-night': '🌉',
  'moscow-dinner-boat': '🍽',
  'moscow-museums': '🏛',
  'spb-yards': '🏛',
  standup: '🎤',
  'new-year': '🎄',
  'salute-9-may': '🎆',
  'family-kids': '🎪',
  'concerts-genre': '🎸',
  'active-sport': '🏎',
};

function formatLandingPrice(value?: number | null): string {
  if (!value || value <= 0) return '—';
  return formatPriceFrom(value);
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

function landingGradient(slug: string): string {
  if (slug.includes('yard') || slug.includes('paradn') || slug.includes('museum')) {
    return 'from-amber-700 via-orange-800 to-stone-900';
  }
  if (slug.includes('river') || slug.includes('bridge') || slug.includes('boat')) {
    return 'from-sky-600 via-primary-700 to-slate-900';
  }
  if (slug.includes('bus')) return 'from-amber-500 via-orange-600 to-rose-600';
  if (slug.includes('salute') || slug.includes('new-year')) {
    return 'from-violet-700 via-fuchsia-600 to-indigo-900';
  }
  if (slug.includes('standup')) return 'from-emerald-600 via-teal-600 to-cyan-800';
  if (slug.includes('family') || slug.includes('kids')) {
    return 'from-pink-500 via-rose-500 to-orange-500';
  }
  if (slug.includes('concert')) return 'from-red-600 via-rose-700 to-purple-900';
  if (slug.includes('active') || slug.includes('sport')) {
    return 'from-slate-700 via-zinc-800 to-black';
  }
  return 'from-indigo-600 via-primary to-fuchsia-700';
}

function LandingDirectionCard({
  landing,
  citySlug,
}: {
  landing: LandingCatalogItem;
  citySlug: string;
}) {
  const emoji = LANDING_EMOJI[landing.slug] || '✨';
  const imageUrl = resolveLandingCardImage(landing.slug);
  const href = landingCategoryHref(landing.slug, citySlug !== 'all' ? citySlug : undefined);

  return (
    <Link
      href={href}
      className="group relative flex h-56 flex-col justify-end overflow-hidden rounded-2xl bg-slate-900 shadow-sm ring-1 ring-slate-900/10 transition hover:-translate-y-0.5 hover:shadow-xl sm:h-60"
    >
      {imageUrl ? (
        <SafeImage
          src={imageUrl}
          alt=""
          fill
          sizes={IMAGE_SIZES.landingCard}
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        <div className={`absolute inset-0 bg-gradient-to-br ${landingGradient(landing.slug)} opacity-90`} />
      )}
      <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/20 to-transparent" />
      <div className="relative p-4 text-white sm:p-5">
        <span className="text-xl" aria-hidden>
          {emoji}
        </span>
        <h3 className="font-display mt-1 text-lg font-bold sm:text-xl">{landing.title}</h3>
        {landing.subtitle ? (
          <p className="mt-1 line-clamp-2 text-xs text-white/80 sm:text-sm">{landing.subtitle}</p>
        ) : null}
        <p className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-white/90 group-hover:text-white sm:text-sm">
          {pluralEvents(landing.events)} · {formatLandingPrice(landing.priceFrom)}
          <ArrowRight className="h-3.5 w-3.5" />
        </p>
      </div>
    </Link>
  );
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
        gradientClass="from-fuchsia-500 via-primary to-indigo-700"
        eyebrow={
          <p className="inline-flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wider text-white/80">
            <Sparkles className="h-4 w-4" />
            Тематические подборки
          </p>
        }
        title="Подборки событий"
        description="Готовые списки под настроение и повод: вечер, выходные, бюджет или редкие премьеры."
      />

      <main className="container-page bg-slate-50 py-10 sm:py-12">
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
                Речные прогулки, развод мостов, стендап, автобусные экскурсии и тематические подборки — выберите город
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
            <p className="mt-1 text-sm text-slate-500">Уточните тему — откроется каталог с фильтром по тегу</p>
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
      </main>
    </>
  );
}
