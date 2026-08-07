'use client';

import { MapPin, Navigation } from 'lucide-react';

import { OsmMapEmbed } from '@/components/OsmMapEmbed';
import { build2gisRouteUrl } from '@/lib/maps';

type Props = {
  lat: number;
  lng: number;
  venueTitle?: string | null;
  venueAddress?: string | null;
  className?: string;
};

/**
 * Equal-weight companion to BuyerTicketCard on the ticket PAGE (not inside the printable card).
 * Scrolls with the page (no sticky / nested scroll). OSM pin; print:hidden at page layout.
 */
export function BuyerTicketVenueMapPanel({
  lat,
  lng,
  venueTitle,
  venueAddress,
  className = '',
}: Props) {
  const title = (venueTitle || '').trim() || 'Площадка';
  const address = (venueAddress || '').trim();
  const routeUrl = build2gisRouteUrl(lat, lng);

  return (
    <aside
      className={`flex h-full min-h-[320px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.05)] ${className}`}
      data-buyer-ticket-map
    >
      <div className="shrink-0 border-b border-slate-100 px-4 py-3.5 sm:px-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Как добраться</p>
        <div className="mt-1.5 flex items-start gap-2">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" />
          <div className="min-w-0">
            <p className="text-sm font-bold leading-5 text-slate-950 sm:text-base">{title}</p>
            {address ? <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">{address}</p> : null}
          </div>
        </div>
      </div>

      <div className="relative min-h-[260px] flex-1 bg-slate-50 sm:min-h-[320px]">
        <OsmMapEmbed
          lat={lat}
          lng={lng}
          title={`Карта: ${title}`}
          pageScrollFriendly
          className="absolute inset-0 h-full w-full"
        />
      </div>

      <div className="shrink-0 border-t border-slate-100 px-4 py-3 sm:px-5">
        <a
          href={routeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm font-semibold text-primary-700 hover:text-primary-800"
        >
          <Navigation className="h-4 w-4" />
          Маршрут в 2ГИС
        </a>
      </div>
    </aside>
  );
}
