'use client';

import { EyeOff } from 'lucide-react';

import {
  normalizeExcludeLandingList,
  pickCatalogExcludeThemeOptions,
  toggleExcludeLanding,
} from '@/lib/catalog-exclude-themes';
import type { CatalogFilterValues } from '@/lib/catalog-url';

type LandingFacet = { slug: string; events: number; title?: string };

type CatalogExcludeThemesProps = {
  filters: CatalogFilterValues;
  landings: LandingFacet[];
  disabled?: boolean;
  onNavigate: (next: CatalogFilterValues) => void;
  className?: string;
  variant?: 'inline' | 'sidebar';
};

/**
 * Quick «hide theme» toggles for over-saturated landings (standup, river, …).
 * Hidden when advanced `landing=` include filter is already set.
 */
export function CatalogExcludeThemes({
  filters,
  landings,
  disabled = false,
  onNavigate,
  className = '',
  variant = 'inline',
}: CatalogExcludeThemesProps) {
  if (filters.landing) return null;

  const excluded = normalizeExcludeLandingList(filters.excludeLanding);
  const options = pickCatalogExcludeThemeOptions(landings, excluded);
  if (!options.length) return null;

  const excludedSet = new Set(excluded);
  const sidebar = variant === 'sidebar';

  return (
    <div
      className={`${sidebar ? 'catalog-sidebar-section flex-col items-stretch' : 'flex flex-wrap items-center'} min-w-0 gap-2 ${className}`}
      role="group"
      aria-label="Скрыть темы"
      data-catalog-exclude-themes
    >
      <span
        className={
          sidebar
            ? 'catalog-sidebar-section__title inline-flex items-center gap-1.5'
            : 'inline-flex shrink-0 items-center gap-1 text-xs font-medium text-graphite-muted'
        }
      >
        <EyeOff className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
        {sidebar ? 'Не показывать' : 'Скрыть'}
      </span>
      <div
        className={
          sidebar
            ? 'flex min-w-0 flex-wrap items-center gap-1.5'
            : 'horizontal-snap-row flex min-w-0 flex-1 flex-nowrap items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
        }
      >
        {options.map((option) => {
          const on = excludedSet.has(option.slug);
          return (
            <button
              key={option.slug}
              type="button"
              disabled={disabled}
              aria-pressed={on}
              title={on ? `Показать снова: ${option.label}` : `Скрыть: ${option.label}`}
              onClick={() => {
                const nextExclude = toggleExcludeLanding(excluded, option.slug);
                onNavigate({
                  ...filters,
                  excludeLanding: nextExclude,
                  landing: undefined,
                  page: undefined,
                });
              }}
              className={`catalog-chip snap-start disabled:opacity-60 ${
                on ? 'catalog-chip-on' : 'catalog-chip-idle'
              }`}
            >
              <span className="whitespace-nowrap">{option.chip}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
