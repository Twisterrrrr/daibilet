'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

import type { PublicVenuePageDto } from '@daibilet/contracts/public';
import { buildVenueBreadcrumbs } from '@/lib/structured-data';

export function VenueBreadcrumbsNav({ payload }: { payload: PublicVenuePageDto }) {
  const crumbs = buildVenueBreadcrumbs(payload);
  return (
    <nav aria-label="Хлебные крошки" className="container-page flex flex-wrap items-center gap-1.5 py-3 text-sm text-slate-500">
      {crumbs.map((crumb, index) => {
        const isLast = index === crumbs.length - 1;
        return (
          <span key={`${crumb.path}-${index}`} className="inline-flex items-center gap-1.5">
            {index > 0 ? <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden /> : null}
            {isLast ? (
              <span className="line-clamp-1 text-slate-900">{crumb.name}</span>
            ) : (
              <Link href={crumb.path} className="transition hover:text-primary-600">
                {crumb.name}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
