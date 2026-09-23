import { ExternalLink, Ticket } from 'lucide-react';

import type { VenueEditorialTickets } from '@/lib/venue-editorial-content';
import { formatAdmissionPriceFrom } from '@/lib/finance-projection';

type Props = {
  tickets: VenueEditorialTickets;
  title?: string;
  description?: string;
  ctaLabel?: string;
  className?: string;
};

/**
 * Official-site tickets CTA when there is no LC admission inventory.
 * Requires a real href; priceFromRub is optional (caller must gate empty href).
 */
export function VenueEditorialTicketsBlock({
  tickets,
  title = 'Билеты',
  description = 'Официальная касса площадки - покупка на сайте организатора.',
  ctaLabel = 'Купить на официальном сайте',
  className = '',
}: Props) {
  const href = String(tickets.href || '').trim();
  if (!href) return null;

  const priceLabel = formatAdmissionPriceFrom(tickets.priceFromRub);

  return (
    <section
      id="venue-editorial-tickets"
      className={`rounded-2xl border border-amber-100 bg-white p-6 ${className}`}
      data-block="venue-editorial-tickets"
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-full bg-amber-50 p-2 text-amber-800">
            <Ticket className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">{title}</h2>
            <p className="mt-1 text-sm text-slate-600">{description}</p>
            {priceLabel ? (
              <p className="mt-3 text-2xl font-extrabold tracking-tight text-slate-950">
                {priceLabel}
              </p>
            ) : null}
            {tickets.badge ? (
              <p className={`text-xs font-medium text-slate-500 ${priceLabel ? 'mt-1' : 'mt-3'}`}>
                {tickets.badge}
              </p>
            ) : null}
          </div>
        </div>
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-primary-600 px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-primary-700"
        >
          {ctaLabel}
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
    </section>
  );
}
