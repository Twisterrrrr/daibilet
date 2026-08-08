'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';

import type { CityDayRoutePreset, CityMustSeeItem } from '@/lib/cityInfo';
import {
  buildCityDayRoutePreset,
  cityDayRoutePresetAvailable,
  type DayRouteCityContext,
  type DayRouteVenueMatchSource,
} from '@/lib/day-route-from-place';
import { mustSeePlacesForDefaultPreset } from '@/lib/must-see-filters';
import { dayRoutePointsWord, replaceDayRouteFromVenues } from '@/lib/day-route';

type Props = {
  places: CityMustSeeItem[];
  venues: DayRouteVenueMatchSource[];
  city: DayRouteCityContext;
  editorial?: boolean;
  /** Именованные шаблоны из cityInfo.dayRoutePresets */
  namedPresets?: CityDayRoutePreset[];
  /** Hub CTA navigates to /my-day; on /my-day keep false (event sync updates panel). */
  navigateToMyDay?: boolean;
  /** Copy when block is already on /my-day. */
  inMyDay?: boolean;
  /**
   * Inside DayRoutePanel accordion: no outer card/title (chrome is the accordion row).
   */
  embedded?: boolean;
};

/** Russian plural for «N главных мест(а/о)» in preset copy. */
function mainPlacesPhrase(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} главное место`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    return `${count} главных места`;
  }
  return `${count} главных мест`;
}

export function CityDayPresetBlock({
  places,
  venues,
  city,
  editorial = false,
  namedPresets = [],
  navigateToMyDay = true,
  inMyDay = false,
  embedded = false,
}: Props) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  const namedResolved = useMemo(() => {
    return (namedPresets || [])
      .map((preset) => ({
        preset,
        items: buildCityDayRoutePreset(preset.stops, venues, city),
        available: cityDayRoutePresetAvailable(preset.stops, venues, city),
      }))
      // Сценарий обязан собирать план: гид без resolvable stops не маскируем
      // под готовый маршрут.
      .filter((row) => row.available);
  }, [namedPresets, venues, city]);

  const fallbackPreset = useMemo(() => {
    const source = mustSeePlacesForDefaultPreset(places);
    return buildCityDayRoutePreset(source, venues, city);
  }, [places, venues, city]);
  const fallbackAvailable = useMemo(() => {
    const source = mustSeePlacesForDefaultPreset(places);
    return cityDayRoutePresetAvailable(source, venues, city);
  }, [places, venues, city]);

  const apply = (id: string, items: ReturnType<typeof buildCityDayRoutePreset>) => {
    setBusyId(id);
    replaceDayRouteFromVenues(items, city.id || null);
    if (navigateToMyDay) {
      router.push('/my-day');
      return;
    }
    window.setTimeout(() => setBusyId(null), 400);
  };

  const namedLead = inMyDay
    ? 'Выберите готовый маршрут или откройте подробный гид.'
    : 'Откройте подробный гид или соберите доступные точки в «Собери свой день».';
  const fallbackLead = inMyDay
    ? `Собрать за минуту: ${mainPlacesPhrase(fallbackPreset.length)} в маршруте.`
    : `Собрать за минуту: ${mainPlacesPhrase(fallbackPreset.length)} в «Собери свой день».`;
  const namedCta = (busy: boolean) => (busy ? 'Собираем…' : inMyDay ? 'Собрать день' : 'В мой день');

  const shellClass = embedded
    ? ''
    : `mt-5 rounded-2xl border p-4 sm:p-5 ${
        editorial ? 'border-zinc-200 bg-white' : 'border-slate-200 bg-slate-50'
      }`;

  if (namedResolved.length > 0) {
    return (
      <div className={shellClass || undefined} data-day-presets={inMyDay ? 'my-day' : 'hub'}>
        {embedded ? null : (
          <>
            <p className={`text-sm font-semibold ${editorial ? 'text-zinc-950' : 'text-slate-950'}`}>
              Готовые сценарии
            </p>
            <p className={`mt-1 text-sm leading-6 ${editorial ? 'text-zinc-600' : 'text-slate-600'}`}>
              {namedLead}
            </p>
          </>
        )}
        <ul className={`${embedded ? '' : 'mt-4 '}grid gap-3`}>
          {namedResolved.map(({ preset, items, available }) => {
            const titles = items.map((item) => item.title).join(' · ');
            return (
              <li
                key={preset.id}
                className={`flex flex-col gap-3 rounded-xl border bg-white px-4 py-3.5 max-md:gap-3.5 md:flex-row md:items-center md:justify-between md:gap-4 md:p-3 ${
                  editorial ? 'border-zinc-200' : 'border-slate-200'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col items-start gap-0.5 md:flex-row md:flex-wrap md:items-baseline md:gap-x-2 md:gap-y-0.5">
                    <p className={`text-sm font-semibold ${editorial ? 'text-zinc-950' : 'text-slate-950'}`}>
                      {preset.title}
                    </p>
                    {preset.blogSlug ? (
                      <Link
                        href={`/blog/${preset.blogSlug}`}
                        className={`inline-flex items-center gap-0.5 text-xs font-medium underline underline-offset-2 transition-colors max-md:mt-0.5 ${
                          editorial
                            ? 'text-sky-700 hover:text-sky-800'
                            : 'text-primary-600 hover:text-primary-700'
                        }`}
                      >
                        Читать об этом в блоге
                        <ArrowUpRight className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
                      </Link>
                    ) : null}
                  </div>
                  {preset.description ? (
                    <p
                      className={`mt-1.5 text-[13px] leading-5 max-md:pr-0.5 md:mt-0.5 md:text-xs ${
                        editorial ? 'text-zinc-600' : 'text-slate-600'
                      }`}
                    >
                      {preset.description}
                    </p>
                  ) : null}
                  {available ? (
                    <p
                      className={`mt-1.5 line-clamp-3 text-[13px] leading-5 max-md:pr-0.5 md:mt-1 md:line-clamp-2 md:text-xs md:leading-4 ${
                        editorial ? 'text-zinc-500' : 'text-slate-500'
                      }`}
                      title={titles}
                    >
                      {items.length} {dayRoutePointsWord(items.length)}: {titles}
                    </p>
                  ) : null}
                </div>
                {available ? (
                  <button
                    type="button"
                    disabled={busyId != null}
                    onClick={() => apply(preset.id, items)}
                    className={`inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition disabled:opacity-60 md:w-auto ${
                      editorial
                        ? 'bg-zinc-900 text-white hover:bg-zinc-800'
                        : 'bg-primary-600 text-white hover:bg-primary-700'
                    }`}
                  >
                    <Sparkles className="h-4 w-4" />
                    {namedCta(busyId === preset.id)}
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  if (!fallbackAvailable || fallbackPreset.length < 3) return null;

  const titles = fallbackPreset.map((item) => item.title).join(' · ');

  return (
    <div className={shellClass || undefined} data-day-presets={inMyDay ? 'my-day' : 'hub'}>
      <div className="flex flex-col gap-3.5 md:flex-row md:items-center md:justify-between md:gap-4">
        <div className="min-w-0 flex-1">
          {embedded ? null : (
            <p className={`text-sm font-semibold ${editorial ? 'text-zinc-950' : 'text-slate-950'}`}>
              Готовый сценарий
            </p>
          )}
          <p
            className={`${embedded ? '' : 'mt-1 '}text-sm leading-6 ${
              editorial ? 'text-zinc-600' : 'text-slate-600'
            }`}
          >
            {fallbackLead}
          </p>
          <p
            className={`mt-1.5 line-clamp-3 text-[13px] leading-5 md:mt-1 md:line-clamp-2 md:text-xs md:leading-4 ${
              editorial ? 'text-zinc-500' : 'text-slate-500'
            }`}
            title={titles}
          >
            {titles}
          </p>
        </div>
        <button
          type="button"
          disabled={busyId != null}
          onClick={() => apply('default', fallbackPreset)}
          className={`inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition disabled:opacity-60 md:w-auto ${
            editorial
              ? 'bg-zinc-900 text-white hover:bg-zinc-800'
              : 'bg-primary-600 text-white hover:bg-primary-700'
          }`}
        >
          <Sparkles className="h-4 w-4" />
          {busyId === 'default' ? 'Собираем…' : 'Собрать за минуту'}
        </button>
      </div>
    </div>
  );
}
