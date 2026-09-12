import { formatStreetAddress, isRuralSettlementAddress } from '@/lib/address';
import { resolveEventInstitutionLabel } from '@/lib/event-venue-context';
import { formatPublicVenueTitle, isMeetingPointLike } from '@/lib/venue-meta';
import type { PublicSessionDto } from '@daibilet/contracts/public';

const GENERIC_VENUE_LABEL_RE =
  /^(точка сбора|место сбора|точка встречи|не указано|адрес уточняется|сбор группы|место отправления)$/iu;

/** Teplohod/TC feed placeholders used as venue titles (not real places). */
const BOOKING_PLATFORM_VENUE_RE =
  /^(?:место\s+отправления\s+)?(?:teplohod|теплоход|tickets?\s*cloud|тикетс?\s*клауд)$/iu;

/** Prefix like `("ЯКарелия")`, `(«Org»)`, `"Provider"` before an address. */
const PROVIDER_PREFIX_RE =
  /^(?:\(\s*[«"']?\s*([^)»"']{2,60}?)\s*[»"']?\s*\)|[«"']\s*([^»"']{2,60}?)\s*[»"'])\s*/u;

function looksLikeStreet(value: string): boolean {
  return /(?:\bul\.|\bпр\.|\bпер\.|наб\.|,\s*д\.|,\s*дом\b|набереж|улиц|просп|площад|линия\b|причал\b)/iu.test(value);
}

/** True for empty / service / booking-platform venue titles (hide in UI). */
export function isGenericVenueLabel(value: string): boolean {
  const text = String(value || '').trim();
  if (!text) return true;
  if (GENERIC_VENUE_LABEL_RE.test(text)) return true;
  if (BOOKING_PLATFORM_VENUE_RE.test(text)) return true;
  return text.length <= 3;
}

/** Category/tag that is a ticket provider name, not a ship/bus label. */
export function isBookingPlatformLabel(value?: string | null): boolean {
  const text = String(value || '').trim();
  if (!text) return false;
  return BOOKING_PLATFORM_VENUE_RE.test(text);
}

function normalizeComparableLabel(value: string): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function cleanProviderName(value: string): string {
  return String(value || '')
    .trim()
    .replace(/^[«"'(\[]+|[\])"'»]+$/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Split `("Provider") Address` / quoted org prefixes from the rest of a venue string. */
export function splitVenueProviderPrefix(raw: string): { provider: string | null; rest: string } {
  const text = String(raw || '').trim();
  if (!text) return { provider: null, rest: '' };
  const match = text.match(PROVIDER_PREFIX_RE);
  if (!match) return { provider: null, rest: text };
  const provider = cleanProviderName(match[1] || match[2] || '');
  const rest = text.slice(match[0].length).trim();
  return { provider: provider || null, rest };
}

type EventCardLocationInput = {
  title?: string | null;
  institutionVenue?: string | null;
  city?: string | null;
  destination?: string | null;
  destinationType?: PublicSessionDto['destinationType'] | string | null;
  venue?: string | null;
  venueAddress?: string | null;
  venueKind?: string | null;
};

function resolveVenueParts(session: EventCardLocationInput) {
  const rawVenue = formatPublicVenueTitle(session.venue);
  const split = splitVenueProviderPrefix(rawVenue);
  const venueName = split.rest || (split.provider ? '' : rawVenue);
  const providerFromVenue = split.provider;
  const address =
    formatStreetAddress(session.venueAddress, { city: session.city }) ||
    (venueName && looksLikeStreet(venueName)
      ? formatStreetAddress(venueName, { city: session.city }) || venueName
      : '');
  return { venueName, providerFromVenue, address, rawVenue };
}

/** Строка локации для карточки события: физический адрес точки, не имя площадки. */
export function resolveEventCardLocationLabel(session: EventCardLocationInput): string {
  const { venueName, providerFromVenue, address } = resolveVenueParts(session);
  const meetingPoint = isMeetingPointLike({
    type: session.venueKind,
    name: venueName || providerFromVenue,
    address: session.venueAddress || address,
  });

  // Always prefer street address under the pin when we have one.
  if (address) {
    if (session.destinationType === 'region' && isRuralSettlementAddress(address)) {
      return address;
    }
    return address;
  }

  if (venueName && looksLikeStreet(venueName)) {
    return formatStreetAddress(venueName, { city: session.city }) || venueName;
  }

  if (venueName && !isGenericVenueLabel(venueName) && !meetingPoint) {
    return venueName;
  }

  // Do not leak generic / «Место отправления Teplohod» placeholders into UI.
  return '';
}

export type EventCardPinLines = {
  /** Рядом с pin: город / короткий адрес / «адрес · город». */
  primary: string;
  /** Ниже: провайдер / площадка без кривых кавычек. */
  secondary: string | null;
};

/**
 * Две строки для pin на showcase/home rails:
 * primary - человекочитаемое место; secondary - org/площадка без `("…")`.
 */
export function resolveEventCardPinLines(session: EventCardLocationInput): EventCardPinLines {
  const city = resolveEventCardDestinationLabel(session);
  const { venueName, providerFromVenue, address } = resolveVenueParts(session);
  const institution = resolveEventInstitutionLabel(session);
  const cityShort = shortCityForPin(city);

  let primary = '';
  if (address) {
    primary = joinAddressAndCity(address, cityShort);
  } else if (venueName && looksLikeStreet(venueName)) {
    primary = joinAddressAndCity(venueName, cityShort);
  } else if (cityShort) {
    primary = cityShort;
  } else if (venueName && !isGenericVenueLabel(venueName) && !providerFromVenue) {
    primary = venueName;
  }

  const secondaryCandidates = [
    providerFromVenue,
    institution && normalizeComparableLabel(institution) !== normalizeComparableLabel(primary)
      ? institution
      : null,
    venueName &&
    !looksLikeStreet(venueName) &&
    !isGenericVenueLabel(venueName) &&
    normalizeComparableLabel(venueName) !== normalizeComparableLabel(primary) &&
    normalizeComparableLabel(venueName) !== normalizeComparableLabel(address || '')
      ? venueName
      : null,
  ].filter(Boolean) as string[];

  const secondary = secondaryCandidates[0] || null;
  if (!primary && secondary) {
    return { primary: secondary, secondary: null };
  }
  if (
    primary &&
    secondary &&
    normalizeComparableLabel(primary) === normalizeComparableLabel(secondary)
  ) {
    return { primary, secondary: null };
  }
  return { primary, secondary };
}

/** Hub/region affiche pin: street + city, never a bare «д. 5/1». */
export function resolveHubAfficheLocationLine(session: EventCardLocationInput): string | null {
  const pin = resolveEventCardPinLines(session);
  if (pin.primary) return pin.primary;
  return resolveEventVenueDisplayLabel(session);
}

function shortCityForPin(cityLabel: string): string {
  const raw = String(cityLabel || '').trim();
  if (!raw) return '';
  // «Горбунки, Ленинградская обл.» → «Горбунки» for compact cards.
  const beforeComma = raw.split(',')[0]?.trim() || raw;
  return beforeComma.replace(/\s*\([^)]*\)\s*$/u, '').trim() || beforeComma;
}

function isHouseNumberOnlyLabel(value: string): boolean {
  return /^(?:д\.?|дом)\s*\d/iu.test(String(value || '').trim());
}

function joinAddressAndCity(address: string, city: string): string {
  const addr = String(address || '').trim();
  const place = String(city || '').trim();
  if (!addr) return place;
  if (!place) return addr;
  if (normalizeComparableLabel(addr).includes(normalizeComparableLabel(place))) return addr;
  // Bare house number without street: lead with settlement/city.
  if (isHouseNumberOnlyLabel(addr)) return `${place}, ${addr}`;
  return `${addr} · ${place}`;
}

/** Физический адрес для блока «Адрес» на странице события. */
export function resolveEventAddressLabel(session: EventCardLocationInput): string {
  const { venueName, address } = resolveVenueParts(session);

  if (address && normalizeComparableLabel(address) !== normalizeComparableLabel(venueName)) {
    return address;
  }

  if (venueName && looksLikeStreet(venueName)) {
    return formatStreetAddress(venueName, { city: session.city }) || venueName;
  }

  return address || '';
}

/** Название площадки для ссылок и карточек: null, если в поле venue лежит адрес или служебная подпись. */
export function resolveEventVenueDisplayLabel(session: EventCardLocationInput): string | null {
  const institutionLabel = resolveEventInstitutionLabel(session);
  const { venueName, providerFromVenue, address } = resolveVenueParts(session);
  const meetingPoint = isMeetingPointLike({
    type: session.venueKind,
    name: venueName || providerFromVenue,
    address: session.venueAddress || address,
  });
  const venueIsAddressLike =
    !venueName ||
    isGenericVenueLabel(venueName) ||
    looksLikeStreet(venueName) ||
    Boolean(providerFromVenue) ||
    (address && normalizeComparableLabel(venueName) === normalizeComparableLabel(address)) ||
    (meetingPoint && Boolean(address));

  if (providerFromVenue && venueIsAddressLike && !isBookingPlatformLabel(providerFromVenue)) {
    return providerFromVenue;
  }
  if (institutionLabel && venueIsAddressLike) return institutionLabel;

  if (!venueName || isGenericVenueLabel(venueName)) {
    return (!isBookingPlatformLabel(providerFromVenue) && providerFromVenue) || institutionLabel || null;
  }

  if (looksLikeStreet(venueName)) return providerFromVenue || institutionLabel || null;
  if (address && normalizeComparableLabel(venueName) === normalizeComparableLabel(address)) {
    return providerFromVenue || institutionLabel || null;
  }
  if (meetingPoint && address) return providerFromVenue || institutionLabel || null;

  return venueName;
}

/** Сокращённое название региона для карточки: «Московская область» → «Московская обл.». */
export function abbreviateRegionName(name: string): string {
  const trimmed = String(name || '').trim();
  if (!trimmed) return trimmed;
  return trimmed
    .replace(/\s+область$/iu, ' обл.')
    .replace(/\s+республика$/iu, ' респ.')
    .replace(/\s+край$/iu, ' край');
}

/** Город/регион в meta карточки: для областных событий - «Раменское, Московская обл.». */
export function resolveEventCardDestinationLabel(session: EventCardLocationInput): string {
  const city = String(session.city || '').trim();
  const destination = String(session.destination || '').trim();

  if (session.destinationType === 'region' && destination) {
    if (city && city !== destination) {
      return `${city}, ${abbreviateRegionName(destination)}`;
    }
    return abbreviateRegionName(destination);
  }

  return city || destination;
}
