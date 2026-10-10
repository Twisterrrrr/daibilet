#!/usr/bin/env node
/**
 * Reverse-geocode moscow-must-see-union.json via Nominatim (no model guesses).
 * Prefer Yandex/DaData when keys exist: YANDEX_GEOCODER_KEY or DADATA_API_KEY(+DADATA_SECRET).
 *
 *   node scripts/geocode-moscow-mustsee-union.mjs
 *   node scripts/geocode-moscow-mustsee-union.mjs --limit=20
 *
 * Writes: docs/drafts/moscow-must-see-geocode.json
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const unionPath = path.join(root, 'docs/drafts/moscow-must-see-union.json');
const outPath = path.join(root, 'docs/drafts/moscow-must-see-geocode.json');

const limitArg = process.argv.find((a) => a.startsWith('--limit='));
const LIMIT = limitArg ? Number(limitArg.split('=')[1]) : Infinity;

const YANDEX_KEY = process.env.YANDEX_GEOCODER_KEY || process.env.YANDEX_MAPS_API_KEY || '';
const DADATA_KEY = process.env.DADATA_API_KEY || '';
const DADATA_SECRET = process.env.DADATA_SECRET || '';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function inMoscowBBox(lat, lon) {
  return lat >= 55.49 && lat <= 56.05 && lon >= 37.25 && lon <= 37.95;
}

async function reverseNominatim(lat, lon) {
  const url =
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}` +
    `&accept-language=ru&addressdetails=1`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'daibilet-moscow-mustsee-geocode/1.0 (ops@daibilet.ru)',
    },
  });
  if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`);
  const j = await res.json();
  const a = j.address || {};
  const city = a.city || a.town || a.village || a.municipality || a.state || '';
  const road = a.road || a.pedestrian || a.square || a.suburb || '';
  const house = a.house_number || '';
  return {
    provider: 'nominatim',
    displayName: j.display_name || '',
    city,
    road,
    house,
    addressHint: [road, house].filter(Boolean).join(', '),
    rawClass: j.class || '',
    rawType: j.type || '',
  };
}

async function reverseYandex(lat, lon) {
  const url =
    `https://geocode-maps.yandex.ru/1.x/?apikey=${encodeURIComponent(YANDEX_KEY)}` +
    `&geocode=${lon},${lat}&format=json&lang=ru_RU&results=1`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Yandex HTTP ${res.status}`);
  const j = await res.json();
  const member = j?.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject;
  if (!member) return { provider: 'yandex', displayName: '', city: '', addressHint: '' };
  const meta = member.metaDataProperty?.GeocoderMetaData;
  const comps = meta?.Address?.Components || [];
  const find = (k) => comps.find((c) => c.kind === k)?.name || '';
  return {
    provider: 'yandex',
    displayName: member.name || meta?.text || '',
    city: find('locality') || find('province'),
    addressHint: meta?.text || '',
    precision: meta?.precision || '',
  };
}

async function reverseDaData(lat, lon) {
  const res = await fetch('https://suggestions.dadata.ru/suggestions/api/4_1/rs/geolocate/address', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Token ${DADATA_KEY}`,
      ...(DADATA_SECRET ? { 'X-Secret': DADATA_SECRET } : {}),
    },
    body: JSON.stringify({ lat, lon, count: 1, radius_meters: 100 }),
  });
  if (!res.ok) throw new Error(`DaData HTTP ${res.status}`);
  const j = await res.json();
  const s = j.suggestions?.[0];
  const d = s?.data || {};
  return {
    provider: 'dadata',
    displayName: s?.value || '',
    city: d.city || d.settlement || '',
    addressHint: s?.unrestricted_value || s?.value || '',
    qc_geo: d.qc_geo,
  };
}

async function reverse(lat, lon) {
  if (DADATA_KEY) return reverseDaData(lat, lon);
  if (YANDEX_KEY) return reverseYandex(lat, lon);
  return reverseNominatim(lat, lon);
}

function providerDelayMs() {
  if (DADATA_KEY || YANDEX_KEY) return 120;
  return 1100; // Nominatim fair use
}

async function main() {
  const union = JSON.parse(fs.readFileSync(unionPath, 'utf8'));
  const items = (union.items || []).slice(0, LIMIT);
  const provider = DADATA_KEY ? 'dadata' : YANDEX_KEY ? 'yandex' : 'nominatim';
  console.log(`geocode ${items.length}/${union.items.length} via ${provider}`);

  const results = [];
  let ok = 0;
  let warn = 0;
  let fail = 0;

  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const row = {
      role: it.role,
      name: it.name,
      hubName: it.hubName || null,
      lat: it.lat,
      lon: it.lon,
      bboxOk: inMoscowBBox(it.lat, it.lon),
    };
    try {
      const geo = await reverse(it.lat, it.lon);
      Object.assign(row, geo);
      const cityL = String(row.city || '').toLowerCase();
      row.moscowHint =
        /москв|moscow|зеленоград/.test(cityL) ||
        /москва|moscow/i.test(String(row.displayName || '')) ||
        /москва|moscow/i.test(String(row.addressHint || ''));
      if (!row.bboxOk || row.moscowHint === false) {
        row.status = 'warn';
        warn++;
      } else {
        row.status = 'ok';
        ok++;
      }
    } catch (e) {
      row.status = 'error';
      row.error = String(e.message || e);
      fail++;
    }
    results.push(row);
    if ((i + 1) % 10 === 0 || i === items.length - 1) {
      console.log(`… ${i + 1}/${items.length} ok=${ok} warn=${warn} fail=${fail}`);
    }
    await sleep(providerDelayMs());
  }

  const out = {
    generatedAt: new Date().toISOString(),
    provider,
    total: results.length,
    ok,
    warn,
    fail,
    results,
  };
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(`wrote ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
