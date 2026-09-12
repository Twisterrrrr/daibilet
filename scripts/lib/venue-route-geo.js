/**
 * Shared geo helpers for venue↔event route autolink (haversine, confidence, kind allowlist).
 * CommonJS so CLI scripts can require() without a build step.
 */

'use strict';

const SUGGEST_STOP_RADIUS_M = Number(process.env.SUGGEST_STOP_RADIUS_M || 150);
const SUGGEST_NEARBY_RADIUS_M = Number(process.env.SUGGEST_NEARBY_RADIUS_M || 300);
const SUGGEST_SOFT_RADIUS_M = Number(process.env.SUGGEST_SOFT_RADIUS_M || 500);
const BBOX_DEG = Number(process.env.SUGGEST_BBOX_DEG || 0.008);
const MAX_CANDIDATES_PER_EVENT = Number(process.env.MAX_CANDIDATES_PER_EVENT || 20);
const MAX_AUTO_APPLY_PER_EVENT = Number(process.env.MAX_AUTO_APPLY_PER_EVENT || 5);

/** Prefer content places for STOP suggestions. */
const KIND_ALLOWLIST = new Set([
  'MONUMENT',
  'PARK',
  'ATTRACTION',
  'MUSEUM_ART_SPACE',
  'OUTDOOR_LOCATION',
  'MEETING_POINT',
  'PIER',
  'VENUE',
]);

const KIND_SCORE = {
  MONUMENT: 5,
  PARK: 5,
  ATTRACTION: 5,
  OUTDOOR_LOCATION: 4,
  MUSEUM_ART_SPACE: 3,
  PIER: 3,
  MEETING_POINT: 2,
  VENUE: 2,
  OTHER: 1,
};

function haversineMeters(lat1, lon1, lat2, lon2) {
  const toRad = (degrees) => (Number(degrees) * Math.PI) / 180;
  const earthRadiusMeters = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * earthRadiusMeters * Math.asin(Math.min(1, Math.sqrt(a)));
}

function isValidCoordinatePair(latitude, longitude) {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180
  );
}

/**
 * @param {number} distanceMeters
 * @returns {'high'|'medium'|'low'|null}
 */
function confidenceForDistance(distanceMeters) {
  const d = Number(distanceMeters);
  if (!Number.isFinite(d) || d < 0) return null;
  if (d <= SUGGEST_STOP_RADIUS_M) return 'high';
  if (d <= SUGGEST_NEARBY_RADIUS_M) return 'medium';
  if (d <= SUGGEST_SOFT_RADIUS_M) return 'low';
  return null;
}

function kindScore(kind) {
  return KIND_SCORE[String(kind || '').toUpperCase()] || 0;
}

function isKindAllowed(kind) {
  return KIND_ALLOWLIST.has(String(kind || '').toUpperCase());
}

/**
 * Rank key for sorting candidates (higher is better).
 * sameCityBonus + kindScore - distanceMeters/1000
 */
function rankScore({ distanceMeters, sameCity, kind }) {
  const sameCityBonus = sameCity ? 1 : 0;
  return sameCityBonus * 10 + kindScore(kind) - Number(distanceMeters) / 1000;
}

/**
 * Pure day-route coverage score: 3*STOP + 2*start + 1*nearby.
 * @param {{ stop?: string[], start?: string[], nearby?: string[] }} covered
 */
function dayRouteMatchScore(covered) {
  const stop = Array.isArray(covered?.stop) ? covered.stop.length : 0;
  const start = Array.isArray(covered?.start) ? covered.start.length : 0;
  const nearby = Array.isArray(covered?.nearby) ? covered.nearby.length : 0;
  return 3 * stop + 2 * start + 1 * nearby;
}

module.exports = {
  SUGGEST_STOP_RADIUS_M,
  SUGGEST_NEARBY_RADIUS_M,
  SUGGEST_SOFT_RADIUS_M,
  BBOX_DEG,
  MAX_CANDIDATES_PER_EVENT,
  MAX_AUTO_APPLY_PER_EVENT,
  KIND_ALLOWLIST,
  haversineMeters,
  isValidCoordinatePair,
  confidenceForDistance,
  kindScore,
  isKindAllowed,
  rankScore,
  dayRouteMatchScore,
};
