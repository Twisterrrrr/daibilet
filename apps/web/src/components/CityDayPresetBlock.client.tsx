'use client';

import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';

import type { CityDayRoutePreset, CityMustSeeItem } from '@/lib/cityInfo';
import {
  buildCityDayRoutePreset,
  cityDayRoutePresetAvailable,
  type DayRouteCityContext,
  type DayRouteVenueMatchSource,
} from '@/lib/day-route-from-place';
import { mustSeePlacesForDefaultPreset } from '@/lib/must-see-filters';
import { replaceDayRouteFromVenues } from '@/lib/day-route';

type Props = {
  places: CityMustSeeItem[];
  venues: DayRouteVenueMatchSource[];
  city: DayRouteCityContext;
  editorial?: boolean;
  /** Именованные шаблоны из cityInfo.dayRoutePresets */
  namedPresets?: CityDayRoutePreset[];
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
}: Props) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  const namedResolved = useMemo(() => {
    return (namedPresets || [])
      .map((preset) => ({
        preset,
        items: buildCityDayRoutePreset(preset.stops, venues, city),
      }))
      .filter((row) => row.items.length >= 3);
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
    router.push('/my-day');
  };

  if (namedResolved.length > 0) {
    return (
      <div
        className={`mt-5 rounded-2xl border p-4 sm:p-5 ${
          editorial ? 'border-zinc-200 bg-white' : 'border-slate-200 bg-slate-50'
        }`}
      >
        <p className={`text-sm font-semibold ${editorial ? 'text-zinc-950' : 'text-slate-950'}`}>
          Готовые сценарии
        </p>
        <p className={`mt-1 text-sm leading-6 ${editorial ? 'text-zinc-600' : 'text-slate-600'}`}>
          Выберите шаблон - все точки найдете в «Собери свой день».
        </p>
        <ul className="mt-4 grid gap-3">
          {namedResolved.map(({ preset, items }) => {
            const titles = items.map((item) => item.title).join(' · ');
            return (
              <li
                key={preset.id}
                className={`flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between ${
                  editorial ? 'border-zinc-200' : 'border-slate-200'
                }`}
              >
                <div className="min-w-0">
                  <p className={`text-sm font-semibold ${editorial ? 'text-zinc-950' : 'text-slate-950'}`}>
                    {preset.title}
                  </p>
                  {preset.description ? (
                    <p className={`mt-0.5 text-xs leading-5 ${editorial ? 'text-zinc-600' : 'text-slate-600'}`}>
                      {preset.description}
                    </p>
                  ) : null}
                  <p
                    className={`mt-1 line-clamp-2 text-xs ${editorial ? 'text-zinc-500' : 'text-slate-500'}`}
                    title={titles}
                  >
                    {items.length} точек: {titles}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busyId != null}
                  onClick={() => apply(preset.id, items)}
                  className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition disabled:opacity-60 ${
                    editorial
                      ? 'bg-zinc-900 text-white hover:bg-zinc-800'
                      : 'bg-primary-600 text-white hover:bg-primary-700'
                  }`}
                >
                  <Sparkles className="h-4 w-4" />
                  {busyId === preset.id ? 'Собираем…' : 'В мой день'}
                </button>
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
    <div
      className={`mt-5 rounded-2xl border p-4 sm:p-5 ${
        editorial ? 'border-zinc-200 bg-white' : 'border-slate-200 bg-slate-50'
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className={`text-sm font-semibold ${editorial ? 'text-zinc-950' : 'text-slate-950'}`}>
            Готовый сценарий
          </p>
          <p className={`mt-1 text-sm leading-6 ${editorial ? 'text-zinc-600' : 'text-slate-600'}`}>
            Собрать за минуту: {mainPlacesPhrase(fallbackPreset.length)} в «Собери свой день».
          </p>
          <p
            className={`mt-1 line-clamp-2 text-xs ${editorial ? 'text-zinc-500' : 'text-slate-500'}`}
            title={titles}
          >
            {titles}
          </p>
        </div>
        <button
          type="button"
          disabled={busyId != null}
          onClick={() => apply('default', fallbackPreset)}
          className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition disabled:opacity-60 ${
            editorial
              ? 'bg-zinc-900 text-white hover:bg-zinc-800'
              : 'bg-primary-600 text-white hover:bg-primary-700'
          }`}
        >
          <Sparkles className="h-4 w-4" />
          Собрать за минуту
        </button>
      </div>
    </div>
  );
}
