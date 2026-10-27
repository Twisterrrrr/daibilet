#!/usr/bin/env node
/**
 * Read-only inventory for event URLs and their production catalog records.
 * Requires EVENT_MAP_DATABASE_URL. The query runs inside a read-only transaction.
 * Optional: --sitemap=https://daibilet.ru/sitemaps/events.xml
 *           --output=docs/event-pdp-url-map-current.csv
 */
import { writeFile } from 'node:fs/promises';
import pg from '../apps/backend/node_modules/pg/lib/index.js';

const args = Object.fromEntries(process.argv.slice(2).map((arg) => {
  const [key, ...parts] = arg.replace(/^--/, '').split('=');
  return [key, parts.join('=') || true];
}));
const sitemapUrl = args.sitemap || 'https://daibilet.ru/sitemaps/events.xml';
const outputPath = args.output || 'docs/event-pdp-url-map-current-2026-10-27.csv';
const connectionString = process.env.EVENT_MAP_DATABASE_URL;
if (!connectionString) {
  console.error('Set EVENT_MAP_DATABASE_URL to the production database through the approved read-only tunnel.');
  process.exit(2);
}

const knownLegacy = [
  ['https://daibilet.ru/events/eduard-husnutdinov-v-ulyanovske-2026-6a95be26151261576ec82982', 'ARCHIVE_TOUR_CANDIDATE', 'eduard-tour-review'],
  ['https://daibilet.ru/events/cirk-shapito-zvezdy-manezha-v-g-meleuz-6ac10b122e31a101a629b183', 'ARCHIVE_TOUR_CANDIDATE', 'stars-of-manege-tour-review'],
  ['https://daibilet.ru/events/cirk-shou-chau-pandy-v-g-gudermes-6ab9d9657e042489f66976f3', 'ARCHIVE_MULTI_SESSION_CANDIDATE', 'chau-pandas-gudermes-review'],
];

// Owner-confirmed decisions from docs/event-pdp-url-correspondence-audit-2026-10-27.md.
const decisions = new Map([
  ['6a76779f32ef1eb57a0dedde', ['KEEP_SEPARATE_PDP', 'owner-confirmed']],
  ['6a7677a032ef1eb57a0dede6', ['KEEP_SEPARATE_PDP', 'owner-confirmed']],
  ['6a85a2fe9ac8650d2a011860', ['ONE_PDP_PIERS', 'north-venice']],
  ['6a85a3d19ac8650d2a012052', ['ONE_PDP_PIERS', 'north-venice']],
  ['6ad9fff2de6d955344fdf6af', ['SHARED_PDP_CANDIDATE', 'proyavlyaysya-review']],
  ['6ad9fff3de6d955344fdf6b7', ['SHARED_PDP_CANDIDATE', 'proyavlyaysya-review']],
  ['6ad4e50c24fe87fee52d12c4', ['TOUR_PDP', 'vassa-tour']],
  ['6ad4e752eb7792539b2d12b8', ['TOUR_PDP', 'vassa-tour']],
  ['6aabb84fc1d591febf7d82d5', ['KEEP_SEPARATE_PDP', 'owner-confirmed']],
  ['6ade511696900f34742d12bd', ['KEEP_SEPARATE_PDP', 'owner-confirmed']],
  ['6a743804956530937e808b9c', ['KEEP_SEPARATE_PDP', 'owner-confirmed']],
  ['6a743812956530937e808d6c', ['KEEP_SEPARATE_PDP', 'owner-confirmed']],
  ['6a743a418fa075ab62808b58', ['KEEP_SEPARATE_PDP', 'owner-confirmed']],
  ['6a743a4e8fa075ab62808d28', ['KEEP_SEPARATE_PDP', 'owner-confirmed']],
]);

function eventIdFromUrl(url) {
  const last = new URL(url).pathname.split('/').filter(Boolean).at(-1) || '';
  return last.match(/^tc-([a-f\d]{24})-/i)?.[1]?.toLowerCase()
    || last.match(/([a-f\d]{24})$/i)?.[1]?.toLowerCase()
    || '';
}
function eventSlugFromUrl(url) {
  let slug = decodeURIComponent(new URL(url).pathname.split('/').filter(Boolean).at(-1) || '');
  slug = slug.replace(/^tc-[a-f\d]{24}-/i, '');
  slug = slug.replace(/-[a-f\d]{24}$/i, '');
  // Older public routes append the provider's numeric event id to the readable slug.
  slug = slug.replace(/-\d{2,6}$/, '');
  return slug;
}
function csv(value) {
  const string = value == null ? '' : Array.isArray(value) ? value.join('|') : String(value);
  return `"${string.replaceAll('"', '""')}"`;
}

const response = await fetch(sitemapUrl, { headers: { 'user-agent': 'DaibiletReadOnlyEventPdpAudit/1.0' } });
if (!response.ok) throw new Error(`Sitemap returned HTTP ${response.status}`);
const xml = await response.text();
const sitemapUrls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1].trim());
const urlRecords = [...new Set([...sitemapUrls, ...knownLegacy.map(([url]) => url)])].map((url) => ({
  url,
  externalId: eventIdFromUrl(url),
  slug: eventSlugFromUrl(url),
  isHistoricalExample: knownLegacy.some(([legacy]) => legacy === url),
}));
const ids = [...new Set(urlRecords.map((record) => record.externalId).filter(Boolean))];
const slugs = [...new Set(urlRecords.map((record) => record.slug))];
const paths = [...new Set(urlRecords.map((record) => new URL(record.url).pathname))];

const pool = new pg.Pool({ connectionString, max: 1, application_name: 'event_pdp_url_map_readonly' });
let rows;
try {
  const client = await pool.connect();
  try {
    await client.query('BEGIN READ ONLY');
    const result = await client.query({
      text: `
        SELECT e.id AS "eventId", e.title, e.slug, e.kind, e.status,
               e."canonicalPath", e."isIndexable", e."purchaseFlow", e."managementMode",
               city.title AS city, venue.title AS venue, supplier.title AS supplier,
               COALESCE(sources.codes, ARRAY[]::text[]) AS sources,
               COALESCE(sources.external_ids, ARRAY[]::text[]) AS "sourceExternalIds",
               COALESCE(sources.meta_ids, ARRAY[]::text[]) AS "metaExternalIds",
               COALESCE(sessions.total, 0)::int AS "sessionCount",
               COALESCE(sessions.active, 0)::int AS "activeSessionCount",
               sessions.next_start AS "nextSessionAt",
               COALESCE(offers.total, 0)::int AS "offerCount",
               override."canonicalPath" AS "overrideCanonicalPath",
               override."mergeGroupKey"
        FROM "Event" e
        LEFT JOIN "City" city ON city.id = e."primaryCityId"
        LEFT JOIN "Venue" venue ON venue.id = e."venueId"
        LEFT JOIN "Supplier" supplier ON supplier.id = e."supplierId"
        LEFT JOIN "EventOverride" override ON override."eventId" = e.id
        LEFT JOIN LATERAL (
          SELECT array_agg(DISTINCT source.code::text) AS codes,
                 array_agg(DISTINCT link."externalId") AS external_ids,
                 array_agg(DISTINCT link."metaExternalId") FILTER (WHERE link."metaExternalId" IS NOT NULL) AS meta_ids
          FROM "EventSourceLink" link
          JOIN "Source" source ON source.id = link."sourceId"
          WHERE link."eventId" = e.id
        ) sources ON TRUE
        LEFT JOIN LATERAL (
          SELECT count(*) AS total,
                 count(*) FILTER (WHERE session."isActive") AS active,
                 min(session."startsAt") FILTER (WHERE session."isActive" AND session."startsAt" >= now()) AS next_start
          FROM "EventSession" session WHERE session."eventId" = e.id
        ) sessions ON TRUE
        LEFT JOIN LATERAL (
          SELECT count(*) AS total FROM "EventOffer" offer WHERE offer."eventId" = e.id AND offer.active
        ) offers ON TRUE
        WHERE e.slug = ANY($1::text[])
           OR e."canonicalPath" = ANY($2::text[])
           OR EXISTS (SELECT 1 FROM "EventSourceLink" link WHERE link."eventId" = e.id AND link."externalId" = ANY($3::text[]))
        ORDER BY e.id
      `,
      values: [slugs, paths, ids],
    });
    rows = result.rows;
    await client.query('ROLLBACK');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
} finally {
  await pool.end();
}

const byExternalId = new Map();
const bySlug = new Map();
const byPath = new Map();
for (const row of rows) {
  for (const externalId of row.sourceExternalIds) byExternalId.set(externalId.toLowerCase(), row);
  bySlug.set(row.slug, row);
  for (const path of [row.canonicalPath, row.overrideCanonicalPath].filter(Boolean)) byPath.set(path, row);
}
const urlCountsByMeta = new Map();
for (const record of urlRecords) {
  const row = byExternalId.get(record.externalId) || bySlug.get(record.slug) || byPath.get(new URL(record.url).pathname);
  record.row = row || null;
  const meta = row?.metaExternalIds?.[0];
  record.metaGroup = meta || '';
  if (meta) urlCountsByMeta.set(meta, (urlCountsByMeta.get(meta) || 0) + 1);
}

const headers = [
  'url', 'url_source', 'external_id_from_url', 'event_id', 'event_title', 'event_slug', 'event_kind',
  'publish_status', 'city', 'venue', 'supplier', 'source_codes', 'source_external_ids', 'meta_external_ids',
  'session_count', 'active_session_count', 'next_active_session_at', 'active_offer_count',
  'event_canonical_path', 'override_canonical_path', 'is_indexable', 'merge_group_key',
  'mapping_decision', 'mapping_confidence_or_group', 'pdp_key', 'fallback_required', 'seo_change',
];
const lines = [headers.map(csv).join(',')];
for (const record of urlRecords) {
  const row = record.row;
  const known = decisions.get(record.externalId);
  const duplicateMeta = record.metaGroup && (urlCountsByMeta.get(record.metaGroup) || 0) > 1;
  let decision = known?.[0]
    || (!row ? 'NO_EVENT_MATCH_IN_CURRENT_CATALOG'
      : duplicateMeta ? 'REVIEW_META_GROUP_CANDIDATE' : 'KEEP_CURRENT_URL_PENDING_AUDIT');
  let confidenceOrGroup = known?.[1]
    || (!row ? 'source/event mapping unresolved'
      : duplicateMeta ? `meta:${record.metaGroup}` : 'unreviewed');
  const pdpKey = known && decision !== 'KEEP_SEPARATE_PDP' ? known[1] : row?.id || '';
  if (record.isHistoricalExample) {
    const [legacyUrl, legacyDecision, group] = knownLegacy.find(([url]) => url === record.url);
    decision = legacyDecision;
    confidenceOrGroup = group;
  }
  lines.push([
    record.url, record.isHistoricalExample ? 'owner-provided historical URL' : 'current event sitemap', record.externalId,
    row?.eventId, row?.title, row?.slug, row?.kind, row?.status, row?.city, row?.venue, row?.supplier,
    row?.sources, row?.sourceExternalIds, row?.metaExternalIds, row?.sessionCount, row?.activeSessionCount,
    row?.nextSessionAt?.toISOString?.() || '', row?.offerCount, row?.canonicalPath, row?.overrideCanonicalPath,
    row?.isIndexable, row?.mergeGroupKey, decision, confidenceOrGroup, pdpKey, 'yes until PDP and mapping are verified', 'none',
  ].map(csv).join(','));
}
await writeFile(outputPath, `${lines.join('\n')}\n`, 'utf8');
const unmatched = urlRecords.filter((record) => !record.row).length;
const metaReview = urlRecords.filter((record) => record.row && record.metaGroup && (urlCountsByMeta.get(record.metaGroup) || 0) > 1).length;
console.log(JSON.stringify({
  sitemapUrl,
  sitemapUrls: sitemapUrls.length,
  historicalExamples: knownLegacy.length,
  exportedRows: urlRecords.length,
  matchedRows: urlRecords.length - unmatched,
  unmatchedRows: unmatched,
  rowsInRepeatedMetaGroups: metaReview,
  outputPath,
  databaseTransaction: 'READ ONLY',
  seoChanges: 0,
}, null, 2));
