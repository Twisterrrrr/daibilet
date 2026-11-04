'use client';

import { Car, MapPin, Train } from 'lucide-react';

import type { PublicVenueDto } from '@daibilet/contracts/public';

import { formatStreetAddress } from '@/lib/address';

export type VenueLogisticsSource = Pick<
  PublicVenueDto,
  'name' | 'title' | 'city' | 'address' | 'metroStation' | 'wayToFind' | 'parkingInfo'
>;

/** Owner rule: null/empty/whitespace logistics fields must not render UI (no «🚇 -»). */
export function nonEmptyLogisticsText(value: string | null | undefined): string | null {
  const text = String(value ?? '').trim();
  if (!text || text === '-' || text === '—' || text === '–') return null;
  return text;
}

export function hasVenueLogisticsContent(venue: VenueLogisticsSource): boolean {
  const street = formatStreetAddress(venue.address, { city: venue.city });
  return Boolean(
    street ||
      nonEmptyLogisticsText(venue.metroStation) ||
      nonEmptyLogisticsText(venue.wayToFind) ||
      nonEmptyLogisticsText(venue.parkingInfo),
  );
}

/** True when wayToFind is just «Ориентир: {address}» / address echo - not real directions. */
export function isAddressEchoWayToFind(
  wayToFind: string | null | undefined,
  address: string | null | undefined,
  city?: string | null,
): boolean {
  const way = nonEmptyLogisticsText(wayToFind);
  if (!way) return true;
  const street = formatStreetAddress(address, { city });
  if (!street) return false;
  const normalized = way
    .replace(/^ориентир:\s*/i, '')
    .replace(/[.…]+$/g, '')
    .trim()
    .toLowerCase();
  const streetNorm = street.trim().toLowerCase();
  if (!normalized || !streetNorm) return false;
  if (normalized === streetNorm) return true;
  if (normalized === `${streetNorm}, ${(city || '').trim().toLowerCase()}`.replace(/,\s*$/, '')) {
    return true;
  }
  // Short echo like «Ориентир: Смоленская набережная, д. 10.»
  if (normalized.includes(streetNorm) && way.length <= street.length + 24) return true;
  return false;
}

/**
 * Location page «Как добраться»: only real tips (parking / non-echo wayToFind).
 * Address + metro stay in sidebar Contacts.
 */
export function hasUsefulLocationDirections(venue: VenueLogisticsSource): boolean {
  const parking = nonEmptyLogisticsText(venue.parkingInfo);
  const way = nonEmptyLogisticsText(venue.wayToFind);
  if (parking) return true;
  if (!way) return false;
  return !isAddressEchoWayToFind(way, venue.address, venue.city);
}

type VenueLogisticsBlockProps = {
  venue: VenueLogisticsSource;
  /** Show venue name as heading row (modal). Venue page often has name elsewhere. */
  showName?: boolean;
  /** Skip address/metro (already in Contacts sidebar on location pages). */
  directionsOnly?: boolean;
  className?: string;
};

export function VenueLogisticsBlock({
  venue,
  showName = true,
  directionsOnly = false,
  className,
}: VenueLogisticsBlockProps) {
  const name = nonEmptyLogisticsText(venue.name) || nonEmptyLogisticsText(venue.title);
  const streetAddress = formatStreetAddress(venue.address, { city: venue.city });
  const metro = nonEmptyLogisticsText(venue.metroStation);
  const wayRaw = nonEmptyLogisticsText(venue.wayToFind);
  const wayToFind =
    wayRaw && !isAddressEchoWayToFind(wayRaw, venue.address, venue.city) ? wayRaw : null;
  const parking = nonEmptyLogisticsText(venue.parkingInfo);

  const rows: Array<{ icon: typeof MapPin; label: string; value: string }> = [];
  if (!directionsOnly && streetAddress) {
    rows.push({
      icon: MapPin,
      label: 'Адрес',
      value: venue.city && !streetAddress.includes(venue.city) ? `${streetAddress}, ${venue.city}` : streetAddress,
    });
  }
  // Independent hide: metro / wayToFind / parking never render empty rows.
  if (!directionsOnly && metro) rows.push({ icon: Train, label: 'Метро', value: metro });
  if (wayToFind) rows.push({ icon: MapPin, label: 'Как найти', value: wayToFind });
  if (parking) rows.push({ icon: Car, label: 'Парковка', value: parking });

  if (!rows.length && !(showName && name)) return null;

  return (
    <div className={className}>
      {showName && name ? <p className="text-base font-semibold text-graphite">{name}</p> : null}
      {rows.length ? (
        <ul className={showName && name ? 'mt-3 space-y-3' : 'space-y-3'}>
          {rows.map((row) => {
            const Icon = row.icon;
            return (
              <li key={row.label} className="flex items-start gap-2.5 text-sm text-graphite">
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" strokeWidth={1.75} />
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-graphite-muted">{row.label}</div>
                  <div className="mt-0.5 whitespace-pre-line text-graphite">{row.value}</div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
