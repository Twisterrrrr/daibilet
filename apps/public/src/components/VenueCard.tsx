import { MapPin, Ticket } from 'lucide-react';
import * as React from 'react';

import { CITY_CARD_ASPECT_CLASS, cityCardTitleClass } from '@/lib/city-card-styles';
import { pluralEvents, venueCardDescription, venueTypeIcon, venueTypeLabel } from '@/lib/venue-meta';
import type { PublicVenue } from '@/types';

export function VenueCard({
  venue,
  href,
  large = false,
}: {
  venue: Pick<PublicVenue, 'name' | 'city' | 'events' | 'type' | 'shortDescription' | 'heroImageUrl'>;
  href: string;
  large?: boolean;
}) {
  const [hasImageError, setHasImageError] = React.useState(false);
  const showImage = Boolean(venue.heroImageUrl && !hasImageError);
  const description = venueCardDescription(venue);
  const TypeIcon = venueTypeIcon(venue.type);

  return (
    <a
      href={href}
      className="group block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-slate-200/50"
    >
      <div className={`relative flex ${CITY_CARD_ASPECT_CLASS} flex-col justify-end overflow-hidden`}>
        {showImage ? (
          <img
            src={venue.heroImageUrl || ''}
            alt=""
            loading="lazy"
            onError={() => setHasImageError(true)}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-900" />
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

        {venue.events > 0 ? (
          <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-xs font-bold text-slate-900 shadow-sm backdrop-blur-sm">
            <Ticket className="h-3.5 w-3.5 text-primary-600" />
            {pluralEvents(venue.events)}
          </div>
        ) : null}

        <div className="relative p-4 sm:p-5">
          <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium text-white/90 backdrop-blur-sm">
            <TypeIcon className="h-3.5 w-3.5" />
            {venueTypeLabel(venue.type)}
          </div>
          <h3 className={cityCardTitleClass(large ? 'large' : 'compact')}>{venue.name}</h3>
          {description ? <p className="mt-1 line-clamp-2 text-sm text-white/70">{description}</p> : null}
          <div className="mt-2 flex items-center gap-1.5 text-sm text-white/80">
            <MapPin className="h-4 w-4 shrink-0" />
            <span className="truncate">{venue.city}</span>
          </div>
        </div>
      </div>
    </a>
  );
}
