'use client';

import { forwardRef } from 'react';

import { CityPicker } from '@/components/CityPicker.client';
import { stripCityDisambiguator } from '@/lib/city-declension';
import {
  myDayCityChipLabel,
  type MyDayRegionAlternatives,
} from '@/lib/my-day-region-scope';
import type { PublicDestinationDto } from '@daibilet/contracts/public';

type MyDayRegionCityPromptProps = {
  alternatives: MyDayRegionAlternatives;
  cities: PublicDestinationDto[];
  value: string;
  onChange: (cityName: string) => void;
};

/**
 * Region/oblast cannot drive My Day (no must-see / city catalog).
 * Offer hub + oblast towns, plus full city picker.
 */
export const MyDayRegionCityPrompt = forwardRef<HTMLSectionElement, MyDayRegionCityPromptProps>(
  function MyDayRegionCityPrompt({ alternatives, cities, value, onChange }, ref) {
    const suggestions = [
      ...(alternatives.hub ? [alternatives.hub] : []),
      ...alternatives.children.slice(0, 12),
    ];

    return (
      <section
        ref={ref}
        className="relative mt-3 overflow-hidden rounded-3xl border border-amber-200/90 bg-gradient-to-b from-amber-50/90 via-white to-slate-50/60 px-5 py-8 sm:mt-5 sm:px-8 sm:py-11"
        data-day-unified-search
        data-day-starter="1"
        data-day-starter-variant="region-redirect"
      >
        <div className="relative mx-auto flex w-full max-w-lg flex-col items-center text-center">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-amber-700">
            Нужен город
          </p>
          <h1 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Область в Моём дне не используется
          </h1>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-600 sm:text-[0.95rem]">
            «{stripCityDisambiguator(alternatives.regionName) || alternatives.regionName}» - это
            регион-агрегатор. Маршрут дня строится по городу: хаб региона или город области.
          </p>

          {suggestions.length ? (
            <div className="mt-6 w-full max-w-md" data-day-region-suggestions>
              <p className="text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                Выберите город
              </p>
              <ul className="mt-2.5 flex flex-wrap justify-start gap-2">
                {suggestions.map((city, index) => {
                  const label = myDayCityChipLabel(city);
                  const active = value === city.name;
                  const isHub = index === 0 && alternatives.hub?.name === city.name;
                  return (
                    <li key={city.slug || city.name}>
                      <button
                        type="button"
                        data-day-region-city={city.slug || city.name}
                        aria-pressed={active}
                        onClick={() => onChange(city.name)}
                        className={
                          active
                            ? 'rounded-full bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white'
                            : isHub
                              ? 'rounded-full bg-primary-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-primary-700'
                              : 'rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-800 hover:border-slate-300 hover:bg-slate-50'
                        }
                      >
                        {isHub ? `${label} (хаб)` : label}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          <div className="mt-6 w-full max-w-md text-left" data-day-city-picker>
            <CityPicker
              cities={cities}
              value={value === alternatives.regionName ? 'all' : value}
              onChange={onChange}
              allLabel="Другой город"
              variant="hero"
              className="w-full"
            />
          </div>
        </div>
      </section>
    );
  },
);
