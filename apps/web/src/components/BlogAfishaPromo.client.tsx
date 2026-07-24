'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Ticket } from 'lucide-react';

import { useSelectedCityOptional } from '@/components/SelectedCityProvider.client';
import { catalogHrefWithSelectedCity } from '@/lib/catalog-url';
import { resolveCityCardImage } from '@/lib/city-images';
import { formatNumber, pluralEvents } from '@/lib/format';
import { landingCategoryHref, normalizeKnownCitySlug } from '@/lib/landing-routes';
import {
  lookupBlogSidebarPromo,
  type BlogSidebarPromoDto,
} from '@/lib/blog-sidebar-promo';

const FALLBACK_IMAGE = '/images/blog/blog-hero-promo.jpg';
const BANNER_IMAGE_SIZES = '(max-width: 768px) 100vw, 36vw';

type BlogAfishaPromoProps = {
  promos: Record<string, BlogSidebarPromoDto>;
  /** Featured article city - fallback when geo is «Все города» or unknown. */
  fallbackCityName?: string | null;
  fallbackCitySlug?: string | null;
};

function litePromoFromDestination(input: {
  name: string;
  slug?: string | null;
  sourceSlug?: string | null;
  events?: number;
  hubTags?: Array<{ slug?: string | null; label: string; kind: string }>;
}): BlogSidebarPromoDto {
  const citySlug =
    normalizeKnownCitySlug(input.slug) ||
    normalizeKnownCitySlug(input.sourceSlug) ||
    String(input.slug || input.sourceSlug || '').trim().toLowerCase() ||
    'city';
  const chips = (input.hubTags || []).slice(0, 2).map((tag) => ({
    label: tag.label,
    href:
      tag.kind === 'landing' && tag.slug
        ? landingCategoryHref(tag.slug, citySlug)
        : catalogHrefWithSelectedCity(input.name, tag.label ? { category: tag.label } : {}),
  }));

  return {
    cityName: input.name,
    citySlug,
    href: catalogHrefWithSelectedCity(input.name),
    priceFrom: null,
    weekendCount: 0,
    eventsCount: input.events || 0,
    upcomingTitles: [],
    imageUrl: resolveCityCardImage({
      slug: input.slug,
      sourceSlug: input.sourceSlug,
      name: input.name,
    }),
    chips,
  };
}

function resolveActivePromo(
  promos: Record<string, BlogSidebarPromoDto>,
  selected: ReturnType<typeof useSelectedCityOptional>,
  fallbackCityName?: string | null,
  fallbackCitySlug?: string | null,
): BlogSidebarPromoDto | null {
  const cityReady = selected?.cityReady ?? true;
  const cityValue = selected?.cityValue;
  const dest = selected?.selectedDestination;

  if (cityReady && cityValue && cityValue !== 'all') {
    const fromMap = lookupBlogSidebarPromo(promos, [
      dest?.slug,
      dest?.sourceSlug,
      dest?.name,
      cityValue,
      selected?.cityLabel,
    ]);
    if (fromMap) return fromMap;
    if (dest?.name) {
      return litePromoFromDestination({
        name: dest.name,
        slug: dest.slug,
        sourceSlug: dest.sourceSlug,
        events: dest.events,
        hubTags: dest.hubTags,
      });
    }
    return litePromoFromDestination({ name: cityValue });
  }

  return (
    lookupBlogSidebarPromo(promos, [fallbackCitySlug, fallbackCityName]) ||
    Object.values(promos)[0] ||
    null
  );
}

export function BlogAfishaPromo({
  promos,
  fallbackCityName,
  fallbackCitySlug,
}: BlogAfishaPromoProps) {
  const selectedCity = useSelectedCityOptional();
  const promo = resolveActivePromo(promos, selectedCity, fallbackCityName, fallbackCitySlug);

  if (!promo) {
    return (
      <section
        aria-label="Афиша"
        className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 text-white shadow-sm"
      >
        <Link
          href="/events"
          className="group flex flex-col sm:flex-row sm:items-stretch"
        >
          <div className="relative aspect-[16/9] w-full shrink-0 sm:aspect-auto sm:w-[38%] sm:min-h-[10.5rem]">
            <Image
              src={FALLBACK_IMAGE}
              alt=""
              fill
              sizes={BANNER_IMAGE_SIZES}
              className="object-cover opacity-80 transition duration-500 group-hover:scale-105"
            />
          </div>
          <div className="flex flex-1 items-center justify-between gap-4 p-5 sm:p-6">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">Афиша</p>
              <p className="mt-1 font-display text-xl font-bold sm:text-2xl">Смотреть события</p>
            </div>
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 transition group-hover:bg-white/25">
              <ArrowRight className="h-4 w-4" aria-hidden />
            </span>
          </div>
        </Link>
      </section>
    );
  }

  const imageSrc = promo.imageUrl || FALLBACK_IMAGE;
  const priceLine =
    typeof promo.priceFrom === 'number' && promo.priceFrom >= 100
      ? `Билеты от ${formatNumber(promo.priceFrom)} ₽`
      : promo.eventsCount > 0
        ? pluralEvents(promo.eventsCount)
        : null;
  const weekendLine =
    promo.weekendCount > 0 ? `${formatNumber(promo.weekendCount)} на выходных` : null;
  const valueLine = [priceLine, weekendLine].filter(Boolean).join(' · ');

  return (
    <section
      aria-label={`Афиша: ${promo.cityName}`}
      className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 text-white shadow-sm"
    >
      <div className="flex flex-col sm:flex-row sm:items-stretch">
        <Link
          href={promo.href}
          aria-label={`Афиша: ${promo.cityName}`}
          className="relative block aspect-[16/9] w-full shrink-0 overflow-hidden sm:aspect-auto sm:w-[38%] sm:min-h-[11rem]"
        >
          <Image
            src={imageSrc}
            alt=""
            fill
            sizes={BANNER_IMAGE_SIZES}
            className="object-cover transition duration-500 hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent sm:bg-gradient-to-r sm:from-transparent sm:to-black/25" />
        </Link>

        <div className="flex flex-1 flex-col justify-center gap-2.5 p-5 sm:gap-3 sm:p-6 lg:pr-7">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">
                События города
              </p>
              <h2 className="mt-0.5 font-display text-xl font-bold leading-snug sm:text-2xl">
                <Link href={promo.href} className="hover:text-white/95">
                  Афиша: {promo.cityName}
                </Link>
              </h2>
            </div>
            <Link
              href={promo.href}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 transition hover:bg-white/25"
              aria-label={`Открыть афишу: ${promo.cityName}`}
            >
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>

          {valueLine ? (
            <Link
              href={promo.href}
              className="inline-flex max-w-full items-center gap-1.5 text-sm font-semibold text-amber-200 hover:text-amber-100"
            >
              <Ticket className="h-4 w-4 shrink-0" aria-hidden />
              <span className="line-clamp-1">{valueLine}</span>
            </Link>
          ) : null}

          {promo.upcomingTitles.length ? (
            <ul className="space-y-1 text-sm leading-snug text-white/85">
              {promo.upcomingTitles.map((title) => (
                <li key={title} className="line-clamp-1">
                  <Link href={promo.href} className="hover:text-white">
                    {title}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            {promo.chips.length ? (
              <ul className="flex flex-wrap gap-1.5" aria-label="Популярные направления">
                {promo.chips.map((chip) => (
                  <li key={`${chip.href}:${chip.label}`}>
                    <Link
                      href={chip.href}
                      className="inline-flex max-w-full truncate rounded-md bg-white/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white ring-1 ring-white/20 transition hover:bg-white/25"
                    >
                      {chip.label}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
            <Link
              href={promo.href}
              className="ml-auto inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
            >
              Смотреть афишу
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
