import * as React from 'react';

/** Generous white-page rhythm between major hub sections (~80-100px). */
export const HUB_SECTION_PAD = 'py-16 sm:py-20 lg:py-24';
/** Nested major blocks inside one wrapper (identity → must-see → suburbs). */
export const HUB_SECTION_GAP = 'mt-16 sm:mt-20 lg:mt-24';

export function hubSectionHeadingClass(editorial = false): string {
  return editorial
    ? 'font-serif text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl'
    : 'text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl';
}

export function hubSectionLeadClass(editorial = false): string {
  return editorial
    ? 'mt-2 max-w-3xl text-base font-normal leading-7 text-zinc-500'
    : 'mt-2 max-w-3xl text-base font-normal leading-7 text-slate-500';
}

/** Left-aligned H2 + gray description, matching the Perm palette mock. */
export function CityHubSectionHeading({
  id,
  title,
  description,
  editorial = false,
  actions,
  as: Tag = 'h2',
  className = '',
}: {
  id?: string;
  title: string;
  description?: string | null;
  editorial?: boolean;
  actions?: React.ReactNode;
  as?: 'h2' | 'h3';
  className?: string;
}) {
  const lead = String(description || '').trim();
  return (
    <div className={`flex items-start justify-between gap-3 ${className}`.trim()}>
      <div className="min-w-0 text-left">
        <Tag id={id} className={hubSectionHeadingClass(editorial)}>
          {title}
        </Tag>
        {lead ? <p className={hubSectionLeadClass(editorial)}>{lead}</p> : null}
      </div>
      {actions}
    </div>
  );
}
