'use client';

import { Check, ChevronDown, MapPin, Search } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';

import { SafeImage } from '@/components/SafeImage.client';

export type DayRouteSearchOption = {
  id: string;
  label: string;
  hint?: string | null;
  imageUrl?: string | null;
  disabled?: boolean;
  disabledReason?: string | null;
};

type Props = {
  label: string;
  placeholder?: string;
  emptyText?: string;
  loading?: boolean;
  disabled?: boolean;
  options: DayRouteSearchOption[];
  onPick: (option: DayRouteSearchOption) => void;
  /** Reset query after successful pick. */
  clearOnPick?: boolean;
  /** Hide visible label (aria-label kept). */
  hideLabel?: boolean;
};

/**
 * Searchable combobox for /my-day catalog picks (locations / venues / events).
 * Stays on-page - no navigation.
 */
export function DayRouteSearchSelect({
  label,
  placeholder = 'Начните вводить название…',
  emptyText = 'Ничего не найдено',
  loading = false,
  disabled = false,
  options,
  onPick,
  clearOnPick = true,
  hideLabel = false,
}: Props) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const list = needle
      ? options.filter((option) => {
          const hay = `${option.label} ${option.hint || ''}`.toLowerCase();
          return hay.includes(needle);
        })
      : options;
    return list.slice(0, 40);
  }, [options, query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, open]);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  function pick(option: DayRouteSearchOption) {
    if (option.disabled) return;
    onPick(option);
    if (clearOnPick) setQuery('');
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative" data-day-search-select={label}>
      <label
        className={
          hideLabel
            ? 'sr-only'
            : 'mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500'
        }
      >
        {label}
      </label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-label={label}
          disabled={disabled || loading}
          value={query}
          placeholder={loading ? 'Загружаем…' : placeholder}
          autoComplete="off"
          onFocus={() => {
            if (!disabled) setOpen(true);
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (!open && (event.key === 'ArrowDown' || event.key === 'Enter')) {
              setOpen(true);
              return;
            }
            if (event.key === 'Escape') {
              setOpen(false);
              return;
            }
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              setActiveIndex((index) => Math.min(index + 1, Math.max(filtered.length - 1, 0)));
              return;
            }
            if (event.key === 'ArrowUp') {
              event.preventDefault();
              setActiveIndex((index) => Math.max(index - 1, 0));
              return;
            }
            if (event.key === 'Enter') {
              event.preventDefault();
              const option = filtered[activeIndex];
              if (option) pick(option);
            }
          }}
          className="min-h-11 w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-9 text-sm text-slate-900 outline-none ring-emerald-500/30 placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 disabled:bg-slate-50"
        />
        <ChevronDown
          className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition ${
            open ? 'rotate-180' : ''
          }`}
        />
      </div>
      {open && !disabled ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto overflow-x-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-lg"
        >
          {loading ? (
            <li className="px-3 py-2.5 text-sm text-slate-500">Загружаем…</li>
          ) : filtered.length === 0 ? (
            <li className="px-3 py-2.5 text-sm text-slate-500">{emptyText}</li>
          ) : (
            filtered.map((option, index) => {
              const active = index === activeIndex;
              return (
                <li key={option.id} role="option" aria-selected={active} aria-disabled={option.disabled}>
                  <button
                    type="button"
                    disabled={option.disabled}
                    title={option.disabled ? option.disabledReason || undefined : undefined}
                    onMouseEnter={() => setActiveIndex(index)}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => pick(option)}
                    className={`flex w-full items-start justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm disabled:cursor-not-allowed disabled:opacity-55 ${
                      active ? 'bg-emerald-50 text-emerald-950' : 'text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    <span className="flex min-w-0 items-start gap-2">
                      <span className="relative mt-0.5 h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                        {option.imageUrl ? (
                          <SafeImage
                            src={option.imageUrl}
                            alt=""
                            fill
                            sizes="2.25rem"
                            className="object-cover"
                          />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-slate-400">
                            <MapPin className="h-3.5 w-3.5" />
                          </span>
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{option.label}</span>
                        {option.hint ? (
                          <span className="mt-0.5 block line-clamp-1 text-xs text-slate-500">{option.hint}</span>
                        ) : null}
                        {option.disabled && option.disabledReason ? (
                          <span className="mt-0.5 block text-[11px] font-medium text-slate-400">
                            {option.disabledReason}
                          </span>
                        ) : null}
                      </span>
                    </span>
                    {!option.disabled ? <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 opacity-0 group-hover:opacity-100" /> : null}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      ) : null}
    </div>
  );
}
