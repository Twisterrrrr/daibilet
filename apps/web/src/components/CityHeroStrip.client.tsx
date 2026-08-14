'use client';

import * as React from 'react';
import { ChevronRight, Share2, Ticket } from 'lucide-react';
import Link from 'next/link';

import { PageBreadcrumbBar } from '@/components/PageBreadcrumbs';
import { SafeImage } from '@/components/SafeImage.client';
import { buildCatalogHref } from '@/lib/catalog-url';
import { resolveCityHeroRegionBadge } from '@/lib/city-hero-region';
import { resolveCityImageObjectPosition } from '@/lib/city-image-focus';
import { resolveCityImage } from '@/lib/city-images';
import { CITY_NIGHT_HERO } from '@/lib/city-night-hero';
import { inCityPrepositional } from '@/lib/city-declension';
import { pluralEvents, pluralPlaces, pluralVenues } from '@/lib/format';
import type { CityInfoEntry } from '@/lib/cityInfo';
import type { resolveCityHubConfig } from '@/lib/city-hub-config';
import type { PublicCityDto, PublicCityPageDto } from '@daibilet/contracts/public';

function cityInPrepositional(city: PublicCityDto) {
  const name = String(city.name || '').trim();
  if (!name) return 'в городе';
  return inCityPrepositional(name);
}

function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/** Lovable-inspired full-bleed night hero for city hubs. */
export function CityHeroStrip({
  city,
  stats,
  guide,
  hasTravel,
  hubConfig = null,
  editorial = false,
  jumpChips = [],
}: {
  city: PublicCityDto;
  stats: PublicCityPageDto['stats'];
  guide: CityInfoEntry | null;
  hasTravel: boolean;
  hubConfig?: ReturnType<typeof resolveCityHubConfig> | null;
  editorial?: boolean;
  jumpChips?: Array<{ id: string; label: string }>;
}) {
  const [heroImageFailed, setHeroImageFailed] = React.useState(false);
  const [shareCopied, setShareCopied] = React.useState(false);
  const cityIn = cityInPrepositional(city);
  const citySlug = city.slug || city.sourceSlug || undefined;
  const brief =
    guide?.brief?.trim() ||
    `Экскурсии, музеи, мероприятия и активный отдых ${cityIn}. Выбирайте формат и дату - и покупайте билет онлайн на Дайбилете.`;
  const afficheHref = citySlug
    ? buildCatalogHref({ city: citySlug, sort: 'popular' })
    : '#affiche';
  const collectionsHref = citySlug
    ? `/podborki?city=${encodeURIComponent(citySlug)}`
    : '/podborki';
  const seasonChip = hubConfig?.highlightSeason;
  const regionBadge = resolveCityHeroRegionBadge(city);
  const guidePlaces = guide?.mustSee?.length || 0;
  const heroImage = resolveCityImage({
    slug: city.slug,
    sourceSlug: city.sourceSlug,
    name: city.name,
    heroImageUrl: city.heroImageUrl,
  });

  React.useEffect(() => {
    setHeroImageFailed(false);
  }, [heroImage]);

  void hasTravel;

  const nightShell = Boolean(heroImage);
  const showPhoto = Boolean(heroImage && !heroImageFailed);
  const heroFocus = resolveCityImageObjectPosition({
    slug: city.slug,
    sourceSlug: city.sourceSlug,
    name: city.name,
  });

  const shareCity = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title: city.name, url });
        return;
      }
      if (url && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setShareCopied(true);
        window.setTimeout(() => setShareCopied(false), 1800);
      }
    } catch {
      /* cancelled */
    }
  };

  const breadcrumbItems = [
    { label: 'Главная', href: '/' },
    { label: city.type === 'region' ? 'Направления' : 'Города', href: '/cities' },
    { label: city.name },
  ];

  if (!nightShell) {
    return (
      <div id="about" data-city-hero>
        <PageBreadcrumbBar items={breadcrumbItems} />
        <section
          className={
            editorial ? 'border-b border-zinc-200 bg-zinc-50' : 'border-b border-slate-200 bg-slate-50'
          }
        >
          <div className="mx-auto w-full max-w-[1240px] px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
            <div className="max-w-3xl">
              {regionBadge ? (
                <p
                  className={
                    editorial
                      ? 'mb-3 inline-flex rounded-full bg-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-800'
                      : 'mb-3 inline-flex rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-800'
                  }
                >
                  {regionBadge}
                </p>
              ) : null}
              <h1
                className={
                  editorial
                    ? 'font-serif text-4xl font-semibold tracking-tight text-zinc-950 sm:text-5xl'
                    : 'font-display text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl md:text-5xl'
                }
              >
                {city.name}
              </h1>
              {brief ? (
                <p
                  className={
                    editorial
                      ? 'mt-3 max-w-2xl text-base leading-relaxed text-zinc-600 sm:text-lg'
                      : 'mt-3 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg'
                  }
                >
                  {brief}
                </p>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="inline-flex rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 ring-1 ring-slate-200">
                  {pluralEvents(stats.events)}
                </span>
                <span className="inline-flex rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 ring-1 ring-slate-200">
                  {pluralVenues(stats.venues)}
                </span>
                {guidePlaces > 0 ? (
                  <span className="inline-flex rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 ring-1 ring-slate-200">
                    {pluralPlaces(guidePlaces)} в гиде
                  </span>
                ) : null}
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href={afficheHref}
                  className={
                    editorial
                      ? 'inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800'
                      : 'inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-primary-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700'
                  }
                >
                  <Ticket className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>Афиша событий</span>
                </Link>
                <Link
                  href={collectionsHref}
                  className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 hover:border-slate-300"
                >
                  Подборки событий
                </Link>
                <button
                  type="button"
                  onClick={() => void shareCity()}
                  aria-label={shareCopied ? 'Ссылка скопирована' : 'Поделиться'}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                >
                  <Share2 className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div id="about" data-city-hero>
      <section className={CITY_NIGHT_HERO.section}>
        <div
          className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
          style={{ backgroundColor: CITY_NIGHT_HERO.navyDeep }}
          aria-hidden
        >
          <div className={CITY_NIGHT_HERO.photoFrame}>
            {showPhoto ? (
              <SafeImage
                src={heroImage}
                alt=""
                fill
                priority
                sizes={CITY_NIGHT_HERO.imageSizes}
                style={{ objectPosition: heroFocus }}
                onError={() => setHeroImageFailed(true)}
                className="object-cover object-center"
              />
            ) : null}
          </div>
          <div
            className={CITY_NIGHT_HERO.leftFillDesktop}
            style={{ backgroundImage: CITY_NIGHT_HERO.fadeLeftDesktop }}
          />
          <div
            className="absolute inset-0 md:hidden"
            style={{ backgroundImage: CITY_NIGHT_HERO.fadeLeftMobile }}
          />
        </div>

        <div className={CITY_NIGHT_HERO.content}>
          <div className={CITY_NIGHT_HERO.contentInner}>
            <nav
              aria-label="Хлебные крошки"
              className="mb-4 flex flex-wrap items-center gap-1.5 text-sm text-white/70"
            >
              {breadcrumbItems.map((item, index) => {
                const isLast = index === breadcrumbItems.length - 1;
                return (
                  <React.Fragment key={`${item.label}:${index}`}>
                    {index > 0 ? (
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-white/35" aria-hidden />
                    ) : null}
                    {item.href && !isLast ? (
                      <Link href={item.href} className="shrink-0 transition hover:text-white">
                        {item.label}
                      </Link>
                    ) : (
                      <span className={`min-w-0 truncate ${isLast ? 'text-white' : ''}`}>{item.label}</span>
                    )}
                  </React.Fragment>
                );
              })}
            </nav>

            {regionBadge || seasonChip ? (
              <div className="mb-3 flex flex-wrap items-center gap-2">
                {regionBadge ? (
                  <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white ring-1 ring-white/25">
                    {regionBadge}
                  </span>
                ) : null}
                {seasonChip ? (
                  <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/90 ring-1 ring-white/20">
                    {seasonChip.label}
                    {seasonChip.monthsHint ? ` (${seasonChip.monthsHint})` : ''}
                  </span>
                ) : null}
              </div>
            ) : null}

            <h1
              className={
                editorial
                  ? 'font-serif text-4xl font-semibold tracking-tight text-white sm:text-5xl md:text-6xl'
                  : 'font-display text-4xl font-extrabold tracking-tight text-white sm:text-5xl md:text-6xl'
              }
            >
              {city.name}
            </h1>
            {brief ? (
              <p className="mt-3 max-w-xl text-base leading-relaxed text-white/85 sm:text-lg">{brief}</p>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="inline-flex rounded-full bg-white/15 px-3 py-1.5 text-sm font-semibold text-white ring-1 ring-white/20 backdrop-blur-sm">
                {pluralEvents(stats.events)}
              </span>
              <span className="inline-flex rounded-full bg-white/15 px-3 py-1.5 text-sm font-semibold text-white ring-1 ring-white/20 backdrop-blur-sm">
                {pluralVenues(stats.venues)}
              </span>
              {guidePlaces > 0 ? (
                <span className="inline-flex rounded-full bg-white/15 px-3 py-1.5 text-sm font-semibold text-white ring-1 ring-white/20 backdrop-blur-sm">
                  {pluralPlaces(guidePlaces)} в гиде
                </span>
              ) : null}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={afficheHref}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-white px-5 text-sm font-semibold text-slate-900 shadow-[0_8px_24px_rgba(0,0,0,0.18)] transition hover:bg-white/92"
              >
                <Ticket className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>Афиша событий</span>
              </Link>
              <Link
                href={collectionsHref}
                className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-white/35 bg-white/10 px-5 text-sm font-semibold text-white backdrop-blur-sm hover:bg-white/15"
              >
                Подборки событий
              </Link>
              <button
                type="button"
                onClick={() => void shareCity()}
                aria-label={shareCopied ? 'Ссылка скопирована' : 'Поделиться'}
                title={shareCopied ? 'Ссылка скопирована' : 'Поделиться'}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/35 bg-white/10 text-white backdrop-blur-sm hover:bg-white/15"
              >
                <Share2 className="h-4 w-4" aria-hidden />
              </button>
            </div>

            {jumpChips.length ? (
              <div
                className="mt-4 flex gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:hidden"
                data-city-hero-jump
              >
                {jumpChips.map((chip) => (
                  <a
                    key={chip.id}
                    href={`#${chip.id}`}
                    onClick={(event) => {
                      event.preventDefault();
                      scrollToSection(chip.id);
                      if (typeof window !== 'undefined') {
                        window.history.replaceState(null, '', `#${chip.id}`);
                      }
                    }}
                    className="shrink-0 rounded-full bg-white/20 px-3.5 py-1.5 text-xs font-semibold text-white ring-1 ring-white/35 backdrop-blur-sm"
                  >
                    {chip.label}
                  </a>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
