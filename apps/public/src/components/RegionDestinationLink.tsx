import { ArrowRight } from 'lucide-react';

import { cityHref } from '@/routes';
import type { PublicDestination } from '@/types';

function pluralEvents(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 19) return `${n} событий`;
  if (mod10 === 1) return `${n} событие`;
  if (mod10 >= 2 && mod10 <= 4) return `${n} события`;
  return `${n} событий`;
}

export function RegionDestinationLink({
  region,
  className = '',
}: {
  region: Pick<PublicDestination, 'slug' | 'name' | 'events'>;
  className?: string;
}) {
  if (!region.events) return null;

  return (
    <a
      href={cityHref(region)}
      className={`flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm shadow-sm transition-all hover:border-primary-300 hover:shadow-md ${className}`.trim()}
    >
      <span className="truncate font-medium text-slate-700">+ {region.name}</span>
      <span className="shrink-0 text-slate-400">{pluralEvents(region.events)}</span>
      <ArrowRight className="ml-auto h-3.5 w-3.5 shrink-0 text-slate-400" />
    </a>
  );
}
