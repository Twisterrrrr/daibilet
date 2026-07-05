import { formatStreetAddress, isRuralSettlementAddress } from '@/lib/address';
import { formatPublicVenueTitle, isMeetingPointLike } from '@/lib/venue-meta';
import type { PublicSession } from '@/types';

const GENERIC_VENUE_LABEL_RE =
  /^(точка сбора|место сбора|точка встречи|не указано|адрес уточняется|сбор группы|место отправления)$/iu;

function looksLikeStreet(value: string): boolean {
  return /(?:\bul\.|\bпр\.|\bпер\.|наб\.|,\s*д\.|,\s*дом\b|набереж|улиц|просп|площад|линия\b|причал\b)/iu.test(value);
}

function isGenericVenueLabel(value: string): boolean {
  const text = String(value || '').trim();
  if (!text) return true;
  if (GENERIC_VENUE_LABEL_RE.test(text)) return true;
  return text.length <= 3;
}

type EventCardLocationInput = {
  city?: string | null;
  destination?: string | null;
  destinationType?: PublicSession['destinationType'] | string | null;
  venue?: string | null;
  venueAddress?: string | null;
  venueKind?: string | null;
};

/** Строка локации для карточки события: адрес, если название площадки служебное. */
export function resolveEventCardLocationLabel(session: EventCardLocationInput): string {
  const venueName = formatPublicVenueTitle(session.venue);
  const address = formatStreetAddress(session.venueAddress, { city: session.city });
  const meetingPoint = isMeetingPointLike({
    type: session.venueKind,
    name: venueName,
    address: session.venueAddress || address,
  });

  if (
    session.destinationType === 'region' &&
    address &&
    isRuralSettlementAddress(address)
  ) {
    return address;
  }

  if (address && (meetingPoint || isGenericVenueLabel(venueName))) {
    return address;
  }

  if (venueName && looksLikeStreet(venueName)) {
    return formatStreetAddress(venueName, { city: session.city }) || venueName;
  }

  if (venueName && !isGenericVenueLabel(venueName)) {
    return venueName;
  }

  return address || venueName || '';
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

/** Город/регион в meta карточки: для областных событий — «Раменское, Московская обл.». */
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
