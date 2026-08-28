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
        className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm"
      >
        <Link href="/events" className="group flex flex-col">
          <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
            <SafeImage
              src={FALLBACK_IMAGE}
              alt=""
              fill
              sizes={SIDEBAR_IMAGE_SIZES}
              className="object-cover transition duration-500 group-hover:scale-[1.02]"
              fallback={<div className="absolute inset-0 bg-slate-200" aria-hidden />}
            />
          </div>
          <div className="flex flex-col gap-2.5 p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">Афиша</p>
            <h2 className="font-display text-lg font-bold leading-snug text-slate-900">
              Гид по лучшим событиям
            </h2>
            <span className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-primary-700">
              Смотреть афишу
              <ArrowRight className="h-4 w-4" aria-hidden />
            </span>
          </div>
        </Link>
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
      className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
        <SafeImage
          src={imageSrc}
          alt=""
          fill
          sizes={SIDEBAR_IMAGE_SIZES}
          className="object-cover"
          fallback={
            <SafeImage
              src={FALLBACK_IMAGE}
              alt=""
              fill
              sizes={SIDEBAR_IMAGE_SIZES}
              className="object-cover"
              fallback={<div className="absolute inset-0 bg-slate-200" aria-hidden />}
            />
          }
        />
      </div>
      <div className="flex flex-col gap-2.5 p-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
          Афиша · {promo.cityName}
        </p>
        <h2 className="font-display text-lg font-bold leading-snug text-slate-900">
          <Link href={promo.href} className="hover:text-primary-700">
            {title}
          </Link>
        </h2>
        {meta ? <p className="text-sm font-medium text-slate-600">{meta}</p> : null}
        {chips.length ? (
          <div className="flex flex-wrap gap-1.5">
            {chips.map((chip) => (
              <Link
                key={`${chip.href}-${chip.label}`}
                href={chip.href}
                className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition hover:border-primary/25 hover:bg-primary-50/50"
              >
                {chip.label}
              </Link>
            ))}
          </div>
        ) : null}
        <Link
          href={promo.href}
          className="inline-flex w-fit items-center gap-1.5 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-500"
        >
          Смотреть афишу
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
