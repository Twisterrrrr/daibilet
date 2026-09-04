'use client';

import Link from 'next/link';
import { MapPin } from 'lucide-react';

import { CARD_IMAGE_QUALITY, IMAGE_SIZES, CardSafeImage } from '@/components/SafeImage.client';
import type { PublicSessionDto } from '@daibilet/contracts/public';
import {
  formatCoverDateBadge,
  formatShowcasePriceLabel,
  MIN_DISPLAY_PRICE_RUB,
} from '@/lib/event-card-meta';
import { resolveEventCardFallbackImage, resolveEventCardPrimaryImage } from '@/lib/event-card-image';
import { resolveEventCardObjectPosition } from '@/lib/event-image-focus';
import { eventHref } from '@/lib/routes';

const GENRE_PALETTE = [
  'bg-emerald-100 text-emerald-900',
  'bg-sky-100 text-sky-900',
  'bg-amber-100 text-amber-950',
  'bg-violet-100 text-violet-900',
  'bg-rose-100 text-rose-900',
  'bg-slate-100 text-slate-800',
] as const;

function genreBubbleClass(category: string): string {
  let hash = 0;
  for (let i = 0; i < category.length; i += 1) {
    hash = (hash * 31 + category.charCodeAt(i)) >>> 0;
  }
  return GENRE_PALETTE[hash % GENRE_PALETTE.length]!;
}

export function RegionEventCard({
  session,
  logisticsChip = null,
}: {
  session: PublicSessionDto;
  logisticsChip?: string | null;
}) {
  const href = eventHref(session);
  const imagePrimarySrc = resolveEventCardPrimaryImage(session);
  const imageFallbackSrc = resolveEventCardFallbackImage(session);
  const imageObjectPosition = resolveEventCardObjectPosition({
    slug: session.slug,
    sourceSlug: 'sourceSlug' in session ? session.sourceSlug : undefined,
    id: session.id,
  });
  const dateBadge = formatCoverDateBadge(session);
  const hasPrice = typeof session.priceFrom === 'number' && session.priceFrom >= MIN_DISPLAY_PRICE_RUB;
  const priceLabel = hasPrice
    ? formatShowcasePriceLabel(session.priceFrom, session.priceTo)
    : null;
  const category = String(session.category || '').trim();
  const city = String(session.city || '').trim();
  const venue = String(session.venue || '').trim();
  const placeLine = [city, venue].filter(Boolean).join(' · ');

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <Link href={href} className="relative block aspect-[4/3] overflow-hidden bg-slate-100">
        {imagePrimarySrc || imageFallbackSrc ? (
          <CardSafeImage
            src={imagePrimarySrc || imageFallbackSrc!}
            fallback={
              imagePrimarySrc && imageFallbackSrc ? (
                <CardSafeImage
                  src={imageFallbackSrc}
                  alt=""
                  fill
                  sizes={IMAGE_SIZES.eventCard}
                  quality={CARD_IMAGE_QUALITY}
                  className="object-cover"
                  style={{ objectPosition: imageObjectPosition }}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-200 via-slate-100 to-emerald-50 text-slate-400">
                  <MapPin className="h-8 w-8" aria-hidden />
                </div>
              )
            }
            alt=""
            fill
            sizes={IMAGE_SIZES.eventCard}
            quality={CARD_IMAGE_QUALITY}
            className="object-cover transition duration-300 group-hover:scale-[1.03]"
            style={{ objectPosition: imageObjectPosition }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-200 via-slate-100 to-emerald-50 text-slate-400">
            <MapPin className="h-8 w-8" aria-hidden />
          </div>
        )}
        {dateBadge ? (
          <span className="absolute left-3 top-3 rounded-lg bg-white/95 px-2.5 py-1 text-xs font-semibold text-slate-900 shadow-sm">
            {dateBadge}
          </span>
        ) : null}
        {category ? (
          <span
            className={`absolute bottom-3 left-3 rounded-full px-2.5 py-1 text-[11px] font-semibold ${genreBubbleClass(category)}`}
          >
            {category}
          </span>
        ) : null}
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-3.5 sm:p-4">
        <h3 className="line-clamp-2 text-base font-semibold leading-snug text-slate-950">
          <Link href={href} className="hover:text-emerald-800">
            {session.title}
          </Link>
        </h3>
        {placeLine ? (
          <p className="line-clamp-1 text-sm text-slate-500">
            <MapPin className="mr-1 inline h-3.5 w-3.5 -translate-y-px" aria-hidden />
            {placeLine}
          </p>
        ) : null}
        {logisticsChip ? (
          <p className="text-xs font-medium text-slate-600">{logisticsChip}</p>
        ) : null}
        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <span className="text-sm font-semibold text-slate-900">{priceLabel || 'Билеты'}</span>
          <Link
            href={href}
            className="inline-flex min-h-9 items-center justify-center rounded-full bg-slate-900 px-3.5 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Билет
          </Link>
        </div>
      </div>
    </article>
  );
}
