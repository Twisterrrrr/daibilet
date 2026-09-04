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
import { pluralEvents, pluralPoints, pluralVenues } from '@/lib/format';
import { buildPodborkiCityHref } from '@/lib/podborki-city-seo';
import type { CityInfoEntry } from '@/lib/cityInfo';
import type { resolveCityHubConfig } from '@/lib/city-hub-config';
import type { PublicCityDto, PublicCityPageDto } from '@daibilet/contracts/public';

function cityInPrepositional(city: PublicCityDto) {
  const name = String(city.name || '').trim();
  if (!name) return 'в городе';
  return inCityPrepositional(name);
}

/** Lovable-inspired night hero for city hubs (photo right + navy left). */
export function CityHeroStrip({
  city,
  stats,
  guide,
  hasTravel,
  hubConfig = null,
  editorial = false,
}: {
  city: PublicCityDto;
  stats: PublicCityPageDto['stats'];
  guide: CityInfoEntry | null;
  hasTravel: boolean;
  hubConfig?: ReturnType<typeof resolveCityHubConfig> | null;
  editorial?: boolean;
  /** @deprecated Mobile jump chips removed (owner). */
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
  const collectionsHref = citySlug ? buildPodborkiCityHref(citySlug) : '/podborki';
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
          <div className="container-page py-8 sm:py-10">
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
              <h1 className="font-display text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
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
                    {pluralPoints(guidePlaces)} в гиде
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
                  className="hidden h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 hover:border-slate-300 md:inline-flex"
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
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
          <div className={CITY_NIGHT_HERO.mediaShell}>
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
            <div className={CITY_NIGHT_HERO.surfaceOverlay} />
          </div>
        </div>

        <div className={CITY_NIGHT_HERO.content}>
          <div className={CITY_NIGHT_HERO.contentInner}>
            <nav
              aria-label="Хлебные крошки"
              className="mb-4 flex flex-wrap items-center gap-1.5 text-sm text-navy-foreground/70"
            >
              {breadcrumbItems.map((item, index) => {
                const isLast = index === breadcrumbItems.length - 1;
                return (
                  <React.Fragment key={`${item.label}:${index}`}>
                    {index > 0 ? (
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-navy-foreground/35" aria-hidden />
                    ) : null}
                    {item.href && !isLast ? (
                      <Link href={item.href} className="shrink-0 transition hover:text-navy-foreground">
                        {item.label}
                      </Link>
                    ) : (
                      <span className={`min-w-0 truncate ${isLast ? 'text-navy-foreground' : ''}`}>
                        {item.label}
                      </span>
                    )}
                  </React.Fragment>
                );
              })}
            </nav>

            {regionBadge || seasonChip ? (
              <div className="mb-3 flex flex-wrap items-center gap-2">
                {regionBadge ? (
                  <span className="inline-flex items-center rounded-full bg-navy-foreground/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-navy-foreground/85 ring-1 ring-inset ring-navy-foreground/15">
                    {regionBadge}
                  </span>
                ) : null}
                {seasonChip ? (
                  <span className="inline-flex items-center rounded-full bg-navy-foreground/10 px-3 py-1 text-xs font-semibold text-navy-foreground/90 ring-1 ring-inset ring-navy-foreground/20">
                    {seasonChip.label}
                    {seasonChip.monthsHint ? ` (${seasonChip.monthsHint})` : ''}
                  </span>
                ) : null}
              </div>
            ) : null}

            <h1 className="font-display text-4xl font-extrabold tracking-tight text-navy-foreground sm:text-5xl md:text-6xl">
              {city.name}
            </h1>
            {brief ? (
              <p className="mt-3 max-w-xl text-base leading-relaxed text-navy-foreground/80 sm:text-lg">
                {brief}
              </p>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="inline-flex rounded-full bg-navy-foreground/15 px-3 py-1.5 text-sm font-semibold text-navy-foreground ring-1 ring-navy-foreground/20 backdrop-blur-sm">
                {pluralEvents(stats.events)}
              </span>
              <span className="inline-flex rounded-full bg-navy-foreground/15 px-3 py-1.5 text-sm font-semibold text-navy-foreground ring-1 ring-navy-foreground/20 backdrop-blur-sm">
                {pluralVenues(stats.venues)}
              </span>
              {guidePlaces > 0 ? (
                <span className="inline-flex rounded-full bg-navy-foreground/15 px-3 py-1.5 text-sm font-semibold text-navy-foreground ring-1 ring-navy-foreground/20 backdrop-blur-sm">
                  {pluralPoints(guidePlaces)} в гиде
                </span>
              ) : null}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={afficheHref}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-card px-6 py-3.5 text-sm font-semibold text-navy-deep shadow-[0_2px_6px_oklch(29%_0.13_264/0.08),0_20px_40px_-20px_oklch(29%_0.13_264/0.28)] transition-transform hover:scale-[1.03] active:scale-95"
              >
                <Ticket className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                <span>Афиша событий</span>
              </Link>
              <Link
                href={collectionsHref}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-navy-foreground/12 px-6 py-3.5 text-sm font-semibold text-navy-foreground ring-1 ring-inset ring-navy-foreground/25 transition-colors hover:bg-navy-foreground/20"
              >
                Подборки событий
              </Link>
              <button
                type="button"
                onClick={() => void shareCity()}
                aria-label={shareCopied ? 'Ссылка скопирована' : 'Поделиться'}
                title={shareCopied ? 'Ссылка скопирована' : 'Поделиться'}
                className="hidden size-11 items-center justify-center rounded-full text-navy-foreground/75 ring-1 ring-inset ring-navy-foreground/20 transition-colors hover:bg-navy-foreground/15 hover:text-navy-foreground md:inline-flex"
              >
                <Share2 className="h-[18px] w-[18px]" aria-hidden />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
