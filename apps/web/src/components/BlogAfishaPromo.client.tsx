'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { useSelectedCityOptional } from '@/components/SelectedCityProvider.client';
import { SafeImage } from '@/components/SafeImage.client';
import { catalogHrefWithSelectedCity } from '@/lib/catalog-url';
import { resolveCityCardImage } from '@/lib/city-images';
import { cityToGenitive } from '@/lib/city-declension';
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

function guideTitleFor(cityName: string): string {
  const genitive = cityToGenitive(cityName);
  return `Гид по лучшим событиям ${genitive}`;
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
        className="group relative mt-auto overflow-hidden rounded-2xl bg-slate-900 text-white shadow-sm aspect-[4/5] max-h-[22rem]"
      >
        <SafeImage
          src={FALLBACK_IMAGE}
          alt=""
          fill
          sizes={SIDEBAR_IMAGE_SIZES}
          className="object-cover opacity-90 transition duration-500 group-hover:scale-105"
          fallback={<div className="absolute inset-0 bg-slate-800" aria-hidden />}
        />
        {/* Scrim ~1/4 снизу — фото остаётся видимым */}
        <div className="absolute inset-x-0 bottom-0 h-[28%] bg-gradient-to-t from-black/80 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
          <div className="rounded-xl border border-white/20 bg-slate-950/45 p-3 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-slate-950/35">
            <h2 className="font-display text-base font-bold leading-snug text-white sm:text-lg">
              Гид по лучшим событиям
            </h2>
            <Link
              href="/events"
              className="mt-2.5 inline-flex w-fit items-center justify-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
            >
              Смотреть афишу
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const imageSrc = promo.imageUrl || FALLBACK_IMAGE;
  const title = guideTitleFor(promo.cityName);

  return (
    <section
      aria-label={title}
      className="group relative mt-auto overflow-hidden rounded-2xl bg-slate-900 text-white shadow-sm aspect-[4/5] max-h-[22rem]"
    >
      <SafeImage
        src={imageSrc}
        alt=""
        fill
        sizes={SIDEBAR_IMAGE_SIZES}
        className="object-cover transition duration-500 group-hover:scale-105"
        fallback={
          <SafeImage
            src={FALLBACK_IMAGE}
            alt=""
            fill
            sizes={SIDEBAR_IMAGE_SIZES}
            className="object-cover"
            fallback={<div className="absolute inset-0 bg-slate-800" aria-hidden />}
          />
        }
      />
      <div className="absolute inset-x-0 bottom-0 h-[28%] bg-gradient-to-t from-black/80 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
        <div className="rounded-xl border border-white/20 bg-slate-950/45 p-3 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-slate-950/35">
          <h2 className="font-display text-base font-bold leading-snug text-white sm:text-lg">
            <Link href={promo.href} className="hover:text-white/95">
              {title}
            </Link>
          </h2>
          <Link
            href={promo.href}
            className="mt-2.5 inline-flex w-fit items-center justify-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
          >
            Смотреть афишу
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
