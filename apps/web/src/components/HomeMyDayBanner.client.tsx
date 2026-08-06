'use client';

import Link from 'next/link';
import { ArrowRight, Route } from 'lucide-react';

import { useSelectedCityOptional } from '@/components/SelectedCityProvider.client';
import { inCityPrepositional } from '@/lib/city-declension';
import { buildMyDayHref } from '@/lib/home-guide';

/**
 * Mid-page My Day promo after «Популярные города».
 * Restores the former hero panel as a dedicated banner (not back in hero).
 * Headline: city selected → «… в {City_Пр}»; all cities / none → without «в …».
 */
export function HomeMyDayBanner() {
  const selectedCity = useSelectedCityOptional();
  const cityReady = selectedCity?.cityReady ?? false;
  const cityValue = cityReady ? selectedCity?.cityValue ?? 'all' : 'all';
  const cityName =
    cityValue !== 'all'
      ? selectedCity?.selectedDestination?.name ||
        (selectedCity?.cityLabel !== 'Все города' ? selectedCity?.cityLabel : null)
      : null;
  const citySlug =
    cityValue !== 'all' ? selectedCity?.selectedDestination?.slug || null : null;

  const titleCity = cityName?.trim() || null;
  const headline = titleCity
    ? `Спланируй свой день ${inCityPrepositional(titleCity)}`
    : 'Спланируй свой день';
  const href = buildMyDayHref(citySlug);

  return (
    <section className="section-y border-b border-slate-200/70 pt-0" aria-label="Мой день">
      <div className="container-page">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-600 via-primary-600 to-sky-500 px-5 py-6 text-white shadow-card sm:px-7 sm:py-7">
          <div
            className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-sky-300/25 blur-2xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-12 left-8 h-32 w-32 rounded-full bg-white/10 blur-2xl"
            aria-hidden
          />
          {/* Subtle map-route dots: dashed paths between pins, low-opacity so copy/CTA stay readable */}
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.22]"
            viewBox="0 0 640 220"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="xMidYMid slice"
            aria-hidden
          >
            <path
              d="M48 168 C120 40, 200 190, 280 78 C340 10, 400 150, 480 62 C540 12, 580 120, 620 88"
              stroke="white"
              strokeWidth="1.5"
              strokeDasharray="5 7"
              strokeLinecap="round"
            />
            <path
              d="M20 90 C90 150, 150 30, 230 120 C300 190, 370 40, 450 110 C520 165, 570 50, 630 140"
              stroke="white"
              strokeWidth="1.25"
              strokeDasharray="4 8"
              strokeLinecap="round"
              opacity="0.7"
            />
            <circle cx="48" cy="168" r="3.5" fill="white" />
            <circle cx="280" cy="78" r="3" fill="white" />
            <circle cx="480" cy="62" r="3.5" fill="white" />
            <circle cx="620" cy="88" r="2.5" fill="white" />
            <circle cx="230" cy="120" r="2.5" fill="white" opacity="0.85" />
            <circle cx="450" cy="110" r="3" fill="white" opacity="0.85" />
          </svg>
          <div className="relative z-[1] flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
            <div className="min-w-0 max-w-xl">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide backdrop-blur-sm">
                <Route className="h-3.5 w-3.5" aria-hidden />
                Мой день
              </span>
              <h2 className="mt-3 font-display text-2xl font-bold leading-snug tracking-tight sm:text-[1.75rem]">
                {headline}
              </h2>
              <p className="mt-2.5 text-sm leading-relaxed text-white/90 sm:text-[15px]">
                Твой собственный сценарий посещения любого из городов: выбери предлагаемые локации
                или добавь свои места
              </p>
            </div>
            <Link
              href={href}
              className="inline-flex min-h-12 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3.5 text-base font-semibold text-primary-700 shadow-sm transition hover:bg-sky-50 sm:w-auto"
            >
              Давай попробуем
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
