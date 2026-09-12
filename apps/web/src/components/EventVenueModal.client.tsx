'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { ExternalLink, X } from 'lucide-react';

import type { PublicEventDto } from '@daibilet/contracts/public';

import { formatStreetAddress } from '@/lib/address';
import { venueHref } from '@/lib/routes';
import { VenueLogisticsBlock, hasVenueLogisticsContent } from '@/components/VenueLogisticsBlock';
import { YandexMapEmbed, buildYandexMapsExternalUrl } from '@/components/YandexMapEmbed';

export type EventVenueLogistics = Pick<
  PublicEventDto,
  | 'venue'
  | 'venueId'
  | 'venueSlug'
  | 'venueKind'
  | 'venueAddress'
  | 'venueLatitude'
  | 'venueLongitude'
  | 'venueMetroStation'
  | 'venueWayToFind'
  | 'venueParkingInfo'
  | 'city'
>;

type EventVenueModalProps = {
  open: boolean;
  onClose: () => void;
  event: EventVenueLogistics;
};

function toLogisticsVenue(event: EventVenueLogistics) {
  return {
    name: event.venue,
    title: event.venue,
    city: event.city,
    address: event.venueAddress,
    metroStation: event.venueMetroStation,
    wayToFind: event.venueWayToFind,
    parkingInfo: event.venueParkingInfo,
  };
}

export function EventVenueModal({ open, onClose, event }: EventVenueModalProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (keyboardEvent: KeyboardEvent) => {
      if (keyboardEvent.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!mounted || !open) return null;

  const logisticsVenue = toLogisticsVenue(event);
  const streetAddress = formatStreetAddress(event.venueAddress, { city: event.city });
  const lat = Number(event.venueLatitude);
  const lng = Number(event.venueLongitude);
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
  const externalMapsUrl = buildYandexMapsExternalUrl({
    latitude: hasCoords ? lat : null,
    longitude: hasCoords ? lng : null,
    address: streetAddress || event.venueAddress,
  });
  const venuePageHref =
    event.venueId || event.venueSlug
      ? venueHref({
          id: event.venueId || event.venueSlug || event.venue,
          slug: event.venueSlug,
          name: event.venue,
          type: event.venueKind,
        })
      : null;
  const title = event.venue || 'Площадка';
  const showLogistics = hasVenueLogisticsContent(logisticsVenue);

  return createPortal(
    <div
      className="fixed inset-0 z-[99980] flex items-center justify-center p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button type="button" className="absolute inset-0 bg-slate-950/60" aria-label="Закрыть" onClick={onClose} />
      <div className="relative flex max-h-[min(92vh,820px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <p className="truncate text-sm font-semibold text-slate-900">{title}</p>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200"
            aria-label="Закрыть"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {showLogistics ? <VenueLogisticsBlock venue={logisticsVenue} showName={false} /> : null}

          {hasCoords ? (
            <div className={`overflow-hidden rounded-2xl border border-slate-200 ${showLogistics ? 'mt-4' : ''}`}>
              <YandexMapEmbed lat={lat} lng={lng} title={`Карта: ${title}`} className="h-56 w-full" />
            </div>
          ) : externalMapsUrl ? (
            <a
              href={externalMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 transition hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 ${showLogistics ? 'mt-4' : ''}`}
            >
              <ExternalLink className="h-4 w-4" />
              Открыть адрес на Яндекс.Картах
            </a>
          ) : null}

          {!showLogistics && !hasCoords && !externalMapsUrl ? (
            <p className="text-sm text-slate-600">Адрес площадки уточняется.</p>
          ) : null}
        </div>

        {venuePageHref ? (
          <div className="border-t border-slate-200 px-4 py-3">
            <Link
              href={venuePageHref}
              className="inline-flex text-sm font-semibold text-primary-600 hover:underline"
              onClick={onClose}
            >
              Страница площадки
            </Link>
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

type EventVenueTriggerProps = {
  event: EventVenueLogistics;
  className?: string;
  children: React.ReactNode;
};

/** Opens logistics modal; falls back to venue page link when no venue id/slug. */
export function EventVenueTrigger({ event, className, children }: EventVenueTriggerProps) {
  const [open, setOpen] = React.useState(false);
  const href =
    event.venueId || event.venueSlug
      ? venueHref({
          id: event.venueId || event.venueSlug || event.venue,
          slug: event.venueSlug,
          name: event.venue,
          type: event.venueKind,
        })
      : null;

  if (!href && !(event.venue || event.venueAddress)) return null;

  if (!event.venueId && !event.venueSlug) {
    return href ? (
      <Link href={href} className={className}>
        {children}
      </Link>
    ) : (
      <span className={className}>{children}</span>
    );
  }

  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        {children}
      </button>
      <EventVenueModal open={open} onClose={() => setOpen(false)} event={event} />
    </>
  );
}
