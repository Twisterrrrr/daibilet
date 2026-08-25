'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { useSelectedCityOptional } from '@/components/SelectedCityProvider.client';
import { SafeImage } from '@/components/SafeImage.client';
import { catalogHrefWithSelectedCity } from '@/lib/catalog-url';
import { resolveCityCardImage } from '@/lib/city-images';
import { cityToGenitive } from '@/lib/city-declension';
import { formatPriceFrom } from '@/lib/format';
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

export function resolveActiveBlogAfishaPromo(
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

export function blogAfishaGuideTitle(cityName: string): string {
  const genitive = cityToGenitive(cityName);
  return `Гид по лучшим событиям ${genitive}`;
}

function richMetaLine(promo: BlogSidebarPromoDto): string | null {
  const parts: string[] = [];
  const price = formatPriceFrom(promo.priceFrom);
  if (price) parts.push(price);
  if (promo.weekendCount > 0) parts.push(`${promo.weekendCount} на выходных`);
  else if (promo.eventsCount > 0) parts.push(`${promo.eventsCount} событий`);
  return parts.length ? parts.join(' · ') : null;
}

export function BlogAfishaPromo({
  promos,
  fallbackCityName,
  fallbackCitySlug,
}: BlogAfishaPromoProps) {
  const selectedCity = useSelectedCityOptional();
  const promo = resolveActiveBlogAfishaPromo(
    promos,
    selectedCity,
    fallbackCityName,
    fallbackCitySlug,
  );

  if (!promo) {
    return (
      <section
        aria-label="Афиша"
        className="group relative mt-auto flex min-h-[18rem] flex-1 overflow-hidden rounded-2xl bg-slate-900 text-white shadow-sm"
      >
        <SafeImage
          src={FALLBACK_IMAGE}
          alt=""
          fill
          sizes={SIDEBAR_IMAGE_SIZES}
          className="object-cover opacity-80 transition duration-500 group-hover:scale-105"
          fallback={<div className="absolute inset-0 bg-slate-800" aria-hidden />}
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/10"
          aria-hidden
        />
        <div className="relative mt-auto flex w-full flex-col gap-3 p-5 sm:p-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-white/75">Афиша</p>
          <h2 className="font-display text-xl font-bold leading-snug text-white sm:text-2xl">
            Гид по лучшим событиям
          </h2>
          <Link
            href="/events"
            className="inline-flex w-fit items-center justify-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
          >
            Смотреть афишу
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </section>
    );
  }

  const imageSrc = promo.imageUrl || FALLBACK_IMAGE;
  const title = blogAfishaGuideTitle(promo.cityName);
  const meta = richMetaLine(promo);
  const chips = (promo.chips || []).slice(0, 2);

  return (
    <section
      aria-label={title}
      className="group relative mt-auto flex min-h-[18rem] flex-1 overflow-hidden rounded-2xl bg-slate-900 text-white shadow-sm"
    >
      <SafeImage
        src={imageSrc}
        alt=""
        fill
        sizes={SIDEBAR_IMAGE_SIZES}
        className="object-cover opacity-80 transition duration-500 group-hover:scale-105"
        fallback={
          <SafeImage
            src={FALLBACK_IMAGE}
            alt=""
            fill
            sizes={SIDEBAR_IMAGE_SIZES}
            className="object-cover opacity-80"
            fallback={<div className="absolute inset-0 bg-slate-800" aria-hidden />}
          />
        }
      />
      {/* Rich A: dense full-height gradient, no glass */}
      <div
        className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/10"
        aria-hidden
      />
      <div className="relative mt-auto flex w-full flex-col gap-3 p-5 sm:p-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-white/75">
          Афиша · {promo.cityName}
        </p>
        <h2 className="font-display text-xl font-bold leading-snug text-white sm:text-2xl">
          <Link href={promo.href} className="hover:text-white/95">
            {title}
          </Link>
        </h2>
        {meta ? <p className="text-sm font-semibold text-white/90">{meta}</p> : null}
        {chips.length ? (
          <div className="flex flex-wrap gap-1.5">
            {chips.map((chip) => (
              <Link
                key={`${chip.href}-${chip.label}`}
                href={chip.href}
                className="inline-flex rounded-full border border-white/25 bg-white/15 px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-white/25"
              >
                {chip.label}
              </Link>
            ))}
          </div>
        ) : null}
        <Link
          href={promo.href}
          className="inline-flex w-fit items-center justify-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
        >
          Смотреть афишу
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
