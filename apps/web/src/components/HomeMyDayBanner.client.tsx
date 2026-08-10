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
 * Full-bleed My Day band: deep graphite visual stopper + airy 1→2→3 preview.
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
      className="section-y bg-[#0F172A] text-white"
      aria-label="Мой день"
      data-home-band="full-bleed"
    >
      <div className="container-page">
        <div className="flex flex-wrap items-end justify-between gap-5 sm:gap-6">
          <div className="min-w-0 max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-300/90">
              Конструктор дня
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {headline}
            </h2>
            <p className="mt-3 max-w-xl text-base leading-relaxed text-slate-300">
              Три шага - и готовый маршрут с местами и билетами
            </p>
          </div>
          <Link
            href={href}
            className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-50"
          >
            Открыть конструктор
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>

        <ul className="mt-10 grid gap-4 sm:mt-12 sm:grid-cols-3 sm:gap-5 lg:gap-6">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            return (
              <li key={step.id}>
                <Link
                  href={href}
                  className="group flex h-full items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-5 transition hover:border-sky-300/40 hover:bg-white/[0.08] sm:p-6"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-sky-200 ring-1 ring-white/15 transition group-hover:bg-sky-400/20 group-hover:text-sky-100">
                    <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                          Шаг {index + 1}
                        </p>
                        <h3 className="mt-1.5 text-base font-bold text-white group-hover:text-sky-100">
                          {step.title}
                        </h3>
                        <p className="mt-1 text-sm leading-relaxed text-slate-400">{step.hint}</p>
                      </div>
                      <span
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/15 transition group-hover:bg-sky-400 group-hover:text-slate-950 group-hover:ring-sky-400"
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
    </section>
  );
}
