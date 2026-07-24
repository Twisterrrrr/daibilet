'use client';

import { useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CalendarDays, Mail, ShieldCheck, Ticket } from 'lucide-react';

import { HeroLayout } from '@/components/HeroLayout';
import { useSelectedCityOptional } from '@/components/SelectedCityProvider.client';
import { buildCatalogHref, catalogFiltersFromQuery, type CatalogFilterValues } from '@/lib/catalog-url';
import { cityToPrepositional } from '@/lib/city-declension';
import { landingCategoryHref } from '@/lib/landing-routes';
import { CANONICAL_LANDING_SLUGS } from '@/lib/landing-constants';
import { persistSelectedCity } from '@/lib/selected-city';

const WHEN_CHIPS: Array<{ value: string; label: string }> = [
  { value: 'today', label: 'Сегодня' },
  { value: 'tomorrow', label: 'Завтра' },
  { value: 'weekend', label: 'В эти выходные' },
];

type WhatChip =
  | { kind: 'category'; label: string; category: string }
  | { kind: 'landing'; label: string; landing: string; href?: string }
  | { kind: 'query'; label: string; q: string };

const WHAT_CHIPS: WhatChip[] = [
  { kind: 'category', label: 'Концерты', category: 'Концерты' },
  { kind: 'query', label: 'Спектакли', q: 'спектакль' },
  { kind: 'query', label: 'Детям', q: 'детям' },
  { kind: 'category', label: 'Выставки', category: 'Музеи и арт' },
  { kind: 'query', label: 'Стендап', q: 'стендап' },
  { kind: 'landing', label: 'Речные', landing: CANONICAL_LANDING_SLUGS.river },
];

function chipClass(active: boolean): string {
  return active
    ? 'bg-slate-900 text-white shadow-sm'
    : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50';
}

export function EventsCatalogHero() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedCity = useSelectedCityOptional();
  const dateInputRef = useRef<HTMLInputElement>(null);

  const filters = useMemo(() => {
    return catalogFiltersFromQuery({
      q: searchParams.get('q') || undefined,
      city: searchParams.get('city') || undefined,
      category: searchParams.get('category') || undefined,
      landing: searchParams.get('landing') || undefined,
      date: searchParams.get('date') || undefined,
      from: searchParams.get('from') || searchParams.get('dateFrom') || undefined,
      to: searchParams.get('to') || searchParams.get('dateTo') || undefined,
      sort: (searchParams.get('sort') as CatalogFilterValues['sort']) || undefined,
      minPrice: searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined,
      maxPrice: searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined,
      ageMax: searchParams.get('ageMax') ? Number(searchParams.get('ageMax')) : undefined,
    });
  }, [searchParams]);

  const cityReady = selectedCity?.cityReady ?? true;
  const cityName =
    cityReady && (filters.city || (selectedCity && selectedCity.cityValue !== 'all'))
      ? selectedCity?.selectedDestination?.name ||
        (selectedCity?.cityLabel !== 'Все города' ? selectedCity?.cityLabel : null) ||
        filters.city ||
        null
      : null;

  const effectiveCity = filters.city || (selectedCity?.cityValue !== 'all' ? selectedCity?.cityValue : undefined);

  const title = cityName ? (
    <>
      Афиша событий в {cityToPrepositional(cityName)}
    </>
  ) : (
    <>Афиша событий</>
  );

  const description = cityName
    ? `Официальные билеты на экскурсии, концерты и музеи в ${cityToPrepositional(cityName)} - оплата у организатора.`
    : 'Официальные билеты на экскурсии, концерты и музеи - оплата в виджете организатора.';

  const navigate = (next: CatalogFilterValues) => {
    if (next.city) persistSelectedCity(next.city);
    router.push(buildCatalogHref(next));
  };

  const setWhen = (value: string | null) => {
    navigate({
      ...filters,
      city: effectiveCity,
      date: value || undefined,
      from: undefined,
      to: undefined,
      page: undefined,
      sort: value === 'today' || value === 'tomorrow' ? 'time' : filters.sort || 'popular',
    });
  };

  const setWhat = (chip: WhatChip) => {
    if (chip.kind === 'landing') {
      router.push(landingCategoryHref(chip.landing));
      return;
    }
    if (chip.kind === 'category') {
      const active = filters.category === chip.category;
      navigate({
        ...filters,
        city: effectiveCity,
        category: active ? undefined : chip.category,
        landing: undefined,
        q: undefined,
        page: undefined,
        sort: 'popular',
      });
      return;
    }
    const active = (filters.q || '').toLowerCase() === chip.q.toLowerCase();
    navigate({
      ...filters,
      city: effectiveCity,
      q: active ? undefined : chip.q,
      category: undefined,
      landing: undefined,
      page: undefined,
      sort: 'popular',
    });
  };

  const isWhatActive = (chip: WhatChip): boolean => {
    if (chip.kind === 'category') return filters.category === chip.category;
    if (chip.kind === 'query') return (filters.q || '').toLowerCase() === chip.q.toLowerCase();
    if (chip.kind === 'landing') return filters.landing === chip.landing;
    return false;
  };

  const customDateActive = Boolean(filters.from || filters.to);

  return (
    <HeroLayout
      variant="minimal"
      breadcrumbs={[{ label: 'Главная', href: '/' }, { label: 'События' }]}
      title={title}
      description={description}
    >
      <div className="mt-6 space-y-4">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Когда</p>
          <div className="flex flex-wrap gap-2">
            {WHEN_CHIPS.map((chip) => {
              const active = !customDateActive && filters.date === chip.value;
              return (
                <button
                  key={chip.value}
                  type="button"
                  onClick={() => setWhen(active ? null : chip.value)}
                  className={`inline-flex h-10 items-center rounded-full px-4 text-sm font-semibold transition ${chipClass(active)}`}
                >
                  {chip.label}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => dateInputRef.current?.showPicker?.() ?? dateInputRef.current?.focus()}
              className={`inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition ${chipClass(customDateActive)}`}
            >
              <CalendarDays className="h-4 w-4" aria-hidden />
              {customDateActive && filters.from
                ? filters.from === filters.to || !filters.to
                  ? filters.from
                  : `${filters.from} - ${filters.to}`
                : 'Выбрать дату'}
            </button>
            <input
              ref={dateInputRef}
              type="date"
              className="sr-only"
              aria-label="Выбрать дату"
              value={filters.from || ''}
              onChange={(event) => {
                const value = event.target.value;
                if (!value) {
                  setWhen(null);
                  return;
                }
                navigate({
                  ...filters,
                  city: effectiveCity,
                  date: undefined,
                  from: value,
                  to: value,
                  page: undefined,
                  sort: 'time',
                });
              }}
            />
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Что</p>
          <div className="flex flex-wrap gap-2">
            {WHAT_CHIPS.map((chip) => {
              const active = isWhatActive(chip);
              return (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => setWhat(chip)}
                  className={`inline-flex h-10 items-center rounded-full px-4 text-sm font-semibold transition ${chipClass(active)}`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        </div>

        <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">
          <li className="inline-flex items-center gap-1.5">
            <Mail className="h-4 w-4 text-primary-600" aria-hidden />
            Билет на email после оплаты
          </li>
          <li className="inline-flex items-center gap-1.5">
            <Ticket className="h-4 w-4 text-primary-600" aria-hidden />
            Оплата у организатора
          </li>
          <li className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-primary-600" aria-hidden />
            Без посреднической наценки Дайбилет
          </li>
        </ul>
      </div>
    </HeroLayout>
  );
}
