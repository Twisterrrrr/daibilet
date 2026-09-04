'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Clock, MapPin, Ticket } from 'lucide-react';

import { EventFavoriteButton } from '@/components/EventFavoriteButton.client';
import { CATALOG_IMAGE_QUALITY, IMAGE_SIZES, CardSafeImage } from '@/components/SafeImage.client';
import type { PublicCatalogListItemDto, PublicSessionDto } from '@daibilet/contracts/public';
import { collectCatalogLabels, extractDurationLabel } from '@/lib/catalog-labels';
import { EventImageBadges } from '@/lib/event-card-badges';
import {
  collectAllDisplaySlotLabels,
  extractAddressFromListDescription,
  formatCardScheduleLine,
  formatListDescription,
  splitListDescriptionSentences,
  getDepartingSoonMinutes,
  isLogisticsListDescription,
  isOpenDate,
  MIN_DISPLAY_PRICE_RUB,
} from '@/lib/event-card-meta';
import { resolveEventCardObjectPosition } from '@/lib/event-image-focus';
import { resolveEventCardFallbackImage, resolveEventCardPrimaryImage } from '@/lib/event-card-image';
import {
  resolveEventCardDestinationLabel,
  resolveEventCardLocationLabel,
  resolveEventCardPinLines,
} from '@/lib/event-location';
import { formatMoneyRange } from '@/lib/format';
import { formatAgeLimit } from '@/lib/event-page-utils';
import { trackProductCardClick } from '@/lib/catalog-analytics';
import { formatPublicTitle } from '@/lib/format-public-title';
import { eventHref, sessionVenueHref } from '@/lib/routes';

const SLOT_CHIP_CLASS =
  'inline-btn inline-flex h-6 min-h-6 shrink-0 items-center justify-center rounded-md bg-surface-muted px-2.5 text-ui-xs font-medium leading-none text-graphite-muted';

const SLOT_GAP_PX = 6; // gap-1.5

/** List mode: «А также:» + as many session chips as fit on one line. */
function AlsoSlotsRow({ labels }: { labels: string[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(labels.length);
  const [moreCount, setMoreCount] = useState(0);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const measure = measureRef.current;
    if (!container || !measure || labels.length === 0) {
      setVisibleCount(0);
      setMoreCount(0);
      return;
    }

    const fit = () => {
      const available = container.clientWidth;
      if (available <= 0) return;

      const kids = Array.from(measure.children) as HTMLElement[];
      // [0] = «А также:», [1..] = slot chips in order
      const labelEl = kids[0];
      const chipEls = kids.slice(1);
      if (!labelEl || chipEls.length === 0) {
        setVisibleCount(0);
        setMoreCount(0);
        return;
      }

      let used = labelEl.offsetWidth;
      let count = 0;

      const moreWidthFor = (n: number) => {
        // Approximate «ещё N» chip; measure sibling if present at end of measure row.
        const moreEl = measure.querySelector('[data-also-more]') as HTMLElement | null;
        if (moreEl) return moreEl.offsetWidth;
        // Fallback estimate
        return 48 + String(n).length * 6;
      };

      for (let i = 0; i < chipEls.length; i += 1) {
        const chipW = chipEls[i]!.offsetWidth;
        const remainingAfter = chipEls.length - (i + 1);
        const withChip = used + SLOT_GAP_PX + chipW;

        if (remainingAfter === 0) {
          if (withChip <= available + 0.5) {
            used = withChip;
            count = i + 1;
          }
          break;
        }

        const moreW = moreWidthFor(remainingAfter);
        const withChipAndMore = withChip + SLOT_GAP_PX + moreW;
        if (withChipAndMore <= available + 0.5) {
          used = withChip;
          count = i + 1;
          continue;
        }
        // Cannot take this chip if we still need «ещё»; stop and show more for rest including this one.
        break;
      }

      const leftover = labels.length - count;
      // If nothing fitted but we have chips, try to show at least one without more, or only more.
      if (count === 0 && chipEls.length > 0) {
        const one = used + SLOT_GAP_PX + chipEls[0]!.offsetWidth;
        if (one <= available + 0.5) {
          setVisibleCount(1);
          setMoreCount(Math.max(0, labels.length - 1));
          return;
        }
      }

      setVisibleCount(count);
      setMoreCount(Math.max(0, leftover));
    };

    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(container);
    return () => ro.disconnect();
  }, [labels]);

  if (labels.length === 0) return null;

  return (
    <div className="relative min-w-0">
      <div ref={containerRef} className="flex min-w-0 flex-nowrap items-center gap-1.5 overflow-hidden">
        <span className="shrink-0 text-ui-xs font-medium text-graphite-muted">А также:</span>
        {labels.slice(0, visibleCount).map((label) => (
          <span key={label} className={SLOT_CHIP_CLASS}>
            {label}
          </span>
        ))}
        {moreCount > 0 ? (
          <span className={`${SLOT_CHIP_CLASS} text-graphite-muted`}>ещё {moreCount}</span>
        ) : null}
      </div>

      <div
        ref={measureRef}
        aria-hidden
        className="pointer-events-none absolute -left-[9999px] top-0 flex flex-nowrap items-center gap-1.5 opacity-0"
      >
        <span className="shrink-0 text-ui-xs font-medium text-graphite-muted">А также:</span>
        {labels.map((label) => (
          <span key={label} className={SLOT_CHIP_CLASS}>
            {label}
          </span>
        ))}
        <span data-also-more className={SLOT_CHIP_CLASS}>
          ещё {Math.max(1, labels.length)}
        </span>
      </div>
    </div>
  );
}

export function EventCardHorizontal({
  session,
  imagePriority = false,
}: {
  session: PublicCatalogListItemDto | PublicSessionDto;
  imagePriority?: boolean;
}) {
  const href = eventHref(session);
  const imageObjectPosition = resolveEventCardObjectPosition({
    slug: session.slug,
    sourceSlug: 'sourceSlug' in session ? session.sourceSlug : undefined,
    id: session.id,
  });
  const imagePrimarySrc = resolveEventCardPrimaryImage(session);
  const imageFallbackSrc = resolveEventCardFallbackImage(session);
  const emptyImageFallback = <div className="flex h-full w-full items-center justify-center bg-surface-muted" />;
  const hasPrice = typeof session.priceFrom === 'number' && session.priceFrom >= MIN_DISPLAY_PRICE_RUB;
  const highlights = collectCatalogLabels(session, 1);
  const openDate = isOpenDate(session);
  const departingSoonMinutes = openDate ? null : getDepartingSoonMinutes(session.startsAt);
  const nextSessionLabel = openDate ? null : formatCardScheduleLine(session);
  const displaySlotLabels = collectAllDisplaySlotLabels(session);
  const sessionMetaLabel = openDate ? null : nextSessionLabel;
  const descriptionText = isLogisticsListDescription(session.description)
    ? ''
    : formatListDescription(session.description);
  const descriptionLines =
    descriptionText && !isLogisticsListDescription(session.description)
      ? splitListDescriptionSentences(session.description)
      : [];
  const destinationLabel = resolveEventCardDestinationLabel(session);
  const locationLabel =
    resolveEventCardLocationLabel(session) ||
    extractAddressFromListDescription(session.description);
  const pinLines = resolveEventCardPinLines(session);
  const pinPrimary = pinLines.primary || locationLabel;
  const durationLabel = extractDurationLabel(session.tags);
  const ageLabel = formatAgeLimit(session.ageLimit);
  const priceFooterLabel = hasPrice
    ? formatMoneyRange(session.priceFrom, 'priceTo' in session ? session.priceTo : null)
    : null;
  const venueHref = sessionVenueHref(session);
  const displayTitle = formatPublicTitle(session.title);

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-card bg-white shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-card-hover sm:flex-row">
      <Link
        href={href}
        className="absolute inset-0 z-[1] rounded-card"
        aria-label={`Событие: ${displayTitle}`}
        onClick={() =>
          trackProductCardClick({
            eventId: session.id,
            slug: session.slug,
            source: 'event_card_horizontal',
          })
        }
      />
      <div className="relative aspect-video w-full shrink-0 overflow-hidden bg-surface-muted sm:min-w-[14rem] sm:w-56 sm:aspect-[4/3] sm:self-stretch lg:w-64">
        <CardSafeImage
          src={imagePrimarySrc}
          alt={displayTitle}
          fill
          sizes={IMAGE_SIZES.eventCardHorizontal}
          quality={CATALOG_IMAGE_QUALITY}
          priority={imagePriority}
          loading={imagePriority ? undefined : 'lazy'}
          style={{ objectPosition: imageObjectPosition }}
          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          fallback={
            imageFallbackSrc && imageFallbackSrc !== imagePrimarySrc ? (
              <CardSafeImage
                src={imageFallbackSrc}
                alt={displayTitle}
                fill
                sizes={IMAGE_SIZES.eventCardHorizontal}
                quality={CATALOG_IMAGE_QUALITY}
                className="object-cover"
                fallback={emptyImageFallback}
              />
            ) : (
              emptyImageFallback
            )
          }
        />
        <EventImageBadges event={session} rail recommendVariant="compact" />
        <EventFavoriteButton eventId={session.id} className="right-2 top-2 sm:right-3 sm:top-3" />
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5 sm:pl-6">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          {durationLabel ? (
            <span className="event-card-meta">
              <Clock className="event-card-meta-icon" />
              <span className="truncate">{durationLabel}</span>
            </span>
          ) : null}
          {ageLabel ? (
            <span className="event-card-meta text-graphite-muted" title="Возрастное ограничение">
              <span className="font-semibold tabular-nums">{ageLabel}</span>
            </span>
          ) : null}
          {destinationLabel ? (
            <span className="event-card-meta min-w-0">
              <MapPin className="event-card-meta-icon" />
              <span className="truncate">{destinationLabel}</span>
            </span>
          ) : null}
        </div>

        <h3 className="font-display text-ui-sm font-bold leading-snug text-graphite sm:text-lg">
          <Link href={href} className="relative z-[2] transition-colors hover:text-primary-600">
            {displayTitle}
          </Link>
        </h3>

        {descriptionText ? (
          <div className="text-ui-xs leading-relaxed text-graphite-muted sm:text-ui-sm" data-list-description>
            <p className="line-clamp-3 sm:hidden">{descriptionText}</p>
            <div className="hidden flex-col gap-1 sm:flex">
              {descriptionLines.map((line) => (
                <p key={line} className="leading-relaxed">
                  {line}
                </p>
              ))}
            </div>
          </div>
        ) : null}

        {(session.category || highlights.length > 0) && (
          <div className="flex flex-wrap items-center gap-1.5">
            {session.category ? (
              <span className="rounded-md bg-surface-muted px-2 py-0.5 text-ui-xs font-medium text-graphite-muted">
                {session.category}
              </span>
            ) : null}
            {highlights.map((label) => (
              <span key={label} className="rounded-md bg-surface-muted px-2 py-0.5 text-ui-xs font-medium text-graphite-muted">
                {label}
              </span>
            ))}
          </div>
        )}

        {displaySlotLabels.length > 0 ? <AlsoSlotsRow labels={displaySlotLabels} /> : null}

        <div className="mt-auto flex flex-col gap-3 border-t border-slate-100 pt-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
          <div className="min-w-0 flex-1 space-y-0.5 text-ui-xs text-graphite-muted sm:text-ui-sm">
            {priceFooterLabel ? (
              <span className="mb-1 block whitespace-nowrap text-left text-lg font-extrabold tabular-nums tracking-tight text-graphite sm:hidden">
                {priceFooterLabel}
              </span>
            ) : null}
            {openDate ? (
              <span className="font-medium text-success">Билет с открытой датой</span>
            ) : departingSoonMinutes ? (
              <span className="inline-flex items-center gap-1 font-medium text-urgency">
                <Clock className="event-card-meta-icon" />
                Скоро начало · через {departingSoonMinutes} мин
              </span>
            ) : sessionMetaLabel ? (
              <span className="inline-flex items-center gap-1 font-medium text-graphite">
                <Clock className="event-card-meta-icon" />
                {sessionMetaLabel}
              </span>
            ) : null}
            {pinPrimary ? (
              venueHref ? (
                <Link
                  href={venueHref}
                  className="relative z-[2] block min-w-0 hover:text-primary-600"
                  onClick={(event) => event.stopPropagation()}
                >
                  <span className="line-clamp-1">{pinPrimary}</span>
                  {pinLines.secondary ? (
                    <span className="mt-0.5 block line-clamp-1">{pinLines.secondary}</span>
                  ) : null}
                </Link>
              ) : (
                <span className="block min-w-0">
                  <span className="line-clamp-1">{pinPrimary}</span>
                  {pinLines.secondary ? (
                    <span className="mt-0.5 block line-clamp-1">{pinLines.secondary}</span>
                  ) : null}
                </span>
              )
            ) : null}
          </div>

          <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
            {priceFooterLabel ? (
              <span className="hidden whitespace-nowrap text-lg font-extrabold tabular-nums tracking-tight text-graphite sm:inline sm:text-xl">
                {priceFooterLabel}
              </span>
            ) : null}
            <Link
              href={href}
              className="relative z-[2] inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700"
            >
              <Ticket className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              Купить
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
