'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import type { PublicDestinationDto } from '@daibilet/contracts/public';
import { cityHref } from '@/lib/routes';

function pluralEvents(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 19) return `${n} событий`;
  if (mod10 === 1) return `${n} событие`;
  if (mod10 >= 2 && mod10 <= 4) return `${n} события`;
  return `${n} событий`;
}

function shortRegionLabel(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length <= 22) return trimmed;
  return `${trimmed.slice(0, 20)}…`;
}

export function RegionDestinationLink({
  region,
  className = '',
  variant = 'row',
}: {
  region: Pick<PublicDestinationDto, 'slug' | 'name' | 'events'>;
  className?: string;
  /** `chip` - compact gray pill for city cards; `row` - legacy full-width link. */
  variant?: 'row' | 'chip';
}) {
  if (!region.events) return null;

  if (variant === 'chip') {
    return (
      <Link
        href={cityHref(region)}
        title={`${region.name}: ${pluralEvents(region.events)}`}
        className={`inline-flex max-w-full items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 transition hover:bg-slate-200 hover:text-slate-800 sm:text-xs ${className}`.trim()}
      >
        <span className="truncate">+ {shortRegionLabel(region.name)}</span>
        <span className="shrink-0 tabular-nums text-slate-400">{region.events}</span>
      </Link>
    );
  }

  return (
    <Link
      href={cityHref(region)}
      className={`flex items-start gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm shadow-sm transition-all hover:border-primary-300 hover:shadow-md sm:items-center ${className}`.trim()}
    >
      <span className="min-w-0 flex-1 break-words font-medium text-slate-700 line-clamp-2 sm:line-clamp-1">
        + {region.name}
      </span>
      <span className="shrink-0 pt-0.5 text-slate-400 sm:pt-0">{pluralEvents(region.events)}</span>
      <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400 sm:mt-0 sm:ml-auto" />
    </Link>
  );
}
