'use client';

import * as React from 'react';
import { useParams, usePathname } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { InstitutionVenueLayout } from '@/components/InstitutionVenueLayout.client';
import { LocationVenueLayout } from '@/components/LocationVenueLayout.client';
import { useSelectedCityOptional } from '@/components/SelectedCityProvider.client';
import { VenueAdmissionBlock } from '@/components/VenueAdmissionBlock';
import type { PublicSessionDto, PublicVenueDto, PublicVenuePageDto } from '@daibilet/contracts/public';
import { resolveVenueHeroImage } from '@/lib/city-place-images';
import {
  formatCardScheduleLine,
  formatCoverDateBadge,
  isOpenDate,
} from '@/lib/event-card-meta';
import { formatAgeLimit } from '@/lib/event-page-utils';
import { applyVenueEditorialOverlay } from '@/lib/venue-editorial-content';
import { venueMatchesRouteSlug } from '@/lib/day-route';
import { formatMoney, formatNumber } from '@/lib/format';
import { formatPublicTitle } from '@/lib/format-public-title';
import { formatStreetAddress } from '@/lib/address';
import type { FinanceAdmissionProduct } from '@/lib/finance-projection';
import { eventHref } from '@/lib/routes';
import {
  buildVenueDateOptions,
  buildVenueAvailableMonths,
  buildVenueMonthRailChips,
  buildVenueProgramGroups,
  buildVenueProgramMonthView,
  formatVenueMonthLabel,
  resolveVenueSmartMonth,
  type VenueEventGroup,
  type VenueMonthFilter,
  type VenueMonthRailChip,
} from '@/lib/venue-program';
import { filterVenuePageSessionsByCity } from '@/lib/venue-page-sessions';
import { venuePageTemplate } from '@/lib/venue-meta';

/** Match SSR VenueDetailPage: curated cover + title/metro overlays. */
function withEditorialVenue(payload: PublicVenuePageDto): PublicVenuePageDto {
  const venue = payload.venue;
  if (!venue) return payload;
  let next = applyVenueEditorialOverlay(venue);
  const editorialHero = resolveVenueHeroImage(next.slug, next.heroImageUrl);
  if (editorialHero && editorialHero !== next.heroImageUrl) {
    next = { ...next, heroImageUrl: editorialHero };
  }
  if (next === venue) return payload;
  return { ...payload, venue: next };
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
  /** null = follow smartMonth until user picks a month chip. */
  const [monthFilter, setMonthFilter] = React.useState<VenueMonthFilter | null>(null);
  const [activeSlug, setActiveSlug] = React.useState(routeSlug);

  // Soft-nav can keep this client tree without remounting. Prefer pathname slug over lagging
  // useParams so «В мой маршрут» never toggles the previous venue id for one paint/frame.
  if (activeSlug !== routeSlug) {
    setActiveSlug(routeSlug);
    setPayload(matchedInitial);
    setContentReady(Boolean(matchedInitial?.venue));
    setError(null);
    setMonthFilter(null);
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
        return withEditorialVenue(data);
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

  const venue = resolveVenueForRouteSlug(routeSlug, initialPayload, payload);
  const baseSessions = React.useMemo(
    () => filterVenuePageSessionsByCity(payload?.sessions ?? [], venue),
    [payload?.sessions, venue],
  );
  const dateOptions = React.useMemo(() => buildVenueDateOptions(baseSessions), [baseSessions]);
  const availableMonths = React.useMemo(
    () => buildVenueAvailableMonths(dateOptions.availableDates),
    [dateOptions.availableDates],
  );
  const smartMonth = React.useMemo(
    () => resolveVenueSmartMonth(availableMonths),
    [availableMonths],
  );
  const resolvedMonthFilter: VenueMonthFilter = monthFilter ?? smartMonth ?? 'all';
  const monthView = React.useMemo(
    () => buildVenueProgramMonthView(baseSessions, resolvedMonthFilter),
    [baseSessions, resolvedMonthFilter],
  );
  const allRouteGroups = React.useMemo(
    () => buildVenueProgramGroups(baseSessions, 'all', null),
    [baseSessions],
  );
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
    <div className="min-h-screen bg-white text-slate-900">
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
                sessions={contentReady ? baseSessions : []}
                routeGroups={contentReady ? allRouteGroups : []}
                relatedVenues={contentReady ? matchedPayload.relatedVenues : []}
                stopEvents={contentReady ? matchedPayload.stopEvents || [] : []}
                nearbyEvents={contentReady ? matchedPayload.nearbyEvents || [] : []}
                pagePayload={matchedPayload}
              >
                {admissionProducts.length > 0 ? <VenueAdmissionBlock products={admissionProducts} /> : null}
                {baseSessions.length > 0 ? (
                  <VenueProgramBlock
                    title="Расписание и билеты"
                    selected={resolvedMonthFilter}
                    availableMonths={availableMonths}
                    onMonthChange={setMonthFilter}
                    monthView={monthView}
                  />
                ) : null}
              </LocationVenueLayout>
            ) : isInstitutionPage ? (
              <InstitutionVenueLayout
                key={venue.id}
                venue={venue}
                stats={matchedPayload.stats}
                sessions={contentReady ? baseSessions : []}
                relatedVenues={contentReady ? matchedPayload.relatedVenues : []}
                stopEvents={contentReady ? matchedPayload.stopEvents || [] : []}
                nearbyEvents={contentReady ? matchedPayload.nearbyEvents || [] : []}
                pagePayload={matchedPayload}
                admissionProducts={admissionProducts}
              >
                {baseSessions.length > 0 ? (
                  <VenueProgramBlock
                    title="Афиша"
                    selected={resolvedMonthFilter}
                    availableMonths={availableMonths}
                    onMonthChange={setMonthFilter}
                    monthView={monthView}
                  />
                ) : null}
              </InstitutionVenueLayout>
            ) : admissionProducts.length > 0 ? (
              <div className="container-page py-6">
                <VenueAdmissionBlock products={admissionProducts} />
              </div>
            ) : null}

            {!useLovableLayout && baseSessions.length > 0 ? (
              <section className="container-page grid gap-6 py-8 lg:grid-cols-[minmax(0,1fr)_320px]">
                <VenueProgramBlock
                  title="Расписание и билеты"
                  selected={resolvedMonthFilter}
                  availableMonths={availableMonths}
                  onMonthChange={setMonthFilter}
                  monthView={monthView}
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
  availableMonths,
  onMonthChange,
  monthView,
  framed = false,
}: {
  title: string;
  selected: VenueMonthFilter;
  availableMonths: string[];
  onMonthChange: (value: VenueMonthFilter) => void;
  monthView: ReturnType<typeof buildVenueProgramMonthView>;
  framed?: boolean;
}) {
  return (
    <section
      id="venue-program"
      className={`scroll-mt-24 ${framed ? 'rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6' : ''}`}
    >
      <h2 className="mb-1 font-display text-xl font-extrabold tracking-tight text-zinc-950 sm:text-2xl">
        {title}
      </h2>
      <p className="mb-4 text-sm text-zinc-500">
        Выберите месяц. Ниже - текстовое расписание в стиле театральной афиши.
      </p>
      <VenueMonthRail selected={selected} availableMonths={availableMonths} onChange={onMonthChange} />
      <VenuePlaybillList monthView={monthView} />
    </section>
  );
}

function VenueMonthRail({
  selected,
  availableMonths,
  onChange,
}: {
  selected: VenueMonthFilter;
  availableMonths: string[];
  onChange: (value: VenueMonthFilter) => void;
}) {
  const chips = React.useMemo(() => buildVenueMonthRailChips(availableMonths), [availableMonths]);
  if (!chips.length) return null;

  return (
    <div
      role="group"
      aria-label="Месяц"
      className="mb-4 horizontal-snap-row flex min-w-0 flex-nowrap gap-1.5 overflow-x-auto pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {chips.map((chip) => {
        const active = isVenueMonthRailChipActive(chip, selected);
        const key = chip.kind === 'all' ? 'all' : chip.iso;
        return (
          <button
            key={key}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(chip.kind === 'all' ? 'all' : chip.iso)}
            className={`catalog-date-chip snap-start ${active ? 'catalog-date-chip-on' : 'catalog-date-chip-idle'}`}
          >
            <span className="whitespace-nowrap">{chip.shortLabel}</span>
          </button>
        );
      })}
    </div>
  );
}

function isVenueMonthRailChipActive(chip: VenueMonthRailChip, selected: VenueMonthFilter): boolean {
  if (chip.kind === 'all') return selected === 'all';
  return selected === chip.iso;
}

/**
 * Theater playbill rows - date/time + title + price + buy.
 * Poster cards stay in «Ближайшие события» rail above; this block is schedule density.
 */
function VenuePlaybillList({
  monthView,
}: {
  monthView: ReturnType<typeof buildVenueProgramMonthView>;
}) {
  const primary = monthView.primary.slice(0, 48);
  const spillover = monthView.spillover.slice(0, 24);
  if (!primary.length && !spillover.length) return <EmptyState />;

  const showPrimaryHeading = Boolean(monthView.primaryMonth) && (spillover.length > 0 || primary.length > 0);
  const primaryLabel = formatVenueMonthLabel(monthView.primaryMonth);
  const spilloverLabel = formatVenueMonthLabel(monthView.spilloverMonth);

  return (
    <div className="space-y-8 border-t border-zinc-100 pt-2" data-venue-playbill data-venue-playbill-month>
      {primary.length ? (
        <section aria-label={primaryLabel || 'Афиша'}>
          {showPrimaryHeading && primaryLabel ? (
            <h3 className="mb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-500">
              {primaryLabel}
            </h3>
          ) : null}
          <ul className="divide-y divide-zinc-100">
            {primary.map((group) => (
              <VenuePlaybillRow key={group.key} group={group} />
            ))}
          </ul>
        </section>
      ) : null}
      {spillover.length ? (
        <section aria-label={spilloverLabel || 'Следующий месяц'}>
          {spilloverLabel ? (
            <h3 className="mb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-500">
              {spilloverLabel}
            </h3>
          ) : null}
          <ul className="divide-y divide-zinc-100">
            {spillover.map((group) => (
              <VenuePlaybillRow key={`spill:${group.key}`} group={group} />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function VenuePlaybillRow({ group }: { group: VenueEventGroup }) {
  const session = group.representative;
  const href = eventHref(session);
  const title = formatPublicTitle(group.title || session.title || session.eventTitle);
  const when = playbillWhenLabel(session, group);
  const age = formatAgeLimit(session.ageLimit);
  const meta = [group.category, age].filter(Boolean).join(' · ');
  const rawPrice =
    typeof group.priceFrom === 'number' && group.priceFrom >= 100
      ? group.priceFrom
      : typeof session.priceFrom === 'number' && session.priceFrom >= 100
        ? session.priceFrom
        : null;
  const priceLabel =
    rawPrice != null ? `от ${formatNumber(rawPrice)}\u00a0₽` : null;
  const vacant =
    typeof group.vacant === 'number' && group.vacant > 0 && group.vacant <= 40
      ? `${group.vacant} мест`
      : null;
  const slotTimes = collectPlaybillSlotTimes(group);

  return (
    <li className="group">
      <a
        href={href}
        className="flex flex-col gap-2 py-3.5 transition hover:bg-zinc-50/80 sm:flex-row sm:items-center sm:gap-4 sm:px-1"
      >
        <div className="w-[7.5rem] shrink-0 sm:w-32" data-venue-playbill-when>
          <p
            className={`text-sm font-semibold tabular-nums ${
              when.weekend ? 'text-rose-600' : 'text-zinc-950'
            }`}
          >
            {when.primary}
          </p>
          {when.secondary ? (
            <p className="mt-0.5 text-xs tabular-nums text-zinc-500">{when.secondary}</p>
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold leading-snug text-zinc-950 group-hover:text-primary-800">
            {title}
          </p>
          {meta ? <p className="mt-0.5 text-xs text-zinc-500">{meta}</p> : null}
          {slotTimes.length > 1 ? (
            <p className="mt-1.5 flex flex-wrap gap-1.5" data-venue-playbill-slots>
              {slotTimes.slice(0, 8).map((time) => (
                <span
                  key={time}
                  className="rounded border border-zinc-200 bg-white px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-zinc-700"
                >
                  {time}
                </span>
              ))}
              {slotTimes.length > 8 ? (
                <span className="text-[11px] text-zinc-400">+{slotTimes.length - 8}</span>
              ) : null}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center justify-end gap-3">
          <div className="text-right">
            {priceLabel ? (
              <div className="text-sm font-bold tabular-nums text-zinc-950">{priceLabel}</div>
            ) : (
              <div className="text-sm font-medium text-zinc-500">Смотреть</div>
            )}
            {vacant ? <div className="mt-0.5 text-xs tabular-nums text-amber-700">{vacant}</div> : null}
          </div>
          <span className="inline-flex min-h-8 items-center rounded-full bg-graphite px-3.5 text-xs font-semibold text-white">
            Купить
          </span>
        </div>
      </a>
    </li>
  );
}

const PLAYBILL_MONTH_GENITIVE_RU = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
] as const;

function playbillSessionDate(session: PublicSessionDto): Date | null {
  const raw = session.startsAt;
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isFinite(date.getTime()) ? date : null;
}

function playbillWhenLabel(
  session: PublicSessionDto,
  group: VenueEventGroup,
): { primary: string; secondary: string | null; weekend: boolean } {
  if (isOpenDate(session)) {
    return { primary: 'Открытая дата', secondary: null, weekend: false };
  }
  const date = playbillSessionDate(session);
  const time =
    String(session.timeLabel || '').trim().replace(/^в\s+/i, '') ||
    collectPlaybillSlotTimes(group)[0] ||
    null;
  if (date) {
    const day = date.getDate();
    const month = PLAYBILL_MONTH_GENITIVE_RU[date.getMonth()] || '';
    const dow = date.getDay();
    const weekend = dow === 0 || dow === 6;
    const badge = formatCoverDateBadge(session);
    if (badge === 'Сегодня' || badge === 'Завтра') {
      return { primary: `${badge}, ${day} ${month}`, secondary: time, weekend };
    }
    return { primary: `${day} ${month}`, secondary: time, weekend };
  }
  const badge = formatCoverDateBadge(session);
  const schedule = formatCardScheduleLine(session);
  if (badge) {
    return {
      primary: badge,
      secondary: time || schedule || null,
      weekend: false,
    };
  }
  const firstSlot = group.visibleSlots[0] || group.sessions[0];
  const fallback = [firstSlot?.dateLabel, firstSlot?.timeLabel].filter(Boolean).join(', ');
  return { primary: fallback || 'Дата', secondary: null, weekend: false };
}

function collectPlaybillSlotTimes(group: VenueEventGroup): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const slot of group.visibleSlots.length ? group.visibleSlots : group.sessions) {
    const time = String(slot.timeLabel || '')
      .trim()
      .replace(/^в\s+/i, '');
    if (!time || seen.has(time)) continue;
    seen.add(time);
    out.push(time);
  }
  return out;
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
