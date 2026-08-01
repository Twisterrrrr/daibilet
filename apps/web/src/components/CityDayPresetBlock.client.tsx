'use client';

import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';

import type { CityMustSeeItem } from '@/lib/cityInfo';
import {
  buildCityDayRoutePreset,
  cityDayRoutePresetAvailable,
  type DayRouteCityContext,
  type DayRouteVenueMatchSource,
} from '@/lib/day-route-from-place';
import { replaceDayRouteFromVenues } from '@/lib/day-route';

type Props = {
  places: CityMustSeeItem[];
  venues: DayRouteVenueMatchSource[];
  city: DayRouteCityContext;
  editorial?: boolean;
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

export function CityDayPresetBlock({ places, venues, city, editorial = false }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const preset = useMemo(
    () => buildCityDayRoutePreset(places, venues, city),
    [places, venues, city],
  );
  const available = cityDayRoutePresetAvailable(places, venues, city);
  if (!available || preset.length < 3) return null;

  const titles = preset.map((item) => item.title).join(' · ');

  return (
    <div
      className={`mt-5 rounded-2xl border p-4 sm:p-5 ${
        editorial ? 'border-zinc-200 bg-white' : 'border-slate-200 bg-slate-50'
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p
            className={`text-sm font-semibold ${editorial ? 'text-zinc-950' : 'text-slate-950'}`}
          >
            Готовый день
          </p>
          <p className={`mt-1 text-sm leading-6 ${editorial ? 'text-zinc-600' : 'text-slate-600'}`}>
            Собрать за минуту: {mainPlacesPhrase(preset.length)} в маршрут.
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
          disabled={busy}
          onClick={() => {
            setBusy(true);
            replaceDayRouteFromVenues(preset, city.id || null);
            router.push('/my-day');
          }}
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
