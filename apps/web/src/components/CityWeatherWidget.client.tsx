'use client';

import { Cloud, CloudRain, CloudSun, Flower2, Leaf, Snowflake, Sun } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import {
  resolveCityLocalFlavor,
  resolveWhenToGoBlurb,
  seasonGuideForTab,
  type CitySeasonTabId,
  type CityWeatherFlavor,
} from '@/lib/city-hub-local-flavor';
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
    const response = await fetch(hubWeatherApiPath(citySlug), { signal });
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
  const flavor = resolveCityLocalFlavor(citySlug);
  const weather = flavor?.weather;
  const whenToGo = flavor?.whenToGo;
  const current = resolveWhenToGoBlurb(citySlug);
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
    loadCityWeatherSnapshot(citySlug, weather, controller.signal)
      .then((snapshot) => {
        setState({ status: 'ready', snapshot });
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        void error;
        setState({ status: 'error' });
      });
    return () => controller.abort();
  }, [citySlug, weather]);

  const guide = useMemo(() => seasonGuideForTab(whenToGo, current, tab), [whenToGo, current, tab]);

  if (!weather && !current && !whenToGo) return null;

  const today = state.status === 'ready' ? state.snapshot.today : null;
  const tomorrow = state.status === 'ready' ? state.snapshot.tomorrow : null;
  const dayAfter = state.status === 'ready' ? state.snapshot.dayAfter : null;
  const temp = today ? formatTempCFull(today.temperatureC) || formatTempCFull(today.tempMaxC) : null;
  const title = cityIn ? `Погода ${cityIn}` : 'Погода';
  const showForecast = state.status === 'ready' && Boolean(today);
  const kicker = showForecast ? title : 'Сезоны';

  return (
    <div
      className={`flex h-full flex-col overflow-hidden rounded-2xl bg-white ${
        editorial
          ? 'ring-1 ring-zinc-200'
          : 'shadow-[0_4px_12px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/80'
      }`}
      data-city-weather={state.status}
    >
      {showForecast && today ? (
        <div className="px-5 pt-5">
          <p
            className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${
              editorial ? 'text-zinc-500' : 'text-slate-500'
            }`}
          >
            {title}
          </p>
          <div
            className={`mt-3 rounded-xl px-4 py-3 ${editorial ? 'bg-zinc-50' : 'bg-slate-50'}`}
            data-city-weather-forecast="ready"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <WeatherGlyph
                  code={today.weatherCode}
                  className={`h-9 w-9 shrink-0 ${editorial ? 'text-zinc-800' : 'text-slate-800'}`}
                />
                <div className="min-w-0">
                  <p className={`text-[2rem] font-semibold leading-none tracking-tight ${editorial ? 'text-zinc-950' : 'text-slate-950'}`}>
                    {temp || '-'}
                  </p>
                  <p className={`mt-1 text-xs ${editorial ? 'text-zinc-500' : 'text-slate-500'}`}>
                    {weatherConditionLine(today.weatherCode)}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 flex-col gap-2 text-right">
                {tomorrow ? (
                  <div className="flex items-center justify-end gap-1.5">
                    <WeatherGlyph
                      code={tomorrow.weatherCode}
                      className={`h-4 w-4 ${editorial ? 'text-zinc-500' : 'text-slate-500'}`}
                    />
                    <div>
                      <p className={`text-[10px] font-semibold uppercase tracking-wide ${editorial ? 'text-zinc-400' : 'text-slate-400'}`}>
                        Завтра
                      </p>
                      <p className={`text-sm font-semibold leading-none ${editorial ? 'text-zinc-800' : 'text-slate-800'}`}>
                        {dayTemp(tomorrow) || '-'}
                      </p>
                    </div>
                  </div>
                ) : null}
                {dayAfter ? (
                  <div className="flex items-center justify-end gap-1.5">
                    <WeatherGlyph
                      code={dayAfter.weatherCode}
                      className={`h-4 w-4 ${editorial ? 'text-zinc-500' : 'text-slate-500'}`}
                    />
                    <div>
                      <p className={`text-[10px] font-semibold uppercase tracking-wide ${editorial ? 'text-zinc-400' : 'text-slate-400'}`}>
                        Послезавтра
                      </p>
                      <p className={`text-sm font-semibold leading-none ${editorial ? 'text-zinc-800' : 'text-slate-800'}`}>
                        {dayTemp(dayAfter) || '-'}
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {whenToGo?.tabs?.length ? (
        <div className={`flex flex-1 flex-col px-5 ${showForecast ? 'pt-4 pb-5' : 'py-5'}`}>
          <p
            className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${
              editorial ? 'text-zinc-500' : 'text-slate-500'
            }`}
          >
            {showForecast ? 'Сезоны' : kicker}
          </p>
          <div
            className="mt-3 flex flex-nowrap gap-1.5 overflow-x-auto pb-0.5 [overscroll-behavior-x:contain] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            role="tablist"
            aria-label="Сезоны"
          >
            {whenToGo.tabs.map((item) => {
              const Icon = TAB_ICON[item.id];
              const active = item.id === tab;
              const isNow = current?.tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTab(item.id)}
                  className={`inline-flex min-h-8 shrink-0 items-center gap-1 rounded-full px-2.5 text-xs font-semibold transition ${
                    active
                      ? editorial
                        ? 'bg-zinc-900 text-white'
                        : 'bg-slate-900 text-white'
                      : editorial
                        ? 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                  {item.label}
                  {isNow ? (
                    <span className={`text-[10px] font-semibold ${active ? 'text-white/70' : editorial ? 'text-zinc-400' : 'text-slate-400'}`}>
                      сейчас
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
          {guide.nowLabel ? (
            <p
              className={`mt-3 text-[11px] font-semibold uppercase tracking-[0.14em] ${
                editorial ? 'text-zinc-500' : 'text-slate-500'
              }`}
              data-city-when-to-go="now"
            >
              Сейчас: {guide.nowLabel}
            </p>
          ) : null}
          {guide.body ? (
            <p
              className={`text-sm leading-6 ${guide.nowLabel ? 'mt-1.5' : 'mt-3'} ${
                editorial ? 'text-zinc-600' : 'text-slate-600'
              }`}
            >
              {guide.body}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
