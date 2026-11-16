'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

import type { PublicVenuePageDto } from '@daibilet/contracts/public';
import { buildVenueBreadcrumbs } from '@/lib/structured-data';

export function VenueBreadcrumbsNav({
  payload,
  overlay = false,
}: {
  payload: PublicVenuePageDto;
  overlay?: boolean;
}) {
  const crumbs = buildVenueBreadcrumbs(payload);
  return (
    <nav
      aria-label="Хлебные крошки"
      className={`${overlay ? '' : 'container-page'} flex flex-wrap items-center gap-1.5 text-sm ${
        overlay ? 'py-0 text-white/75' : 'py-3 text-slate-500'
      }`}
    >
      {crumbs.map((crumb, index) => {
        const isLast = index === crumbs.length - 1;
        return (
          <span
            key={`${crumb.path}-${index}`}
            className={`inline-flex items-center gap-1.5 ${isLast ? 'hidden md:inline-flex' : ''}`}
          >
            {index > 0 ? <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden /> : null}
            {isLast ? (
              <span className={`line-clamp-1 ${overlay ? 'text-white' : 'text-slate-900'}`}>{crumb.name}</span>
            ) : (
              <Link href={crumb.path} className={`transition ${overlay ? 'hover:text-white' : 'hover:text-primary-600'}`}>
                {crumb.name}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
