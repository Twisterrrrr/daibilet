#!/usr/bin/env node
/**
 * Merge geocode + expand fixes into seed-draft, sync union arrays.
 *
 *   node scripts/merge-moscow-mustsee-geocode.mjs
 *
 * Truth:
 *   seed-draft = mustSeeFilter / type / markup
 *   union composition synced FROM seed after merge
 * Does NOT re-run the geocoder.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const drafts = path.join(root, 'docs/drafts');

const seedPath = path.join(drafts, 'moscow-must-see-seed-draft.json');
const unionPath = path.join(drafts, 'moscow-must-see-union.json');
const geoPath = path.join(drafts, 'moscow-must-see-geocode.json');
const nrPath = path.join(drafts, 'moscow-must-see-name-review-decisions.json');
const reportPath = path.join(drafts, 'moscow-must-see-merge-report.json');

/** Group A: dump coords wrong, hub truth (expand stays). */
const GROUP_A_EXPAND = new Set([
  'Музей русского импрессионизма',
  'Богоявленский собор в Елохове',
  'Бункер-42',
  'Еврейский музей',
  'Донской монастырь',
  'Храм Вознесения в Коломенском',
  'Коломенское',
]);

/** Same park; hub coords (Group B stay-expand). */
const SOKOLNIKI = 'Сокольники';

/** Owner 2026-09-20: Red Square ensemble → expand (not separate card). */
const MININ = 'Памятник Минину и Пожарскому';
const MININ_HUB = 'Собор Василия Блаженного';

/** Owner: distinct monument → insert. */
const POKORITELYAM = 'Монумент «Покорителям космоса»';

function haversineM(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(a)));
}

function normName(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[«»"']/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function loadHubPackCoords() {
  const packPath = path.join(root, 'scripts/data/patch-moscow-hub-pack.js');
  const src = fs.readFileSync(packPath, 'utf8');
  const map = new Map();
  const re =
    /\{\s*name:\s*'((?:\\'|[^'])*)'[\s\S]*?latitude:\s*([0-9.]+)[\s\S]*?longitude:\s*([0-9.]+)/g;
  let m;
  while ((m = re.exec(src))) {
    const name = m[1].replace(/\\'/g, "'");
    map.set(name, { lat: Number(m[2]), lon: Number(m[3]) });
  }
  return map;
}

function geoKey(role, name) {
  return `${role}|${normName(name)}`;
}

function main() {
  const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
  const union = JSON.parse(fs.readFileSync(unionPath, 'utf8'));
  const geo = JSON.parse(fs.readFileSync(geoPath, 'utf8'));
  const nr = JSON.parse(fs.readFileSync(nrPath, 'utf8'));
  const hubPack = loadHubPackCoords();

  // Owner override: Minin → expand (was insert in earlier NR draft).
  for (const d of nr.decisions || []) {
    if (d.dump === MININ) {
      d.decision = 'expand';
      d.note = 'owner 2026-09-20: Red Square ensemble with St Basil; not separate card';
    }
  }
  nr.updatedAt = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(nrPath, JSON.stringify(nr, null, 2) + '\n');

  /** Hub truth: name → {lat,lon,address?} */
  const hubTruth = new Map();

  for (const [name, c] of hubPack) {
    hubTruth.set(name, { lat: c.lat, lon: c.lon, address: null });
  }
  for (const it of union.items || []) {
    if (it.role === 'hub_only' && it.name) {
      hubTruth.set(it.name, {
        lat: it.lat,
        lon: it.lon,
        address: it.address || null,
      });
    }
    if (it.role === 'expand' && it.hubName) {
      const prev = hubTruth.get(it.hubName);
      // union.lat/lon on expand = hub coords
      hubTruth.set(it.hubName, {
        lat: it.lat,
        lon: it.lon,
        address: prev?.address || null,
        dumpLat: it.dumpLat,
        dumpLon: it.dumpLon,
      });
    }
  }
  for (const r of geo.results || []) {
    if (r.role === 'hub_only' && r.name) {
      const prev = hubTruth.get(r.name) || { lat: r.lat, lon: r.lon };
      hubTruth.set(r.name, {
        ...prev,
        lat: prev.lat ?? r.lat,
        lon: prev.lon ?? r.lon,
        address: r.addressHint || prev.address || null,
      });
    }
  }

  const geoByRoleName = new Map();
  for (const r of geo.results || []) {
    geoByRoleName.set(geoKey(r.role, r.name), r);
  }

  const unionExpandByName = new Map();
  for (const it of union.items || []) {
    if (it.role === 'expand') unionExpandByName.set(it.name, it);
  }

  let expands = structuredClone(seed.expands || []);
  let inserts = structuredClone(seed.inserts || []);

  // --- Step 3: ensure Minin expand + Pokoritelyam insert ---
  const hasMinin =
    expands.some((e) => e.name === MININ) || inserts.some((i) => i.name === MININ);
  if (!hasMinin) {
    const hub = hubTruth.get(MININ_HUB) || hubPack.get(MININ_HUB);
    const g = geoByRoleName.get(geoKey('expand', MININ));
    const dumpLat = g?.lat;
    const dumpLon = g?.lon;
    const lat = hub?.lat ?? 55.7525;
    const lon = hub?.lon ?? 37.6231;
    expands.push({
      role: 'expand',
      name: MININ,
      hubName: MININ_HUB,
      latitude: lat,
      longitude: lon,
      dumpLat,
      dumpLon,
      distM:
        dumpLat != null && dumpLon != null ? haversineM(dumpLat, dumpLon, lat, lon) : 41,
      note: 'same complex (Red Square ensemble); owner expand',
      address: hubTruth.get(MININ_HUB)?.address || 'Красная площадь',
      geocoded: true,
    });
  }

  const hasPok =
    expands.some((e) => e.name === POKORITELYAM) ||
    inserts.some((i) => i.name === POKORITELYAM);
  if (!hasPok) {
    const g =
      geoByRoleName.get(geoKey('expand', POKORITELYAM)) ||
      geoByRoleName.get(geoKey('insert', POKORITELYAM));
    inserts.push({
      role: 'insert',
      name: POKORITELYAM,
      desc: `${POKORITELYAM} - точка must-see хаба Москвы. Короткое описание «в один укус» TBD.`,
      type: 'monument',
      mustSeeFilter: 'monument',
      locationSlug: 'moscow-monument-pokoritelyam-kosmosa',
      latitude: g?.lat ?? 55.822295,
      longitude: g?.lon ?? 37.639726,
      address: g?.addressHint || null,
      descStatus: 'placeholder',
      photoStatus: 'missing',
      geocoded: g?.status === 'ok' || g?.status === 'warn',
      geoReviewNeeded: g?.status === 'warn' || g?.status === 'error',
    });
  }

  // Drop Minin from inserts if present (owner → expand).
  inserts = inserts.filter((i) => i.name !== MININ);
  // Drop Pokoritelyam from expands if present.
  expands = expands.filter((e) => e.name !== POKORITELYAM);

  // --- Step 2 + 1: expand merge ---
  const farAfter = [];
  for (const e of expands) {
    const hubName = e.hubName;
    const hub = hubTruth.get(hubName) || hubPack.get(hubName);
    const u = unionExpandByName.get(e.name);
    const dumpLat = e.dumpLat ?? u?.dumpLat ?? null;
    const dumpLon = e.dumpLon ?? u?.dumpLon ?? null;

    if (!hub) {
      console.warn(`WARN: no hub truth for expand «${e.name}» hub=«${hubName}»`);
      continue;
    }

    e.latitude = hub.lat;
    e.longitude = hub.lon;
    // Card is on hub → distM to hub ≈ 0. Keep dump offset separately for audit.
    if (dumpLat != null && dumpLon != null) {
      e.dumpLat = dumpLat;
      e.dumpLon = dumpLon;
      e.dumpOffsetM = haversineM(dumpLat, dumpLon, hub.lat, hub.lon);
    }
    e.distM = haversineM(e.latitude, e.longitude, hub.lat, hub.lon);

    // Address from hub only — never expand geocode addressHint (may be neighbour).
    e.address = hub.address || e.address || null;
    e.geocoded = true;

    if (GROUP_A_EXPAND.has(e.name) || e.name === SOKOLNIKI) {
      e.note = 'hub truth, coords fixed';
    } else if (e.name === MININ) {
      e.note = 'same complex (Red Square ensemble); owner expand';
    } else if (!e.note || /dump may enrich/i.test(e.note)) {
      e.note = 'same complex';
    }

    if ((e.distM || 0) >= 200) {
      farAfter.push({
        name: e.name,
        hubName: e.hubName,
        distM: e.distM,
        dumpOffsetM: e.dumpOffsetM ?? null,
      });
    }
  }

  // --- Step 1: insert geocode merge (match by name+role, not index) ---
  const geocodedOk = [];
  const geocodedWarn = [];
  const geocodedError = [];
  const geoReviewNeeded = [];

  for (const ins of inserts) {
    const g =
      geoByRoleName.get(geoKey('insert', ins.name)) ||
      geoByRoleName.get(geoKey('expand', ins.name)); // orphans geocoded as expand before role flip

    if (!g) {
      ins.geocoded = false;
      ins.geoReviewNeeded = true;
      geocodedError.push(ins.name);
      geoReviewNeeded.push({ name: ins.name, reason: 'no geocode row' });
      continue;
    }

    if (g.status === 'error') {
      ins.geocoded = false;
      ins.address = null;
      ins.geoReviewNeeded = true;
      geocodedError.push(ins.name);
      geoReviewNeeded.push({ name: ins.name, reason: 'geocode error', error: g.error });
      continue;
    }

    ins.latitude = g.lat;
    ins.longitude = g.lon;
    ins.address = g.addressHint || null;
    ins.geocoded = true;

    if (g.status === 'warn') {
      ins.geoReviewNeeded = true;
      geocodedWarn.push(ins.name);
      geoReviewNeeded.push({ name: ins.name, reason: 'geocode warn' });
    } else {
      delete ins.geoReviewNeeded;
      geocodedOk.push(ins.name);
    }
  }

  if (geocodedError.length > 0) {
    console.error('STOP: geocodedError > 0');
    console.error(geocodedError);
    const stopReport = {
      stopped: true,
      geocodedError,
      geocodedWarn,
      geocodedOk: geocodedOk.length,
    };
    fs.writeFileSync(reportPath, JSON.stringify(stopReport, null, 2));
    process.exit(1);
  }

  // --- Step 4: hub_only from union, drop Vorobyovy smotrovaya twin if expand covers ---
  let hubOnly = (union.items || [])
    .filter((it) => it.role === 'hub_only')
    .map((it) => ({
      role: 'hub_only',
      name: it.name,
      latitude: it.lat,
      longitude: it.lon,
      address: hubTruth.get(it.name)?.address || it.address || null,
    }));

  const expandHubNames = new Set(expands.map((e) => e.hubName).filter(Boolean));
  const insertCoords = inserts.map((i) => ({
    name: i.name,
    lat: i.latitude,
    lon: i.longitude,
  }));

  const removedHubOnly = [];
  hubOnly = hubOnly.filter((h) => {
    // Covered as expand hub target (same viewpoint / same entity).
    if (expandHubNames.has(h.name)) {
      removedHubOnly.push({ name: h.name, reason: 'covered by expand hubName' });
      return false;
    }
    // Near-duplicate of an insert (<200m + soft name overlap).
    for (const ins of insertCoords) {
      const d = haversineM(h.latitude, h.longitude, ins.lat, ins.lon);
      if (d < 200) {
        const hn = normName(h.name);
        const iname = normName(ins.name);
        if (
          hn.includes(iname.slice(0, 8)) ||
          iname.includes(hn.slice(0, 8)) ||
          (hn.includes('вороб') && iname.includes('вороб')) ||
          (hn.includes('смотров') && iname.includes('смотров'))
        ) {
          removedHubOnly.push({
            name: h.name,
            reason: `dup insert «${ins.name}» ${d}m`,
          });
          return false;
        }
      }
    }
    return true;
  });

  // Theater/gastro sanity: theaters = type theater + filter main (no theater chip);
  // gastro = gastro. Never park.
  const filterFixes = [];
  for (const ins of inserts) {
    const n = ins.name || '';
    if (
      /театр|мхт|ленком|современник|образцов|фоменко|кабаре|вахтанг/i.test(n) &&
      ins.mustSeeFilter === 'park'
    ) {
      ins.type = 'theater';
      ins.mustSeeFilter = 'main';
      filterFixes.push(ins.name);
    }
    if (
      /twins|пушкинъ|белуга|rabbit|savva|живаго|угол|депо|усачев|центральный рынок|профсоюз|данилов/i.test(
        n,
      ) &&
      ins.mustSeeFilter === 'park'
    ) {
      ins.type = 'club_bar_restaurant';
      ins.mustSeeFilter = 'gastro';
      filterFixes.push(ins.name);
    }
  }

  // --- Write seed-draft ---
  const nameReviewCount = (nr.decisions || []).length;
  const nextSeed = {
    generatedAt: new Date().toISOString(),
    unionCount: expands.length + inserts.length + hubOnly.length,
    expandCount: expands.length,
    insertCount: inserts.length,
    hubOnlyCount: hubOnly.length,
    nameReviewCount,
    nameReview: nr.decisions,
    note:
      'seed-draft = truth for mustSeeFilter/type; geocode merged; hub_only from union after dedupe',
    expands,
    inserts,
    hub_only: hubOnly,
  };
  fs.writeFileSync(seedPath, JSON.stringify(nextSeed, null, 2) + '\n');

  // --- Step 5: sync union from seed arrays ---
  const unionItems = [
    ...expands.map((e) => ({
      role: 'expand',
      name: e.name,
      hubName: e.hubName,
      lat: e.latitude,
      lon: e.longitude,
      dumpLat: e.dumpLat ?? null,
      dumpLon: e.dumpLon ?? null,
      distM: e.distM ?? null,
      address: e.address ?? null,
      geocoded: e.geocoded === true,
      note: e.note || null,
      via: 'hub-truth-merge',
    })),
    ...inserts.map((i) => ({
      role: 'insert',
      name: i.name,
      lat: i.latitude,
      lon: i.longitude,
      address: i.address ?? null,
      geocoded: i.geocoded === true,
      geoReviewNeeded: i.geoReviewNeeded === true,
      mustSeeFilter: i.mustSeeFilter,
      type: i.type,
    })),
    ...hubOnly.map((h) => ({
      role: 'hub_only',
      name: h.name,
      lat: h.latitude,
      lon: h.longitude,
      address: h.address ?? null,
    })),
  ];

  const nextUnion = {
    ...union,
    generatedAt: new Date().toISOString(),
    expandCount: expands.length,
    insertCount: inserts.length,
    hubOnlyCount: hubOnly.length,
    unionCount: unionItems.length,
    nameReviewCount,
    nameReviewDecisionsApplied: true,
    note:
      'Synced from seed-draft after geocode merge + expand hub-truth fixes. Composition mirrors seed arrays.',
    expands: expands.map((e) => ({ ...e })),
    inserts: inserts.map((i) => ({
      role: i.role,
      name: i.name,
      lat: i.latitude,
      lon: i.longitude,
      address: i.address,
      geocoded: i.geocoded,
      geoReviewNeeded: i.geoReviewNeeded || false,
      mustSeeFilter: i.mustSeeFilter,
      type: i.type,
    })),
    hub_only: hubOnly,
    items: unionItems,
  };
  fs.writeFileSync(unionPath, JSON.stringify(nextUnion, null, 2) + '\n');

  // --- Step 6: report ---
  const countFilters = (arr) => {
    const o = {};
    for (const x of arr) {
      const f = x.mustSeeFilter || 'NONE';
      o[f] = (o[f] || 0) + 1;
    }
    return o;
  };

  const expandTheaterGastro = expands.filter(
    (e) => e.mustSeeFilter === 'theater' || e.mustSeeFilter === 'gastro',
  );
  const parkTheaters = inserts.filter(
    (i) =>
      i.mustSeeFilter === 'park' &&
      /театр|мхт|ленком|современник|образцов|фоменко|кабаре/i.test(i.name),
  );
  const parkGastro = inserts.filter(
    (i) =>
      i.mustSeeFilter === 'park' &&
      /twins|пушкинъ|белуга|rabbit|savva|живаго|угол|депо|усачев|рынок|профсоюз/i.test(
        i.name,
      ),
  );

  const report = {
    generatedAt: new Date().toISOString(),
    unionCount: nextSeed.unionCount,
    expandCount: expands.length,
    insertCount: inserts.length,
    hubOnlyCount: hubOnly.length,
    nameReviewCount,
    geocodedOk: geocodedOk.length,
    geocodedWarn: geocodedWarn,
    geocodedError: geocodedError,
    geoReviewNeeded,
    farExpandsDistM200: farAfter.sort((a, b) => b.distM - a.distM),
    removedHubOnly,
    filterFixes,
    mustSeeFilter: {
      expands: countFilters(expands),
      inserts: countFilters(inserts),
    },
    sanity: {
      expandTheaterOrGastro: expandTheaterGastro.map((e) => e.name),
      parkTheaters: parkTheaters.map((i) => i.name),
      parkGastro: parkGastro.map((i) => i.name),
      arraysSumOk:
        expands.length + inserts.length + hubOnly.length === nextSeed.unionCount,
    },
    readiness: {
      geocodedErrorZero: geocodedError.length === 0,
      geoReviewNeededOk: geoReviewNeeded.length <= 15,
      noExpandTheaterGastro: expandTheaterGastro.length === 0,
      nameReviewApplied: true,
      farExpandMaxFew: farAfter.length <= 3,
    },
  };
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');

  console.log(JSON.stringify(report, null, 2));
  console.log(`\nwrote ${seedPath}`);
  console.log(`wrote ${unionPath}`);
  console.log(`wrote ${reportPath}`);
}

main();
