/**
 * Union dump190 + hub mustSee(58) → expand / insert / hub_only.
 * Suburbs (significantSuburbs) excluded from the ~200 in-city count.
 *
 * Usage: node docs/drafts/_diff-moscow-mustsee.mjs
 * Writes: moscow-dump-minus-hub.json, moscow-must-see-union.json
 */
import fs from 'fs';

const COORD_DUP_M = 50;

const hubSrc = fs.readFileSync('scripts/data/patch-moscow-hub-pack.js', 'utf8');
const mustSeeBlock = hubSrc.match(/mustSee:\s*\[([\s\S]*?)\],\s*\n\s*significantSuburbs/);
if (!mustSeeBlock) {
  console.error('Could not find mustSee […] before significantSuburbs');
  process.exit(1);
}

const hub = [];
const re =
  /\{\s*name:\s*'((?:\\'|[^'])+)'[\s\S]*?latitude:\s*([0-9.]+)[\s\S]*?longitude:\s*([0-9.]+)/g;
let m;
while ((m = re.exec(mustSeeBlock[1]))) {
  hub.push({
    name: m[1].replace(/\\'/g, "'"),
    lat: +m[2],
    lon: +m[3],
  });
}

const dumpSrc = fs.readFileSync('docs/drafts/moscow-must-see-201-edited.md', 'utf8');
const dump = [];
for (const line of dumpSrc.split(/\n/)) {
  const mm = line.match(
    /^\d+\.\s+(.+?)\s+\|\s+.+?\s+\|\s+([0-9.]+),\s*([0-9.]+)\s*$/,
  );
  if (mm) {
    dump.push({
      name: mm[1].replace(/\s*\*.*$/, '').trim(),
      lat: +mm[2],
      lon: +mm[3],
    });
  }
}

function haversine(a, b) {
  const R = 6371000;
  const toR = (d) => (d * Math.PI) / 180;
  const dLat = toR(b.lat - a.lat);
  const dLon = toR(b.lon - a.lon);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

function norm(s) {
  return s
    .toLowerCase()
    .replace(/[«»"']/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const expand = [];
const insert = [];
const usedHub = new Set();

for (const d of dump) {
  let best = null;
  let bestDist = 1e9;
  let bestIdx = -1;
  hub.forEach((h, i) => {
    const dist = haversine(d, h);
    if (dist < bestDist) {
      bestDist = dist;
      best = h;
      bestIdx = i;
    }
  });
  const nameHit = hub.findIndex((h) => {
    const hn = norm(h.name);
    const dn = norm(d.name);
    return hn.includes(dn.slice(0, 14)) || dn.includes(hn.slice(0, 14));
  });
  if (bestDist < COORD_DUP_M || nameHit >= 0) {
    const hi = bestDist < COORD_DUP_M ? bestIdx : nameHit;
    usedHub.add(hi);
    expand.push({
      role: 'expand',
      name: d.name,
      hubName: hub[hi].name,
      lat: d.lat,
      lon: d.lon,
      distM: Math.round(bestDist),
      via: bestDist < COORD_DUP_M ? 'coords' : 'name',
    });
  } else {
    insert.push({
      role: 'insert',
      name: d.name,
      lat: d.lat,
      lon: d.lon,
      nearestHub: best?.name || '',
      distM: Math.round(bestDist),
    });
  }
}

const hubOnly = hub
  .filter((_, i) => !usedHub.has(i))
  .map((h) => ({
    role: 'hub_only',
    name: h.name,
    lat: h.lat,
    lon: h.lon,
  }));

/** Intra-dump coords dedupe among inserts (<50 m keep first). */
const insertDeduped = [];
const droppedDumpDupes = [];
for (const item of insert) {
  const hit = insertDeduped.find((x) => haversine(item, x) < COORD_DUP_M);
  if (hit) {
    droppedDumpDupes.push({ keep: hit.name, drop: item.name, distM: Math.round(haversine(item, hit)) });
  } else {
    insertDeduped.push(item);
  }
}

const union = [...expand, ...insertDeduped, ...hubOnly];

const summary = {
  generatedAt: new Date().toISOString().slice(0, 10),
  coordDupM: COORD_DUP_M,
  hubMustSeeCount: hub.length,
  dumpCount: dump.length,
  expandCount: expand.length,
  insertCount: insertDeduped.length,
  insertDroppedIntraDump: droppedDumpDupes.length,
  hubOnlyCount: hubOnly.length,
  unionCount: union.length,
  note:
    'In-city only (mustSee). Suburbs excluded. Target ~200 after editorial trim. ABCD superseded.',
};

const dumpMinus = {
  ...summary,
  hubOnly: hubOnly.map((h) => h.name),
  expandSample: expand.slice(0, 15),
  insertAll: insertDeduped,
  droppedDumpDupes,
};

fs.writeFileSync(
  'docs/drafts/moscow-dump-minus-hub.json',
  JSON.stringify(dumpMinus, null, 2),
);

fs.writeFileSync(
  'docs/drafts/moscow-must-see-union.json',
  JSON.stringify({ ...summary, items: union }, null, 2),
);

console.log(JSON.stringify({ ...summary, hubOnly: hubOnly.map((h) => h.name) }, null, 2));
