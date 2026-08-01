'use client';

import * as React from 'react';
import { ArrowLeft, Grid3X3, ListFilter } from 'lucide-react';

import { EventCard } from '@/components/EventCard';
import { InstitutionVenueLayout } from '@/components/InstitutionVenueLayout.client';
import { LocationVenueLayout } from '@/components/LocationVenueLayout.client';
import { VenueAdmissionBlock } from '@/components/VenueAdmissionBlock';
import type { PublicVenueDto, PublicVenuePageDto } from '@daibilet/contracts/public';
import { formatMoney, formatNumber } from '@/lib/format';
import { formatStreetAddress } from '@/lib/address';
import type { FinanceAdmissionProduct } from '@/lib/finance-projection';
import {
  buildVenueDateOptions,
  buildVenueProgramGroups,
  countVisibleVenueSlots,
  formatHumanDate,
  formatShortDate,
  type VenueDateFilter,
  type VenueEventGroup,
} from '@/lib/venue-program';
import { venuePageTemplate } from '@/lib/venue-meta';
import { eventHref } from '@/lib/routes';

export function VenuePageView({
  slug,
  initialPayload,
  admissionProducts = [],
}: {
  slug: string;
  initialPayload: PublicVenuePageDto | null;
  admissionProducts?: FinanceAdmissionProduct[];
}) {
  const [payload, setPayload] = React.useState<PublicVenuePageDto | null>(initialPayload);
  const [contentReady, setContentReady] = React.useState(() =>
    // CF.P2e: admission-only institutions have zero sessions but still need SSR layout/CTA.
    Boolean(initialPayload?.venue),
  );
  const [error, setError] = React.useState<string | null>(null);
  const [category, setCategory] = React.useState('all');
  const [dateFilter, setDateFilter] = React.useState<VenueDateFilter>('smart');
  const [mode, setMode] = React.useState<'cards' | 'table'>('cards');

  React.useEffect(() => {
    // Soft-nav between /locations|venues/[slug] reuses this client tree. Without sync,
    // payload sticks on the previous venue and «В мой маршрут» toggles the wrong id
    // (add second point → often removes the first). Prefer SSR payload; fetch only if absent.
    if (initialPayload?.venue) {
      setPayload(initialPayload);
      setContentReady(true);
      setError(null);
      setCategory('all');
      setDateFilter('smart');
      return;
    }
    const controller = new AbortController();
    setPayload(null);
    setContentReady(false);
    fetch(`/api/public/venues/${encodeURIComponent(slug)}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = (await response.json()) as PublicVenuePageDto | null;
        if (!data?.venue) throw new Error('Страница не найдена');
        return data;
      })
      .then((data) => {
        setPayload(data);
        setContentReady(true);
        setError(null);
      })
      .catch((requestError) => {
        if (controller.signal.aborted) return;
        setError(requestError instanceof Error ? requestError.message : 'Страница не найдена');
      });
    return () => controller.abort();
  }, [slug, initialPayload]);

  const baseSessions = React.useMemo(() => {
    if (!payload) return [];
    if (category === 'all') return payload.sessions;
    return payload.sessions.filter((session) => session.category === category);
  }, [category, payload]);

  const dateOptions = React.useMemo(() => buildVenueDateOptions(baseSessions), [baseSessions]);
  const groups = React.useMemo(
    () => buildVenueProgramGroups(baseSessions, dateFilter, dateOptions.smartDate),
    [baseSessions, dateFilter, dateOptions.smartDate],
  );
  const visibleSlotCount = React.useMemo(() => countVisibleVenueSlots(groups), [groups]);
  const routeCount = React.useMemo(
    () => buildVenueProgramGroups(baseSessions, 'all', null).length,
    [baseSessions],
  );
  const allRouteGroups = React.useMemo(
    () => buildVenueProgramGroups(baseSessions, 'all', null),
    [baseSessions],
  );
  const venue = payload?.venue;
  const categories = venue ? Object.entries(venue.categories).sort((a, b) => b[1] - a[1]) : [];
  const pageTemplate = venue ? venuePageTemplate(venue.type) : 'location';
  const isLocationPage = pageTemplate === 'location';
  const isInstitutionPage = pageTemplate === 'institution';
  const useLovableLayout = isLocationPage || isInstitutionPage;

  return (
    <div className={`min-h-screen text-slate-900 ${useLovableLayout ? 'bg-slate-50' : 'bg-white'}`}>
      <div>
        {!payload && !error ? (
          <div className="container-page py-16 text-sm text-slate-500">Загружаем страницу...</div>
        ) : null}

        {!payload && !contentReady && error ? (
          <div className="container-page py-16">
            <button type="button" className="btn-secondary" onClick={() => navigateHome('top')}>
              <ArrowLeft className="h-4 w-4" />
              На главную
            </button>
            <h1 className="mt-6 text-3xl font-bold text-slate-950">Страница не найдена</h1>
            <p className="mt-2 text-sm text-slate-600">{error}</p>
          </div>
        ) : null}

        {venue && payload && contentReady ? (
          <>
            {isLocationPage ? (
              <LocationVenueLayout
                venue={venue}
                stats={payload.stats}
                sessions={contentReady ? payload.sessions : []}
                routeGroups={contentReady ? allRouteGroups : []}
                relatedVenues={contentReady ? payload.relatedVenues : []}
                stopEvents={contentReady ? payload.stopEvents || [] : []}
                nearbyEvents={contentReady ? payload.nearbyEvents || [] : []}
                pagePayload={payload}
              />
            ) : isInstitutionPage ? (
              <InstitutionVenueLayout
                venue={venue}
                stats={payload.stats}
                sessions={contentReady ? payload.sessions : []}
                relatedVenues={contentReady ? payload.relatedVenues : []}
                pagePayload={payload}
                admissionProducts={admissionProducts}
              />
            ) : null}

            {!isInstitutionPage && admissionProducts.length > 0 ? (
              <div className="container-page py-6">
                <VenueAdmissionBlock products={admissionProducts} />
              </div>
            ) : null}

            {contentReady ? (
            <section id="venue-program" className={`container-page py-8 ${useLovableLayout ? '' : 'grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]'}`}>
              <div className={useLovableLayout ? 'rounded-2xl border border-slate-200 bg-white p-6' : ''}>
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-950">
                      {isInstitutionPage ? 'Афиша и билеты' : 'Расписание и билеты'}
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      {isInstitutionPage
                        ? 'События площадки — выберите категорию, дату и сеанс для покупки.'
                        : 'По одному маршруту в строке; в колонке слотов — ближайшие отправления на выбранную дату.'}
                    </p>
                  </div>
                  <div className="inline-flex overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <button type="button" onClick={() => setMode('table')} className={`inline-flex items-center gap-2 px-4 text-sm font-medium ${mode === 'table' ? 'bg-primary-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
                      <ListFilter className="h-4 w-4" />
                      Таблица
                    </button>
                    <button type="button" onClick={() => setMode('cards')} className={`inline-flex items-center gap-2 border-l border-slate-200 px-4 text-sm font-medium ${mode === 'cards' ? 'bg-primary-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
                      <Grid3X3 className="h-4 w-4" />
                      Карточки
                    </button>
                  </div>
                </div>

                <div className="mb-4 flex flex-wrap gap-2">
                  <button type="button" onClick={() => setCategory('all')} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${category === 'all' ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                    Все {formatNumber(routeCount)}
                  </button>
                  {categories.map(([name, count]) => (
                    <button key={name} type="button" onClick={() => setCategory(name)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${category === name ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                      {name} {formatNumber(count)}
                    </button>
                  ))}
                </div>

                <VenueDateFilters
                  dateFilter={dateFilter}
                  options={dateOptions}
                  onChange={setDateFilter}
                  visibleGroups={groups.length}
                  visibleSessions={visibleSlotCount}
                  variant={isInstitutionPage ? 'institution' : 'location'}
                />

                {mode === 'table' ? <VenueEventsTable groups={groups} /> : <VenueEventsGrid groups={groups} />}
              </div>

              {!useLovableLayout ? (
                <aside className="space-y-4">
                  <section className="rounded-xl bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
                    <h3 className="text-sm font-semibold text-slate-950">Кратко</h3>
                    <dl className="mt-4 grid gap-3 text-sm">
                      <InfoRow label="Город" value={venue.city} />
                      <InfoRow label="Адрес" value={venueStreetLabel(venue)} />
                      <InfoRow label="Событий" value={formatNumber(payload.stats.events)} />
                      <InfoRow label="Цена" value={formatMoney(payload.stats.priceFrom)} />
                    </dl>
                  </section>
                </aside>
              ) : null}
            </section>
            ) : (
              <div className="container-page py-8">
                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500">
                  Загружаем расписание и билеты…
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
function VenueDateFilters({
  dateFilter,
  options,
  onChange,
  visibleGroups,
  visibleSessions,
  variant = 'location',
}: {
  dateFilter: VenueDateFilter;
  options: ReturnType<typeof buildVenueDateOptions>;
  onChange: (value: VenueDateFilter) => void;
  visibleGroups: number;
  visibleSessions: number;
  variant?: 'location' | 'institution';
}) {
  const groupLabel = variant === 'institution' ? 'событий' : 'маршрутов';
  const sessionLabel = variant === 'institution' ? 'сеансов' : 'отправлений';

  return (
    <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-sm font-semibold text-slate-950">Дата</div>
          <div className="text-xs text-slate-500">
            Показано {formatNumber(visibleGroups)} {groupLabel}, {formatNumber(visibleSessions)} {sessionLabel} на выбранную дату.
          </div>
        </div>
        {options.smartDate ? <div className="text-xs font-medium text-slate-500">Ближайшая дата: {formatHumanDate(options.smartDate)}</div> : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <DateChip active={dateFilter === 'smart'} disabled={!options.smartDate} onClick={() => onChange('smart')} label={options.smartDate ? `Ближайшая · ${formatShortDate(options.smartDate)}` : 'Ближайшая'} />
        <DateChip active={dateFilter === 'today'} disabled={!options.hasToday} onClick={() => onChange('today')} label="Сегодня" />
        <DateChip active={dateFilter === 'tomorrow'} disabled={!options.hasTomorrow} onClick={() => onChange('tomorrow')} label="Завтра" />
        <DateChip active={dateFilter === 'all'} disabled={false} onClick={() => onChange('all')} label="Все даты" />
      </div>
    </div>
  );
}

function DateChip({ active, disabled, label, onClick }: { active: boolean; disabled: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
        active
          ? 'bg-primary-600 text-white'
          : disabled
            ? 'bg-slate-100 text-slate-300'
            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
      }`}
    >
      {label}
    </button>
  );
}

function VenueEventsGrid({ groups }: { groups: VenueEventGroup[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {groups.slice(0, 36).map((group) => (
        <EventCard key={group.key} session={group.representative} compact />
      ))}
      {!groups.length ? <EmptyState /> : null}
    </div>
  );
}

function VenueEventsTable({ groups }: { groups: VenueEventGroup[] }) {
  return (
    <div className="overflow-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[900px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500">
            <th className="px-4 py-3 font-semibold">Ближайшие слоты</th>
            <th className="px-4 py-3 font-semibold">Событие</th>
            <th className="px-4 py-3 font-semibold">Категория</th>
            <th className="px-4 py-3 font-semibold">Цена</th>
            <th className="px-4 py-3 font-semibold">Остаток</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {groups.slice(0, 120).map((group) => (
            <tr key={group.key} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
              <td className="whitespace-nowrap px-4 py-3 align-top">
                <div className="flex flex-wrap gap-1.5">
                  {group.visibleSlots.length ? (
                    group.visibleSlots.map((session) => (
                      <span
                        key={`${session.id}:${session.startsAt}`}
                        className={`rounded-lg px-2 py-1 text-xs font-medium ${
                          group.hasSlotsOnSelectedDate ? 'bg-slate-100 text-slate-700' : 'bg-amber-50 text-amber-800'
                        }`}
                      >
                        {session.dateLabel} · {session.timeLabel}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400">Нет рейсов</span>
                  )}
                </div>
                {!group.hasSlotsOnSelectedDate && group.visibleSlots.length ? (
                  <p className="mt-1 text-[11px] text-amber-700">Ближайшее отправление</p>
                ) : null}
              </td>
              <td className="min-w-[320px] px-4 py-3">
                <a href={eventHref(group.representative)} className="font-medium text-slate-950 hover:text-primary-700">{group.title}</a>
                <div className="mt-1 text-xs text-slate-500">{group.tags.slice(0, 2).join(' · ')}</div>
              </td>
              <td className="px-4 py-3 text-slate-600">{group.category}</td>
              <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-950">{formatMoney(group.priceFrom)}</td>
              <td className="px-4 py-3 text-slate-600">{group.vacant ?? '-'}</td>
              <td className="px-4 py-3">
                <BuyLink group={group} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!groups.length ? <EmptyState /> : null}
    </div>
  );
}

function BuyLink({ group }: { group: VenueEventGroup }) {
  return (
    <a href={eventHref(group.representative)} className="inline-flex min-h-9 items-center justify-center rounded-full bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700">
      Купить
    </a>
  );
}

function EmptyState() {
  return <div className="p-8 text-sm text-slate-500">Событий по выбранному фильтру пока нет.</div>;
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[90px_1fr] gap-3">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="min-w-0 text-slate-800">{value}</dd>
    </div>
  );
}

function venueStreetLabel(venue: PublicVenueDto): string {
  const street = formatStreetAddress(venue.address, { city: venue.city });
  return street || 'Адрес уточняется';
}

function navigateHome(section: string) {
  if (section === 'top') {
    window.location.href = '/';
    return;
  }
  if (section === 'events') {
    window.location.href = '/events';
    return;
  }
  if (section === 'cities' || section === 'destinations') {
    window.location.href = '/cities';
    return;
  }
  if (section === 'venues') {
    window.location.href = '/venues';
    return;
  }
  if (section === 'locations') {
    window.location.href = '/locations';
    return;
  }
  if (section === 'blog') {
    window.location.href = '/blog';
    return;
  }
  window.location.href = `/#${section}`;
}
