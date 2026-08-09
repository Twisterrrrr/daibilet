'use client';

import * as React from 'react';
import Link from 'next/link';

import type { CitySuburbGastroStop } from '@/lib/cityInfo';

export type DayTripCanonSight = {
  name: string;
  desc?: string;
  href?: string | null;
  /** Совет по перемещению к этой точке (серая строка между пунктами). */
  transitTip?: string;
  /** Заголовок дня над пунктом (multi-day suburb: «День 1 - Усьва»). */
  dayLabel?: string;
};

export type DayTripCanonCardProps = {
  index: number;
  total?: number;
  title: React.ReactNode;
  /** Subtitle under title (vector / timingNote / description). */
  subtitle?: string;
  logisticsExit?: string;
  logisticsText?: string;
  /** Extra prose under logistics (hub blurb). */
  logisticsExtra?: string;
  gastro?: CitySuburbGastroStop | null;
  sights: DayTripCanonSight[];
  /** Show sight desc only from md+ (my-day compact). */
  sightDescFromMd?: boolean;
  editorial?: boolean;
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

function SightLabel({
  name,
  href,
  desc,
  descFromMd,
}: {
  name: string;
  href?: string | null;
  desc?: string;
  descFromMd?: boolean;
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
  const text = String(desc || '').trim();
  if (!text) return <>{nameNode}</>;
  return (
    <>
      {nameNode}
      <span className={`font-normal ${descFromMd ? 'hidden md:inline' : ''}`}>{` - ${text}`}</span>
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
  logisticsText,
  logisticsExtra,
  gastro,
  sights,
  sightDescFromMd = false,
  editorial = false,
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
  const nested = sights.filter((s) => s?.name);
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

  return (
    <article
      id={id}
      role={role}
      aria-label={
        ariaLabel ||
        (total != null ? `${index + 1} из ${total}` : undefined)
      }
      className={`mt-4 w-full rounded-2xl border bg-white px-3.5 py-4 shadow-sm sm:p-5 md:p-6 ${
        editorial ? 'border-zinc-200' : 'border-slate-200'
      } ${className}`}
      data-day-trip-canon="1"
      data-day-trip-align="gutter-text"
      {...dataProps}
    >
      {/* Title row: badge in gutter, title on text vertical. */}
      <div className={GRID} data-day-trip-head>
        <div className={`${GUTTER} pt-0.5`} data-day-trip-gutter>
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums sm:h-9 sm:w-9 ${badgeClass}`}
            data-day-trip-badge
          >
            {index + 1}
          </span>
        </div>
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
                {/* pl-0 desktop: panel copy on the same vertical as title. */}
                <div className={`mt-1.5 ${panelClass} px-2.5 py-2.5 sm:mt-2 sm:py-3.5 sm:pr-4 sm:pl-0`}>
                  {logisticsExit ? (
                    <p className={`text-sm leading-snug ${softClass}`} data-day-trip-exit>
                      <span className={`font-semibold ${inkClass}`}>Где выходить</span>
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
                <div className="mt-1.5 rounded-xl border border-amber-100 bg-amber-50/80 px-2.5 py-2.5 sm:mt-2 sm:py-3.5 sm:pr-4 sm:pl-0">
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
                      />
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      ) : null}

      {cta ? (
        <div className={`mt-5 border-t pt-4 ${borderSoft}`} data-day-trip-cta>
          <div className="sm:grid sm:grid-cols-[2.25rem_minmax(0,1fr)] sm:gap-x-3">
            <div aria-hidden className="hidden sm:block" />
            <div className="min-w-0">{cta}</div>
          </div>
        </div>
      ) : null}
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
