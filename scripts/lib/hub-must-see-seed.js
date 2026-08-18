/**
 * Parse city hub `place('name', 'desc', lat, lng, { ... })` packs and decide
 * which editorial points are enough for a public Venue/Location row.
 *
 * Minimum profile (Project.md city-hub seed): canonical name, coords, address,
 * short text, family/kind. Generic unnamed gastro and nested suburb POIs stay
 * hub-only (day-route pins), not catalog PDPs.
 */
'use strict';

const { inferMustSeeKindAndFamily } = require('./venue-kind-heuristics');

const HUB_MUST_SEE_MODULES = [
  { cityKey: 'kazan', file: 'apps/web/src/lib/kazan-hub.ts', exportName: 'KAZAN_MUST_SEE' },
  { cityKey: 'samara', file: 'apps/web/src/lib/samara-hub.ts', exportName: 'SAMARA_MUST_SEE' },
  {
    cityKey: 'ekaterinburg',
    file: 'apps/web/src/lib/ekaterinburg-hub.ts',
    exportName: 'EKB_MUST_SEE',
  },
  {
    cityKey: 'krasnodar',
    file: 'apps/web/src/lib/krasnodar-hub.ts',
    exportName: 'KRASNODAR_MUST_SEE',
  },
  {
    cityKey: 'krasnoyarsk',
    file: 'apps/web/src/lib/krasnoyarsk-hub.ts',
    exportName: 'KRASNOYARSK_MUST_SEE',
  },
  {
    cityKey: 'rostov-na-donu',
    file: 'apps/web/src/lib/rostov-na-donu-hub.ts',
    exportName: 'ROSTOV_NA_DONU_MUST_SEE',
    suburbsExport: 'ROSTOV_NA_DONU_SUBURBS',
  },
  {
    cityKey: 'penza',
    file: 'apps/web/src/lib/penza-hub.ts',
    exportName: 'PENZA_MUST_SEE',
    suburbsExport: 'PENZA_SUBURBS',
  },
  {
    cityKey: 'tver',
    file: 'apps/web/src/lib/tver-hub.ts',
    exportName: 'TVER_MUST_SEE',
    suburbsExport: 'TVER_SUBURBS',
  },
];

/** Live twins that already exist under a slightly different slug. */
const HUB_PLACE_SLUG_ALIASES = {
  'rostov-na-donu-tsentralnyy-rynok-staryy-bazar':
    'rostov-na-donu-tsentral-nyy-rynok-staryy-bazar',
};

function unescapeTs(value) {
  return String(value || '')
    .replace(/\\'/g, "'")
    .replace(/\\n/g, '\n');
}

function sliceBalancedObject(source, openBraceIndex) {
  if (source[openBraceIndex] !== '{') return null;
  let depth = 0;
  for (let i = openBraceIndex; i < source.length; i++) {
    const ch = source[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return source.slice(openBraceIndex, i + 1);
    }
  }
  return null;
}

function optString(block, key) {
  const re = new RegExp(`${key}:\\s*'((?:\\\\'|[^'])*)'`);
  const m = block.match(re);
  return m ? unescapeTs(m[1]) : null;
}

function optNumber(block, key) {
  const re = new RegExp(`${key}:\\s*(-?\\d+(?:\\.\\d+)?)`);
  const m = block.match(re);
  return m ? Number(m[1]) : null;
}

function parseOptsBlock(block) {
  return {
    address: optString(block, 'address'),
    locationSlug: optString(block, 'locationSlug'),
    venueSlug: optString(block, 'venueSlug'),
    mustSeeFilter: optString(block, 'mustSeeFilter'),
  };
}

/**
 * Top-level `place(...)` calls (indent 2). Nested suburb `places: [ place() ]`
 * use deeper indent and are skipped.
 */
function parsePlaceHelperCalls(source, cityKey) {
  const rows = [];
  const re =
    /^(?<indent>[ \t]*)place\(\s*'(?<name>(?:\\'|[^'])*)'\s*,\s*'(?<desc>(?:\\'|[^'])*)'\s*,\s*(?<lat>-?\d+(?:\.\d+)?)\s*,\s*(?<lng>-?\d+(?:\.\d+)?)\s*,\s*\{/gm;
  let m;
  while ((m = re.exec(source))) {
    const indent = m.groups.indent.length;
    const optsStart = m.index + m[0].length - 1;
    const opts = sliceBalancedObject(source, optsStart);
    if (!opts) continue;
    const fields = parseOptsBlock(opts);
    rows.push({
      cityKey,
      nested: indent > 2,
      name: unescapeTs(m.groups.name),
      desc: unescapeTs(m.groups.desc),
      latitude: Number(m.groups.lat),
      longitude: Number(m.groups.lng),
      ...fields,
    });
  }
  return rows;
}

function parseExportArray(source, exportName) {
  const re = new RegExp(`export const ${exportName}[^=]*=\\s*\\[`, 'm');
  const m = re.exec(source);
  if (!m) return null;
  const arrStart = m.index + m[0].length - 1;
  let depth = 0;
  for (let i = arrStart; i < source.length; i++) {
    if (source[i] === '[') depth++;
    else if (source[i] === ']') {
      depth--;
      if (depth === 0) return source.slice(arrStart, i + 1);
    }
  }
  return null;
}

/** Suburb parent cards (`{ name, desc, locationSlug, latitude... }`), not nested POIs. */
function parseSuburbParents(source, cityKey, exportName) {
  const arraySrc = parseExportArray(source, exportName);
  if (!arraySrc) return [];
  const rows = [];
  const re = /\n  \{\n    name:\s*'((?:\\'|[^'])*)'/g;
  let m;
  while ((m = re.exec(arraySrc))) {
    const blockStart = m.index + 1; // '{'
    const absStart = arraySrc.indexOf('{', blockStart - 1);
    const block = sliceBalancedObject(arraySrc, absStart);
    if (!block) continue;
    if (/\n    places:\s*\[/.test(block) === false && !optString(block, 'locationSlug')) continue;
    rows.push({
      cityKey,
      nested: false,
      suburbParent: true,
      name: unescapeTs(m[1]),
      desc: optString(block, 'desc') || '',
      latitude: optNumber(block, 'latitude'),
      longitude: optNumber(block, 'longitude'),
      address: optString(block, 'address'),
      locationSlug: optString(block, 'locationSlug'),
      venueSlug: optString(block, 'venueSlug'),
      mustSeeFilter: optString(block, 'mustSeeFilter'),
    });
  }
  return rows;
}

function sanitizeEditorialText(value) {
  const raw = String(value || '');
  const stripped = raw.replace(/координата здесь должна оставаться[^.]*\.?\s*/gi, '');
  const text = stripped === raw ? raw : stripped.replace(/[.,;:\s]+$/g, '');
  return text.replace(/\s+/g, ' ').trim();
}

function isGenericUnnamedPlace(name) {
  const n = String(name || '')
    .trim()
    .toLowerCase()
    .replace(/ё/g, 'е');
  if (!n) return true;
  if (/^ресторан с /.test(n)) return true;
  if (/локальной кухн/.test(n)) return true;
  if (/^кофейн/.test(n)) return true;
  if (/гастроквартал/.test(n)) return true;
  if (/дегустационн/.test(n)) return true;
  if (/^орнитологическ/.test(n)) return true;
  if (/^смотровые степные/.test(n)) return true;
  return false;
}

function hasMinimalLocationProfile(item) {
  const name = String(item?.name || '').trim();
  const desc = sanitizeEditorialText(item?.desc);
  const lat = Number(item?.latitude);
  const lng = Number(item?.longitude);
  const address = String(item?.address || '').trim();
  if (name.length < 4) return false;
  if (desc.length < 24) return false;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (Math.abs(lat) < 1 || Math.abs(lng) < 1) return false;
  if (!address) return false;
  if (isGenericUnnamedPlace(name)) return false;
  return true;
}

function kindFromMustSeeItem(item) {
  const name = String(item?.name || '');
  const inferred = inferMustSeeKindAndFamily(`${name} ${item?.desc || ''}`, null);
  const filter = String(item?.mustSeeFilter || '').trim();
  switch (filter) {
    case 'monument':
      return { kind: 'MONUMENT', family: 'location', confident: true };
    case 'park':
      return { kind: 'PARK', family: 'location', confident: true };
    case 'street':
      return { kind: 'OUTDOOR_LOCATION', family: 'location', confident: true };
    case 'temple':
    case 'houses':
    case 'mansions':
    case 'views':
      return { kind: 'ATTRACTION', family: 'location', confident: true };
    case 'museum':
    case 'literature':
      return { kind: 'MUSEUM_ART_SPACE', family: 'institution', confident: true };
    case 'gastro':
      return { kind: 'GASTRO', family: 'location', confident: true };
    case 'creative':
    case 'science':
      return inferred.family === 'institution'
        ? inferred
        : { kind: inferred.kind || 'ATTRACTION', family: inferred.family, confident: inferred.confident };
    default:
      return inferred;
  }
}

function resolveSeedSlug(item) {
  const raw = String(item?.venueSlug || item?.locationSlug || '').trim();
  if (!raw) return null;
  return HUB_PLACE_SLUG_ALIASES[raw] || raw;
}

function toSeedPlan(item) {
  const desc = sanitizeEditorialText(item.desc);
  const inferred = kindFromMustSeeItem({ ...item, desc });
  const slug = resolveSeedSlug(item);
  let { kind, family } = inferred;
  if (item.venueSlug && !item.locationSlug) {
    family = 'institution';
    if (!['MUSEUM_ART_SPACE', 'THEATER', 'CONCERT_HALL', 'CLUB_BAR_RESTAURANT'].includes(kind)) {
      const fromName = inferMustSeeKindAndFamily(item.name);
      kind = ['MUSEUM_ART_SPACE', 'THEATER', 'CONCERT_HALL'].includes(fromName.kind)
        ? fromName.kind
        : 'MUSEUM_ART_SPACE';
    }
  }
  const canonicalFamily =
    ['MUSEUM_ART_SPACE', 'THEATER', 'CONCERT_HALL', 'CLUB_BAR_RESTAURANT'].includes(kind)
      ? 'institution'
      : family;
  return {
    cityKey: item.cityKey,
    name: item.name,
    desc,
    address: String(item.address || '').trim(),
    latitude: Number(item.latitude),
    longitude: Number(item.longitude),
    slug,
    kind,
    family: canonicalFamily,
    skipReason: !slug
      ? 'no-slug'
      : !hasMinimalLocationProfile({ ...item, desc })
        ? 'thin-profile'
        : item.nested
          ? 'nested-suburb-poi'
          : null,
    slugField: canonicalFamily === 'institution' ? 'venueSlug' : 'locationSlug',
    canonicalPath:
      canonicalFamily === 'institution' ? `/venues/${slug}` : `/locations/${slug}`,
  };
}

function collectHubMustSeeRows(readFile, rootDir) {
  const path = require('path');
  const rows = [];
  for (const hub of HUB_MUST_SEE_MODULES) {
    const abs = path.join(rootDir, hub.file);
    let src;
    try {
      src = readFile(abs, 'utf8');
    } catch {
      continue;
    }
    const mustSeeSrc = parseExportArray(src, hub.exportName) || src;
    for (const row of parsePlaceHelperCalls(mustSeeSrc, hub.cityKey)) {
      rows.push(row);
    }
    if (hub.suburbsExport) {
      rows.push(...parseSuburbParents(src, hub.cityKey, hub.suburbsExport));
    }
  }
  return rows;
}

module.exports = {
  HUB_MUST_SEE_MODULES,
  HUB_PLACE_SLUG_ALIASES,
  parsePlaceHelperCalls,
  parseSuburbParents,
  sanitizeEditorialText,
  isGenericUnnamedPlace,
  hasMinimalLocationProfile,
  kindFromMustSeeItem,
  resolveSeedSlug,
  toSeedPlan,
  collectHubMustSeeRows,
};
