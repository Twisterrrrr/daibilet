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
const SIDEBAR_IMAGE_SIZES = '(max-width: 1024px) 100vw, 22vw';

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

function valueLineFor(promo: BlogSidebarPromoDto): string | null {
  const priceLine =
    typeof promo.priceFrom === 'number' && promo.priceFrom >= 100
      ? `Билеты от ${formatNumber(promo.priceFrom)} ₽`
      : promo.eventsCount > 0
        ? pluralEvents(promo.eventsCount)
        : null;
  const weekendLine =
    promo.weekendCount > 0 ? `${formatNumber(promo.weekendCount)} на выходных` : null;
  const line = [priceLine, weekendLine].filter(Boolean).join(' · ');
  return line || null;
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
        className="group relative mt-auto flex min-h-[11rem] flex-1 overflow-hidden rounded-2xl bg-slate-900 text-white shadow-sm"
      >
        <Image
          src={FALLBACK_IMAGE}
          alt=""
          fill
          sizes={SIDEBAR_IMAGE_SIZES}
          className="object-cover opacity-80 transition duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/10" />
        <Link
          href="/events"
          className="relative mt-auto flex w-full items-end justify-between gap-3 p-4 sm:p-5"
        >
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">Афиша</p>
            <p className="mt-1 font-display text-lg font-bold leading-snug text-white sm:text-xl">Смотреть события</p>
          </div>
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 backdrop-blur transition group-hover:bg-white/25">
            <ArrowRight className="h-4 w-4" aria-hidden />
          </span>
        </Link>
      </section>
    );
  }

  const imageSrc = promo.imageUrl || FALLBACK_IMAGE;
  const valueLine = valueLineFor(promo);

  return (
    <section
      aria-label={`Афиша: ${promo.cityName}`}
      className="mt-auto flex min-h-[14rem] flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 text-white shadow-sm"
    >
      <Link
        href={promo.href}
        aria-label={`Афиша: ${promo.cityName}`}
        className="relative block aspect-[5/3] w-full shrink-0 overflow-hidden"
      >
        <Image
          src={imageSrc}
          alt=""
          fill
          sizes={SIDEBAR_IMAGE_SIZES}
          className="object-cover transition duration-500 hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-4 sm:p-5">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">
            События города
          </p>
          <h2 className="mt-0.5 font-display text-lg font-bold leading-snug text-white sm:text-xl">
            <Link href={promo.href} className="text-white hover:text-white/95">
              Афиша: {promo.cityName}
            </Link>
          </h2>
        </div>

        {valueLine ? (
          <Link
            href={promo.href}
            className="inline-flex max-w-full items-center gap-1.5 text-sm font-semibold text-amber-200 hover:text-amber-100"
          >
            <Ticket className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="line-clamp-2">{valueLine}</span>
          </Link>
        ) : null}

        {promo.upcomingTitles.length ? (
          <ul className="space-y-1 text-[13px] leading-snug text-white/85">
            {promo.upcomingTitles.map((title) => (
              <li key={title} className="line-clamp-1">
                <Link href={promo.href} className="text-white/85 hover:text-white">
                  {title}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}

        {promo.chips.length ? (
          <ul className="flex flex-wrap gap-1.5" aria-label="Популярные направления">
            {promo.chips.map((chip) => (
              <li key={`${chip.href}:${chip.label}`}>
                <Link
                  href={chip.href}
                  className="inline-flex max-w-full truncate rounded-md bg-white/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white ring-1 ring-white/20 transition hover:bg-white/25"
                >
                  {chip.label}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}

        <Link
          href={promo.href}
          className="mt-auto inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
        >
          Смотреть афишу
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
