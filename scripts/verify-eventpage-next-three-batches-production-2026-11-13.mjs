import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const rootDir = process.cwd();
const editorialDir = path.join(rootDir, 'data/ticketscloud/editorial');
const payload = JSON.parse(fs.readFileSync(path.join(editorialDir, 'eventpage-next-three-batches-production-payload-2026-11-13.json'), 'utf8'));
const backup = JSON.parse(fs.readFileSync(path.join(editorialDir, 'eventpage-next-three-batches-production-before-apply-2026-11-13.json'), 'utf8'));
const applied = JSON.parse(fs.readFileSync(path.join(editorialDir, 'eventpage-next-three-batches-production-result-2026-11-13.json'), 'utf8'));
const backupById = new Map(backup.pages.map((page) => [page.id, page]));
const payloadById = new Map(payload.pages.map((page) => [page.eventPageId, page]));

if (applied.pages.length !== 296 || applied.counts.indexable !== 94 || applied.counts.publishedNoindex !== 202) {
  throw new Error('Apply result totals do not match expected totals');
}

const { createDb } = await import(pathToFileURL(path.join(rootDir, 'apps/backend/src/db.js')));
const db = createDb(rootDir);
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value;
}

try {
  const summary = await db.query(`
    SELECT count(*) FILTER (WHERE status = 'READY' AND "isIndexable" IS TRUE)::int AS "readyIndexable",
      count(*) FILTER (WHERE status = 'READY' AND "isIndexable" IS FALSE)::int AS "readyNoindex"
    FROM "EventPage"
  `);
  if (summary.rows[0].readyIndexable !== 909) throw new Error(`Expected 909 indexable EventPages, got ${summary.rows[0].readyIndexable}`);

  const verified = [];
  const revisionDeltas = {};
  const revisionAnomalies = [];
  let linkedAssociations = 0;
  for (const resultRow of applied.pages) {
    const prior = backupById.get(resultRow.id);
    const target = payloadById.get(resultRow.id);
    if (!prior || !target || prior.slug !== resultRow.slug) throw new Error(`Missing exact source mapping for ${resultRow.slug}`);
    const query = await db.query(`
      SELECT page.id, page.slug, page.title, page.summary, page."heroImageUrl", page.content,
        page."seoH1", page."seoTitle", page."seoDescription", page."canonicalPath",
        page.status, page."isIndexable", page."publishedAt",
        COALESCE((SELECT jsonb_agg(jsonb_build_object('eventId', link."eventId", 'position', link.position, 'role', link.role) ORDER BY link.position)
          FROM "EventPageEvent" link WHERE link."eventPageId" = page.id), '[]'::jsonb) AS links,
        COALESCE((SELECT jsonb_agg(jsonb_build_object('path', route.path, 'kind', route.kind, 'source', route.source) ORDER BY route.path)
          FROM "EventPageRoute" route WHERE route."eventPageId" = page.id), '[]'::jsonb) AS routes,
        (SELECT count(*)::int FROM "EventPageRevision" revision WHERE revision."eventPageId" = page.id) AS revisions
      FROM "EventPage" page WHERE page.id = $1
    `, [resultRow.id]);
    const current = query.rows[0];
    if (!current || current.status !== 'READY' || current.isIndexable !== resultRow.isIndexable || !current.publishedAt || current.slug !== resultRow.slug) {
      throw new Error(`Status/publish mismatch for ${resultRow.slug}`);
    }
    if (JSON.stringify(stable(current.content)) !== JSON.stringify(stable(target.content))) throw new Error(`Content mismatch for ${resultRow.slug}`);
    for (const key of ['title', 'summary', 'heroImageUrl', 'seoH1', 'seoTitle', 'seoDescription', 'canonicalPath']) {
      if (current[key] !== prior[key]) throw new Error(`${key} changed for ${resultRow.slug}`);
    }
    const expectedLinks = prior.links.map(({ eventId, position, role }) => ({ eventId, position, role }));
    if (JSON.stringify(stable(current.links)) !== JSON.stringify(stable(expectedLinks))) throw new Error(`EventPage/Event links changed for ${resultRow.slug}`);
    const expectedRoutes = prior.routes.map(({ path: routePath, kind, source }) => ({ path: routePath, kind, source }));
    if (JSON.stringify(stable(current.routes)) !== JSON.stringify(stable(expectedRoutes))) throw new Error(`Routes changed for ${resultRow.slug}`);
    const revisionDelta = current.revisions - prior.revisions;
    if (revisionDelta < 2) throw new Error(`Revision history did not advance enough for ${resultRow.slug}`);
    revisionDeltas[revisionDelta] = (revisionDeltas[revisionDelta] || 0) + 1;
    if (revisionDelta > 2) revisionAnomalies.push({ slug: resultRow.slug, standardExpected: 2, actual: revisionDelta });
    resultRow.revisionAdded = revisionDelta;
    linkedAssociations += current.links.length;
    verified.push(resultRow.slug);
  }

  const excluded = [];
  for (const slug of ['put-raskolnikova-sankt-peterburg-8', 'muzykalnoe-loto-musebingo-moskva-5']) {
    const prior = backup.pages.find((page) => page.slug === slug);
    const current = await db.query(`SELECT status, "isIndexable", "publishedAt" FROM "EventPage" WHERE id = $1`, [prior?.id]);
    if (!current.rows[0] || current.rows[0].status !== 'DRAFT' || current.rows[0].isIndexable !== false || current.rows[0].publishedAt !== null) {
      throw new Error(`Excluded page was changed: ${slug}`);
    }
    excluded.push(slug);
  }

  applied.verifiedAt = new Date().toISOString();
  applied.counts.totalRevisionEntriesAdded = Object.entries(revisionDeltas).reduce((sum, [delta, count]) => sum + Number(delta) * Number(count), 0);
  applied.counts.pagesWithRepeatedRevisionWrites = revisionAnomalies.length;
  fs.writeFileSync(path.join(editorialDir, 'eventpage-next-three-batches-production-result-2026-11-13.json'), `${JSON.stringify(applied, null, 2)}\n`, 'utf8');
  process.stdout.write(JSON.stringify({ verifiedPages: verified.length, indexable: applied.counts.indexable, publishedNoindex: applied.counts.publishedNoindex, globalIndexable: summary.rows[0].readyIndexable, linkedAssociations, revisionDeltas, revisionAnomalies, excludedDrafts: excluded, linksAndRoutesChanged: false }));
} finally {
  await db.close();
}
