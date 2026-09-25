#!/usr/bin/env node
/**
 * Suggest / apply EventVenueRouteItem STOP links from start-venue geo proximity.
 *
 * Usage:
 *   node scripts/suggest-venue-route-links.js --city=perm --mode=dry-run
 *   node scripts/suggest-venue-route-links.js --city=perm --mode=apply --auto-high --limit=200
 *
 * Invariants:
 * - Never updates Event.venueId (start remains start).
 * - Only writes role=STOP (never START / NEARBY_HUB).
 * - Apply is merge-only (does not wipe existing STOP).
 * - Does not merge nearby into stopEvents (public contract unchanged).
 */
'use strict';

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { createRequire } = require('module');

const rootDir = path.resolve(__dirname, '..');
loadRootEnv(rootDir);

const geo = require('./lib/venue-route-geo');
const requireFromDbPackage = createRequire(path.join(rootDir, 'packages', 'db', 'package.json'));
const { Pool } = requireFromDbPackage('pg');

const args = parseArgs(process.argv.slice(2));
const mode = String(args.mode || 'dry-run').toLowerCase();
const citySlug = String(args.city || '').trim().toLowerCase();
const autoHigh = Boolean(args['auto-high'] || args.autoHigh);
const limit = Math.max(1, Math.min(5000, Number(args.limit) || 500));
const connectionString =
  process.env.DATABASE_URL || 'postgresql://daibilet:daibilet@127.0.0.1:5437/daibilet';

if (!citySlug) {
  console.error('Usage: --city=<slug> --mode=dry-run|apply [--auto-high] [--limit=N]');
  process.exit(1);
}
if (mode !== 'dry-run' && mode !== 'apply') {
  console.error(`Unknown mode: ${mode}`);
  process.exit(1);
}
if (mode === 'apply' && !autoHigh) {
  console.error('Apply without --auto-high refused: medium/low require manual approve (admin).');
  process.exit(1);
}

const pool = new Pool({ connectionString, max: 2 });

async function main() {
  const city = await resolveCity(citySlug);
  if (!city) throw new Error(`City not found: ${citySlug}`);

  const events = await loadCityEvents(city.id, limit);
  const venues = await loadCandidateVenues(city.id);
  const existingStops = await loadExistingStops(events.map((e) => e.id));

  const suggestions = [];
  const applyRows = [];
  let skippedExisting = 0;
  let skippedStart = 0;

  for (const event of events) {
    if (!geo.isValidCoordinatePair(event.startLat, event.startLng)) continue;

    const existingForEvent = existingStops.get(event.id) || new Set();
    const candidates = [];

    for (const venue of venues) {
      if (venue.id === event.venueId) {
        skippedStart += 1;
        continue;
      }
      if (existingForEvent.has(venue.id)) {
        skippedExisting += 1;
        continue;
      }
      if (!geo.isKindAllowed(venue.kind)) continue;
      if (venue.kind === 'ONLINE') continue;

      const dLat = Math.abs(venue.latitude - event.startLat);
      const dLng = Math.abs(venue.longitude - event.startLng);
      if (dLat > geo.BBOX_DEG || dLng > geo.BBOX_DEG) continue;

      const distanceMeters = geo.haversineMeters(
        event.startLat,
        event.startLng,
        venue.latitude,
        venue.longitude,
      );
      const confidence = geo.confidenceForDistance(distanceMeters);
      if (!confidence) continue;

      const sameCity = venue.cityId === city.id || venue.cityId === event.primaryCityId;
      candidates.push({
        eventId: event.id,
        eventSlug: event.slug,
        eventTitle: event.title,
        startVenueId: event.venueId,
        venueId: venue.id,
        venueSlug: venue.slug,
        venueTitle: venue.title,
        venueKind: venue.kind,
        distanceMeters: Math.round(distanceMeters * 10) / 10,
        confidence,
        sameCity,
        action: confidence === 'high' && sameCity ? 'auto-apply-ok' : 'suggest-only',
        rank: geo.rankScore({ distanceMeters, sameCity, kind: venue.kind }),
      });
    }

    candidates.sort((a, b) => b.rank - a.rank || a.distanceMeters - b.distanceMeters);
    const capped = candidates.slice(0, geo.MAX_CANDIDATES_PER_EVENT);
    suggestions.push(...capped);

    if (mode === 'apply' && autoHigh) {
      const auto = capped
        .filter((c) => c.confidence === 'high' && c.sameCity)
        .slice(0, geo.MAX_AUTO_APPLY_PER_EVENT);
      applyRows.push(...auto);
    }
  }

  const summary = {
    mode,
    city: { id: city.id, slug: city.slug, title: city.title },
    autoHigh,
    eventsScanned: events.length,
    candidateVenues: venues.length,
    suggestions: suggestions.length,
    byConfidence: countBy(suggestions, (s) => s.confidence),
    applyCandidates: applyRows.length,
    skippedExistingApprox: skippedExisting,
    skippedStartApprox: skippedStart,
    thresholds: {
      high: geo.SUGGEST_STOP_RADIUS_M,
      medium: geo.SUGGEST_NEARBY_RADIUS_M,
      soft: geo.SUGGEST_SOFT_RADIUS_M,
      bboxDeg: geo.BBOX_DEG,
    },
  };

  let applied = [];
  if (mode === 'apply') {
    applied = await mergeStopLinks(applyRows);
    summary.applied = applied.length;
  }

  const payload = {
    summary,
    sample: suggestions.slice(0, 40),
    applied: mode === 'apply' ? applied : undefined,
  };
  console.log(JSON.stringify(payload, null, 2));
}

const CITY_ALIASES = {
  perm: ['perm', 'permi', 'пермь'],
  moscow: ['moscow', 'moskva', 'москва', 'msk'],
  moskva: ['moscow', 'moskva', 'москва', 'msk'],
  'saint-petersburg': ['saint-petersburg', 'spb', 'petersburg', 'санкт-петербург', 'питер'],
  spb: ['saint-petersburg', 'spb', 'petersburg', 'санкт-петербург', 'питер'],
};

async function resolveCity(slug) {
  const aliases = CITY_ALIASES[slug] || [slug];
  const result = await pool.query(
    `
      select id, slug, title
      from "City"
      where lower(slug) = any($1::text[])
         or lower(coalesce("sourceTitle", '')) = any($1::text[])
         or lower(title) = any($1::text[])
      limit 1
    `,
    [aliases],
  );
  return result.rows[0] || null;
}

async function loadCityEvents(cityId, max) {
  const result = await pool.query(
    `
      select
        e.id,
        e.slug,
        e.title,
        e."venueId",
        e."primaryCityId",
        start_venue.latitude as "startLat",
        start_venue.longitude as "startLng"
      from "Event" e
      join "Venue" start_venue on start_venue.id = e."venueId"
      where e."primaryCityId" = $1
        and e.status not in ('HIDDEN', 'DRAFT')
        and start_venue.latitude is not null
        and start_venue.longitude is not null
        and start_venue.kind <> 'ONLINE'::"VenueKind"
      order by e.title
      limit $2
    `,
    [cityId, max],
  );
  return result.rows.map((row) => ({
    ...row,
    startLat: Number(row.startLat),
    startLng: Number(row.startLng),
  }));
}

async function loadCandidateVenues(cityId) {
  const kinds = [...geo.KIND_ALLOWLIST];
  const result = await pool.query(
    `
      select
        v.id,
        v.slug,
        v.title,
        v.kind::text as kind,
        v."cityId",
        v.latitude,
        v.longitude
      from "Venue" v
      where v."cityId" = $1
        and v."pageStatus" in ('PUBLISHED'::"VenuePageStatus", 'CANDIDATE'::"VenuePageStatus")
        and v.kind::text = any($2::text[])
        and v.latitude is not null
        and v.longitude is not null
    `,
    [cityId, kinds],
  );
  return result.rows
    .map((row) => ({
      ...row,
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
    }))
    .filter((row) => geo.isValidCoordinatePair(row.latitude, row.longitude));
}

async function loadExistingStops(eventIds) {
  const map = new Map();
  if (!eventIds.length) return map;
  const result = await pool.query(
    `
      select "eventId", "venueId"
      from "event_venue_route_items"
      where role = 'STOP'::"RouteItemRole"
        and "eventId" = any($1::text[])
    `,
    [eventIds],
  );
  for (const row of result.rows) {
    if (!map.has(row.eventId)) map.set(row.eventId, new Set());
    map.get(row.eventId).add(row.venueId);
  }
  return map;
}

/**
 * Merge-insert STOP links. Never touches Event.venueId. Never writes START/NEARBY_HUB.
 */
async function mergeStopLinks(rows) {
  const applied = [];
  const client = await pool.connect();
  try {
    await client.query('begin');
    for (const row of rows) {
      if (row.venueId === row.startVenueId) continue;
      const id = `evr_${crypto.randomBytes(10).toString('hex')}`;
      const result = await client.query(
        `
          insert into "event_venue_route_items"
            (id, "eventId", "venueId", role, "sortOrder", label, "createdAt", "updatedAt")
          values
            ($1, $2, $3, 'STOP'::"RouteItemRole", 100, null, now(), now())
          on conflict ("eventId", "venueId", role) do nothing
          returning id, "eventId", "venueId", role
        `,
        [id, row.eventId, row.venueId],
      );
      if (result.rows[0]) {
        applied.push({
          id: result.rows[0].id,
          eventId: row.eventId,
          venueId: row.venueId,
          distanceMeters: row.distanceMeters,
          confidence: row.confidence,
        });
      }
    }
    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
  return applied;
}

function countBy(items, keyFn) {
  const out = {};
  for (const item of items) {
    const key = keyFn(item);
    out[key] = (out[key] || 0) + 1;
  }
  return out;
}

function parseArgs(argv) {
  const out = {};
  for (const raw of argv) {
    if (!raw.startsWith('--')) continue;
    const eq = raw.indexOf('=');
    if (eq === -1) {
      out[raw.slice(2)] = true;
      continue;
    }
    out[raw.slice(2, eq)] = raw.slice(eq + 1);
  }
  return out;
}

function loadRootEnv(dir) {
  for (const name of ['.env', '.env.local', '.env.production']) {
    const file = path.join(dir, name);
    if (!fs.existsSync(file)) continue;
    const text = fs.readFileSync(file, 'utf8');
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq < 1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
