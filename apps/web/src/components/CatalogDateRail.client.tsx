'use client';

import { useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import {
  buildCatalogDateRailChips,
  isDateRailChipActive,
  type CatalogDateRailChip,
} from '@/lib/catalog-date-rail';
import {
  buildCatalogHref,
  catalogFiltersFromQuery,
  type CatalogFilterValues,
} from '@/lib/catalog-url';

type CatalogDateRailProps = {
  disabled?: boolean;
  className?: string;
};

/**
 * Horizontal date presets + upcoming days.
 * Owned by EventsCatalogHero (not CatalogToolbar) so search stays one row below.
 */
export function CatalogDateRail({ disabled = false, className = '' }: CatalogDateRailProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const chips = useMemo(() => buildCatalogDateRailChips(), []);

  const filters = useMemo(() => {
    const minRaw = searchParams.get('minPrice');
    const maxRaw = searchParams.get('maxPrice');
    const ageRaw = searchParams.get('ageMax');
    const limitRaw = searchParams.get('limit');
    const minPrice = minRaw != null ? Number(minRaw) : undefined;
    const maxPrice = maxRaw != null ? Number(maxRaw) : undefined;
    const ageMax = ageRaw != null ? Number(ageRaw) : undefined;
    const limitNum = limitRaw != null ? Number(limitRaw) : undefined;
    return catalogFiltersFromQuery({
      q: searchParams.get('q') || undefined,
      city: searchParams.get('city') || undefined,
      category: searchParams.get('category') || undefined,
      landing: searchParams.get('landing') || undefined,
      date: searchParams.get('date') || undefined,
      from: searchParams.get('from') || undefined,
      to: searchParams.get('to') || undefined,
      sort: (searchParams.get('sort') as CatalogFilterValues['sort']) || undefined,
      limit: limitNum === 50 || limitNum === 100 ? limitNum : undefined,
      minPrice: Number.isFinite(minPrice) ? minPrice : undefined,
      maxPrice: Number.isFinite(maxPrice) ? maxPrice : undefined,
      ageMax: Number.isFinite(ageMax) ? ageMax : undefined,
    });
  }, [searchParams]);

  const navigate = (next: CatalogFilterValues) => {
    router.push(buildCatalogHref(next));
  };

  const onSelect = (chip: CatalogDateRailChip) => {
    if (chip.kind === 'preset') {
      const nextDate = chip.value;
      navigate({
        ...filters,
        date: nextDate === 'all' ? undefined : nextDate,
        from: undefined,
        to: undefined,
        page: undefined,
        sort:
          nextDate === 'today' || nextDate === 'tomorrow' || nextDate === 'evening'
            ? 'time'
            : filters.sort,
      });
      return;
    }
    navigate({
      ...filters,
      date: undefined,
      from: chip.iso,
      to: chip.iso,
      page: undefined,
      sort: 'time',
    });
  };

  return (
    <div
      role="group"
      aria-label="Дата"
      className={`horizontal-snap-row flex flex-nowrap gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}
    >
      {chips.map((chip) => {
        const active = isDateRailChipActive(chip, filters);
        const key = chip.kind === 'preset' ? chip.value : chip.iso;
        return (
          <button
            key={key}
            type="button"
            disabled={disabled}
            aria-pressed={active}
            onClick={() => onSelect(chip)}
            className={`catalog-date-chip snap-start disabled:opacity-60 ${
              active ? 'catalog-date-chip-on' : 'catalog-date-chip-idle'
            }`}
          >
            {chip.kind === 'day' ? (
              <span className="whitespace-nowrap">
                <span className="text-[11px] font-semibold uppercase tracking-wide opacity-80">{chip.weekday}</span>
                <span className="ml-1 font-semibold">{chip.iso.slice(8)}</span>
              </span>
            ) : (
              <span className="whitespace-nowrap">{chip.shortLabel}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
