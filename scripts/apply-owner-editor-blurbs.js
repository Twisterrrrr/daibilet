#!/usr/bin/env node
/**
 * Apply owner editorial address + coords + annotation:
 * Perm 9 nested/mustSee POIs, Moscow 57 preset (+ matching mustSee), SPB VO 12 presets.
 *
 * Does NOT write Solikamsk church copy onto Kungur cluster / Khokhlovka church.
 * Does NOT wipe Belaya Gora / Gubakha-Usva suburb cluster copy.
 * Does NOT revert sibling SPB mustSee coords (writes desc/address on presets; mustSee coords left as-is).
 *
 * Usage: node scripts/apply-owner-editor-blurbs.js
 */
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const DATA_PATH = path.join(rootDir, 'scripts/data/owner-editor-blurbs-2026-08-14.json');
const CITYINFO_PATHS = [
  path.join(rootDir, 'apps/web/src/lib/cityInfo.ts'),
  path.join(rootDir, 'apps/public/src/lib/cityInfo.ts'),
];
const COORDS_TS = path.join(rootDir, 'apps/web/src/lib/city-place-coords.ts');
const EDITORIAL_JSON = path.join(rootDir, 'scripts/data/perm-location-copy-2026-08-14.json');
const SQL_PATH = path.join(rootDir, 'scripts/data/perm-location-copy-2026-08-14.sql');

const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));

function dash(s) {
  return String(s || '')
    .replace(/\u2014|\u2013|\u2212/g, '-')
    .trim();
}

function escTs(s, q) {
  const v = dash(s);
  if (q === "'") return v.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  return v.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function matchObjectAt(block, start) {
  if (block[start] !== '{') return null;
  let depth = 0;
  let inStr = false;
  let quote = '';
  for (let i = start; i < block.length; i++) {
    const ch = block[i];
    const prev = i > 0 ? block[i - 1] : '';
    if (inStr) {
      if (ch === quote && prev !== '\\') inStr = false;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inStr = true;
      quote = ch;
      continue;
    }
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        return { start, end: i + 1, text: block.slice(start, i + 1) };
      }
    }
  }
  return null;
}

function extractObjects(block) {
  const objects = [];
  for (let i = 0; i < block.length; i++) {
    if (block[i] !== '{') continue;
    const obj = matchObjectAt(block, i);
    if (!obj) continue;
    objects.push(obj);
  }
  return objects;
}

function isLeafObject(text) {
  return !text.slice(1, -1).includes('{');
}

function field(objText, key) {
  const re = new RegExp(`${key}:\\s*(?:"((?:\\\\.|[^"\\\\])*)"|'((?:\\\\.|[^'\\\\])*)'|(-?[0-9.]+))`);
  const m = objText.match(re);
  if (!m) return null;
  if (m[3] != null) return m[3];
  return (m[1] ?? m[2] ?? '').replace(/\\'/g, "'").replace(/\\"/g, '"');
}

function quoteOf(objText) {
  if (/name:\s*'/.test(objText)) return "'";
  return '"';
}

function formatNum(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) throw new Error(`bad number ${n}`);
  return String(x);
}

function upsertField(objText, key, value, isNumber) {
  const q = quoteOf(objText);
  const formatted = isNumber ? formatNum(value) : `${q}${escTs(value, q)}${q}`;
  const re = new RegExp(`(${key}:\\s*)(?:"(?:\\\\.|[^"\\\\])*"|'(?:\\\\.|[^'\\\\])*'|[-.\\d]+)`);
  if (re.test(objText)) return objText.replace(re, `$1${formatted}`);
  const indentMatch = objText.match(/\n([ \t]+)\S[^\n]*\n\s*\}$/);
  const indent = indentMatch ? indentMatch[1] : '  ';
  return objText.replace(/,?\n(\s*)\}$/, `,\n${indent}${key}: ${formatted},\n$1}`);
}

function cityRange(src, cityKey) {
  const patterns = [`  '${cityKey}': {`, `  ${cityKey}: {`];
  let start = -1;
  for (const p of patterns) {
    start = src.indexOf(p);
    if (start >= 0) break;
  }
  if (start < 0) throw new Error(`city ${cityKey} not found`);
  const after = src.slice(start + 1);
  const next = after.search(/\n  [a-zA-Z'"-]+: \{/);
  if (next < 0) throw new Error(`next city after ${cityKey} not found`);
  const end = start + 1 + next;
  return { start, end, block: src.slice(start, end) };
}

function mustSeeArrayRange(cityBlock) {
  const mustSeeKey = cityBlock.indexOf('mustSee:');
  const arrStart = cityBlock.indexOf('[', mustSeeKey);
  let depth = 0;
  let arrEnd = arrStart;
  for (let i = arrStart; i < cityBlock.length; i++) {
    if (cityBlock[i] === '[') depth++;
    else if (cityBlock[i] === ']') {
      depth--;
      if (depth === 0) {
        arrEnd = i;
        break;
      }
    }
  }
  return { arrStart, arrEnd, block: cityBlock.slice(arrStart, arrEnd + 1) };
}

function presetsRange(cityBlock) {
  const key = cityBlock.indexOf('dayRoutePresets:');
  if (key < 0) throw new Error('dayRoutePresets not found');
  const arrStart = cityBlock.indexOf('[', key);
  let depth = 0;
  let arrEnd = arrStart;
  for (let i = arrStart; i < cityBlock.length; i++) {
    if (cityBlock[i] === '[') depth++;
    else if (cityBlock[i] === ']') {
      depth--;
      if (depth === 0) {
        arrEnd = i;
        break;
      }
    }
  }
  return { arrStart, arrEnd, block: cityBlock.slice(arrStart, arrEnd + 1) };
}

function patchMoscow(src) {
  const city = cityRange(src, 'moscow');
  let cityBlock = city.block;
  const moscowBySlug = new Map(data.moscow.map((row) => [row.slug, row]));
  const moscowByName = new Map(data.moscow.map((row) => [row.name, row]));
  const stats = { presets: 0, mustSee: 0 };

  const presets = presetsRange(cityBlock);
  let presetBlock = presets.block;
  const presetObjs = extractObjects(presetBlock).filter((o) => {
    if (!isLeafObject(o.text)) return false;
    const desc = field(o.text, 'desc');
    const name = field(o.text, 'name');
    const slug = field(o.text, 'locationSlug') || field(o.text, 'venueSlug');
    return name && (desc === 'Точка маршрута по Москве.' || moscowBySlug.has(slug) || moscowByName.has(name));
  });

  const usedPreset = new Set();
  for (const obj of [...presetObjs].reverse()) {
    const slug = field(obj.text, 'locationSlug') || field(obj.text, 'venueSlug');
    const name = field(obj.text, 'name');
    const row = moscowBySlug.get(slug) || moscowByName.get(name);
    if (!row) continue;
    let next = obj.text;
    next = upsertField(next, 'desc', row.desc, false);
    next = upsertField(next, 'address', row.address, false);
    next = upsertField(next, 'latitude', row.latitude, true);
    next = upsertField(next, 'longitude', row.longitude, true);
    if (next !== obj.text) {
      presetBlock = presetBlock.slice(0, obj.start) + next + presetBlock.slice(obj.end);
      stats.presets++;
      usedPreset.add(row.slug);
    }
  }
  cityBlock = cityBlock.slice(0, presets.arrStart) + presetBlock + cityBlock.slice(presets.arrEnd + 1);

  const mustSee = mustSeeArrayRange(cityBlock);
  let mustBlock = mustSee.block;
  const mustObjs = extractObjects(mustBlock).filter((o) => isLeafObject(o.text));
  const usedMust = new Set();
  for (const obj of [...mustObjs].reverse()) {
    const slug = field(obj.text, 'locationSlug') || field(obj.text, 'venueSlug');
    if (!slug || !moscowBySlug.has(slug)) continue;
    const row = moscowBySlug.get(slug);
    let next = obj.text;
    next = upsertField(next, 'desc', row.desc, false);
    next = upsertField(next, 'address', row.address, false);
    next = upsertField(next, 'latitude', row.latitude, true);
    next = upsertField(next, 'longitude', row.longitude, true);
    if (next !== obj.text) {
      mustBlock = mustBlock.slice(0, obj.start) + next + mustBlock.slice(obj.end);
      stats.mustSee++;
      usedMust.add(slug);
    }
  }
  cityBlock = cityBlock.slice(0, mustSee.arrStart) + mustBlock + cityBlock.slice(mustSee.arrEnd + 1);

  const missingPreset = data.moscow.filter((r) => !usedPreset.has(r.slug)).map((r) => r.slug);
  const missingMust = data.moscow.filter((r) => !usedMust.has(r.slug)).map((r) => r.slug);
  src = src.slice(0, city.start) + cityBlock + src.slice(city.end);
  return { src, stats, missingPreset, missingMust };
}

function formatSpbStop(row) {
  const lines = [`          spbPresetStop('${escTs(row.name, "'")}', {`];
  lines.push(`            desc: '${escTs(row.desc, "'")}',`);
  lines.push(`            address: '${escTs(row.address, "'")}',`);
  if (row.dayRouteId) lines.push(`            dayRouteId: '${row.dayRouteId}',`);
  if (row.locationSlug) lines.push(`            locationSlug: '${row.locationSlug}',`);
  if (row.venueSlug) lines.push(`            venueSlug: '${row.venueSlug}',`);
  lines.push(`            latitude: ${formatNum(row.latitude)},`);
  lines.push(`            longitude: ${formatNum(row.longitude)}`);
  lines.push('          })');
  return lines.join('\n');
}

function patchSpbPresets(src) {
  if (src.includes("locationSlug: 'saint-petersburg-akademiya-hudozhestv'")) {
    return src;
  }
  const voTitle = src.indexOf("title: 'Васильевский остров'");
  if (voTitle < 0) throw new Error('SPB VO preset title not found');
  const stopsKey = src.indexOf('stops: [', voTitle);
  const arrStart = src.indexOf('[', stopsKey);
  let depth = 0;
  let arrEnd = arrStart;
  for (let i = arrStart; i < src.length; i++) {
    if (src[i] === '[') depth++;
    else if (src[i] === ']') {
      depth--;
      if (depth === 0) {
        arrEnd = i;
        break;
      }
    }
  }
  const replacement = `[\n${data.spbVo.map(formatSpbStop).join(',\n')}\n        ]`;
  return src.slice(0, arrStart) + replacement + src.slice(arrEnd + 1);
}

function patchNamedObject(src, name, fields, opts = {}) {
  const needle = `name: '${escTs(name, "'")}'`;
  const matches = [];
  let from = 0;
  while (from < src.length) {
    const idx = src.indexOf(needle, from);
    if (idx < 0) break;
    const brace = src.lastIndexOf('{', idx);
    if (brace < 0) break;
    const objs = extractObjects(src.slice(brace, brace + 2500));
    const obj = objs[0];
    if (!obj || !obj.text.includes(needle)) {
      from = idx + needle.length;
      continue;
    }
    const absStart = brace + obj.start;
    const absEnd = brace + obj.end;
    matches.push({ start: absStart, end: absEnd, text: src.slice(absStart, absEnd) });
    from = idx + needle.length;
  }

  let filtered = matches;
  if (opts.requireSlug) {
    filtered = matches.filter((m) => (field(m.text, 'locationSlug') || '') === opts.requireSlug);
  }
  if (opts.skipIfDescIncludes) {
    filtered = filtered.filter((m) => !String(field(m.text, 'desc') || '').includes(opts.skipIfDescIncludes));
  }
  if (opts.onlyIfParentIncludes) {
    filtered = filtered.filter((m) => {
      const window = src.slice(Math.max(0, m.start - 800), m.start);
      return window.includes(opts.onlyIfParentIncludes);
    });
  }

  let count = 0;
  for (const m of [...filtered].reverse()) {
    let next = m.text;
    if (fields.desc) next = upsertField(next, 'desc', fields.desc, false);
    if (fields.address) next = upsertField(next, 'address', fields.address, false);
    if (fields.latitude != null) next = upsertField(next, 'latitude', fields.latitude, true);
    if (fields.longitude != null) next = upsertField(next, 'longitude', fields.longitude, true);
    if (next !== m.text) {
      src = src.slice(0, m.start) + next + src.slice(m.end);
      count++;
    }
  }
  return { src, count, found: filtered.length };
}

function patchPerm(src) {
  const stats = {};
  const byName = Object.fromEntries(data.permPlaces.map((p) => [p.name, p]));

  const monastery = byName['Белогорский Свято-Николаевский монастырь'];
  let r = patchNamedObject(src, monastery.name, monastery, {
    requireSlug: 'perm-belogorskiy-monastyr',
  });
  src = r.src;
  stats.monastery = r.count;
  r = patchNamedObject(src, monastery.name, { desc: monastery.desc }, {});
  src = r.src;
  stats.monasteryAll = r.count;

  const cave = byName['Кунгурская ледяная пещера'];
  r = patchNamedObject(src, cave.name, cave, { requireSlug: 'perm-kungurskaya-ledyanaya-peshchera' });
  src = r.src;
  stats.cave = r.count;

  const stone = byName['Каменный город'];
  r = patchNamedObject(src, stone.name, stone, { requireSlug: 'perm-kamennyy-gorod' });
  src = r.src;
  stats.stone = r.count;

  const usva = byName['Усьвинские столбы'];
  r = patchNamedObject(src, usva.name, usva, { requireSlug: 'perm-usvinskie-stolby' });
  src = r.src;
  stats.usva = r.count;

  const pup = byName['Пуп Земли'];
  r = patchNamedObject(src, pup.name, pup, {
    skipIfDescIncludes: 'Хохловк',
  });
  src = r.src;
  stats.pup = r.count;

  const cross = byName['Царский крест'];
  r = patchNamedObject(src, cross.name, cross, {});
  src = r.src;
  stats.cross = r.count;

  const cup = byName['Cup by Cup'];
  r = patchNamedObject(src, cup.name, cup, { requireSlug: 'perm-cup-by-cup' });
  src = r.src;
  stats.cup = r.count;

  const nolan = byName['Nolan Wine & Kitchen'];
  r = patchNamedObject(src, nolan.name, nolan, { requireSlug: 'perm-nolan-wine-kitchen' });
  src = r.src;
  stats.nolan = r.count;

  return { src, stats };
}

function patchMskHelper(src) {
  const old = `const mskPresetStop = (
  name: string,
  route?: Pick<
    CityMustSeeItem,
    'dayRouteId' | 'latitude' | 'longitude' | 'venueSlug' | 'locationSlug'
  >,
): CityMustSeeItem => ({
  name,
  desc: 'Точка маршрута по Москве.',
  ...route
});`;
  const next = `const mskPresetStop = (
  name: string,
  route?: Pick<
    CityMustSeeItem,
    'dayRouteId' | 'latitude' | 'longitude' | 'venueSlug' | 'locationSlug' | 'address' | 'desc'
  >,
): CityMustSeeItem => ({
  name,
  desc: route?.desc || 'Точка маршрута по Москве.',
  ...route
});`;
  if (src.includes(old)) src = src.replace(old, next);
  return src;
}

function patchCoordsTs(src) {
  const updates = [
    ['perm-nolan-wine-kitchen', 58.012115, 56.238415],
    ['perm-cup-by-cup', 58.009415, 56.249415],
    ['perm-belogorskiy-monastyr', 57.392398, 56.229415],
    ['perm-kungurskaya-ledyanaya-peshchera', 57.440263, 57.006206],
    ['perm-usvinskie-stolby', 58.653457, 57.568472],
    ['perm-kamennyy-gorod', 58.723049, 57.633454],
  ];
  for (const [slug, lat, lng] of updates) {
    const re = new RegExp(
      `'${slug}': \\{ latitude: [\\d.]+, longitude: [\\d.]+ \\}`,
    );
    if (!re.test(src)) throw new Error(`coords slug missing: ${slug}`);
    src = src.replace(re, `'${slug}': { latitude: ${formatNum(lat)}, longitude: ${formatNum(lng)} }`);
  }
  return src;
}

function sqlEscape(s) {
  return String(s).replace(/'/g, "''");
}

function writeVenuePack() {
  const editorial = data.permPlaces.map((p) => ({
    slug: p.liveSlug,
    cityKey: 'perm',
    title: p.name,
    shortDescription: dash(p.desc),
    description: dash(p.desc),
    address: dash(p.address),
    latitude: p.latitude,
    longitude: p.longitude,
    note: p.note || undefined,
  }));
  fs.writeFileSync(EDITORIAL_JSON, `${JSON.stringify(editorial, null, 2)}\n`);

  const lines = [
    '-- Perm /locations card copy from owner editor table 2026-08-14.',
    '-- LocationCard reads Venue.shortDescription (DB). Do NOT apply to prod without owner request.',
    '-- Match slug+title so Kungur/Belaya Gora/Gubakha cluster rows are updated only if they still display the POI title.',
    '',
  ];
  for (const p of data.permPlaces) {
    lines.push(
      `UPDATE "Venue" SET`,
      `  "shortDescription" = '${sqlEscape(dash(p.desc))}',`,
      `  address = '${sqlEscape(dash(p.address))}',`,
      `  latitude = ${formatNum(p.latitude)},`,
      `  longitude = ${formatNum(p.longitude)},`,
      `  "updatedAt" = NOW()`,
      `WHERE slug = '${sqlEscape(p.liveSlug)}'`,
      `  AND title ILIKE '%${sqlEscape(p.name).replace(/%/g, '')}%';`,
      '',
    );
  }
  fs.writeFileSync(SQL_PATH, `${lines.join('\n')}\n`);
}

function countGenericMoscow(src) {
  const city = cityRange(src, 'moscow');
  const presets = presetsRange(city.block);
  return (presets.block.match(/Точка маршрута по Москве\./g) || []).length;
}

function countGenericSpbVo(src) {
  const start = src.indexOf("title: 'Васильевский остров'");
  const end = src.indexOf("title: 'Петроградская сторона'", start);
  const block = src.slice(start, end);
  return (block.match(/spbPresetStop\('(?:Академия художеств|Аптека доктора Пеля|Набережная Макарова|Брусницын|Зоологический музей РАН|Университетская набережная|Линии Васильевского острова|Эрарта|Севкабель Порт)'\)/g) || []).length;
}

const report = {
  files: [],
  perm: {},
  moscowMissingPreset: [],
  moscowMissingMustSee: [],
};

for (const file of CITYINFO_PATHS) {
  let src = fs.readFileSync(file, 'utf8');
  src = patchMskHelper(src);
  const msk = patchMoscow(src);
  src = msk.src;
  src = patchSpbPresets(src);
  const perm = patchPerm(src);
  src = perm.src;
  fs.writeFileSync(file, src);
  report.files.push({
    file: path.relative(rootDir, file),
    moscowPresets: msk.stats.presets,
    moscowMustSee: msk.stats.mustSee,
    moscowGenericLeft: countGenericMoscow(src),
    spbBareStopsLeft: countGenericSpbVo(src),
    perm: perm.stats,
  });
  report.moscowMissingPreset = msk.missingPreset;
  report.moscowMissingMustSee = msk.missingMust;
  report.perm = perm.stats;
}

const coordsSrc = fs.readFileSync(COORDS_TS, 'utf8');
fs.writeFileSync(COORDS_TS, patchCoordsTs(coordsSrc));
writeVenuePack();

console.log(JSON.stringify(report, null, 2));
console.log('wrote', path.relative(rootDir, EDITORIAL_JSON));
console.log('wrote', path.relative(rootDir, SQL_PATH));
