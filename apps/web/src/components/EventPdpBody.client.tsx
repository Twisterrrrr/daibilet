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
import { displayEventDescription } from '@/lib/event-description-lead';
import { isMusicEvent } from '@/lib/event-music-description';
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

function eventPageDescription(page: NonNullable<PublicEventPageDto['eventPage']>): string {
  const content = page.content && typeof page.content === 'object' ? page.content : {};
  const sections = Array.isArray(content.sections) ? content.sections : [];
  const parts = [String(page.summary || content.summary || '').trim()].filter(Boolean);
  for (const section of sections) {
    const body = String(section.body || '').trim();
    const items = Array.isArray(section.items) ? section.items : [];
    const itemText = items.map((item) => {
      const title = String(item.title || '').trim();
      const description = String(item.description || '').trim();
      return [title, description].filter(Boolean).join(' — ');
    }).filter(Boolean).map((item) => `- ${item}`).join('\n');
    const text = [body, itemText].filter(Boolean).join('\n\n');
    if (!text) continue;
    if (section.kind === 'about' && (!section.title || section.title.trim().toLocaleLowerCase('ru') === 'о событии')) {
      parts.push(text);
      continue;
    }
    const heading = String(section.title || '').trim();
    parts.push([heading ? `## ${heading}` : '', text].filter(Boolean).join('\n\n'));
  }
  return parts.join('\n\n').trim();
}

export function EventPdpBody({
  event,
  payload,
}: {
  event: PublicEventDto;
  payload: PublicEventPageDto;
}) {
  const priceRange = getTicketPriceRange(payload);
  const editorialDescription = payload.eventPage ? eventPageDescription(payload.eventPage) : null;
  const descriptionForPage = editorialDescription ?? displayEventDescription(event);
  const fallback = formatPriceRub(payload.stats?.priceFrom ?? event.priceFrom);
  const priceLabel = priceRange
    ? formatHeroBuyButtonPrice(priceRange)
    : fallback
      ? `от ${fallback}`
      : '';
  const hasDescription = Boolean(descriptionForPage.trim()) || (!payload.eventPage && isMusicEvent(event));
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
              content: hasDescription ? <EventDescriptionBody event={event} description={editorialDescription ?? undefined} /> : null,
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
