'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useCallback, useEffect, useState, type SyntheticEvent } from 'react';

import {
  blogAfishaGuideTitle,
} from '@/components/BlogAfishaPromo.client';
import {
  HORIZONTAL_PROMO_MIN_RATIO,
  resolveHorizontalFeedPromoImage,
} from '@/lib/blog-promo-image';
import { formatPriceFrom, pluralEvents } from '@/lib/format';
import type { BlogSidebarPromoDto } from '@/lib/blog-sidebar-promo';
import type { BlogFeedPromoKind, BlogFeedPromoLayout } from '@/lib/blog-feed-promo';

const FALLBACK_IMAGE = '/images/blog/blog-hero-promo.jpg';
const FEED_IMAGE_SIZES = '(max-width: 768px) 100vw, 380px';

type BlogFeedPromoProps = {
  promo: BlogSidebarPromoDto;
  kind: BlogFeedPromoKind;
  layout: BlogFeedPromoLayout;
};

type ResolvedCopy = {
  eyebrow: string;
  cityTag: string;
  citySlug: string;
  title: string;
  excerpt: string;
  href: string;
  cta: string;
  meta: string[];
  imageSrc: string;
  imageFallback: string;
  probeEventCover: boolean;
};

function resolveCopy(promo: BlogSidebarPromoDto, kind: BlogFeedPromoKind): ResolvedCopy {
  const cityImageUrl = promo.imageUrl || FALLBACK_IMAGE;
  const citySlug = String(promo.citySlug || '').trim().toLowerCase();
  const { src, probeEventCover } = resolveHorizontalFeedPromoImage({
    kind,
    cityImageUrl: promo.imageUrl,
    eventImageUrl: promo.featuredEventImageUrl,
    fallback: FALLBACK_IMAGE,
  });
  const price = formatPriceFrom(promo.priceFrom);
  const chip = promo.chips?.[0];
  const eventTitle = String(promo.upcomingTitles?.[0] || '').trim();
  const eventsLabel = promo.eventsCount > 0 ? pluralEvents(promo.eventsCount) : null;

  if (kind === 'landing' && chip) {
    return {
      eyebrow: 'Подборка',
      cityTag: promo.cityName,
      citySlug,
      title: `${chip.label} в ${promo.cityName}`,
      excerpt: price
        ? `${price} - готовый список без бесконечного скролла.`
        : `Готовый список в ${promo.cityName} без бесконечного скролла.`,
      href: chip.href,
      cta: 'Открыть подборку',
      meta: [price, eventsLabel].filter(Boolean) as string[],
      imageSrc: src,
      imageFallback: cityImageUrl,
      probeEventCover: false,
    };
  }

  if (kind === 'event' && eventTitle) {
    return {
      eyebrow: 'Афиша',
      cityTag: promo.cityName,
      citySlug,
      title: eventTitle,
      excerpt: price
        ? `${price} - ближайшая дата в афише ${promo.cityName}.`
        : `Ближайшая дата в афише ${promo.cityName}.`,
      href: promo.featuredEventHref || promo.href,
      cta: 'К билетам',
      meta: [price, eventsLabel].filter(Boolean) as string[],
      imageSrc: src,
      imageFallback: cityImageUrl,
      probeEventCover: probeEventCover,
    };
  }

  // Generic city afisha (no named event) - same voice as a guide article card.
  const titles = (promo.upcomingTitles || []).slice(0, 2).filter(Boolean);
  return {
    eyebrow: 'Афиша',
    cityTag: promo.cityName,
    citySlug,
    title: blogAfishaGuideTitle(promo.cityName),
    excerpt: titles.length
      ? `${titles.join(' · ')}.`
      : price
        ? `${price} - концерты, прогулки и живые даты без очереди в чатах.`
        : `Концерты, прогулки и живые даты в ${promo.cityName} без очереди в чатах.`,
    href: promo.href,
    cta: 'Смотреть афишу',
    meta: [price, eventsLabel].filter(Boolean) as string[],
    imageSrc: src,
    imageFallback: cityImageUrl,
    probeEventCover: false,
  };
}

function FeedPromoImage({
  src,
  fallback,
  probeEventCover,
  sizes,
  className = 'object-cover transition-transform duration-500 group-hover:scale-[1.02]',
}: {
  src: string;
  fallback: string;
  probeEventCover: boolean;
  sizes: string;
  className?: string;
}) {
  const [activeSrc, setActiveSrc] = useState(src);

  useEffect(() => {
    setActiveSrc(src);
  }, [src]);

  const handleLoad = useCallback(
    (event: SyntheticEvent<HTMLImageElement>) => {
      if (!probeEventCover) return;
      const img = event.currentTarget;
      const { naturalWidth, naturalHeight } = img;
      if (!naturalWidth || !naturalHeight) return;
      if (naturalWidth / naturalHeight < HORIZONTAL_PROMO_MIN_RATIO) {
        setActiveSrc(fallback);
      }
    },
    [fallback, probeEventCover],
  );

  const handleError = useCallback(() => {
    setActiveSrc((current) => (current === fallback ? current : fallback));
  }, [fallback]);

  return (
    <Image
      src={activeSrc}
      alt=""
      fill
      sizes={sizes}
      className={className}
      onLoad={handleLoad}
      onError={handleError}
    />
  );
}

/** Full-image magazine tile with restrained overlay copy. */
function ArticleTileCard({ copy }: { copy: ResolvedCopy }) {
  return (
    <article className="group relative flex h-full min-h-[20rem] overflow-hidden rounded-2xl bg-slate-900 text-white shadow-sm transition duration-300 hover:shadow-md">
      <Link
        href={copy.href}
        aria-label={copy.title}
        className="absolute inset-0 block overflow-hidden bg-slate-900"
      >
        <FeedPromoImage
          src={copy.imageSrc}
          fallback={copy.imageFallback}
          probeEventCover={copy.probeEventCover}
          sizes={FEED_IMAGE_SIZES}
        />
        <span
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/45 to-transparent"
        />
      </Link>
      <div className="relative z-[1] mt-auto flex min-w-0 flex-col gap-2.5 p-5 sm:p-6">
        <div className="flex flex-wrap gap-1.5">
          <span
            className="inline-flex max-w-full truncate rounded-md bg-white/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-900 ring-1 ring-white/70 sm:text-[11px]"
          >
            {copy.eyebrow}
          </span>
          <span
            className="inline-flex max-w-full truncate rounded-md bg-sky-100/95 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-900 ring-1 ring-sky-200/80 sm:text-[11px]"
          >
            {copy.cityTag}
          </span>
        </div>
        <h3 className="break-words font-display text-xl font-bold leading-snug text-white transition-colors sm:text-2xl">
          <Link href={copy.href} className="hover:text-white/90">
            {copy.title}
          </Link>
        </h3>
        <p className="line-clamp-2 break-words text-sm leading-relaxed text-white/80">{copy.excerpt}</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pt-1 text-xs text-white/70">
          <Link
            href={copy.href}
            className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
          >
            {copy.cta}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          {copy.meta.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </div>
    </article>
  );
}

export function BlogFeedPromo({ promo, kind, layout }: BlogFeedPromoProps) {
  const copy = resolveCopy(promo, kind);
  void layout;
  return <ArticleTileCard copy={copy} />;
}
