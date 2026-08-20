'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { IMAGE_SIZES, CardSafeImage } from '@/components/SafeImage.client';
import { ScrollRail } from '@/components/ScrollRail.client';
import type { DestinationPageGuide } from '@/lib/city-destination-registry';
import { resolveVenueHeroImage } from '@/lib/city-place-images';
import { venueHref } from '@/lib/routes';
import { formatVisitDuration } from '@/lib/visit-duration';

export function DestinationRegionGuide({
  guide,
  /** When brief/whyGo already live in the page hero. */
  hideIntro = false,
}: {
  guide: DestinationPageGuide;
  hideIntro?: boolean;
}) {
  const { suburbCard } = guide;
  const gastro = suburbCard.gastroStop;
  const logisticsExit = String(suburbCard.logisticsExit || suburbCard.stationName || '').trim();

  return (
    <div className="space-y-8">
      {!hideIntro && guide.whyGo ? (
        <p className="max-w-3xl text-base leading-7 text-slate-700">{guide.whyGo}</p>
      ) : null}

      {guide.places.length ? (
        <ScrollRail
          className="mt-1"
          hideScrollbar
          viewportClassName="flex flex-nowrap gap-2.5 snap-x snap-mandatory pb-0.5"
          aria-label={`Главные места: ${guide.name}`}
        >
            {guide.places.map((place, index) => {
              const slug = String(place.locationSlug || place.venueSlug || '').trim();
              const href = slug ? venueHref({ slug, name: place.name }) : null;
              const coverSrc = resolveVenueHeroImage(slug);
              const visitLabel = formatVisitDuration(place.visitMinutes);
              const title = (
                <span className="text-base font-bold leading-snug text-slate-950 break-words">
                  {place.name}
                </span>
              );

              return (
                <article
                  key={`${place.name}:${index}`}
                  data-rail-item
                  className="flex w-[min(80%,18.5rem)] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_28px_-10px_hsl(221_83%_53%_/_0.28)] sm:w-[20rem]"
                >
                  <div className="relative aspect-[16/10] shrink-0 overflow-hidden bg-slate-100">
                    <CardSafeImage
                      src={coverSrc}
                      alt=""
                      fill
                      sizes={IMAGE_SIZES.placeCard}
                      className="object-cover"
                      fallback={
                        <div className="h-full w-full bg-gradient-to-br from-slate-300 to-slate-600" />
                      }
                    />
                    <span className="absolute left-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-xs font-semibold text-slate-700 shadow-sm">
                      {index + 1}
                    </span>
                  </div>
                  <div className="flex min-h-0 flex-1 flex-col p-4 sm:p-5">
                    {href ? (
                      <Link href={href} className="hover:text-primary-700">
                        {title}
                      </Link>
                    ) : (
                      title
                    )}
                    {place.desc ? (
                      <p className="mt-1.5 line-clamp-3 text-sm leading-6 text-slate-600">{place.desc}</p>
                    ) : null}
                    {visitLabel ? (
                      <p className="mt-3 text-xs font-medium text-slate-500">{visitLabel}</p>
                    ) : null}
                  </div>
                </article>
              );
            })}
        </ScrollRail>
      ) : null}

      {guide.travel || logisticsExit ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">Как добраться</h3>
          {suburbCard.travelVector ? (
            <p className="mt-2 text-sm font-medium text-slate-900">{suburbCard.travelVector}</p>
          ) : null}
          {guide.travel ? <p className="mt-2 text-sm leading-6 text-slate-600">{guide.travel}</p> : null}
          {logisticsExit ? (
            <p className="mt-2 text-sm text-slate-600">
              <span className="font-medium text-slate-800">Выход / старт: </span>
              {logisticsExit}
            </p>
          ) : null}
        </div>
      ) : null}

      {gastro?.name ? (
        <div className="rounded-2xl border border-amber-200/80 bg-amber-50/70 px-5 py-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-amber-900/80">Где поесть</h3>
          <p className="mt-2 text-sm font-medium text-slate-900">{gastro.name}</p>
          {gastro.blurb ? <p className="mt-1 text-sm leading-6 text-slate-600">{gastro.blurb}</p> : null}
        </div>
      ) : null}

      {guide.parentHubHref && guide.parentHubLabel ? (
        <Link
          href={guide.parentHubHref}
          className="group inline-flex items-center gap-2 text-sm font-semibold text-emerald-900 underline-offset-4 hover:underline"
        >
          Смотреть {guide.name} как пригород {guide.parentHubLabel}
          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden />
        </Link>
      ) : null}
    </div>
  );
}
