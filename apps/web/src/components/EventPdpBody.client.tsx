'use client';

import type { PublicEventDto, PublicEventPageDto } from '@daibilet/contracts/public';

import {
  EventContentAccordion,
  EventExpandableMap,
  EventStickyBuyBar,
} from '@/components/EventPdpChrome.client';
import {
  EventDescriptionBody,
  EventTicketTips,
  EventVenueStops,
} from '@/components/EventPageSections';
import { ReviewSection } from '@/components/ReviewSection';
import {
  formatHeroBuyButtonPrice,
  formatPriceRub,
  getTicketPriceRange,
} from '@/lib/event-page-utils';

function hasCoords(event: PublicEventDto) {
  const lat = Number(event.venueLatitude);
  const lng = Number(event.venueLongitude);
  return Number.isFinite(lat) && Number.isFinite(lng);
}

export function EventPdpBody({
  event,
  payload,
}: {
  event: PublicEventDto;
  payload: PublicEventPageDto;
}) {
  const priceRange = getTicketPriceRange(payload);
  const fallback = formatPriceRub(payload.stats?.priceFrom ?? event.priceFrom);
  const priceLabel = priceRange
    ? formatHeroBuyButtonPrice(priceRange)
    : fallback
      ? `от ${fallback}`
      : '';
  const hasDescription = Boolean(String(event.description || '').trim());
  const stops = Array.isArray(event.venueStops) ? event.venueStops : [];
  const coords = hasCoords(event);

  return (
    <>
      <div className="space-y-5 pb-24 lg:pb-0">
        <EventTicketTips event={event} />

        <EventContentAccordion
          panels={[
            {
              id: 'about',
              title: 'О событии',
              content: hasDescription ? <EventDescriptionBody event={event} /> : null,
              defaultOpen: true,
            },
            {
              id: 'route',
              title: 'Маршрут',
              content: stops.length ? <EventVenueStops event={event} hideTitle /> : null,
            },
          ]}
        />

        {coords ? (
          <EventExpandableMap
            lat={Number(event.venueLatitude)}
            lng={Number(event.venueLongitude)}
            title={event.venue || event.title}
            address={event.venueAddress}
          />
        ) : null}

        {/* Reviews stay outside accordion so #reviews + 3 recent stay visible */}
        <ReviewSection eventId={event.id} eventSlug={event.slug} />
      </div>

      <EventStickyBuyBar priceLabel={priceLabel} disabled={!priceLabel && !event.purchaseReady} />
    </>
  );
}
