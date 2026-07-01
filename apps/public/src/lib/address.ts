type FormatStreetAddressOptions = {
  city?: string | null;
};

const COUNTRY_TOKENS = new Set([
  'россия',
  'russia',
  'ru',
  'рф',
  'russian federation',
  'российская федерация',
]);

function normalizeAddressToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^г\.?\s+/i, '')
    .replace(/\s+/g, ' ');
}

function isPostalCode(part: string): boolean {
  const trimmed = part.trim();
  return /^\d{5,6}$/.test(trimmed) || /^\d{3}\s?\d{3}$/.test(trimmed);
}

function isCountry(part: string): boolean {
  return COUNTRY_TOKENS.has(normalizeAddressToken(part));
}

function looksLikeStreetPart(part: string): boolean {
  return (
    /\d/.test(part) ||
    /(?:^|[\s,])(?:наб\.?|ул\.?|пр\.?|пр-?т|пер\.?|б-?р\.?|ш\.?|просп\.?|набереж(?:ная)?|пл\.?|площад(?:ь|и)|линия|аллея|проезд|туп\.?|str\.?|st\.?)(?:[\s,]|$)/i.test(part)
  );
}

function isCityPart(part: string, city?: string | null): boolean {
  if (!city) return false;
  const normalized = normalizeAddressToken(part);
  const cityNorm = normalizeAddressToken(city);
  if (!cityNorm) return false;
  return normalized === cityNorm || normalized.includes(cityNorm) || cityNorm.includes(normalized);
}

function stripTrailingMeta(parts: string[], city?: string | null): string[] {
  const result = [...parts];

  while (result.length > 1) {
    const last = result[result.length - 1];
    if (isPostalCode(last) || isCountry(last) || isCityPart(last, city)) {
      result.pop();
      continue;
    }
    if (!city && !looksLikeStreetPart(last)) {
      result.pop();
      continue;
    }
    break;
  }

  while (result.length > 1 && !looksLikeStreetPart(result[0]) && looksLikeStreetPart(result[1])) {
    result.shift();
  }

  return result.filter((part) => !isPostalCode(part) && !isCountry(part) && !isCityPart(part, city));
}

export function formatStreetAddress(
  address: string | null | undefined,
  options?: FormatStreetAddressOptions,
): string {
  if (!address) return '';
  const trimmed = address.replace(/\s+/g, ' ').trim();
  if (!trimmed) return '';

  const parts = trimmed
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length <= 1) return trimmed;

  const cleaned = stripTrailingMeta(parts, options?.city);
  const result = cleaned.join(', ').trim();
  return result || trimmed;
}

export function shortenAddressToStreet(
  address: string | null | undefined,
  city?: string | null,
): string {
  return formatStreetAddress(address, { city });
}
