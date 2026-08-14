'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, MapPin } from 'lucide-react';

import type { PublicDestinationDto } from '@daibilet/contracts/public';
import { matchDestination } from '@/lib/selected-city';

type CityPickerVariant = 'hero' | 'header' | 'compact';

type CityPickerProps = {
  cities: PublicDestinationDto[];
  value: string;
  onChange: (value: string) => void;
  allLabel?: string;
  variant?: CityPickerVariant;
  className?: string;
  /** Open the dropdown on mount (e.g. /my-day «или сменить город»). */
  defaultOpen?: boolean;
};

const MENU_MAX_HEIGHT = 360;

export function CityPicker({
  cities,
  value,
  onChange,
  allLabel = 'Все города',
  variant = 'hero',
  className = '',
  defaultOpen = false,
}: CityPickerProps) {
  const [open, setOpen] = React.useState(defaultOpen);
  const [menuStyle, setMenuStyle] = React.useState<React.CSSProperties>({ visibility: 'hidden' });
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);

  const cityOptions = React.useMemo(
    () => cities.filter((item) => item.type === 'city').sort((a, b) => b.events - a.events || a.name.localeCompare(b.name, 'ru')),
    [cities],
  );

  // Show the picked name immediately; parent cityLabel can lag one frame behind
  // URL/searchParams (saint-petersburg vs sankt-peterburg) and look stale.
  const [optimisticValue, setOptimisticValue] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (optimisticValue == null) return;
    if (value === optimisticValue) {
      setOptimisticValue(null);
      return;
    }
    const current = matchDestination(cityOptions, value);
    const pending = matchDestination(cityOptions, optimisticValue);
    if (current && pending && current.name === pending.name) {
      setOptimisticValue(null);
    }
  }, [value, optimisticValue, cityOptions]);

  const displayValue = optimisticValue ?? value;
  const selectedMatch = displayValue === 'all' ? null : matchDestination(cityOptions, displayValue);
  const selectedLabel =
    displayValue === 'all' ? allLabel : selectedMatch?.name || displayValue;
  const isAllSelected = displayValue === 'all';

  const updatePosition = React.useCallback(() => {
    const button = buttonRef.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const menuWidth =
      variant === 'compact' ? Math.max(rect.width, 256) : Math.max(rect.width, 256);
    const pad = 8;
    const left = Math.min(Math.max(pad, rect.left), Math.max(pad, window.innerWidth - menuWidth - pad));
    // Always open downward (owner: no flip-up). Scroll inside menu if viewport is short.
    const spaceBelow = Math.max(120, window.innerHeight - rect.bottom - pad);

    setMenuStyle({
      position: 'fixed',
      left,
      width: menuWidth,
      top: rect.bottom + 4,
      maxHeight: Math.min(MENU_MAX_HEIGHT, spaceBelow),
      visibility: 'visible',
    });
  }, [variant]);

  React.useEffect(() => {
    if (!open) return;
    updatePosition();
    const sync = () => updatePosition();
    window.addEventListener('scroll', sync, true);
    window.addEventListener('resize', sync);
    return () => {
      window.removeEventListener('scroll', sync, true);
      window.removeEventListener('resize', sync);
    };
  }, [open, updatePosition]);

  React.useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const selectCity = (name: string) => {
    setOptimisticValue(name);
    setOpen(false);
    onChange(name);
  };

  const buttonClassName =
    variant === 'hero'
      ? 'relative flex h-11 w-full items-center gap-2 rounded-xl bg-slate-50 px-3 pr-9 text-left text-sm font-medium text-slate-800 outline-none transition hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-primary/25'
      : variant === 'compact'
        ? 'relative flex w-full items-center gap-2 rounded-lg py-3 pl-10 pr-10 text-left text-base font-medium text-slate-700 hover:bg-slate-100'
        : // Header pill: pin + city + chevron (Lovable chrome).
          'inline-flex h-10 max-w-[11rem] shrink-0 items-center gap-1.5 rounded-full border border-slate-200/90 bg-slate-50/90 px-3 text-sm font-medium text-slate-700 outline-none transition hover:border-slate-300 hover:bg-white hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-primary/25 sm:max-w-[14rem] xl:max-w-[16rem]';

  const menu = open
    ? createPortal(
        <div
          ref={menuRef}
          style={menuStyle}
          className="z-[120] overflow-y-auto overflow-x-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-lg"
          role="listbox"
          aria-label="Города"
        >
          <ul>
            <li>
              <button
                type="button"
                role="option"
                aria-selected={isAllSelected}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectCity('all')}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100 ${
                  isAllSelected ? 'bg-slate-100 font-semibold text-slate-900' : 'text-slate-700'
                }`}
              >
                <span className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  {allLabel}
                </span>
                {isAllSelected ? <Check className="h-4 w-4 text-primary-600" /> : null}
              </button>
            </li>
            {cityOptions.map((city) => {
              const active = Boolean(
                selectedMatch
                  ? selectedMatch.name === city.name && selectedMatch.slug === city.slug
                  : displayValue === city.name,
              );
              return (
                <li key={city.name}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectCity(city.name)}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100 ${
                      active ? 'bg-slate-100 font-semibold text-slate-900' : 'text-slate-700'
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span className="truncate">{city.name}</span>
                      <span className="shrink-0 text-xs text-slate-400">· {city.events}</span>
                    </span>
                    {active ? <Check className="h-4 w-4 shrink-0 text-primary-600" /> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>,
        document.body,
      )
    : null;

  return (
    <div className={`relative ${className}`}>
      {variant === 'compact' ? (
        <MapPin className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      ) : null}
      <button
        ref={buttonRef}
        type="button"
        aria-label={`Выбрать город: ${selectedLabel}`}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => {
          setOpen((current) => {
            if (current) return false;
            setMenuStyle({ visibility: 'hidden' });
            return true;
          });
        }}
        className={buttonClassName}
      >
        {variant === 'hero' ? (
          <MapPin className={`h-4 w-4 shrink-0 ${open ? 'text-primary-600' : 'text-slate-500'}`} />
        ) : null}
        {variant === 'header' ? (
          <MapPin className={`h-4 w-4 shrink-0 ${open ? 'text-primary-600' : 'text-slate-500'}`} />
        ) : null}
        {variant === 'header' ? (
          <span className="min-w-0 truncate">{selectedLabel}</span>
        ) : (
          <span className="min-w-0 flex-1 truncate whitespace-nowrap text-left">{selectedLabel}</span>
        )}
        {variant === 'hero' || variant === 'compact' ? (
          <ChevronDown
            className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 shrink-0 text-slate-400 transition ${
              open ? 'rotate-180' : ''
            } ${variant === 'compact' ? 'right-4' : ''}`}
          />
        ) : (
          <ChevronDown className={`h-3.5 w-3.5 shrink-0 opacity-60 transition ${open ? 'rotate-180' : ''}`} />
        )}
      </button>
      {menu}
    </div>
  );
}
