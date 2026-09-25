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

const SETTLEMENT_PREFIX_RE = /^(?:д|дер|с|село|п|пос)\.?\s+/iu;
const HOUSE_NUMBER_RE = /^(?:д\.?|дом)\s*(\d[\p{L}\d\-/]*)/iu;
const STREET_MARKERS_RE =
  /(?:^|[\s,.-])(?:улиц(?:а|ы|u|e)?|ул\.|просп(?:ект)?|пр-?т|пр\.|пер(?:\.|еулок)?|площ(?:адь|и)?|наб(?:\.|ереж(?:ная)?)?|шоссе|бульвар|б-?р\.|линия|проезд|туп(?:\.|ик)?|str\.|st\.)(?:[\s,.]|$)|(?:переулок|проспект|набережная|бульвар|площадь|шоссе)/iu;
const REGION_SUFFIX_RE = /\s+[\p{L}][\p{L}\d-]*\s+(?:обл\.|область|край|респ\.|республика)(?:,\s*)?$/iu;
const ONLY_REGION_RE = /^[\p{L}][\p{L}\d-]*\s+(?:обл\.|область|край|респ\.|республика)$/iu;

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

function isRegionPart(part: string): boolean {
  return REGION_SUFFIX_RE.test(part.trim()) || ONLY_REGION_RE.test(part.trim());
}

function isOnlyRegionPart(part: string): boolean {
  if (isHouseNumberPart(part)) return false;
  return ONLY_REGION_RE.test(cleanAddressPart(part));
}

function cleanAddressPart(part: string): string {
  return part.trim().replace(REGION_SUFFIX_RE, '').trim();
}

function isHouseNumberPart(part: string): boolean {
  return HOUSE_NUMBER_RE.test(cleanAddressPart(part));
}

function looksLikeStreetPart(part: string): boolean {
  const text = cleanAddressPart(part);
  if (isHouseNumberPart(text)) return true;
  if (STREET_MARKERS_RE.test(text)) return true;
  return /\d/.test(text);
}

function looksLikeInstitutionName(part: string): boolean {
  return INSTITUTION_NAME_RE.test(cleanAddressPart(part));
}

function isBareStreetNamePart(part: string, city?: string | null): boolean {
  const text = cleanAddressPart(part);
  if (!text || isPostalCode(text) || isCountry(text) || isCityPart(text, city) || isRegionPart(text)) {
    return false;
  }
  if (looksLikeInstitutionName(text)) return false;
  if (isHouseNumberPart(text) || SETTLEMENT_PREFIX_RE.test(text) || STREET_MARKERS_RE.test(text)) {
    return false;
  }
  if (/\d/.test(text)) return false;
  return text.length >= 2 && text.length <= 60;
}

function looksLikeHouseNumberToken(part: string): boolean {
  const text = cleanAddressPart(part);
  if (isHouseNumberPart(text)) return true;
  if (/^\d[\p{L}\d\-/]*(?:\s*,?\s*лит(?:ера)?\.?\s*[\p{L}\d]+)?/iu.test(text)) return true;
  if (/^лит(?:ера)?\.?\s*[\p{L}\d]+/iu.test(text)) return true;
  return false;
}

function formatBareStreetLine(parts: string[], city?: string | null): string | null {
  const cleaned = parts.map((part) => cleanAddressPart(part)).filter(Boolean);
  if (cleaned.length < 2) return null;
  const [first, second, ...rest] = cleaned;
  if (isBareStreetNamePart(first, city) && looksLikeHouseNumberToken(second)) {
    const tail = [second, ...rest].join(', ');
    return `ул. ${first}, ${tail}`;
  }
  return null;
}

function isBareSettlementPart(part: string, city?: string | null): boolean {
  const text = cleanAddressPart(part);
  if (!text || isPostalCode(text) || isCountry(text) || isCityPart(text, city) || isRegionPart(text)) {
    return false;
  }
  if (isHouseNumberPart(text)) return false;
  if (SETTLEMENT_PREFIX_RE.test(text)) return true;
  if (STREET_MARKERS_RE.test(text)) return false;
  if (/\d/.test(text)) return false;
  return text.length >= 2 && text.length <= 40;
}

function formatSettlementPart(part: string): string {
  const text = cleanAddressPart(part);
  const prefixed = text.match(/^(?:д|дер|с|село|п|пос)\.?\s+(.+)$/iu);
  if (prefixed) return `д.${prefixed[1].trim()}`;
  return `д.${text}`;
}

function formatHousePart(part: string): string {
  const text = cleanAddressPart(part);
  const match = text.match(HOUSE_NUMBER_RE);
  if (match) return `д. ${match[1]}`;
  return text;
}

function composeSettlementAddress(parts: string[], city?: string | null): string | null {
  const cleaned = parts.map((part) => cleanAddressPart(part)).filter(Boolean);
  if (cleaned.length < 2) return null;

  const [first, second] = cleaned;
  if (isBareSettlementPart(first, city) && isHouseNumberPart(second)) {
    return `${formatSettlementPart(first)}, ${formatHousePart(second)}`;
  }

  return null;
}

function isCityPart(part: string, city?: string | null): boolean {
  if (!city) return false;
  const normalized = normalizeAddressToken(part);
  const cityNorm = normalizeAddressToken(city);
  if (!cityNorm) return false;
  if (STREET_MARKERS_RE.test(part) || looksLikeHouseNumberToken(part)) return false;
  if (normalized === cityNorm) return true;
  if (normalized === `г ${cityNorm}` || normalized === `город ${cityNorm}`) return true;
  return false;
}

const INLINE_STREET_RE =
  /^([\p{L}][\p{L}\s-]{1,40}?)\s+(\d[\p{L}\d\-/]*(?:\s*лит(?:ера)?\.?\s*[\p{L}\d]+)?)$/iu;
const INSTITUTION_NAME_RE =
  /(?:музе|заповедник|усадьб|театр|галере|дворец|кремл|собор|храм|филармон|экспозици|кинотеатр|манеж|цирк)/iu;

function capitalizeWord(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

/** Type-first + adjectival name (API quirk) → name + type: «Проспект Кольский» → «Кольский проспект». */
const STREET_TYPE_FIRST_RE =
  /^(проспект|пр-?т|просп\.?|пр\.|улица|ул\.|переулок|пер\.|бульвар|б-?р\.?|площадь|пл\.|набережная|наб\.?)\s+(.+)$/iu;
/** Nominative adjectives only — keep genitives like «проспект Мира», «улица Ленина». */
const ADJECTIVE_STREET_NAME_RE =
  /^[\p{L}][\p{L}\d-]*(?:ский|ская|ское|ские|цкий|цкая|цкое|ный|ная|ное|ной|овый|овая|овое)$/iu;

function canonicalStreetType(typeRaw: string): string {
  const t = typeRaw.replace(/\.$/, '').toLowerCase().replace(/\s+/g, '');
  if (t === 'ул' || t.startsWith('улиц')) return 'улица';
  if (t === 'пр' || t === 'пр-т' || t === 'прт' || t.startsWith('просп')) return 'проспект';
  if (t === 'пер' || t.startsWith('переул')) return 'переулок';
  if (t === 'б-р' || t === 'бр' || t.startsWith('бульвар')) return 'бульвар';
  if (t === 'пл' || t.startsWith('площад')) return 'площадь';
  if (t === 'наб' || t.startsWith('набереж')) return 'набережная';
  return typeRaw.toLowerCase();
}

function reorderStreetTypePrefix(part: string): string {
  const text = part.trim();
  if (!text) return text;
  const match = text.match(STREET_TYPE_FIRST_RE);
  if (!match) return text;
  const name = match[2].trim();
  if (!name || /\d/.test(name) || !ADJECTIVE_STREET_NAME_RE.test(name)) return text;
  return `${capitalizeWord(name)} ${canonicalStreetType(match[1])}`;
}

function formatInlineStreetAddress(value: string): string | null {
  const match = value.trim().match(INLINE_STREET_RE);
  if (!match) return null;
  const street = reorderStreetTypePrefix(capitalizeWord(match[1]));
  const house = match[2];
  if (STREET_MARKERS_RE.test(street)) return `${street}, ${house}`;
  return `ул. ${street}, ${house}`;
}

function stripTrailingMeta(parts: string[], city?: string | null): string[] {
  const result = [...parts];

  while (result.length > 1) {
    const last = result[result.length - 1];
    if (isPostalCode(last) || isCountry(last) || isCityPart(last, city) || isOnlyRegionPart(last)) {
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
    const first = cleanAddressPart(result[0]);
    const second = cleanAddressPart(result[1]);
    if (isBareSettlementPart(first, city) && isHouseNumberPart(second)) {
      break;
    }
    if (isBareStreetNamePart(first, city) && looksLikeHouseNumberToken(second)) {
      break;
    }
    result.shift();
  }

  return result.filter(
    (part) => !isPostalCode(part) && !isCountry(part) && !isCityPart(part, city) && !isOnlyRegionPart(part),
  );
}

function stripInstitutionPrefix(parts: string[], city?: string | null): string[] {
  if (parts.length < 2) return parts;
  const [first, ...rest] = parts.map((part) => cleanAddressPart(part)).filter(Boolean);
  if (!looksLikeInstitutionName(first)) return parts;
  const street = rest.filter(Boolean).join(', ');
  if (!street || (!STREET_MARKERS_RE.test(street) && !/\d/.test(street))) return parts;
  return street.split(',').map((part) => part.trim()).filter(Boolean);
}

/** Yandex/2GIS bilingual: «Дворцовая наб., 34///Dvortsovaya Emb., 34» → Russian only. */
export function stripBilingualAddressTail(value: string): string {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const beforeSlash = raw.split(/\s*\/\/\/\s*/)[0]?.trim() || '';
  const withoutLatinTail = beforeSlash
    .replace(/\s*\/\s*[A-Za-z][A-Za-z0-9 .,'’\-]*$/u, '')
    .trim();
  const parts = withoutLatinTail
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => {
      const letters = part.replace(/[^A-Za-zА-Яа-яЁё]/g, '');
      if (!letters) return true;
      const latin = (part.match(/[A-Za-z]/g) || []).length;
      const cyr = (part.match(/[А-Яа-яЁё]/g) || []).length;
      return cyr >= latin;
    });
  return parts.join(', ') || withoutLatinTail;
}

export function formatStreetAddress(
  address: string | null | undefined,
  options?: FormatStreetAddressOptions,
): string {
  if (!address) return '';
  const trimmed = stripBilingualAddressTail(address.replace(/\s+/g, ' ').trim());
  if (!trimmed) return '';

  const parts = trimmed
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  const withoutInstitution = stripInstitutionPrefix(parts, options?.city);

  if (withoutInstitution.length <= 1) {
    const inline = formatInlineStreetAddress(trimmed);
    if (inline) return inline;
    return reorderStreetTypePrefix(trimmed);
  }

  const cleaned = stripTrailingMeta(withoutInstitution, options?.city);
  const settlementLine = composeSettlementAddress(cleaned, options?.city);
  if (settlementLine) return settlementLine;

  const bareStreetLine = formatBareStreetLine(cleaned, options?.city);
  if (bareStreetLine) return bareStreetLine;

  const result = cleaned
    .map((part) => reorderStreetTypePrefix(cleanAddressPart(part)))
    .filter(Boolean)
    .join(', ')
    .trim();
  return result || trimmed;
}

/** Адрес с населённым пунктом и номером дома: «д.Турыгино, д. 280». */
export function isRuralSettlementAddress(value: string): boolean {
  return /^д\.[^,]+,\s*д\.\s*\d+/iu.test(String(value || '').trim());
}

export function shortenAddressToStreet(
  address: string | null | undefined,
  city?: string | null,
): string {
  return formatStreetAddress(address, { city });
}
