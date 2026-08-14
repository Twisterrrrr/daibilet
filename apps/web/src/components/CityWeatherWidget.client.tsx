'use client';

import { Cloud, CloudRain, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

import {
  focusFromWeatherCta,
  resolveCityLocalFlavor,
  type CityPlaceFocus,
} from '@/lib/city-hub-local-flavor';
import {
  formatTempC,
  indoorCtaForCode,
  isRainyWeatherCode,
  isSunnyWeatherCode,
  type CityWeatherDay,
  type CityWeatherSnapshot,
} from '@/lib/city-weather';

type Props = {
  citySlug: string;
  editorial?: boolean;
  onFocusPlaces: (focus: CityPlaceFocus) => void;
};

type LoadState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; snapshot: CityWeatherSnapshot };

function WeatherGlyph({ code, className }: { code: number; className?: string }) {
  const iconClass = className || 'h-5 w-5';
  if (isSunnyWeatherCode(code)) return <Sun className={iconClass} aria-hidden />;
  if (isRainyWeatherCode(code)) return <CloudRain className={iconClass} aria-hidden />;
  return <Cloud className={iconClass} aria-hidden />;
}

function DayLine({
  title,
  day,
  editorial,
}: {
  title: string;
  day: CityWeatherDay;
  editorial: boolean;
}) {
  const temp = formatTempC(day.temperatureC) || formatTempC(day.tempMaxC);
  return (
    <div className="flex items-center gap-2.5">
      <WeatherGlyph
        code={day.weatherCode}
        className={`h-5 w-5 shrink-0 ${editorial ? 'text-sky-800' : 'text-sky-700'}`}
      />
      <div className="min-w-0 flex-1">
        <p className={`text-[11px] font-semibold uppercase tracking-wide ${editorial ? 'text-sky-900' : 'text-sky-800'}`}>
          {title}
        </p>
        <p className={`text-sm leading-5 ${editorial ? 'text-zinc-700' : 'text-slate-700'}`}>
          {temp ? `${temp} · ${day.label}` : day.label}
        </p>
      </div>
    </div>
  );
}

export function CityWeatherWidget({ citySlug, editorial = false, onFocusPlaces }: Props) {
  const flavor = resolveCityLocalFlavor(citySlug)?.weather;
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    if (!flavor) return;
    const controller = new AbortController();
    setState({ status: 'loading' });
    fetch(`/api/public/weather/${encodeURIComponent(citySlug)}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return (await response.json()) as { ok?: boolean; today?: CityWeatherDay; tomorrow?: CityWeatherDay | null };
      })
      .then((data) => {
        if (!data?.ok || !data.today) throw new Error('bad_payload');
        setState({
          status: 'ready',
          snapshot: { today: data.today, tomorrow: data.tomorrow || null },
        });
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        void error;
        setState({ status: 'error' });
      });
    return () => controller.abort();
  }, [citySlug, flavor]);

  if (!flavor) return null;

  const cardClass = editorial
    ? 'rounded-2xl bg-sky-50 px-5 py-4 ring-1 ring-sky-200/80 sm:px-6 sm:py-5'
    : 'rounded-2xl bg-gradient-to-br from-sky-50 via-cyan-50 to-indigo-50 px-5 py-4 ring-1 ring-sky-200/70 sm:px-6 sm:py-5';

  if (state.status === 'loading') {
    return (
      <div className={`h-full ${cardClass}`} data-city-weather="loading" aria-busy="true" aria-label="Загружаем погоду">
        <p className="text-xs font-semibold uppercase tracking-wide text-sky-800">Погода</p>
        <div className="mt-3 h-16 animate-pulse rounded-xl bg-white/60" />
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className={`h-full ${cardClass}`} data-city-weather="error">
        <p className="text-xs font-semibold uppercase tracking-wide text-sky-800">Погода</p>
        <p className={`mt-2 text-sm leading-6 ${editorial ? 'text-zinc-600' : 'text-slate-600'}`}>
          Сейчас данные о погоде недоступны. Не гадаем - откройте главные места ниже.
        </p>
      </div>
    );
  }

  const { today, tomorrow } = state.snapshot;
  const primaryMood = today.mood;
  const primaryLabel =
    primaryMood === 'sunny' ? flavor.outdoorCta : indoorCtaForCode(today.weatherCode, flavor);
  const tomorrowDiffers = Boolean(tomorrow && tomorrow.mood !== today.mood);
  const tomorrowLabel = tomorrow
    ? tomorrow.mood === 'sunny'
      ? flavor.outdoorCta
      : indoorCtaForCode(tomorrow.weatherCode, flavor)
    : '';

  return (
    <div className={`h-full ${cardClass}`} data-city-weather="ready" data-city-weather-mood={primaryMood}>
      <p className="text-xs font-semibold uppercase tracking-wide text-sky-800">Погода</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <DayLine title="Сегодня" day={today} editorial={editorial} />
        {tomorrow ? <DayLine title="Завтра" day={tomorrow} editorial={editorial} /> : null}
      </div>
      <div className="mt-4 flex flex-col gap-2">
        <button
          type="button"
          data-city-weather-cta={primaryMood}
          onClick={() => onFocusPlaces(focusFromWeatherCta(primaryMood, flavor, primaryLabel))}
          className={`inline-flex min-h-10 items-center justify-center rounded-xl px-3.5 py-2 text-left text-sm font-semibold leading-5 transition ${
            editorial
              ? 'bg-zinc-900 text-white hover:bg-zinc-800'
              : 'bg-slate-900 text-white hover:bg-slate-800'
          }`}
        >
          {primaryLabel}
        </button>
        {tomorrowDiffers && tomorrow ? (
          <button
            type="button"
            data-city-weather-cta-tomorrow={tomorrow.mood}
            onClick={() => onFocusPlaces(focusFromWeatherCta(tomorrow.mood, flavor, tomorrowLabel))}
            className={`text-left text-xs font-medium leading-5 underline decoration-sky-300 underline-offset-2 ${
              editorial ? 'text-sky-900 hover:text-sky-950' : 'text-sky-800 hover:text-sky-950'
            }`}
          >
            Завтра {tomorrow.label.toLowerCase()} - другая подборка
          </button>
        ) : null}
      </div>
    </div>
  );
}
