'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import type { DestinationPageGuide } from '@/lib/city-destination-registry';
import { formatVisitDuration } from '@/lib/visit-duration';

export function DestinationRegionGuide({ guide }: { guide: DestinationPageGuide }) {
  const { suburbCard } = guide;
  const gastro = suburbCard.gastroStop;
  const logisticsExit = String(suburbCard.logisticsExit || suburbCard.stationName || '').trim();

  return (
    <div className="space-y-8">
      {guide.whyGo ? (
        <p className="max-w-3xl text-base leading-7 text-slate-700">{guide.whyGo}</p>
      ) : null}

      {guide.places.length ? (
        <div>
          <h3 className="text-lg font-semibold text-slate-950">Что посмотреть</h3>
          <ul className="mt-4 space-y-3">
            {guide.places.map((place) => {
              const visitLabel = formatVisitDuration(place.visitMinutes);
              return (
                <li key={place.name} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                  <p className="font-medium text-slate-950">
                    {place.name}
                    {visitLabel ? (
                      <span className="ml-2 font-normal text-slate-500">{visitLabel}</span>
                    ) : null}
                  </p>
                  {place.desc ? (
                    <p className="mt-1 text-sm leading-6 text-slate-600">{place.desc}</p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
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
