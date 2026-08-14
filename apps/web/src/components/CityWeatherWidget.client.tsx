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
  whenToGo?: string | null;
  onFocusPlaces: (focus: CityPlaceFocus) => void;
};

type LoadState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; snapshot: CityWeatherSnapshot };

function WeatherGlyph({ code, className }: { code: number; className?: string }) {
  const iconClass = className || 'h-5 w-5';
  if (isSunnyWeatherCode(code)) return <Sun className={iconClass} aria-hidden />;
  if (isRainyWeatherCode(code)) return <CloudRain className={iconClass} aria-hidden />;
  return <Cloud className={iconClass} aria-hidden />;
}

function shellClass(editorial: boolean) {
  return editorial
    ? 'flex h-full flex-col overflow-hidden rounded-3xl bg-white ring-1 ring-zinc-200'
    : 'flex h-full flex-col overflow-hidden rounded-3xl bg-white shadow-[0_18px_40px_-28px_rgba(14,165,233,0.55)] ring-1 ring-sky-100';
}

export function CityWeatherWidget({
  citySlug,
  editorial = false,
  whenToGo = null,
  onFocusPlaces,
}: Props) {
  const flavor = resolveCityLocalFlavor(citySlug)?.weather;
  const whenBody = whenToGo?.trim() || '';
  const [state, setState] = useState<LoadState>(flavor ? { status: 'loading' } : { status: 'idle' });

  useEffect(() => {
    if (!flavor) {
      setState({ status: 'idle' });
      return;
    }
    const controller = new AbortController();
    setState({ status: 'loading' });
    fetch(`/api/public/weather/${encodeURIComponent(citySlug)}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return (await response.json()) as {
          ok?: boolean;
          today?: CityWeatherDay;
          tomorrow?: CityWeatherDay | null;
        };
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

  if (!flavor && !whenBody) return null;

  const today = state.status === 'ready' ? state.snapshot.today : null;
  const tomorrow = state.status === 'ready' ? state.snapshot.tomorrow : null;
  const temp = today ? formatTempC(today.temperatureC) || formatTempC(today.tempMaxC) : null;
  const primaryMood = today?.mood;
  const primaryLabel =
    flavor && today
      ? primaryMood === 'sunny'
        ? flavor.outdoorCta
        : indoorCtaForCode(today.weatherCode, flavor)
      : '';
  const tomorrowDiffers = Boolean(tomorrow && today && tomorrow.mood !== today.mood);
  const tomorrowLabel =
    flavor && tomorrow
      ? tomorrow.mood === 'sunny'
        ? flavor.outdoorCta
        : indoorCtaForCode(tomorrow.weatherCode, flavor)
      : '';
  const tomorrowLine = tomorrow
    ? (() => {
        const nextTemp = formatTempC(tomorrow.temperatureC) || formatTempC(tomorrow.tempMaxC);
        return nextTemp
          ? `Завтра ${nextTemp} · ${tomorrow.label.toLowerCase()}`
          : `Завтра ${tomorrow.label.toLowerCase()}`;
      })()
    : '';

  return (
    <div
      className={shellClass(editorial)}
      data-city-weather={state.status}
      data-city-weather-mood={primaryMood || undefined}
    >
      {flavor ? (
        <div
          className={
            editorial
              ? 'bg-zinc-900 px-5 py-5 text-white sm:px-6'
              : 'bg-gradient-to-br from-sky-400 via-sky-500 to-indigo-500 px-5 py-5 text-white sm:px-6'
          }
        >
          {state.status === 'loading' ? (
            <div className="h-[5.5rem] animate-pulse rounded-2xl bg-white/20" aria-busy="true" aria-label="Загружаем погоду" />
          ) : state.status === 'error' || !today ? (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">Погода</p>
              <p className="mt-2 text-sm leading-6 text-white/90">Сейчас данные недоступны - не гадаем.</p>
            </div>
          ) : (
            <div className="flex items-end justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">Сейчас</p>
                <p className="mt-1 text-sm font-medium text-white/90">{today.label}</p>
                {tomorrowLine ? <p className="mt-2 text-xs text-white/75">{tomorrowLine}</p> : null}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <WeatherGlyph code={today.weatherCode} className="h-10 w-10 text-white" />
                <p className="text-5xl font-semibold leading-none tracking-tight">{temp || '—'}</p>
              </div>
            </div>
          )}
        </div>
      ) : null}

      <div className="flex flex-1 flex-col px-5 py-4 sm:px-6 sm:py-5">
        {whenBody ? (
          <div data-city-when-to-go="seasonal">
            <p
              className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${
                editorial ? 'text-zinc-500' : 'text-sky-700'
              }`}
            >
              Когда ехать
            </p>
            <p className={`mt-2 text-sm leading-6 ${editorial ? 'text-zinc-700' : 'text-slate-700'}`}>{whenBody}</p>
          </div>
        ) : (
          <p className={`text-sm leading-6 ${editorial ? 'text-zinc-600' : 'text-slate-600'}`}>
            Смотрите афишу и главные места ниже - погода уже в шапке блока.
          </p>
        )}

        {flavor && today && primaryLabel ? (
          <div className="mt-4 flex flex-col gap-2">
            <button
              type="button"
              data-city-weather-cta={primaryMood}
              onClick={() => onFocusPlaces(focusFromWeatherCta(primaryMood!, flavor, primaryLabel))}
              className={
                editorial
                  ? 'inline-flex min-h-10 items-center justify-center rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800'
                  : 'inline-flex min-h-10 items-center justify-center rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-600'
              }
            >
              {primaryLabel}
            </button>
            {tomorrowDiffers && tomorrow ? (
              <button
                type="button"
                data-city-weather-cta-tomorrow={tomorrow.mood}
                onClick={() => onFocusPlaces(focusFromWeatherCta(tomorrow.mood, flavor, tomorrowLabel))}
                className={`text-left text-xs font-medium leading-5 ${
                  editorial ? 'text-zinc-500 hover:text-zinc-800' : 'text-sky-700 hover:text-sky-900'
                }`}
              >
                Завтра {tomorrow.label.toLowerCase()} - другая подборка
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
