'use client';

import Link from 'next/link';
import { ArrowRight, MapPinned, Plus, Route, Sparkles } from 'lucide-react';

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
 * Mid-page My Day promo: interactive constructor preview (not a static ad banner).
 * Contained white card in page container - not full-bleed graphite/blue band.
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
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0 max-w-xl">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary-600">Конструктор дня</p>
              <h2 className="mt-1.5 font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-[1.75rem]">
                {headline}
              </h2>
              <p className="mt-1.5 text-sm text-slate-500">
                Три шага - и готовый маршрут с местами и билетами
              </p>
            </div>
            <Link
              href={href}
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Открыть конструктор
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>

          <ul className="mt-5 grid gap-3 sm:grid-cols-3">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              return (
                <li key={step.id}>
                  <Link
                    href={href}
                    className="group flex h-full items-start gap-3 rounded-2xl border border-slate-200/90 bg-slate-50/80 p-4 transition hover:border-primary-200 hover:bg-primary-50/40"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-slate-700 shadow-sm ring-1 ring-slate-200/80 transition group-hover:text-primary-700">
                      <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                            Шаг {index + 1}
                          </p>
                          <h3 className="mt-0.5 text-sm font-bold text-slate-900 group-hover:text-primary-800">
                            {step.title}
                          </h3>
                          <p className="mt-0.5 text-xs text-slate-500">{step.hint}</p>
                        </div>
                        <span
                          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm ring-1 ring-slate-200/80 transition group-hover:bg-primary-600 group-hover:text-white group-hover:ring-primary-600"
                          aria-hidden
                        >
                          <Plus className="h-4 w-4" strokeWidth={2} />
                        </span>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
