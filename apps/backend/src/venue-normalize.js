import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PLUS_CODE_RE = /^[23456789CFGHJMPQRVWX]{4,}\+[23456789CFGHJMPQRVWX]{2,}/i;
const TITLE_ADDRESS_SPLIT_RE =
  /^(.{2,120}?),\s*(?:ул\.?|улиц(?:а|у|ы|ой|e)?|пр\.?|просп(?:ект)?|пр-?т|пер\.?|переулок|наб\.?|набер(?:ежная)?|ш\.?|шоссе|б-?р\.?|бульвар|пл\.?|площ(?:адь|и)?|с\.|село|пос\.|д\.|дер\.|район|обл\.|область|респ\.|республика|\d)/iu;
const STREET_MARKER_RE =
  /(?:ул\.|улиц|пр\.|просп|пр-?т|пер\.|переулок|наб\.|набер|ш\.|шоссе|б-?р\.|бульвар|пл\.|площ|линия|проезд|тупик)/i;

let referenceByTitleKey = null;
let overrideByKey = null;

const INLINE_STREET_RE =
  /^([\p{L}][\p{L}\s-]{1,40}?)\s+(\d[\p{L}\d\-/]*(?:\s*лит(?:ера)?\.?\s*[\p{L}\d]+)?)$/iu;

function normalizeKey(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/["«»]/g, '')
    .replace(/[^a-z0-9а-я]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function loadReferenceMap() {
  if (referenceByTitleKey) return referenceByTitleKey;
  referenceByTitleKey = new Map();
  const filePath = path.join(__dirname, '..', '..', '..', 'scripts', 'data', 'venues-for-research.txt');
  if (!fs.existsSync(filePath)) return referenceByTitleKey;

  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('=') || trimmed.startsWith('ПЛОЩАДКИ') || trimmed.startsWith('ЛОКАЦИИ')) {
      continue;
    }
    const dash = trimmed.indexOf(' — ');
    if (dash <= 0) continue;
    const title = trimmed.slice(0, dash).trim();
    const address = trimmed.slice(dash + 3).trim();
    if (!title || !address || /^не указан$/i.test(address)) continue;
    referenceByTitleKey.set(normalizeKey(title), { title, address });
  }
  return referenceByTitleKey;
}

function isGenericReferenceAddress(value) {
  const text = normalizeKey(value);
  return (
    !text ||
    text === 'открытая локация' ||
    text === 'не указан' ||
    text === 'online' ||
    text === 'спорт активности' ||
    /^спорт\s*\//.test(text)
  );
}

function loadOverrideMap() {
  if (overrideByKey) return overrideByKey;
  overrideByKey = new Map();
  const filePath = path.join(__dirname, '..', '..', '..', 'scripts', 'data', 'venue-address-overrides.json');
  if (!fs.existsSync(filePath)) return overrideByKey;

  const payload = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  for (const entry of payload.venues || []) {
    const keys = [entry.id, entry.title, ...(entry.match || []), ...(entry.aliases || [])]
      .filter(Boolean)
      .map(normalizeKey);
    for (const key of keys) {
      overrideByKey.set(key, entry);
    }
  }
  return overrideByKey;
}

export function findVenueOverride(input = {}) {
  const overrides = loadOverrideMap();
  const keys = [input.id, input.title, input.name].filter(Boolean).map(normalizeKey);
  for (const key of keys) {
    if (overrides.has(key)) return overrides.get(key);
  }
  return null;
}

function findOverride(input = {}) {
  return findVenueOverride(input);
}

function capitalizeWord(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return trimmed;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function formatInlineStreetAddress(value) {
  const match = String(value || '').trim().match(INLINE_STREET_RE);
  if (!match) return null;
  const street = capitalizeWord(match[1]);
  const house = match[2];
  if (STREET_MARKER_RE.test(street)) return `${street}, ${house}`;
  return `ул. ${street}, ${house}`;
}

function findReference(title) {
  const reference = loadReferenceMap();
  const key = normalizeKey(title);
  if (reference.has(key)) return reference.get(key);

  let best = null;
  for (const [refKey, ref] of reference.entries()) {
    if (refKey === key) return ref;
    if (refKey.startsWith(`${key},`) || key.startsWith(`${refKey},`)) {
      best = ref;
    }
  }
  return best;
}

function splitAddressFromTitle(title) {
  const text = String(title || '').trim();
  if (!text) return { title: text, addressFromTitle: null };
  const match = text.match(TITLE_ADDRESS_SPLIT_RE);
  if (!match) return { title: text, addressFromTitle: null };
  const cleanTitle = match[1].trim().replace(/[,\s]+$/u, '');
  const addressFromTitle = text.slice(match[1].length + 1).trim();
  if (!cleanTitle || cleanTitle.length < 2 || !addressFromTitle) {
    return { title: text, addressFromTitle: null };
  }
  return { title: cleanTitle, addressFromTitle };
}

function isPlusCodeAddress(value) {
  return PLUS_CODE_RE.test(String(value || '').trim());
}

function stripCityPrefix(value) {
  return String(value || '')
    .trim()
    .replace(/^(?:г\.?|город)\s+/iu, '')
    .trim();
}

function looksLikeCityOrSettlementPart(part) {
  const text = String(part || '').trim();
  if (!text) return false;
  if (/^(?:г\.?|город|пос\.?|пгт\.?|посёлок|поселок|село|деревня)\b/iu.test(text)) return true;
  // Bare "д. Name" settlement (not house "д. 12") - letter after д.
  if (/^д\.?\s*[\p{L}]/iu.test(text) && !/^д\.?\s*\d/iu.test(text)) return true;
  return false;
}

function stripAddressMetaParts(parts, city) {
  const cityNorm = normalizeKey(city);
  return parts.filter((part) => {
    const clean = part.trim();
    if (!clean) return false;
    if (/^\d{5,6}$/.test(clean)) return false;
    if (/^(?:россия|russia|рф)$/i.test(clean)) return false;
    if (city && normalizeKey(clean) === cityNorm) return false;
    // "г. Санкт-Петербург" when city is Санкт-Петербург
    if (city && normalizeKey(stripCityPrefix(clean)) === cityNorm) return false;
    if (/^[\p{L}][\p{L}\d-]*\s+(?:обл\.|область|край|респ\.|республика)$/iu.test(clean)) return false;
    return true;
  });
}

function extractStreetFromReference(refAddress, city) {
  const parts = String(refAddress || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length <= 1) return refAddress;

  const last = parts[parts.length - 1];
  const cityNorm = normalizeKey(city);
  if (cityNorm && normalizeKey(last) === cityNorm) {
    return parts.slice(0, -1).join(', ');
  }
  if (!/\d/.test(last) && !STREET_MARKER_RE.test(last) && parts.length >= 2) {
    return parts.slice(0, -1).join(', ');
  }
  return refAddress;
}

function enrichBareStreetAddress(address) {
  const text = String(address || '').trim();
  if (!text) return text;

  const inline = formatInlineStreetAddress(text);
  if (inline) return inline;

  const parts = text.split(',').map((part) => part.trim()).filter(Boolean);
  if (parts.length === 1 && !STREET_MARKER_RE.test(parts[0])) {
    if (looksLikeCityOrSettlementPart(parts[0])) return text;
    if (/^\d/.test(parts[0]) || /^50\s+лет/i.test(parts[0])) {
      return `ул. ${parts[0]}`;
    }
  }
  if (parts.length >= 2 && isBareStreetPrefix(parts[0])) {
    const first = parts[0];
    // Never invent "ул. г. Санкт-Петербург, …" from a city/settlement prefix.
    if (looksLikeCityOrSettlementPart(first)) return text;
    if (!/(?:переулок|проспект|набережная|бульвар|шоссе|площадь|линия|проезд|тупик)/i.test(first)) {
      return `ул. ${first}, ${parts.slice(1).join(', ')}`;
    }
  }
  return text;
}

function normalizePublicVenueAddress(address, city) {
  let text = String(address || '').trim();
  if (!text || isPlusCodeAddress(text)) return null;

  const parts = stripAddressMetaParts(
    text.split(',').map((part) => part.trim()).filter(Boolean),
    city,
  );
  text = parts.join(', ').trim();
  if (!text) return null;

  text = text
    .replace(/\bлитера\b/gi, 'лит.')
    .replace(/\bпроспект\b/gi, 'пр.')
    .replace(/\bпросп\.?\b/gi, 'пр.')
    .replace(/\bпереулок\b/gi, 'пер.')
    .replace(/\bулица\b/gi, 'ул.')
    .replace(/\s+/g, ' ')
    .trim();

  return enrichBareStreetAddress(text);
}

function inferCityFromAddressText(text) {
  const value = String(text || '').toLowerCase();
  if (value.includes('ефремкино') || value.includes('хакас') || value.includes('ширинск')) return 'Абакан';
  if (value.includes('суздал')) return 'Суздаль';
  if (value.includes('всеволожск')) return 'Всеволожск';
  return null;
}

function venueTitleLooksLikeAddress(name) {
  const text = String(name || '').toLowerCase();
  return /(?:\bul\.|\bпр\.|\bпер\.|наб\.|,\s*с\.|,\s*д\.|,\s*дом\b|район,|область,|республик)/i.test(text);
}

function venueTitleLooksLikeMeetingPoint(title) {
  const text = String(title || '').trim();
  return /^(?:место\s+(?:сбора|встречи)|точка\s+(?:сбора|встречи)|сбор\s+(?:группы\s+)?(?:у|около|на)|площадка\s*:)/iu.test(text);
}

const INSTITUTION_NAME_RE =
  /(?:музе|заповедник|усадьб|театр|галере|дворец|кремл|собор|храм|филармон|экспозици|кинотеатр|манеж|цирк)/iu;

function looksLikeInstitutionName(value) {
  return INSTITUTION_NAME_RE.test(String(value || '').trim());
}

function splitInstitutionFromAddress(address, city) {
  const parts = stripAddressMetaParts(
    String(address || '')
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean),
    city,
  );
  if (parts.length < 2) return null;

  const [first, ...rest] = parts;
  if (!looksLikeInstitutionName(first)) return null;

  const street = rest.join(', ').trim();
  if (!street || (!STREET_MARKER_RE.test(street) && !/\d/.test(street))) return null;

  return { institution: first, street };
}

function isBareStreetPrefix(part) {
  const text = String(part || '').trim();
  if (!text || STREET_MARKER_RE.test(text) || /^\d/.test(text)) return false;
  if (looksLikeInstitutionName(text)) return false;
  if (/^(?:обл\.|область|край|респ\.|республика)$/iu.test(text)) return false;
  return text.length >= 2 && text.length <= 60;
}

function formatPublicVenueTitle(value) {
  if (value == null) return value;
  return String(value)
    .replace(/\s*\(\s*-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?\s*\)\s*$/u, '')
    .trim();
}

function cityContradictsAddress(city, title, address) {
  const cityNorm = normalizeKey(city);
  if (!cityNorm || cityNorm === normalizeKey('Не указан')) return false;
  const haystack = `${title} ${address}`.toLowerCase();
  if (haystack.includes('хакас') || haystack.includes('ефремкино')) {
    return !['ефрем', 'хакас', 'абакан', 'ширин'].some((part) => cityNorm.includes(part));
  }
  return false;
}

function isGenericBusVenueTitle(name) {
  const key = normalizeKey(name);
  if (!key) return true;
  if (key === 'автобус') return true;
  if (/^(?:точка|место)\s+(?:сбора|встречи)/.test(key)) return true;
  if (/^площадка$/.test(key)) return true;
  return false;
}

function isBusVenueTitleLikelyTourName(name, address) {
  const text = String(name || '').trim();
  if (!text || venueTitleLooksLikeAddress(text)) return false;
  if (looksLikeInstitutionName(text)) return false;
  if (
    STREET_MARKER_RE.test(text) ||
    /(?:^|\s)м\.(?:\s|$)|\bметро\b|пам\.|площад|пл\.|станци|вокзал|\bфорт\b|берег|набереж|парковк/i.test(text)
  ) {
    return false;
  }
  const addr = String(address || '').trim();
  return addr.length >= 6 && text.length <= 80;
}

function isGenericPierReferenceAddress(value) {
  const text = normalizeKey(value);
  return (
    !text ||
    text === 'причал' ||
    text === 'пристань' ||
    text === 'площадка на набережной' ||
    text === 'локация на набережной' ||
    text === 'открытая локация'
  );
}

function isPierLikeVenueText(name, address) {
  const text = `${name || ''} ${address || ''}`.toLowerCase();
  return /(?:^|\s)причал(?:\s|$)|(?:^|\s)пристань(?:\s|$)|набереж|наб\.|\bреки\b|\bрека\b|\bканал/i.test(text);
}

function venueTitleLooksLikeEmbankmentAddress(name) {
  const text = String(name || '').trim();
  if (!text) return false;
  if (/^(?:причал|пристань)\b/i.test(text)) return false;
  if (looksLikeNamedLandmark(text)) return false;
  return (
    /(?:^|\s)(?:наб\.|набереж|набережная|реки|река|канал|пр\.|ул\.|улиц)/i.test(text) ||
    /\d[\p{L}\d\-/]*(?:\s*лит(?:ера)?\.?\s*[\p{L}\d]+)?$/iu.test(text)
  );
}

function looksLikeNamedLandmark(title) {
  return /(?:^|\s)(?:мост|угол|площадь|сквер|памятник|парк|дворец|крепость|собор|театр|музей|спуск|набережная\s+[\p{L}]+(?:\s+[\p{L}]+){0,2}\s+и\s+[\p{L}])/iu.test(
    String(title || ''),
  );
}

function stripPierPrefixFromAddress(address) {
  return String(address || '')
    .trim()
    .replace(/^при(?:чал|стан(?:ь|и)?)(?:\s+(?:на|у|около))?\s+/iu, '')
    .trim();
}

function hasDescriptivePierTitle(title) {
  const text = String(title || '').trim();
  return /^при(?:чал|стан(?:ь|и)?)\s+(?:(?:на|у|около)\s+(?!б(?:\.|\b))|«|")/iu.test(text);
}

function shouldUsePierAddressDisplayName(name, address) {
  const title = formatPublicVenueTitle(name);
  if (!address) return false;
  if (hasDescriptivePierTitle(title)) return false;
  if (/^при(?:чал|стан(?:ь|и)?)\b/i.test(title) && /\d/.test(title)) {
    const locationPart = stripPierPrefixFromTitle(title);
    if (venueTitleLooksLikeEmbankmentAddress(locationPart)) return true;
  }
  if (pierTitlesEquivalent(title, address)) return true;
  if (venueTitleLooksLikeEmbankmentAddress(title)) return true;
  const stripped = stripPierPrefixFromTitle(title);
  return /^причал\b/i.test(title) && !/\d/.test(title) && stripped.length < 5;
}

function normalizePierVenueAddress(address, city) {
  let text = normalizePublicVenueAddress(address, city);
  if (!text) return text;
  const stripped = stripPierPrefixFromAddress(text);
  if (stripped && stripped !== text) {
    text = normalizePublicVenueAddress(stripped, city) || stripped;
  }
  return text;
}

function normalizeComparableStreet(value) {
  return normalizeKey(value)
    .replace(/\bнабережная\b/g, 'наб')
    .replace(/\bнаб\b/g, 'наб')
    .replace(/\bулица\b/g, 'ул')
    .replace(/\bпроспект\b/g, 'пр')
    .replace(/\s+/g, ' ')
    .trim();
}

function addressAlreadyContainsTitleStreet(title, address) {
  const titleNorm = normalizeComparableStreet(title);
  const addrNorm = normalizeComparableStreet(address);
  if (!titleNorm || !addrNorm || titleNorm.length < 6) return false;
  if (addrNorm.includes(titleNorm)) return true;
  const titleCore = titleNorm.replace(/^(?:причал|пристань)\s+/u, '').trim();
  return titleCore.length >= 6 && addrNorm.includes(titleCore);
}

function isIncompleteVenueAddress(address, title) {
  const addr = String(address || '').trim();
  if (!addr || isPlusCodeAddress(addr)) return true;
  if (/^\d[\p{L}\d\-/]*$/u.test(addr)) return true;
  if (addr.length < 8) return true;
  if (addressAlreadyContainsTitleStreet(title, addr)) return false;
  return false;
}

function stripPierPrefixFromTitle(name) {
  return String(name || '')
    .trim()
    .replace(/^причал(?:\s+(?:на|у|около))?\s+/iu, '')
    .replace(/^пристань(?:\s+(?:на|у|около))?\s+/iu, '')
    .trim();
}

function pierTitlesEquivalent(name, address) {
  const titleNorm = normalizeComparableStreet(stripPierPrefixFromTitle(name));
  const addrNorm = normalizeComparableStreet(address);
  if (!titleNorm || !addrNorm) return false;
  if (titleNorm === addrNorm) return true;
  if (addrNorm.includes(titleNorm) && titleNorm.length >= 8 && /\d/.test(titleNorm)) {
    return true;
  }
  return false;
}

export function formatPierLocationDisplayName(name, address, city) {
  const normalizedAddress = normalizePierVenueAddress(address, city);
  const shortAddress = normalizedAddress || String(address || '').trim() || null;
  const title = formatPublicVenueTitle(name);

  if (!shouldUsePierAddressDisplayName(title, shortAddress)) {
    return title;
  }

  return shortAddress ? `Причал — ${shortAddress}` : 'Причал';
}

export function formatBusLocationDisplayName(name, address, city) {
  const normalizedAddress = normalizePublicVenueAddress(address, city);
  const shortAddress = normalizedAddress || String(address || '').trim() || null;
  const shouldRename =
    isGenericBusVenueTitle(name) || isBusVenueTitleLikelyTourName(name, address) || String(name || '').length > 72;

  if (!shouldRename) {
    return formatPublicVenueTitle(name);
  }

  if (shortAddress) {
    return `Место посадки — ${shortAddress}`;
  }

  return 'Место посадки';
}

export function normalizePublicVenueRecord(input = {}) {
  const override = findOverride(input);
  let title = String(input.title || input.name || '').trim();
  let address = String(input.address || '').trim();
  let city = String(input.city || '').trim();

  if (override?.title) title = override.title;
  if (override?.address) address = override.address;
  if (override?.city) city = override.city;

  const split = splitAddressFromTitle(title);
  if (split.addressFromTitle) {
    title = split.title;
    if (!address || isPlusCodeAddress(address)) {
      address = split.addressFromTitle;
    }
  }

  if (venueTitleLooksLikeAddress(title) && address && isIncompleteVenueAddress(address, title)) {
    const merged = `${title}, ${address}`;
    const reSplit = splitAddressFromTitle(merged);
    if (reSplit.addressFromTitle) {
      title = reSplit.title;
      address = reSplit.addressFromTitle;
    }
  }

  if (venueTitleLooksLikeMeetingPoint(title) && address) {
    const institutionSplit = splitInstitutionFromAddress(address, city);
    if (institutionSplit) {
      title = institutionSplit.institution;
      address = institutionSplit.street;
    }
  }

  const ref = findReference(title);
  if (ref) {
    let refStreet = extractStreetFromReference(ref.address, city);
    if (isGenericReferenceAddress(refStreet)) {
      const refSplit = splitAddressFromTitle(ref.title);
      refStreet = refSplit.addressFromTitle || refStreet;
    }
    if (
      refStreet &&
      !isGenericReferenceAddress(refStreet) &&
      !isGenericPierReferenceAddress(refStreet) &&
      (!address || isPlusCodeAddress(address) || isGenericReferenceAddress(address) || isIncompleteVenueAddress(address, title))
    ) {
      address = refStreet;
    }
  }

  const inferredCity = inferCityFromAddressText(`${title} ${address}`);
  if (inferredCity && (!city || city === 'Не указан' || cityContradictsAddress(city, title, address))) {
    city = inferredCity;
  }

  address = normalizePublicVenueAddress(address, city);
  if (isPierLikeVenueText(title, address)) {
    address = normalizePierVenueAddress(address, city);
  }

  if (override?.title) title = override.title;
  if (override?.address) address = override.address;
  if (override?.city) city = override.city;

  return {
    title: formatPublicVenueTitle(title),
    address: address || null,
    city: city && city !== 'Не указан' ? city : inferredCity || city || null,
  };
}
