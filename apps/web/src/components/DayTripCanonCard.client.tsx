'use client';

import * as React from 'react';
import Link from 'next/link';

import { SafeImage } from '@/components/SafeImage.client';
import type { CitySuburbGastroStop } from '@/lib/cityInfo';
import { formatVisitDuration } from '@/lib/visit-duration';

export type DayTripCanonSight = {
  name: string;
  desc?: string;
  href?: string | null;
  /** Совет по перемещению к этой точке (серая строка между пунктами). */
  transitTip?: string;
  /** Заголовок дня над пунктом (multi-day suburb: «День 1 - Усьва»). */
  dayLabel?: string;
  visitMinutes?: number;
};

export type DayTripCanonCardProps = {
  index: number;
  total?: number;
  title: React.ReactNode;
  /** Subtitle under title (vector / timingNote / description). */
  subtitle?: string;
  logisticsExit?: string;
  /** Label before logisticsExit. Empty → «Где выходить» if exit set, else «Логистика». */
  logisticsExitLabel?: string;
  logisticsText?: string;
  /** Extra prose under logistics (hub blurb). */
  logisticsExtra?: string;
  gastro?: CitySuburbGastroStop | null;
  sights: DayTripCanonSight[];
  /** Show sight desc only from md+ (my-day compact). */
  sightDescFromMd?: boolean;
  editorial?: boolean;
  /**
   * my-day magazine: large cover photo, short «Что посмотреть», primary CTA.
   * Hub keeps full logistics + all POIs and now also shows the same cover.
   */
  magazine?: boolean;
  /** Cover for magazine layout (editorial / hub hero). */
  heroImageUrl?: string | null;
  /** Short lead under title (suburb desc). */
  lead?: string | null;
  /** Footer CTA (AddMany / Collect day button). */
  cta?: React.ReactNode;
  /** Optional link row under title (blog). Text no SVG required. */
  titleExtra?: React.ReactNode;
  id?: string;
  role?: React.AriaRole;
  'aria-label'?: string;
  className?: string;
  /** data-* hooks */
  dataAttrs?: Record<string, string | undefined>;
};

const MAGAZINE_SIGHTS_MAX = 4;
const HUB_SIGHTS_PREVIEW = 3;

function SightLabel({
  name,
  href,
  desc,
  descFromMd,
  visitMinutes,
}: {
  name: string;
  href?: string | null;
  desc?: string;
  descFromMd?: boolean;
  visitMinutes?: number;
}) {
  const nameNode = href ? (
    <Link
      href={href}
      className="font-semibold underline decoration-slate-300 underline-offset-2 hover:decoration-current"
    >
      {name}
    </Link>
  ) : (
    <strong className="font-semibold">{name}</strong>
  );
  const visitLabel = formatVisitDuration(visitMinutes);
  const text = String(desc || '').trim();
  return (
    <>
      {nameNode}
      {visitLabel ? (
        <span className="ml-1.5 font-normal text-slate-500" data-city-visit-duration>
          {visitLabel}
        </span>
      ) : null}
      {text ? (
        <span className={`font-normal ${descFromMd ? 'hidden md:inline' : ''}`}>{` - ${text}`}</span>
      ) : null}
    </>
  );
}

/**
 * Desktop (owner red line):
 * - Left gutter = badge width; badge + list nums centered in gutter.
 * - Right column = ALL text flush to one vertical (title / headings / panel copy / POI names).
 * Mobile: same grid, tighter card padding for usable width.
 */
const GRID =
  'grid grid-cols-[2rem_minmax(0,1fr)] gap-x-2.5 sm:grid-cols-[2.25rem_minmax(0,1fr)] sm:gap-x-3';
const GUTTER = 'flex justify-center';
/**
 * Desktop: text stays on title vertical; panel bg needs breathing room.
 * Logistics: extend gray bg left (-ml) + matching pl so copy does not move.
 * Gastro: same pl so yellow inset matches logistics after the extend.
 * Mobile: keep px-2.5 (wider content).
 */
const PANEL_INSET_SM = 'sm:pl-4';
const LOGISTICS_BG_EXTEND_SM = 'sm:-ml-4';

/** Compact between-stop tip: «↓ 5-8 мин пешком» (hyphen only). */
function formatCanonTransitTip(raw: string): string {
  const tip = raw.trim();
  if (!tip) return '';
  if (/^[↓▾▼]/.test(tip)) return tip;
  return `↓ ${tip}`;
}

export function DayTripCanonCard({
  index,
  total,
  title,
  subtitle,
  logisticsExit,
  logisticsExitLabel,
  logisticsText,
  logisticsExtra,
  gastro,
  sights,
  sightDescFromMd = false,
  editorial = false,
  magazine = false,
  heroImageUrl = null,
  lead = null,
  cta,
  titleExtra,
  id,
  role,
  'aria-label': ariaLabel,
  className = '',
  dataAttrs,
}: DayTripCanonCardProps) {
  const mutedClass = editorial ? 'text-zinc-500' : 'text-slate-500';
  const softClass = editorial ? 'text-zinc-600' : 'text-slate-600';
  const borderSoft = editorial ? 'border-zinc-100' : 'border-slate-100';
  const inkClass = editorial ? 'text-zinc-950' : 'text-slate-950';
  const titleClass = editorial ? 'text-zinc-950' : 'text-slate-950';
  const numClass = editorial ? 'text-zinc-400' : 'text-slate-400';
  const poiTextClass = editorial ? 'text-zinc-700' : 'text-slate-700';
  const badgeClass = editorial
    ? 'bg-zinc-100 text-zinc-800'
    : 'bg-primary-50 text-primary-700';
  const panelClass = editorial
    ? 'rounded-xl border border-zinc-100 bg-zinc-50/60'
    : 'rounded-xl border border-slate-100 bg-slate-50/70';

  const hasLogistics = Boolean(logisticsExit || logisticsText || logisticsExtra);
  const hasGastro = Boolean(gastro?.name);
  const showMetaGrid = hasLogistics || hasGastro;
  const nestedAll = sights.filter((s) => s?.name);
  const [sightsOpen, setSightsOpen] = React.useState(false);
  const hubNeedsCollapse = !magazine && nestedAll.length > HUB_SIGHTS_PREVIEW;
  const nested = magazine
    ? nestedAll.slice(0, MAGAZINE_SIGHTS_MAX)
    : hubNeedsCollapse && !sightsOpen
      ? nestedAll.slice(0, HUB_SIGHTS_PREVIEW)
      : nestedAll;
  const poiDayNumbers: number[] = [];
  {
    let dayPlaceNum = 0;
    for (const poi of nested) {
      if (String(poi.dayLabel || '').trim()) dayPlaceNum = 0;
      dayPlaceNum += 1;
      poiDayNumbers.push(dayPlaceNum);
    }
  }

  const dataProps: Record<string, string> = {};
  if (dataAttrs) {
    for (const [k, v] of Object.entries(dataAttrs)) {
      if (v != null && v !== '') dataProps[k] = v;
    }
  }

  const cover = String(heroImageUrl || '').trim() || null;
  const leadText = String(lead || '').trim();
  const subtitleText = String(subtitle || '').trim();
  // Dedupe when seed/UI pass the same blurb as both subtitle and lead.
  const leadDistinct =
    leadText && (!subtitleText || leadText !== subtitleText) ? leadText : '';
  const exitHint = String(logisticsExit || '').trim();
  const logisticsCopy = String(logisticsText || '').trim();
  const logisticsOneLiner = [exitHint, logisticsCopy].filter(Boolean).join(' · ');
  const resolvedExitLabel =
    String(logisticsExitLabel || '').trim() ||
    (exitHint ? 'Где выходить' : 'Логистика');

  if (magazine) {
    return (
      <article
        id={id}
        role={role}
        aria-label={
          ariaLabel ||
          (total != null ? `${index + 1} из ${total}` : undefined)
        }
        className={`mt-4 w-full rounded-2xl border bg-white shadow-sm ${
          editorial ? 'border-zinc-200' : 'border-slate-200'
        } ${className}`}
        data-day-trip-canon="1"
        data-day-trip-magazine="1"
        data-day-trip-has-cover={cover ? '1' : '0'}
        {...dataProps}
      >
        {/* Header: cover + title only. Sights/CTA below use full card width. */}
        <div
          className={
            cover
              ? 'flex flex-col sm:grid sm:grid-cols-[minmax(9rem,32%)_minmax(0,1fr)] sm:items-start'
              : undefined
          }
        >
          {cover ? (
            <div
              className="relative h-36 w-full shrink-0 overflow-hidden rounded-t-2xl bg-[#F5F5F7] sm:h-full sm:min-h-[7.5rem] sm:max-h-[11rem] sm:rounded-l-2xl sm:rounded-tr-none"
              data-day-trip-cover
            >
              <SafeImage
                src={cover}
                alt=""
                fill
                sizes="(max-width: 640px) 100vw, 240px"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/35 via-transparent to-transparent sm:bg-gradient-to-r sm:from-transparent sm:via-transparent sm:to-slate-950/10" />
              <span
                className="absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-sm font-bold tabular-nums text-slate-900 shadow-sm"
                data-day-trip-badge
              >
                {index + 1}
              </span>
            </div>
          ) : null}

          <div className="px-4 py-4 sm:px-5 sm:py-5">
            <header>
              <div className="flex items-start gap-2.5">
                {!cover ? (
                  <span
                    className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums ${badgeClass}`}
                    data-day-trip-badge
                  >
                    {index + 1}
                  </span>
                ) : null}
                <div className="min-w-0 flex-1">
                  <h3
                    className={`text-xl font-semibold leading-snug tracking-tight sm:text-2xl ${titleClass}`}
                    data-day-trip-title
                  >
                    {title}
                  </h3>
                  {subtitleText ? (
                    <p className={`mt-1 text-sm leading-snug ${softClass}`} data-day-trip-subtitle>
                      {subtitleText}
                    </p>
                  ) : null}
                </div>
              </div>
              {leadDistinct ? (
                <p className={`mt-2 text-sm leading-relaxed ${softClass}`} data-day-trip-lead>
                  {leadDistinct}
                </p>
              ) : null}
              {titleExtra ? <div className="mt-1.5">{titleExtra}</div> : null}
              {logisticsOneLiner ? (
                <p className={`mt-2 text-xs leading-snug ${mutedClass}`} data-day-trip-logistics-line>
                  {resolvedExitLabel}: {logisticsOneLiner}
                </p>
              ) : null}
            </header>
          </div>
        </div>

        {nested.length ? (
          <section
            className={`border-t px-4 py-4 sm:px-5 sm:py-5 ${borderSoft}`}
            data-day-trip-sights
          >
            <h4 className={`text-sm font-semibold ${inkClass}`}>Что посмотреть</h4>
            <ul className="mt-2 list-none space-y-1.5 p-0" data-day-trip-places>
              {nested.map((poi, poiIndex) => (
                <li
                  key={`${poi.name}:${poiIndex}`}
                  className="flex items-start gap-2 text-sm leading-snug"
                  data-day-trip-place
                >
                  <span
                    className={`mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-500 ${numClass}`}
                    aria-hidden
                  />
                  <span className={`min-w-0 ${poiTextClass}`}>
                    <SightLabel
                      name={poi.name}
                      href={poi.href}
                      desc={poi.desc}
                      descFromMd={sightDescFromMd}
                      visitMinutes={poi.visitMinutes}
                    />
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {cta ? (
          <div
            className={`relative z-10 overflow-visible border-t px-4 py-4 sm:px-5 sm:py-4 ${borderSoft}`}
            data-day-trip-cta
          >
            {cta}
          </div>
        ) : null}
      </article>
    );
  }

  return (
    <article
      id={id}
      role={role}
      aria-label={
        ariaLabel ||
        (total != null ? `${index + 1} из ${total}` : undefined)
      }
      className={`mt-4 w-full rounded-2xl border bg-white shadow-sm ${
        editorial ? 'border-zinc-200' : 'border-slate-200'
      } ${className}`}
      data-day-trip-canon="1"
      data-day-trip-align="gutter-text"
      data-day-trip-has-cover={cover ? '1' : '0'}
      {...dataProps}
    >
      <div
        className={
          cover
            ? 'flex flex-col sm:grid sm:grid-cols-[minmax(15rem,40%)_minmax(0,1fr)] sm:items-stretch'
            : undefined
        }
      >
      {cover ? (
        <div className="relative h-44 w-full overflow-hidden rounded-t-2xl bg-[#F5F5F7] sm:h-auto sm:min-h-[18rem] sm:rounded-l-2xl sm:rounded-tr-none" data-day-trip-cover>
          <SafeImage
            src={cover}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, 40vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/25 via-transparent to-transparent sm:bg-gradient-to-r sm:from-transparent sm:to-slate-950/10" />
          <span
            className="absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-sm font-bold tabular-nums text-slate-900 shadow-sm"
            data-day-trip-badge
          >
            {index + 1}
          </span>
        </div>
      ) : null}
      <div
        className={`px-3.5 py-4 sm:p-5 md:p-6 ${
          cover ? (editorial ? 'bg-zinc-50' : 'bg-slate-50') : ''
        }`}
      >
      {/* Title row: badge in gutter unless the cover already shows it. */}
      <div className={cover ? 'min-w-0' : GRID} data-day-trip-head>
        {cover ? null : (
        <div className={`${GUTTER} pt-0.5`} data-day-trip-gutter>
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums sm:h-9 sm:w-9 ${badgeClass}`}
            data-day-trip-badge
          >
            {index + 1}
          </span>
        </div>
        )}
        <div className="min-w-0" data-day-trip-content>
          <header>
            <h3
              className={`text-xl font-semibold leading-snug tracking-tight sm:text-2xl ${titleClass}`}
              data-day-trip-title
            >
              {title}
            </h3>
            {subtitle ? (
              <p className={`mt-1 text-sm leading-snug ${softClass}`} data-day-trip-subtitle>
                {subtitle}
              </p>
            ) : null}
            {titleExtra ? <div className="mt-1.5">{titleExtra}</div> : null}
          </header>
        </div>
      </div>

      {showMetaGrid ? (
        <div
          className="mt-4 sm:mt-5 sm:grid sm:grid-cols-[2.25rem_minmax(0,1fr)] sm:gap-x-3"
          data-day-trip-meta
        >
          <div aria-hidden className="hidden sm:block" />
          <div
            className={`min-w-0 grid gap-3 sm:gap-4 ${
              hasLogistics && hasGastro ? 'sm:grid-cols-2' : 'grid-cols-1'
            }`}
          >
            {hasLogistics ? (
              <section data-day-trip-logistics>
                <h4 className={`text-sm font-semibold ${inkClass}`}>Логистика</h4>
                {/* Desktop: bg bleeds left; copy stays on title vertical. */}
                <div
                  className={`mt-1.5 ${panelClass} px-2.5 py-2.5 sm:mt-2 sm:py-3.5 sm:pr-4 ${PANEL_INSET_SM} ${LOGISTICS_BG_EXTEND_SM}`}
                >
                  {logisticsExit ? (
                    <p className={`text-sm leading-snug ${softClass}`} data-day-trip-exit>
                      <span className={`font-semibold ${inkClass}`}>{resolvedExitLabel}</span>
                      <span className={mutedClass}>: {logisticsExit}</span>
                    </p>
                  ) : null}
                  {logisticsText ? (
                    <p
                      className={`${logisticsExit ? 'mt-1.5' : ''} text-sm leading-relaxed ${mutedClass}`}
                    >
                      {logisticsText}
                    </p>
                  ) : null}
                  {logisticsExtra ? (
                    <p className={`mt-1.5 text-sm leading-relaxed ${mutedClass}`}>
                      {logisticsExtra}
                    </p>
                  ) : null}
                </div>
              </section>
            ) : null}

            {hasGastro && gastro ? (
              <section data-day-trip-gastro>
                <h4 className={`text-sm font-semibold ${inkClass}`}>Гастро-остановка</h4>
                <div
                  className={`mt-1.5 rounded-xl border border-amber-100 bg-amber-50/80 px-2.5 py-2.5 sm:mt-2 sm:py-3.5 sm:pr-4 ${PANEL_INSET_SM}`}
                >
                  <p className={`text-sm font-semibold leading-snug ${inkClass}`}>{gastro.name}</p>
                  {gastro.blurb ? (
                    <p className={`mt-1 text-sm leading-relaxed ${softClass}`}>{gastro.blurb}</p>
                  ) : null}
                </div>
              </section>
            ) : null}
          </div>
        </div>
      ) : null}

      {nested.length ? (
        <section className={`mt-4 border-t pt-3.5 sm:mt-5 sm:pt-4 ${borderSoft}`} data-day-trip-sights>
          <div className="sm:grid sm:grid-cols-[2.25rem_minmax(0,1fr)] sm:gap-x-3">
            <div aria-hidden className="hidden sm:block" />
            <h4 className={`text-sm font-semibold ${inkClass}`}>Что посмотреть</h4>
          </div>
          <ol className="mt-2.5 list-none space-y-2 p-0 sm:mt-3 sm:space-y-2.5" data-day-trip-places>
            {nested.map((poi, poiIndex) => {
              const dayLabel = String(poi.dayLabel || '').trim();
              const tip = formatCanonTransitTip(String(poi.transitTip || ''));
              return (
                <li key={`${poi.name}:${poiIndex}`} className="list-none" data-day-trip-place>
                  {dayLabel ? (
                    <div
                      className={`${
                        poiIndex > 0
                          ? `mt-3 border-t pt-3 sm:mt-3.5 sm:pt-3.5 ${borderSoft}`
                          : ''
                      } mb-1.5 sm:mb-2 ${GRID}`}
                      data-day-trip-day-label
                    >
                      <span aria-hidden />
                      <h5 className={`min-w-0 text-sm font-semibold ${inkClass}`}>{dayLabel}</h5>
                    </div>
                  ) : null}
                  {tip ? (
                    <div className={`mb-0.5 sm:mb-1 ${GRID}`}>
                      <span aria-hidden />
                      <p
                        className={`min-w-0 text-[11px] leading-snug sm:text-[12px] ${mutedClass}`}
                        data-day-trip-transit-tip
                      >
                        {tip}
                      </p>
                    </div>
                  ) : null}
                  <div className={`${GRID} text-sm leading-snug`}>
                    <span
                      className={`${GUTTER} tabular-nums ${numClass}`}
                      data-day-trip-place-num
                    >
                      {poiDayNumbers[poiIndex]}.
                    </span>
                    <span className={`min-w-0 ${poiTextClass}`}>
                      <SightLabel
                        name={poi.name}
                        href={poi.href}
                        desc={poi.desc}
                        descFromMd={sightDescFromMd}
                        visitMinutes={poi.visitMinutes}
                      />
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
          {hubNeedsCollapse ? (
            <div className="mt-3 sm:grid sm:grid-cols-[2.25rem_minmax(0,1fr)] sm:gap-x-3">
              <div aria-hidden className="hidden sm:block" />
              <button
                type="button"
                data-day-trip-sights-more
                onClick={() => setSightsOpen((open) => !open)}
                className={`text-left text-sm font-semibold ${
                  editorial ? 'text-zinc-700 hover:text-zinc-950' : 'text-primary-700 hover:text-primary-800'
                }`}
              >
                {sightsOpen ? 'Свернуть' : `Ещё ${nestedAll.length - HUB_SIGHTS_PREVIEW} точек`}
              </button>
            </div>
          ) : null}
        </section>
      ) : null}

      {cta ? (
        <div className={`relative z-10 mt-5 overflow-visible border-t pt-4 ${borderSoft}`} data-day-trip-cta>
          <div className="sm:grid sm:grid-cols-[2.25rem_minmax(0,1fr)] sm:gap-x-3">
            <div aria-hidden className="hidden sm:block" />
            <div className="min-w-0">{cta}</div>
          </div>
        </div>
      ) : null}
      </div>
      </div>
    </article>
  );
}

/** Resolve gastro from structured stop or legacy «Name - blurb» hint. */
export function resolveCanonGastroStop(input: {
  gastroStop?: CitySuburbGastroStop | null;
  gastroHint?: string | null;
}): CitySuburbGastroStop | null {
  const structured = input.gastroStop;
  if (structured?.name?.trim()) {
    return {
      name: structured.name.trim(),
      blurb: String(structured.blurb || '').trim() || undefined,
    };
  }
  const hint = String(input.gastroHint || '').trim();
  if (!hint) return null;
  const split = hint.split(/\s+-\s+/);
  if (split.length >= 2) {
    return { name: split[0].trim(), blurb: split.slice(1).join(' - ').trim() || undefined };
  }
  return { name: hint };
}
