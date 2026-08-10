'use client';

import Link from 'next/link';
import { ArrowRight, MapPinned, Route, Sparkles } from 'lucide-react';

import { useSelectedCityOptional } from '@/components/SelectedCityProvider.client';
import { inCityPrepositional } from '@/lib/city-declension';
import { buildMyDayHref } from '@/lib/home-guide';

const STEPS = [
  {
    id: 'scenario',
    title: 'Выбери сценарий',
    hint: 'Готовый маршрут или с нуля',
    icon: Sparkles,
  },
  {
    id: 'places',
    title: 'Добавь места',
    hint: 'Музеи, прогулки, точки',
    icon: MapPinned,
  },
  {
    id: 'route',
    title: 'Собери день',
    hint: 'Порядок, время, билеты',
    icon: Route,
  },
] as const;

/**
 * Full-bleed My Day band: brand blue stopper + centered 1→2→3 preview + CTA below.
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
    <section
      className="section-y bg-primary-600 text-white"
      aria-label="Мой день"
      data-home-band="full-bleed"
    >
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/80">
            Конструктор дня
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
            {headline}
          </h2>
          <p className="mt-3 text-base leading-relaxed text-white/90">
            Три шага - и готовый маршрут с местами и билетами
          </p>
        </div>

        <ul className="mt-10 grid gap-4 sm:mt-12 sm:grid-cols-3 sm:gap-5 lg:gap-6">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            return (
              <li key={step.id}>
                <Link
                  href={href}
                  className="group flex h-full items-start gap-4 rounded-2xl border border-white/20 bg-white/10 p-5 transition hover:bg-white/[0.16] sm:p-6"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white ring-1 ring-white/25 transition group-hover:bg-white/25">
                    <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/70">
                      Шаг {index + 1}
                    </p>
                    <h3 className="mt-1.5 text-base font-bold text-white">{step.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-white/80">{step.hint}</p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="mt-8 flex justify-center sm:mt-10">
          <Link
            href={href}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-primary-700 shadow-sm transition hover:bg-white/95"
          >
            Открыть конструктор
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
