'use client';

import * as React from 'react';
import Link from 'next/link';

import type { CitySuburbGastroStop } from '@/lib/cityInfo';

export type DayTripCanonSight = {
  name: string;
  desc?: string;
  href?: string | null;
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
 * Shared visual canon for suburb + day-preset cards (owner Peterhof mockup).
 * No SVG icons in logistics / gastro / sights - text section titles only.
 */
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

  const hasLogistics = Boolean(logisticsExit || logisticsText || logisticsExtra);
  const hasGastro = Boolean(gastro?.name);
  const showMetaGrid = hasLogistics || hasGastro;
  const nested = sights.filter((s) => s?.name);

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
      className={`mx-auto mt-4 max-w-2xl rounded-2xl border bg-white p-5 shadow-sm sm:p-6 ${
        editorial ? 'border-zinc-200' : 'border-slate-200'
      } ${className}`}
      data-day-trip-canon="1"
      {...dataProps}
    >
      <header className="flex gap-3">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums ${badgeClass}`}
        >
          {index + 1}
        </span>
        <div className="min-w-0">
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
        </div>
      </header>

      {showMetaGrid ? (
        <div
          className={`mt-5 grid gap-3 ${
            hasLogistics && hasGastro ? 'sm:grid-cols-2' : 'grid-cols-1'
          }`}
          data-day-trip-meta
        >
          {hasLogistics ? (
            <section
              className={`rounded-xl border p-3.5 sm:p-4 ${
                editorial ? 'border-zinc-100 bg-zinc-50/60' : 'border-slate-100 bg-slate-50/70'
              }`}
              data-day-trip-logistics
            >
              <h4 className={`text-sm font-semibold ${inkClass}`}>Логистика</h4>
              {logisticsExit ? (
                <p className={`mt-2 text-sm leading-snug ${softClass}`} data-day-trip-exit>
                  <span className={`font-semibold ${inkClass}`}>Где выходить</span>
                  <span className={mutedClass}>: {logisticsExit}</span>
                </p>
              ) : null}
              {logisticsText ? (
                <p
                  className={`${logisticsExit ? 'mt-1.5' : 'mt-2'} text-sm leading-relaxed ${mutedClass}`}
                >
                  {logisticsText}
                </p>
              ) : null}
              {logisticsExtra ? (
                <p className={`mt-2 text-sm leading-relaxed ${mutedClass}`}>{logisticsExtra}</p>
              ) : null}
            </section>
          ) : null}

          {hasGastro && gastro ? (
            <section
              className="rounded-xl border border-amber-100 bg-amber-50/80 p-3.5 sm:p-4"
              data-day-trip-gastro
            >
              <h4 className={`text-sm font-semibold ${inkClass}`}>Гастро-остановка</h4>
              <p className={`mt-2 text-sm font-semibold leading-snug ${inkClass}`}>{gastro.name}</p>
              {gastro.blurb ? (
                <p className={`mt-1 text-sm leading-relaxed ${softClass}`}>{gastro.blurb}</p>
              ) : null}
            </section>
          ) : null}
        </div>
      ) : null}

      {nested.length ? (
        <section className={`mt-5 border-t pt-4 ${borderSoft}`} data-day-trip-sights>
          <h4 className={`text-sm font-semibold ${inkClass}`}>Что посмотреть</h4>
          <ol className="mt-3 space-y-2" data-day-trip-places>
            {nested.map((poi, poiIndex) => (
              <li
                key={`${poi.name}:${poiIndex}`}
                className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-x-2 text-sm leading-snug"
                data-day-trip-place
              >
                <span className={`pt-0.5 text-center tabular-nums ${numClass}`}>
                  {poiIndex + 1}.
                </span>
                <span className={`min-w-0 ${poiTextClass}`}>
                  <SightLabel
                    name={poi.name}
                    href={poi.href}
                    desc={poi.desc}
                    descFromMd={sightDescFromMd}
                  />
                </span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {cta ? (
        <div className={`mt-5 border-t pt-4 ${borderSoft}`} data-day-trip-cta>
          {cta}
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
