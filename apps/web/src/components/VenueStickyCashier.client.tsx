'use client';

import { ExternalLink, Ticket } from 'lucide-react';

import { MobileStickyActionBar } from '@/components/MobileStickyActionBar';
import { formatAdmissionPriceFrom } from '@/lib/finance-projection';
import type { VenuePrimaryCta } from '@/lib/venue-cta';

type Props = {
  cta: VenuePrimaryCta;
  /** Soft hint under the button (hours / official site). */
  hint?: string | null;
  /** Accent for theater-like pages. */
  tone?: 'default' | 'theater';
  className?: string;
};

function CtaAnchor({
  cta,
  className,
  children,
}: {
  cta: VenuePrimaryCta;
  className: string;
  children: React.ReactNode;
}) {
  const attrs = {
    href: cta.href,
    className,
    'data-venue-cta-kind': cta.kind,
  } as const;
  if (cta.external) {
    return (
      <a {...attrs} target="_blank" rel="noreferrer">
        {children}
      </a>
    );
  }
  return <a {...attrs}>{children}</a>;
}

/**
 * Commercial sticky cashier: desktop sidebar card + mobile bottom bar.
 * Replaces MobileStickyActionBar when primary CTA exists - never stacks two bars.
 * No checkout modal - only real href targets from resolveVenuePrimaryCta.
 * No secondary AddToDay in sticky (Wave 1).
 */
export function VenueStickyCashier({
  cta,
  hint,
  tone = 'default',
  className = '',
}: Props) {
  const priceLabel =
    cta.priceFromRub != null ? formatAdmissionPriceFrom(cta.priceFromRub) : null;
  const primaryBtn =
    tone === 'theater'
      ? 'bg-rose-600 hover:bg-rose-700'
      : 'bg-primary-600 hover:bg-primary-700';

  return (
    <>
      <div
        className={`hidden overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm lg:block ${className}`.trim()}
        data-venue-sticky-cashier="desktop"
        data-venue-cta-kind={cta.kind}
      >
        <div className="space-y-3 p-5">
          {priceLabel ? (
            <div>
              <p className="text-2xl font-extrabold tracking-tight text-zinc-950">{priceLabel}</p>
              {cta.badge ? (
                <p className="mt-1 text-xs font-medium text-zinc-500">{cta.badge}</p>
              ) : null}
            </div>
          ) : (
            <p className="text-sm font-semibold text-zinc-950">Билеты и визит</p>
          )}
          <CtaAnchor
            cta={cta}
            className={`inline-flex h-11 w-full items-center justify-center gap-2 rounded-full px-5 text-sm font-bold text-white shadow-sm ${primaryBtn}`}
          >
            <Ticket className="h-4 w-4" />
            {cta.label}
            {cta.external ? <ExternalLink className="h-3.5 w-3.5" /> : null}
          </CtaAnchor>
          {hint ? <p className="text-center text-xs leading-5 text-zinc-500">{hint}</p> : null}
        </div>
      </div>

      <MobileStickyActionBar>
        <CtaAnchor
          cta={cta}
          className={`inline-flex h-11 w-full items-center justify-center gap-2 rounded-full px-5 text-sm font-bold text-white shadow-lg ${primaryBtn}`}
        >
          <Ticket className="h-4 w-4" />
          {priceLabel ? `${cta.label} · ${priceLabel}` : cta.label}
          {cta.external ? <ExternalLink className="h-3.5 w-3.5" /> : null}
        </CtaAnchor>
      </MobileStickyActionBar>
    </>
  );
}
