'use client';

import { Cloud, CloudRain, CloudSun, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

import {
  resolveCityLocalFlavor,
  resolveWhenToGoBlurb,
  type CityWeatherFlavor,
} from '@/lib/city-hub-local-flavor';
import { normalizeCityHubSlug } from '@/lib/city-hub-config';
import {
  buildOpenMeteoForecastUrl,
  formatTempC,
  formatTempCFull,
  hubWeatherApiPath,
  isRainyWeatherCode,
  isSunnyWeatherCode,
  parseOpenMeteoForecast,
  snapshotFromHubWeatherPayload,
  weatherConditionLine,
  type CityWeatherDay,
  type CityWeatherSnapshot,
} from '@/lib/city-weather';

type Props = {
  citySlug: string;
  cityIn?: string;
  editorial?: boolean;
};

type LoadState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; snapshot: CityWeatherSnapshot };

function WeatherGlyph({ code, className }: { code: number; className?: string }) {
  const iconClass = className || 'h-5 w-5';
  if (code === 2) return <CloudSun className={iconClass} strokeWidth={1.75} aria-hidden />;
  if (isSunnyWeatherCode(code)) return <Sun className={iconClass} strokeWidth={1.75} aria-hidden />;
  if (isRainyWeatherCode(code)) return <CloudRain className={iconClass} strokeWidth={1.75} aria-hidden />;
  return <Cloud className={iconClass} strokeWidth={1.75} aria-hidden />;
}

function dayTemp(day: CityWeatherDay): string | null {
  return formatTempC(day.temperatureC) || formatTempC(day.tempMaxC);
}

async function loadCityWeatherSnapshot(
  citySlug: string,
  weather: CityWeatherFlavor,
  signal: AbortSignal,
): Promise<CityWeatherSnapshot> {
  try {
    const hubSignal =
      typeof AbortSignal.any === 'function'
        ? AbortSignal.any([signal, AbortSignal.timeout(8000)])
        : signal;
    const response = await fetch(hubWeatherApiPath(citySlug), { signal: hubSignal });
    if (response.ok) {
      const snapshot = snapshotFromHubWeatherPayload(await response.json());
      if (snapshot) return snapshot;
    }
  } catch (error) {
    if (signal.aborted) throw error;
  }

  const response = await fetch(buildOpenMeteoForecastUrl(weather), { signal });
  if (!response.ok) throw new Error(`open-meteo ${response.status}`);
  const snapshot = parseOpenMeteoForecast(await response.json());
  if (!snapshot) throw new Error('open-meteo_bad_payload');
  return snapshot;
}

export function CityWeatherWidget({ citySlug, cityIn, editorial = false }: Props) {
  const resolvedSlug = normalizeCityHubSlug(citySlug) || citySlug;
  const flavor = resolveCityLocalFlavor(resolvedSlug);
  const weather = flavor?.weather;
  const whenToGo = flavor?.whenToGo;
  const current = resolveWhenToGoBlurb(resolvedSlug);
  const [state, setState] = useState<LoadState>(weather ? { status: 'loading' } : { status: 'idle' });

  useEffect(() => {
    if (!weather) {
      setState({ status: 'idle' });
      return;
    }
    const controller = new AbortController();
    setState({ status: 'loading' });
    loadCityWeatherSnapshot(resolvedSlug, weather, controller.signal)
      .then((snapshot) => {
        setState({ status: 'ready', snapshot });
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        void error;
        setState({ status: 'error' });
      });
    return () => controller.abort();
  }, [resolvedSlug, weather]);

  if (!weather && !current && !whenToGo) return null;

  const today = state.status === 'ready' ? state.snapshot.today : null;
  const tomorrow = state.status === 'ready' ? state.snapshot.tomorrow : null;
  const dayAfter = state.status === 'ready' ? state.snapshot.dayAfter : null;
  const temp = today ? formatTempCFull(today.temperatureC) || formatTempCFull(today.tempMaxC) : null;
  const title = cityIn ? `Погода ${cityIn}` : 'Погода';
  const showForecast = state.status === 'ready' && Boolean(today);
  const hasSeasons = Boolean(whenToGo?.seasons?.length);
  const showForecastShell = Boolean(weather);
  const twoCol = showForecastShell && hasSeasons;
  const forecastPending = showForecastShell && !showForecast;
  const kickerClass = editorial
    ? 'text-xs font-bold uppercase tracking-[0.14em] text-zinc-500'
    : 'text-xs font-bold uppercase tracking-[0.14em] text-slate-500';
  const muted = editorial ? 'text-zinc-500' : 'text-slate-500';
  const body = editorial ? 'text-zinc-600' : 'text-slate-600';
  const forecastBox = editorial ? 'bg-zinc-100' : 'bg-slate-100';
  const forecastRule = editorial ? 'border-zinc-200' : 'border-slate-200';
  const iconAccent = editorial ? 'text-zinc-800' : 'text-primary-600';
  const dayLabelClass = `text-[11px] font-semibold uppercase tracking-wider ${muted}`;
  const dayTempClass = `flex items-center gap-1.5 text-base font-bold ${
    editorial ? 'text-zinc-900' : 'text-slate-900'
  }`;
  const nowBadge = editorial
    ? 'rounded-full bg-zinc-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white'
    : 'rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white';
  const seasonCard = editorial
    ? 'rounded-xl bg-zinc-50 px-3 py-2.5 ring-1 ring-zinc-200/80'
    : 'rounded-xl bg-slate-50 px-3 py-2.5 ring-1 ring-slate-200/70';
  const seasonCardNow = editorial
    ? 'rounded-xl bg-white px-3 py-2.5 ring-1 ring-zinc-900/15 shadow-sm'
    : 'rounded-xl bg-white px-3 py-2.5 ring-1 ring-slate-900/10 shadow-sm';

  return (
    <div
      className={`flex h-full flex-col overflow-hidden rounded-2xl p-5 sm:p-6 ${
        editorial
          ? 'bg-white ring-1 ring-zinc-200'
          : 'bg-white shadow-[0_4px_12px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/80'
      }`}
      data-city-weather={state.status}
      data-city-weather-layout="fused"
    >
      <div
        className={
          twoCol
            ? 'grid flex-1 gap-5 md:grid-cols-2 md:items-start md:gap-0'
            : 'min-w-0'
        }
      >
        {showForecast && today ? (
          <div className={twoCol ? 'min-w-0 md:pr-6' : 'min-w-0'}>
            <h2 className={kickerClass}>{title}</h2>
            <div
              className={`mt-3 flex flex-col gap-3 rounded-xl p-4 ${forecastBox}`}
              data-city-weather-forecast="ready"
            >
              <div className="flex items-center gap-3">
                <WeatherGlyph
                  code={today.weatherCode}
                  className={`h-9 w-9 shrink-0 sm:h-10 sm:w-10 ${iconAccent}`}
                />
                <div className="min-w-0">
                  <p
                    className={`text-3xl font-extrabold leading-none tracking-tight ${
                      editorial ? 'text-zinc-950' : 'text-slate-950'
                    }`}
                  >
                    {temp || '-'}
                  </p>
                  <p className={`mt-1 text-sm ${muted}`}>{weatherConditionLine(today.weatherCode)}</p>
                </div>
              </div>
              {tomorrow ? (
                <div className={`flex items-center justify-between gap-2 border-t pt-3 ${forecastRule}`}>
                  <p className={dayLabelClass}>Завтра</p>
                  <p className={dayTempClass}>
                    <WeatherGlyph code={tomorrow.weatherCode} className={`h-4 w-4 ${muted}`} />
                    {dayTemp(tomorrow) || '-'}
                  </p>
                </div>
              ) : null}
              {dayAfter ? (
                <div className={`flex items-center justify-between gap-2 border-t pt-3 ${forecastRule}`}>
                  <p className={dayLabelClass}>Послезавтра</p>
                  <p className={dayTempClass}>
                    <WeatherGlyph code={dayAfter.weatherCode} className={`h-4 w-4 ${muted}`} />
                    {dayTemp(dayAfter) || '-'}
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        ) : forecastPending ? (
          <div className={twoCol ? 'min-w-0 md:pr-6' : 'min-w-0'} data-city-weather-forecast="pending">
            <h2 className={kickerClass}>{title}</h2>
            <div className={`mt-3 flex flex-col gap-3 rounded-xl p-4 ${forecastBox}`} aria-hidden>
              <div className="flex items-center gap-3">
                <span className={`h-10 w-10 shrink-0 animate-pulse rounded-full ${editorial ? 'bg-zinc-200' : 'bg-slate-200'}`} />
                <div className="min-w-0 flex-1 space-y-2">
                  <span className={`block h-8 w-20 animate-pulse rounded ${editorial ? 'bg-zinc-200' : 'bg-slate-200'}`} />
                  <span className={`block h-3.5 w-28 animate-pulse rounded ${editorial ? 'bg-zinc-200/80' : 'bg-slate-200/80'}`} />
                </div>
              </div>
              <div className={`flex items-center justify-between gap-2 border-t pt-3 ${forecastRule}`}>
                <span className={`h-3 w-14 animate-pulse rounded ${editorial ? 'bg-zinc-200' : 'bg-slate-200'}`} />
                <span className={`h-4 w-12 animate-pulse rounded ${editorial ? 'bg-zinc-200' : 'bg-slate-200'}`} />
              </div>
              <div className={`flex items-center justify-between gap-2 border-t pt-3 ${forecastRule}`}>
                <span className={`h-3 w-20 animate-pulse rounded ${editorial ? 'bg-zinc-200' : 'bg-slate-200'}`} />
                <span className={`h-4 w-12 animate-pulse rounded ${editorial ? 'bg-zinc-200' : 'bg-slate-200'}`} />
              </div>
            </div>
          </div>
        ) : null}

        {hasSeasons && whenToGo ? (
          <div
            className={
              twoCol ? `min-w-0 md:border-l md:pl-6 ${forecastRule}` : 'min-w-0'
            }
          >
            <h3 id="seasons-title" className={kickerClass}>
              Когда ехать
            </h3>

            {whenToGo.verdict?.length ? (
              <dl
                className={`mt-3 space-y-1.5 text-sm ${body}`}
                data-city-when-to-go="verdict"
              >
                {whenToGo.verdict.map((line) => (
                  <div
                    key={line.label}
                    className="grid grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)] gap-x-3 gap-y-0.5 sm:grid-cols-[9.5rem_minmax(0,1fr)]"
                  >
                    <dt className={`font-medium ${editorial ? 'text-zinc-800' : 'text-slate-800'}`}>
                      {line.label}
                    </dt>
                    <dd className={muted}>{line.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}

            <div
              className="mt-4 space-y-2"
              aria-labelledby="seasons-title"
              data-city-when-to-go="seasons"
            >
              {whenToGo.seasons.map((season) => {
                const isNow = current?.seasonId === season.id;
                return (
                  <article
                    key={season.id}
                    className={isNow ? seasonCardNow : seasonCard}
                    data-season-id={season.id}
                    data-season-now={isNow ? '1' : undefined}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <h4
                        className={`text-sm font-semibold ${
                          editorial ? 'text-zinc-950' : 'text-slate-950'
                        }`}
                      >
                        {season.headline}
                      </h4>
                      {isNow ? <span className={nowBadge}>сейчас</span> : null}
                    </div>
                    <p className={`mt-1 text-sm leading-relaxed ${body}`}>{season.body}</p>
                  </article>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
