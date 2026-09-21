/**
 * Union dump190 + hub mustSee(58) → expand / insert / hub_only.
 * Suburbs (significantSuburbs) excluded from the ~200 in-city count.
 *
 * Usage: node docs/drafts/_diff-moscow-mustsee.mjs
 * Writes: moscow-dump-minus-hub.json, moscow-must-see-union.json
 */
import fs from 'fs';

const COORD_DUP_M = 50;
/** Expand via coords only below this; beyond = insert unless name_review says expand. */
const AUTO_EXPAND_M = 50;
/** Soft flag for editorial: expand with hub coords if name_review says so, even if far. */
const EXPAND_DIST_WARN_M = 200;

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

const decisionsPath = 'docs/drafts/moscow-must-see-name-review-decisions.json';
const decisionsByDump = new Map();
if (fs.existsSync(decisionsPath)) {
  const dec = JSON.parse(fs.readFileSync(decisionsPath, 'utf8'));
  for (const row of dec.decisions || []) {
    decisionsByDump.set(norm(row.dump), {
      decision: row.decision,
      hubName: row.hub,
      note: row.note || '',
    });
  }
}

/** Hub twins at same coords (e.g. Воробьевы горы + Смотровая). */
function markHubUsed(idx, usedHub) {
  if (idx < 0) return;
  usedHub.add(idx);
  const anchor = hub[idx];
  hub.forEach((h, i) => {
    if (i === idx) return;
    if (haversine(anchor, h) < COORD_DUP_M) usedHub.add(i);
  });
}

const expand = [];
const insert = [];
const nameReview = [];
const usedHub = new Set();

function findHubIndexByName(hubName) {
  const n = norm(hubName);
  return hub.findIndex((h) => {
    const hn = norm(h.name);
    return hn === n || hn.includes(n.slice(0, 14)) || n.includes(hn.slice(0, 14));
  });
}

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
  const manual = decisionsByDump.get(norm(d.name));

  // Manual insert wins even when coords <50m (distinct POI next to hub card).
  if (manual?.decision === 'insert') {
    insert.push({
      role: 'insert',
      name: d.name,
      lat: d.lat,
      lon: d.lon,
      nearestHub: manual.hubName || best?.name || '',
      distM: Math.round(bestDist),
      via: 'name_review',
      note: manual.note || '',
    });
    continue;
  }

  if (manual?.decision === 'expand') {
    const hubIdx = findHubIndexByName(manual.hubName);
    if (hubIdx < 0) {
      console.error('decision expand hub not found:', manual.hubName, 'for', d.name);
      process.exit(1);
    }
    markHubUsed(hubIdx, usedHub);
    const distHub = Math.round(haversine(d, hub[hubIdx]));
    expand.push({
      role: 'expand',
      name: d.name,
      hubName: hub[hubIdx].name,
      lat: hub[hubIdx].lat,
      lon: hub[hubIdx].lon,
      dumpLat: d.lat,
      dumpLon: d.lon,
      distM: distHub,
      via: 'name_review',
      distWarn: distHub >= EXPAND_DIST_WARN_M,
      note: manual.note || '',
    });
    continue;
  }

  if (bestDist < AUTO_EXPAND_M) {
    markHubUsed(bestIdx, usedHub);
    expand.push({
      role: 'expand',
      name: d.name,
      hubName: hub[bestIdx].name,
      lat: hub[bestIdx].lat,
      lon: hub[bestIdx].lon,
      dumpLat: d.lat,
      dumpLon: d.lon,
      distM: Math.round(bestDist),
      via: 'coords',
    });
  } else {
    insert.push({
      role: 'insert',
      name: d.name,
      lat: d.lat,
      lon: d.lon,
      nearestHub: best?.name || '',
      distM: Math.round(bestDist),
      via: 'coords',
    });
    if (nameHit >= 0) {
      nameReview.push({
        role: 'name_review',
        name: d.name,
        hubName: hub[nameHit].name,
        lat: d.lat,
        lon: d.lon,
        distM: Math.round(bestDist),
        note: 'Same-ish name, >50m - decide expand vs insert manually; hub is source of truth',
      });
    }
  }
}

const hubOnlyRaw = hub
  .filter((_, i) => !usedHub.has(i))
  .map((h) => ({
    role: 'hub_only',
    name: h.name,
    lat: h.lat,
    lon: h.lon,
  }));

/** Collapse hub_only twins at same coords (keep first name). */
const hubOnly = [];
const droppedHubOnlyDupes = [];
for (const item of hubOnlyRaw) {
  const hit = hubOnly.find((x) => haversine(item, x) < COORD_DUP_M);
  if (hit) {
    droppedHubOnlyDupes.push({ keep: hit.name, drop: item.name });
  } else {
    hubOnly.push(item);
  }
}

/** Intra-dump coords dedupe among inserts (<50 m keep first). */
const insertDeduped = [];
const droppedDumpDupes = [];
for (const item of insert) {
  const hit = insertDeduped.find((x) => haversine(item, x) < COORD_DUP_M);
  if (hit) {
    droppedDumpDupes.push({
      keep: hit.name,
      drop: item.name,
      distM: Math.round(haversine(item, hit)),
    });
  } else {
    insertDeduped.push(item);
  }
}

/** Drop inserts that land on remaining hub_only / expand hub coords. */
const expandAnchors = expand.map((e) => ({ lat: e.lat, lon: e.lon, name: e.hubName }));
const insertFinal = [];
const droppedVsHub = [];
for (const item of insertDeduped) {
  const vsExpand = expandAnchors.find((x) => haversine(item, x) < COORD_DUP_M);
  const vsHubOnly = hubOnly.find((x) => haversine(item, x) < COORD_DUP_M);
  if (vsExpand || vsHubOnly) {
    droppedVsHub.push({
      drop: item.name,
      keep: vsExpand?.name || vsHubOnly?.name,
      distM: Math.round(haversine(item, vsExpand || vsHubOnly)),
    });
  } else {
    insertFinal.push(item);
  }
}

const union = [...expand, ...insertFinal, ...hubOnly];
const expandFar = expand.filter((e) => (e.distM || 0) >= EXPAND_DIST_WARN_M);

const summary = {
  generatedAt: new Date().toISOString().slice(0, 10),
  coordDupM: COORD_DUP_M,
  hubMustSeeCount: hub.length,
  dumpCount: dump.length,
  expandCount: expand.length,
  expandFarCount: expandFar.length,
  insertCount: insertFinal.length,
  insertDroppedIntraDump: droppedDumpDupes.length,
  insertDroppedVsHub: droppedVsHub.length,
  hubOnlyCount: hubOnly.length,
  hubOnlyDroppedDupes: droppedHubOnlyDupes.length,
  nameReviewCount: nameReview.length,
  nameReviewDecisionsApplied: decisionsByDump.size,
  unionCount: union.length,
  note:
    'In-city only (mustSee). Dedup key = coords <50m; name_review insert wins over coords; expand uses hub lat/lng. Suburbs excluded. Do not force count to 200.',
};

const dumpMinus = {
  ...summary,
  hubOnly: hubOnly.map((h) => h.name),
  expandFar: expandFar.map((e) => ({
    name: e.name,
    hubName: e.hubName,
    distM: e.distM,
    via: e.via,
  })),
  expandSample: expand.slice(0, 15),
  nameReview,
  insertAll: insertFinal,
  droppedDumpDupes,
  droppedVsHub,
  droppedHubOnlyDupes,
};

fs.writeFileSync(
  'docs/drafts/moscow-dump-minus-hub.json',
  JSON.stringify(dumpMinus, null, 2),
);

fs.writeFileSync(
  'docs/drafts/moscow-must-see-union.json',
  JSON.stringify({ ...summary, items: union }, null, 2),
);

console.log(
  JSON.stringify(
    {
      ...summary,
      hubOnly: hubOnly.map((h) => h.name),
      expandFar: expandFar.map((e) => `${e.name}→${e.hubName} ${e.distM}m`),
    },
    null,
    2,
  ),
);
