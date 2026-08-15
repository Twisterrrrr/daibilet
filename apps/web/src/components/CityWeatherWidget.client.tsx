'use client';

import { Cloud, CloudRain, CloudSun, Flower2, Leaf, Ship, Snowflake, Sun } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import {
  resolveCityLocalFlavor,
  resolveWhenToGoBlurb,
  seasonGuideForTab,
  type CitySeasonTabId,
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

const TAB_ICON = {
  spring: Flower2,
  summer: Sun,
  autumn: Leaf,
  winter: Snowflake,
} as const;

export function CityWeatherWidget({ citySlug, cityIn, editorial = false }: Props) {
  const resolvedSlug = normalizeCityHubSlug(citySlug) || citySlug;
  const flavor = resolveCityLocalFlavor(resolvedSlug);
  const weather = flavor?.weather;
  const whenToGo = flavor?.whenToGo;
  const current = resolveWhenToGoBlurb(resolvedSlug);
  const [state, setState] = useState<LoadState>(weather ? { status: 'loading' } : { status: 'idle' });
  const [tab, setTab] = useState<CitySeasonTabId>(current?.tab || 'summer');

  useEffect(() => {
    if (current?.tab) setTab(current.tab);
  }, [current?.tab]);

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

  const guide = useMemo(() => seasonGuideForTab(whenToGo, current, tab), [whenToGo, current, tab]);

  if (!weather && !current && !whenToGo) return null;

  const today = state.status === 'ready' ? state.snapshot.today : null;
  const tomorrow = state.status === 'ready' ? state.snapshot.tomorrow : null;
  const dayAfter = state.status === 'ready' ? state.snapshot.dayAfter : null;
  const temp = today ? formatTempCFull(today.temperatureC) || formatTempCFull(today.tempMaxC) : null;
  const title = cityIn ? `Погода ${cityIn}` : 'Погода';
  const showForecast = state.status === 'ready' && Boolean(today);
  const hasSeasons = Boolean(whenToGo?.tabs?.length);
  // Reserve forecast column as soon as weather pack exists (avoid late pop-in after fetch).
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
            ? 'grid flex-1 gap-5 md:grid-cols-2 md:items-stretch md:gap-0'
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
            <p className={`mt-1 text-xs ${muted}`}>Выберите сезон - совет ниже обновится</p>
            <div
              role="tablist"
              aria-labelledby="seasons-title"
              className="mt-3 flex flex-wrap gap-2"
            >
              {whenToGo.tabs.map((item) => {
                const isSpbSummer =
                  item.id === 'summer' && resolvedSlug === 'saint-petersburg';
                const Icon = isSpbSummer ? Ship : TAB_ICON[item.id];
                const active = item.id === tab;
                const isNow = current?.tab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    id={`season-tab-${item.id}`}
                    aria-selected={active}
                    aria-controls="season-panel"
                    onClick={() => setTab(item.id)}
                    className={`inline-flex min-h-11 min-w-0 flex-[1_1_calc(50%-0.25rem)] items-center justify-center gap-1.5 rounded-full px-3 py-2.5 text-sm font-medium transition sm:gap-2 sm:px-4 ${
                      active
                        ? editorial
                          ? 'bg-zinc-900 text-white shadow-sm'
                          : 'bg-slate-900 text-white shadow-sm'
                        : editorial
                          ? 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 ${isSpbSummer ? 'motion-safe:animate-pulse' : ''}`}
                      strokeWidth={1.75}
                      aria-hidden
                    />
                    {item.label}
                    {isNow ? (
                      <span className={`text-[11px] font-semibold ${active ? 'text-white/70' : muted}`}>
                        сейчас
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
            {guide.body ? (
              <p
                id="season-panel"
                role="tabpanel"
                aria-labelledby={`season-tab-${tab}`}
                className={`mt-3 text-sm leading-relaxed ${body}`}
                data-city-when-to-go="now"
              >
                {guide.body}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
