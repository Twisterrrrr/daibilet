'use client';

import Link from 'next/link';
import { Star, Grid3X3, List, Table2 } from 'lucide-react';

import { EventCard } from '@/components/EventCard';
import { EventCardHorizontal } from '@/components/EventCardHorizontal';
import type { PublicCatalogListItemDto } from '@daibilet/contracts/public';
import {
  formatMoneyRange,
  formatNumber,
} from '@/lib/format';
import { formatShowcaseSessionDate } from '@/lib/event-card-meta';
import { resolveEventCardDestinationLabel } from '@/lib/event-location';
import { resolvePseudoRating } from '@/lib/event-card-meta';
import { eventHref, sessionVenueHref } from '@/lib/routes';
import type { CatalogViewMode } from '@/lib/catalog-view-mode';

type CatalogResultsProps = {
  items: PublicCatalogListItemDto[];
  viewMode: CatalogViewMode;
  onViewModeChange: (mode: CatalogViewMode) => void;
};

export function CatalogResults({ items, viewMode, onViewModeChange }: CatalogResultsProps) {

  if (!items.length) {
    return (
      <div className="mt-10 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
        <p className="text-lg font-semibold text-slate-800">Ничего не найдено</p>
        <p className="mt-2 text-sm text-slate-500">Попробуйте изменить фильтры или сбросить поиск.</p>
      </div>
    );
  }

  return (
    <>
      <div className="mt-4 flex justify-end md:hidden">
        <ViewModeToggle mode={viewMode} onChange={onViewModeChange} />
      </div>

      {viewMode === 'list' ? (
        <ul className="mt-8 space-y-3">
          {items.map((session) => (
            <li key={`${session.id}-${session.startsAt}`}>
              <EventCardHorizontal session={session} />
            </li>
          ))}
        </ul>
      ) : viewMode === 'table' ? (
        <CatalogTable items={items} />
      ) : (
        <ul className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {items.map((session) => (
            <li key={`${session.id}-${session.startsAt}`}>
              <EventCard session={session} compact />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export function ViewModeToggle({
  mode,
  onChange,
}: {
  mode: CatalogViewMode;
  onChange: (mode: CatalogViewMode) => void;
}) {
  return (
    <div className="hidden overflow-hidden rounded-xl bg-slate-100 p-1 md:flex" role="radiogroup" aria-label="Вид списка">
      <ViewModeButton active={mode === 'cards'} label="Карточки" onClick={() => onChange('cards')}>
        <Grid3X3 className="h-4 w-4" />
      </ViewModeButton>
      <ViewModeButton active={mode === 'list'} label="Список" onClick={() => onChange('list')}>
        <List className="h-4 w-4" />
      </ViewModeButton>
      <ViewModeButton active={mode === 'table'} label="Таблица" onClick={() => onChange('table')}>
        <Table2 className="h-4 w-4" />
      </ViewModeButton>
    </div>
  );
}

function ViewModeButton({
  active,
  label,
  onClick,
  children,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`grid h-9 w-9 place-items-center rounded-lg transition ${
        active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
      }`}
    >
      {children}
    </button>
  );
}

function CatalogTable({ items }: { items: PublicCatalogListItemDto[] }) {
  return (
    <div className="mt-8 overflow-auto rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[980px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500">
            <th className="px-4 py-3 font-semibold">Событие</th>
            <th className="px-4 py-3 font-semibold">Категория</th>
            <th className="px-4 py-3 font-semibold">Город</th>
            <th className="px-4 py-3 font-semibold">Дата</th>
            <th className="px-4 py-3 font-semibold">Цена</th>
            <th className="px-4 py-3 font-semibold">Рейтинг</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {items.map((session) => {
            const rating = resolvePseudoRating(session.groupKey || session.id);
            const reviewCount = Math.max(session.sessionCount || 1, 1) * 37 + (session.id.charCodeAt(0) % 90);
            const cityLabel = resolveEventCardDestinationLabel(session);
            const venueLink = sessionVenueHref(session);
            return (
              <tr key={`${session.id}-${session.startsAt}`} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="min-w-[280px] px-4 py-3 align-top">
                  <Link href={eventHref(session)} className="font-semibold text-slate-950 hover:text-primary-700">
                    {session.title}
                  </Link>
                  {session.venue ? (
                    venueLink ? (
                      <Link href={venueLink} className="mt-1 block text-xs text-slate-500 hover:text-primary-700">
                        {session.venue}
                      </Link>
                    ) : (
                      <div className="mt-1 text-xs text-slate-500">{session.venue}</div>
                    )
                  ) : null}
                </td>
                <td className="px-4 py-3 align-top text-slate-600">{session.category || '—'}</td>
                <td className="px-4 py-3 align-top text-slate-600">
                  {session.citySlug ? (
                    <Link href={`/cities/${session.citySlug}`} className="hover:text-primary-700">
                      {cityLabel}
                    </Link>
                  ) : (
                    cityLabel || '—'
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3 align-top text-slate-700">{formatShowcaseSessionDate(session)}</td>
                <td className="whitespace-nowrap px-4 py-3 align-top font-semibold text-slate-950">
                  {formatMoneyRange(session.priceFrom, session.priceTo)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 align-top">
                  <span className="inline-flex items-center gap-1 text-slate-700">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    <span className="font-medium">{rating.toFixed(1)}</span>
                    <span className="text-xs text-slate-400">({formatNumber(reviewCount)})</span>
                  </span>
                </td>
                <td className="px-4 py-3 align-top">
                  <Link
                    href={eventHref(session)}
                    className="inline-flex min-h-9 items-center justify-center rounded-full bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800"
                  >
                    Купить
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
