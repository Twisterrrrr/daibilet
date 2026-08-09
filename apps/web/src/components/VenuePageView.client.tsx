'use client';

import * as React from 'react';
import { useParams, usePathname } from 'next/navigation';
import { ArrowLeft, Calendar as CalendarIcon } from 'lucide-react';

import { EventCard } from '@/components/EventCard';
import { InstitutionVenueLayout } from '@/components/InstitutionVenueLayout.client';
import { LocationVenueLayout } from '@/components/LocationVenueLayout.client';
import { useSelectedCityOptional } from '@/components/SelectedCityProvider.client';
import { VenueAdmissionBlock } from '@/components/VenueAdmissionBlock';
import type { PublicVenueDto, PublicVenuePageDto } from '@daibilet/contracts/public';
import { resolveVenueHeroImage } from '@/lib/city-place-images';
import { venueMatchesRouteSlug } from '@/lib/day-route';
import { formatMoney, formatNumber } from '@/lib/format';
import { formatStreetAddress } from '@/lib/address';
import type { FinanceAdmissionProduct } from '@/lib/finance-projection';
import {
  buildVenueDateOptions,
  buildVenueDateRailChips,
  buildVenueProgramGroups,
  type VenueDateFilter,
  type VenueDateRailChip,
  type VenueEventGroup,
} from '@/lib/venue-program';
import { venuePageTemplate } from '@/lib/venue-meta';

/** Match SSR VenueDetailPage: curated cover wins over hub stub / supplier thumb. */
function withEditorialHero(payload: PublicVenuePageDto): PublicVenuePageDto {
  const venue = payload.venue;
  if (!venue) return payload;
  const editorialHero = resolveVenueHeroImage(venue.slug, venue.heroImageUrl);
  if (!editorialHero || editorialHero === venue.heroImageUrl) return payload;
  return { ...payload, venue: { ...venue, heroImageUrl: editorialHero } };
}

function slugFromPathname(pathname: string | null | undefined): string {
  const path = String(pathname || '');
  const match = path.match(/\/(?:locations|venues)\/([^/?#]+)/i);
  if (!match?.[1]) return '';
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

function resolveVenueForRouteSlug(
  routeSlug: string,
  initialPayload: PublicVenuePageDto | null,
  payload: PublicVenuePageDto | null,
): PublicVenueDto | null {
  if (initialPayload?.venue && venueMatchesRouteSlug(initialPayload.venue, routeSlug)) {
    return initialPayload.venue;
  }
  if (payload?.venue && venueMatchesRouteSlug(payload.venue, routeSlug)) {
    return payload.venue;
  }
  return null;
}

export function VenuePageView({
  slug,
  initialPayload,
  admissionProducts = [],
}: {
  slug: string;
  initialPayload: PublicVenuePageDto | null;
  admissionProducts?: FinanceAdmissionProduct[];
}) {
  const params = useParams();
  const pathname = usePathname();
  const selectedCity = useSelectedCityOptional();
  const routeSlug = React.useMemo(() => {
    const fromPath = slugFromPathname(pathname);
    if (fromPath) return fromPath;
    const fromParams = typeof params?.slug === 'string' ? params.slug : Array.isArray(params?.slug) ? params.slug[0] : '';
    const raw = String(fromParams || slug || '').trim();
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }, [params, pathname, slug]);

  const matchedInitial =
    initialPayload?.venue && venueMatchesRouteSlug(initialPayload.venue, routeSlug) ? initialPayload : null;
  const matchedInitialVenueId = matchedInitial?.venue?.id ?? null;

  const [payload, setPayload] = React.useState<PublicVenuePageDto | null>(matchedInitial);
  const [contentReady, setContentReady] = React.useState(() => Boolean(matchedInitial?.venue));
  const [error, setError] = React.useState<string | null>(null);
  /** null = follow smartDate until user picks a chip/calendar day. */
  const [dateFilter, setDateFilter] = React.useState<VenueDateFilter | null>(null);
  const [activeSlug, setActiveSlug] = React.useState(routeSlug);

  // Soft-nav can keep this client tree without remounting. Prefer pathname slug over lagging
  // useParams so «В мой маршрут» never toggles the previous venue id for one paint/frame.
  if (activeSlug !== routeSlug) {
    setActiveSlug(routeSlug);
    setPayload(matchedInitial);
    setContentReady(Boolean(matchedInitial?.venue));
    setError(null);
    setDateFilter(null);
  }

  React.useEffect(() => {
    if (matchedInitialVenueId && matchedInitial) {
      setPayload(matchedInitial);
      setContentReady(true);
      setError(null);
      return;
    }
    const controller = new AbortController();
    setPayload(null);
    setContentReady(false);
    fetch(`/api/public/venues/${encodeURIComponent(routeSlug)}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = (await response.json()) as PublicVenuePageDto | null;
        if (!data?.venue) throw new Error('Страница не найдена');
        if (!venueMatchesRouteSlug(data.venue, routeSlug)) {
          throw new Error('Страница не найдена');
        }
        return withEditorialHero(data);
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
    // matchedInitial object identity changes; key off venue id + route slug.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeSlug, matchedInitialVenueId]);

  const baseSessions = payload?.sessions ?? [];
  const dateOptions = React.useMemo(() => buildVenueDateOptions(baseSessions), [baseSessions]);
  const resolvedDateFilter: VenueDateFilter = dateFilter ?? dateOptions.smartDate ?? 'all';
  const groups = React.useMemo(() => {
    const built = buildVenueProgramGroups(baseSessions, resolvedDateFilter, dateOptions.smartDate);
    if (resolvedDateFilter === 'all') return built;
    return built.filter((group) => group.hasSlotsOnSelectedDate);
  }, [baseSessions, resolvedDateFilter, dateOptions.smartDate]);
  const allRouteGroups = React.useMemo(
    () => buildVenueProgramGroups(baseSessions, 'all', null),
    [baseSessions],
  );
  const venue = resolveVenueForRouteSlug(routeSlug, initialPayload, payload);
  const matchedPayload =
    payload?.venue && venueMatchesRouteSlug(payload.venue, routeSlug) ? payload : matchedInitial;
  const pageTemplate = venue ? venuePageTemplate(venue.type) : 'location';
  const isLocationPage = pageTemplate === 'location';
  const isInstitutionPage = pageTemplate === 'institution';
  const useLovableLayout = isLocationPage || isInstitutionPage;

  // A flat venue URL has no city segment. Make its verified venue city the
  // header context instead of leaking a previously selected destination.
  React.useEffect(() => {
    const city = String(venue?.city || '').trim();
    if (!city || city === 'Не указан' || selectedCity?.cityValue === city) return;
    selectedCity?.setCity(city, { skipRouteConfirm: true, persistOnly: true });
  }, [selectedCity, venue?.city]);

  return (
    <div className={`min-h-screen text-slate-900 ${useLovableLayout ? 'bg-slate-50' : 'bg-white'}`}>
      <div>
        {!venue && !error ? (
          <div className="container-page py-16 text-sm text-slate-500">Загружаем страницу...</div>
        ) : null}

        {!venue && !contentReady && error ? (
          <div className="container-page py-16">
            <button type="button" className="btn-secondary" onClick={() => navigateHome('top')}>
              <ArrowLeft className="h-4 w-4" />
              На главную
            </button>
            <h1 className="mt-6 text-3xl font-bold text-slate-950">Страница не найдена</h1>
            <p className="mt-2 text-sm text-slate-600">{error}</p>
          </div>
        ) : null}

        {venue && matchedPayload && contentReady ? (
          <>
            {isLocationPage ? (
              <LocationVenueLayout
                key={venue.id}
                venue={venue}
                stats={matchedPayload.stats}
                sessions={contentReady ? matchedPayload.sessions : []}
                routeGroups={contentReady ? allRouteGroups : []}
                relatedVenues={contentReady ? matchedPayload.relatedVenues : []}
                stopEvents={contentReady ? matchedPayload.stopEvents || [] : []}
                nearbyEvents={contentReady ? matchedPayload.nearbyEvents || [] : []}
                pagePayload={matchedPayload}
              >
                {baseSessions.length > 0 ? (
                  <VenueProgramBlock
                    title="Расписание и билеты"
                    selected={resolvedDateFilter}
                    availableDates={dateOptions.availableDates}
                    onDateChange={setDateFilter}
                    groups={groups}
                    framed
                  />
                ) : null}
              </LocationVenueLayout>
            ) : isInstitutionPage ? (
              <InstitutionVenueLayout
                key={venue.id}
                venue={venue}
                stats={matchedPayload.stats}
                sessions={contentReady ? matchedPayload.sessions : []}
                relatedVenues={contentReady ? matchedPayload.relatedVenues : []}
                stopEvents={contentReady ? matchedPayload.stopEvents || [] : []}
                nearbyEvents={contentReady ? matchedPayload.nearbyEvents || [] : []}
                pagePayload={matchedPayload}
                admissionProducts={admissionProducts}
              >
                {baseSessions.length > 0 ? (
                  <VenueProgramBlock
                    title="Афиша и билеты"
                    selected={resolvedDateFilter}
                    availableDates={dateOptions.availableDates}
                    onDateChange={setDateFilter}
                    groups={groups}
                    framed
                  />
                ) : null}
              </InstitutionVenueLayout>
            ) : null}

            {!isInstitutionPage && !isLocationPage && admissionProducts.length > 0 ? (
              <div className="container-page py-6">
                <VenueAdmissionBlock products={admissionProducts} />
              </div>
            ) : null}

            {!useLovableLayout && baseSessions.length > 0 ? (
              <section className="container-page grid gap-6 py-8 lg:grid-cols-[minmax(0,1fr)_320px]">
                <VenueProgramBlock
                  title="Расписание и билеты"
                  selected={resolvedDateFilter}
                  availableDates={dateOptions.availableDates}
                  onDateChange={setDateFilter}
                  groups={groups}
                />
                <aside className="space-y-4">
                  <section className="rounded-xl bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
                    <h3 className="text-sm font-semibold text-slate-950">Кратко</h3>
                    <dl className="mt-4 grid gap-3 text-sm">
                      <InfoRow label="Город" value={venue.city} />
                      <InfoRow label="Адрес" value={venueStreetLabel(venue)} />
                      <InfoRow label="Событий" value={formatNumber(matchedPayload.stats.events)} />
                      <InfoRow label="Цена" value={formatMoney(matchedPayload.stats.priceFrom)} />
                    </dl>
                  </section>
                </aside>
              </section>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}

function VenueProgramBlock({
  title,
  selected,
  availableDates,
  onDateChange,
  groups,
  framed = false,
}: {
  title: string;
  selected: VenueDateFilter;
  availableDates: string[];
  onDateChange: (value: VenueDateFilter) => void;
  groups: VenueEventGroup[];
  framed?: boolean;
}) {
  return (
    <section
      id="venue-program"
      className={`scroll-mt-24 ${framed ? 'rounded-2xl border border-slate-200 bg-white p-5 sm:p-6' : ''}`}
    >
      <h2 className="mb-3 text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">{title}</h2>
      <VenueDateRail selected={selected} availableDates={availableDates} onChange={onDateChange} />
      <VenueEventsGrid groups={groups} />
    </section>
  );
}

function VenueDateRail({
  selected,
  availableDates,
  onChange,
}: {
  selected: VenueDateFilter;
  availableDates: string[];
  onChange: (value: VenueDateFilter) => void;
}) {
  const calendarRef = React.useRef<HTMLInputElement>(null);
  const chips = React.useMemo(() => buildVenueDateRailChips(availableDates), [availableDates]);
  const minDate = availableDates[0] || undefined;
  const maxDate = availableDates[availableDates.length - 1] || undefined;
  const calendarValue = selected !== 'all' && /^\d{4}-\d{2}-\d{2}$/.test(selected) ? selected : '';
  const calendarOffRail =
    Boolean(calendarValue) && !availableDates.slice(0, 21).includes(calendarValue);

  const openCalendar = () => {
    const input = calendarRef.current;
    if (!input) return;
    try {
      if (typeof input.showPicker === 'function') {
        input.showPicker();
        return;
      }
    } catch {
      // fall through to click
    }
    input.click();
  };

  return (
    <div className="mb-4 flex items-center gap-2">
      <div
        role="group"
        aria-label="Дата"
        className="horizontal-snap-row flex min-w-0 flex-1 flex-nowrap gap-1.5 overflow-x-auto pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {chips.map((chip) => {
          const active = isVenueDateRailChipActive(chip, selected);
          const key = chip.kind === 'all' ? 'all' : chip.iso;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(chip.kind === 'all' ? 'all' : chip.iso)}
              className={`catalog-date-chip snap-start ${active ? 'catalog-date-chip-on' : 'catalog-date-chip-idle'}`}
            >
              {chip.kind === 'day' ? (
                <span className="flex flex-col items-center leading-none">
                  <span className="text-[10px] font-semibold uppercase tracking-wide opacity-80">{chip.weekday}</span>
                  <span className="mt-0.5 text-sm font-bold">{chip.dayNum}</span>
                </span>
              ) : (
                <span className="whitespace-nowrap">{chip.shortLabel}</span>
              )}
            </button>
          );
        })}
      </div>

      {availableDates.length > 0 ? (
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={openCalendar}
            aria-label="Выбрать другую дату"
            aria-pressed={calendarOffRail}
            className={`catalog-date-chip inline-flex h-11 w-11 items-center justify-center px-0 ${
              calendarOffRail ? 'catalog-date-chip-on' : 'catalog-date-chip-idle'
            }`}
          >
            <CalendarIcon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          </button>
          <input
            ref={calendarRef}
            type="date"
            value={calendarValue}
            min={minDate}
            max={maxDate}
            onChange={(event) => {
              const next = event.target.value;
              if (!next) return;
              onChange(next);
            }}
            aria-label="Календарь дат с билетами"
            className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
            tabIndex={-1}
          />
        </div>
      ) : null}
    </div>
  );
}

function isVenueDateRailChipActive(chip: VenueDateRailChip, selected: VenueDateFilter): boolean {
  if (chip.kind === 'all') return selected === 'all';
  return selected === chip.iso;
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
