#!/usr/bin/env node
/**
 * Apply owner-filled SPB mustSee lat/lng/address (editor table 1-184).
 * Skip rows 46 and 162 (blank on the screenshot).
 */
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const RAW_PATH = path.join(rootDir, 'scripts/data/spb-owner-editor-coords-raw.txt');
const LOCK_PATH = path.join(rootDir, 'scripts/data/spb-owner-editor-coords.json');
const CITYINFO_PATHS = [
  path.join(rootDir, 'apps/web/src/lib/cityInfo.ts'),
  path.join(rootDir, 'apps/public/src/lib/cityInfo.ts'),
];
const COORDS_TS = path.join(rootDir, 'apps/web/src/lib/city-place-coords.ts');
const EDITORIAL_JSON = path.join(rootDir, 'scripts/data/must-see-editorial.json');
const AUDIT_JS = path.join(rootDir, 'scripts/audit-cityinfo-yandex-coords.js');

const SKIP_ROWS = new Set([46, 162]);
const MOSQUE_NAME = 'Санкт-Петербургская соборная мечеть';

function parseOwnerRows(raw) {
  let body = String(raw).replace(/№НазваниеАдрес в Санкт-ПетербургеКоординаты \(широта, долгота\)/g, '');
  const rows = [];
  for (let n = 1; n <= 184; n++) {
    const prefix = String(n);
    if (!body.startsWith(prefix)) {
      throw new Error(`expected row ${n} at ${JSON.stringify(body.slice(0, 60))}`);
    }
    body = body.slice(prefix.length);
    if (SKIP_ROWS.has(n)) {
      const skipM = body.match(/^Пропущено на картинке[—\-]+/);
      if (!skipM) throw new Error(`expected skip marker at row ${n}`);
      body = body.slice(skipM[0].length);
      rows.push({ n, skip: true, editorName: 'Пропущено на картинке', address: null, latitude: null, longitude: null });
      continue;
    }
    let chunk;
    if (n === 184) {
      chunk = body;
      body = '';
    } else {
      const nextRe = new RegExp(`(?=${n + 1}[\\p{L}«])`, 'u');
      const idx = body.search(nextRe);
      if (idx < 0) throw new Error(`next row ${n + 1} not found after ${n}`);
      chunk = body.slice(0, idx);
      body = body.slice(idx);
    }
    const coordM = chunk.match(/59\.(\d{6}), (30\.\d{6})\s*$/);
    if (!coordM) throw new Error(`coords not at end of row ${n}: ${chunk.slice(-50)}`);
    rows.push({
      n,
      skip: false,
      blob: chunk.slice(0, coordM.index),
      latitude: `59.${coordM[1]}`,
      longitude: coordM[2],
    });
  }
  return rows;
}

function extractMustSeeArray(src) {
  const cityStart = src.indexOf("'saint-petersburg':");
  if (cityStart < 0) throw new Error('saint-petersburg block not found');
  const mustSeeKey = src.indexOf('mustSee:', cityStart);
  const arrStart = src.indexOf('[', mustSeeKey);
  let depth = 0;
  let arrEnd = arrStart;
  for (let i = arrStart; i < src.length; i++) {
    const ch = src[i];
    if (ch === '[') depth++;
    else if (ch === ']') {
      depth--;
      if (depth === 0) {
        arrEnd = i;
        break;
      }
    }
  }
  return { arrStart, arrEnd, block: src.slice(arrStart, arrEnd + 1) };
}

function extractObjects(block) {
  const objects = [];
  let i = 0;
  while (i < block.length) {
    if (block[i] !== '{') {
      i++;
      continue;
    }
    let depth = 0;
    let inStr = false;
    let quote = '';
    const start = i;
    for (; i < block.length; i++) {
      const ch = block[i];
      const prev = i > 0 ? block[i - 1] : '';
      if (inStr) {
        if (ch === quote && prev !== '\\') inStr = false;
        continue;
      }
      if (ch === "'" || ch === '"') {
        inStr = true;
        quote = ch;
        continue;
      }
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) {
          objects.push({ start, end: i + 1, text: block.slice(start, i + 1) });
          i++;
          break;
        }
      }
    }
  }
  return objects;
}

function field(objText, key) {
  const re = new RegExp(`${key}:\\s*'((?:\\\\'|[^'])*)'`);
  const m = objText.match(re);
  return m ? m[1].replace(/\\'/g, "'") : '';
}

function tsString(value) {
  return `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

function upsertCoordFields(objText, { address, latitude, longitude }) {
  let next = objText.replace(/\s*,?\s*latitude:\s*-?[\d.]+/g, '');
  next = next.replace(/\s*,?\s*longitude:\s*-?[\d.]+/g, '');
  next = next.replace(/\s*,?\s*address:\s*'(?:\\'|[^'])*'/g, '');
  next = next.replace(/,(\s*)\}/, '$1}');
  const insert = `address: ${tsString(address)}, latitude: ${latitude}, longitude: ${longitude}`;
  const close = next.lastIndexOf('}');
  const before = next.slice(0, close).replace(/[ \t]+$/, '');
  const nl = before.match(/\n([ \t]*)$/);
  if (nl) {
    const body = before.slice(0, -nl[0].length).replace(/[ \t]+$/, '');
    const comma = body.trimEnd().endsWith(',') ? '' : ',';
    return `${body}${comma}\n${nl[1]}  ${insert}\n${nl[1]}}`;
  }
  const comma = before.trimEnd().endsWith(',') ? ' ' : ', ';
  return `${before.trimEnd()}${comma}${insert} }`;
}

function namesAlign(editorBlob, cityName) {
  const blob = editorBlob.replace(/\s+/g, ' ').trim();
  const city = cityName.replace(/\s+/g, ' ').trim();
  if (blob.startsWith(city)) return { ok: true, address: blob.slice(city.length).trim() };
  const shortCity = city.replace(/\s*\([^)]*\)\s*$/, '').trim();
  if (blob.startsWith(shortCity)) return { ok: true, address: blob.slice(shortCity.length).trim() };

  const aliases = [
    ['Медный всадник', city.includes('Медный всадник')],
    ['Доходный дом Ратькова-Рожнова', city.includes('Ратькова-Рожнова')],
    ['Дворец Вел. князя Владимира (Дом ученых)', city.includes('Владимира Александровича')],
    ['Планетарий №1', city.includes('Планетарий')],
  ];
  for (const [alias, match] of aliases) {
    if (match && blob.startsWith(alias)) {
      return { ok: true, address: blob.slice(alias.length).trim() };
    }
  }
  return { ok: false, address: '' };
}

function formatCoordsObject(map, extras) {
  const keys = [...new Set([...Object.keys(extras), ...Object.keys(map)])];
  keys.sort((a, b) => a.localeCompare(b));
  const lines = ['const SAINT_PETERSBURG_COORDS: Record<string, EditorialPlaceCoords> = {'];
  for (const key of keys) {
    const pair = map[key] || extras[key];
    lines.push(`  '${key}': { latitude: ${pair.latitude}, longitude: ${pair.longitude} },`);
  }
  lines.push('};');
  return lines.join('\n');
}

function main() {
  const raw = fs.readFileSync(RAW_PATH, 'utf8');
  const ownerRows = parseOwnerRows(raw);
  if (ownerRows.length !== 184) {
    throw new Error(`expected 184 owner rows, got ${ownerRows.length}`);
  }
  const withCoords = ownerRows.filter((r) => !r.skip);
  if (withCoords.length !== 182) {
    throw new Error(`expected 182 coord rows, got ${withCoords.length}`);
  }
  for (const n of SKIP_ROWS) {
    const row = ownerRows.find((r) => r.n === n);
    if (!row || !row.skip) throw new Error(`row ${n} should be skipped`);
  }

  const webSrc = fs.readFileSync(CITYINFO_PATHS[0], 'utf8');
  const { block } = extractMustSeeArray(webSrc);
  const objects = extractObjects(block);
  const cityItems = objects
    .map((obj, idx) => ({
      idx,
      name: field(obj.text, 'name'),
      venueSlug: field(obj.text, 'venueSlug'),
      locationSlug: field(obj.text, 'locationSlug'),
      text: obj.text,
    }))
    .filter((item) => item.name !== MOSQUE_NAME);

  if (cityItems.length !== 184) {
    throw new Error(`expected 184 cityInfo mustSee (ex mosque), got ${cityItems.length}`);
  }

  const unmatched = [];
  const applied = [];
  const slugCoords = {};

  for (let i = 0; i < 184; i++) {
    const owner = ownerRows[i];
    const city = cityItems[i];
    if (owner.n !== i + 1) throw new Error(`owner row order drift at ${i + 1}`);
    if (SKIP_ROWS.has(owner.n)) {
      applied.push({ n: owner.n, name: city.name, skipped: true });
      continue;
    }
    const split = namesAlign(owner.blob, city.name);
    if (!split.ok) {
      unmatched.push({ n: owner.n, cityName: city.name, blob: owner.blob.slice(0, 80) });
      continue;
    }
    const slug = city.venueSlug || city.locationSlug;
    applied.push({
      n: owner.n,
      name: city.name,
      editorName: owner.blob.slice(0, city.name.length),
      address: split.address,
      latitude: owner.latitude,
      longitude: owner.longitude,
      slug,
    });
    if (slug) {
      slugCoords[slug] = { latitude: owner.latitude, longitude: owner.longitude };
    }
  }

  if (unmatched.length) {
    console.error(JSON.stringify({ unmatched }, null, 2));
    throw new Error(`${unmatched.length} names could not be matched`);
  }

  const byIndex = new Map(applied.filter((r) => !r.skipped).map((r) => [r.n, r]));

  function patchCityInfo(src) {
    const extracted = extractMustSeeArray(src);
    const objs = extractObjects(extracted.block);
    const withoutMosque = objs.filter((obj) => field(obj.text, 'name') !== MOSQUE_NAME);
    if (withoutMosque.length !== 184) {
      throw new Error(`cityInfo mustSee count ${withoutMosque.length}`);
    }
    let nextBlock = extracted.block;
    for (let i = 183; i >= 0; i--) {
      const owner = ownerRows[i];
      if (SKIP_ROWS.has(owner.n)) continue;
      const row = byIndex.get(owner.n);
      const obj = withoutMosque[i];
      const patched = upsertCoordFields(obj.text, row);
      nextBlock = nextBlock.slice(0, obj.start) + patched + nextBlock.slice(obj.end);
    }
    return src.slice(0, extracted.arrStart) + nextBlock + src.slice(extracted.arrEnd + 1);
  }

  for (const filePath of CITYINFO_PATHS) {
    const src = fs.readFileSync(filePath, 'utf8');
    fs.writeFileSync(filePath, patchCityInfo(src));
    console.log('patched', path.relative(rootDir, filePath));
  }

  const coordsSrc = fs.readFileSync(COORDS_TS, 'utf8');
  const extras = {};
  const extrasBlock = coordsSrc.match(
    /const SAINT_PETERSBURG_COORDS: Record<string, EditorialPlaceCoords> = \{([\s\S]*?)\n\};/,
  );
  if (!extrasBlock) throw new Error('SAINT_PETERSBURG_COORDS not found');
  const extraRe = /'([^']+)':\s*\{\s*latitude:\s*([-.\d]+),\s*longitude:\s*([-.\d]+)\s*\}/g;
  let em;
  while ((em = extraRe.exec(extrasBlock[1]))) {
    if (!slugCoords[em[1]]) {
      extras[em[1]] = { latitude: Number(em[2]), longitude: Number(em[3]) };
    }
  }
  const generated = formatCoordsObject(slugCoords, extras);
  const nextCoords = coordsSrc.replace(
    /const SAINT_PETERSBURG_COORDS: Record<string, EditorialPlaceCoords> = \{[\s\S]*?\n\};/,
    generated,
  );
  fs.writeFileSync(COORDS_TS, nextCoords);
  console.log('patched', path.relative(rootDir, COORDS_TS), 'slugs', Object.keys(slugCoords).length);

  if (fs.existsSync(EDITORIAL_JSON)) {
    const editorial = JSON.parse(fs.readFileSync(EDITORIAL_JSON, 'utf8'));
    let jsonUpdated = 0;
    const bySlug = new Map(applied.filter((r) => r.slug && !r.skipped).map((r) => [r.slug, r]));
    for (const item of editorial) {
      const row = bySlug.get(item.slug);
      if (!row) continue;
      item.latitude = row.latitude;
      item.longitude = row.longitude;
      if (row.address) item.address = row.address;
      jsonUpdated++;
    }
    fs.writeFileSync(EDITORIAL_JSON, JSON.stringify(editorial, null, 2) + '\n');
    console.log('patched editorial json', jsonUpdated);
  }

  const lock = {
    source: 'owner-editor-table-2026-08-14',
    skipRows: [46, 162],
    skipNames: ['Открытые дворы-колодцы (экскурсии по дворам)', 'Булочная Ф. Вольчека'],
    places: applied.filter((r) => !r.skipped).map((r) => ({
      n: r.n,
      name: r.name,
      slug: r.slug,
      address: r.address,
      latitude: Number(r.latitude),
      longitude: Number(r.longitude),
    })),
  };
  fs.writeFileSync(LOCK_PATH, JSON.stringify(lock, null, 2) + '\n');

  let audit = fs.readFileSync(AUDIT_JS, 'utf8');
  if (!audit.includes('spb-owner-editor-coords.json')) {
    audit = audit.replace(
      `const OWNER_OVERRIDES = {
  'perm-sobornaya-ploschad': {
    latitude: 58.016205,
    longitude: 56.2338,
    reason: 'owner Yandex screenshot Cathedral Square',
  },
};`,
      `const OWNER_OVERRIDES = {
  'perm-sobornaya-ploschad': {
    latitude: 58.016205,
    longitude: 56.2338,
    reason: 'owner Yandex screenshot Cathedral Square',
  },
};

try {
  const spbOwner = JSON.parse(
    fs.readFileSync(path.join(rootDir, 'scripts/data/spb-owner-editor-coords.json'), 'utf8'),
  );
  for (const place of spbOwner.places || []) {
    if (!place.slug) continue;
    OWNER_OVERRIDES[place.slug] = {
      latitude: place.latitude,
      longitude: place.longitude,
      reason: 'owner editor table 2026-08-14 SPB mustSee',
    };
  }
} catch {
  /* lock file optional until first apply */
}`,
    );
    fs.writeFileSync(AUDIT_JS, audit);
    console.log('patched yandex audit owner overrides');
  }

  console.log(
    JSON.stringify(
      {
        updated: applied.filter((r) => !r.skipped).length,
        skipped: applied.filter((r) => r.skipped).map((r) => ({ n: r.n, name: r.name })),
        unmatched,
        spot: applied.filter((r) => [1, 2, 9].includes(r.n)),
      },
      null,
      2,
    ),
  );
}

main();
