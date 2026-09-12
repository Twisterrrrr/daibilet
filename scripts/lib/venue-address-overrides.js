const fs = require('fs');
const path = require('path');

let overrideByKey = null;

function normalizeKey(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/["«»]/g, '')
    .replace(/[^a-z0-9а-я]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function loadOverrideMap() {
  if (overrideByKey) return overrideByKey;
  overrideByKey = new Map();
  const filePath = path.join(__dirname, '..', 'data', 'venue-address-overrides.json');
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

function findVenueAddressOverride(input = {}) {
  const overrides = loadOverrideMap();
  const keys = [input.id, input.title, input.name, input.slug].filter(Boolean).map(normalizeKey);
  for (const key of keys) {
    if (overrides.has(key)) return overrides.get(key);
  }
  return null;
}

/** Owner canon: Синопская house is always 10А (Cyrillic А). */
function rewriteSinopskayaHouseNumber(value) {
  const text = String(value || '');
  if (!text || !/синопск/iu.test(text)) return text;
  return text
    .replace(/,\s*10(?![АаAa\d])(?=\s*(?:,|$))/gu, ', 10А')
    .replace(/(\s)10(?![АаAa\d])(?=\s*(?:,|$))/gu, '$110А');
}

/**
 * Apply durable venue title/address canons before DB upsert (TC/TEP import).
 * Prefer explicit override entry; always rewrite Sinopskaya 10 → 10А.
 */
function applyVenueAddressCanon(input = {}) {
  const override = findVenueAddressOverride(input);
  let title = String(input.title || input.name || '').trim();
  let address = String(input.address || '').trim();
  let city = String(input.city || '').trim() || null;

  if (override?.title) title = override.title;
  if (override?.address) address = override.address;
  if (override?.city) city = override.city;

  title = rewriteSinopskayaHouseNumber(title);
  address = rewriteSinopskayaHouseNumber(address);

  return {
    ...input,
    title: title || input.title || input.name || null,
    name: title || input.name || input.title || null,
    address: address || null,
    city,
    overrideId: override?.id || null,
    kind: override?.kind || input.kind || null,
  };
}

module.exports = {
  applyVenueAddressCanon,
  findVenueAddressOverride,
  rewriteSinopskayaHouseNumber,
};
