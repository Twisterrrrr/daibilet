import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const rootDir = process.cwd();
const editorialDir = path.join(rootDir, 'data/ticketscloud/editorial');
const payloadPath = path.join(editorialDir, 'eventpage-next-three-batches-production-payload-2026-11-13.json');
const backupPath = path.join(editorialDir, 'eventpage-next-three-batches-production-before-apply-2026-11-13.json');
const resultPath = path.join(editorialDir, 'eventpage-next-three-batches-production-result-2026-11-13.json');
const payload = JSON.parse(fs.readFileSync(payloadPath, 'utf8'));
const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
const backupById = new Map(backup.pages.map((page) => [page.id, page]));

if (payload.pages.length !== 296 || backup.pages.length !== 298 || backup.baseline?.indexable !== 815) {
  throw new Error(`Unexpected package/baseline: payload=${payload.pages.length}, backup=${backup.pages.length}, indexable=${backup.baseline?.indexable}`);
}
if (payload.pages.filter((page) => page.isIndexable).length !== 94 || payload.pages.filter((page) => !page.isIndexable).length !== 202) {
  throw new Error('Unexpected indexability split');
}

const { createDb } = await import(pathToFileURL(path.join(rootDir, 'apps/backend/src/db.js')));
const { updateAdminEventPage, publishAdminEventPage } = await import(pathToFileURL(path.join(rootDir, 'apps/backend/src/event-pages.js')));
const db = createDb(rootDir);

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value;
}

try {
  const baseline = await db.query(`SELECT count(*)::int AS count FROM "EventPage" WHERE status = 'READY' AND "isIndexable" IS TRUE`);
  if (baseline.rows[0].count < 815 || baseline.rows[0].count > 909) throw new Error(`Indexable baseline changed unexpectedly: ${baseline.rows[0].count}`);

  const prepared = [];
  const alreadyApplied = [];
  for (const item of payload.pages) {
    const prior = backupById.get(item.eventPageId);
    if (!prior || prior.slug !== item.slug || prior.status !== 'DRAFT' || prior.isIndexable !== false) {
      throw new Error(`Backup precondition failed for ${item.slug}`);
    }
    const result = await db.query(`
      SELECT page.id, page.slug, page.title, page.summary, page."heroImageUrl", page.content,
        page."seoH1", page."seoTitle", page."seoDescription", page."canonicalPath",
        page.status, page."isIndexable", page."publishedAt",
        COALESCE((SELECT jsonb_agg(jsonb_build_object('eventId', link."eventId", 'position', link.position, 'role', link.role) ORDER BY link.position)
          FROM "EventPageEvent" link WHERE link."eventPageId" = page.id), '[]'::jsonb) AS links,
        COALESCE((SELECT jsonb_agg(jsonb_build_object('path', route.path, 'kind', route.kind, 'source', route.source) ORDER BY route.path)
          FROM "EventPageRoute" route WHERE route."eventPageId" = page.id), '[]'::jsonb) AS routes
      FROM "EventPage" page WHERE page.id = $1
    `, [item.eventPageId]);
    const current = result.rows[0];
    if (!current || current.slug !== item.slug) throw new Error(`Live page does not match expected route: ${item.slug}`);
    const expectedLinks = prior.links.map(({ eventId, position, role }) => ({ eventId, position, role }));
    if (JSON.stringify(stable(current.links)) !== JSON.stringify(stable(expectedLinks))) throw new Error(`EventPage/Event links changed: ${item.slug}`);
    const expectedRoutes = prior.routes.map(({ path: routePath, kind, source }) => ({ path: routePath, kind, source }));
    if (JSON.stringify(stable(current.routes)) !== JSON.stringify(stable(expectedRoutes))) throw new Error(`EventPage routes changed: ${item.slug}`);
    for (const key of ['title', 'summary', 'heroImageUrl', 'seoH1', 'seoTitle', 'seoDescription', 'canonicalPath']) {
      if (current[key] !== prior[key]) throw new Error(`Live ${key} changed since backup: ${item.slug}`);
    }
    const currentContent = JSON.stringify(stable(current.content));
    const finalContent = JSON.stringify(stable(item.content));
    if (current.status === 'DRAFT' && current.isIndexable === false && current.publishedAt === null && currentContent === JSON.stringify(stable(prior.content))) {
      prepared.push({ item, current, needsUpdate: true });
      continue;
    }
    if (current.status === 'READY' && current.isIndexable === item.isIndexable && currentContent === finalContent) {
      if (current.publishedAt) {
        alreadyApplied.push({
          id: item.eventPageId,
          slug: item.slug,
          status: current.status,
          isIndexable: current.isIndexable,
          publishedAt: current.publishedAt,
          eventIds: current.links.map((link) => link.eventId),
          revisionAdded: 0,
          decision: item.decision,
        });
        continue;
      }
      prepared.push({ item, current, needsUpdate: false });
      continue;
    }
    throw new Error(`Live state differs from backed-up draft and final rewrite: ${item.slug}`);
  }

  const completedIndexable = alreadyApplied.filter((page) => page.isIndexable).length
    + prepared.filter(({ item, current }) => current.status === 'READY' && item.isIndexable).length;
  if (baseline.rows[0].count - 815 !== completedIndexable) {
    throw new Error(`Indexable count does not match completed rows: baseline=${baseline.rows[0].count}, completed=${completedIndexable}`);
  }

  const changed = [...alreadyApplied];
  let next = 0;
  async function applyWorker() {
    while (next < prepared.length) {
      const { item, current, needsUpdate } = prepared[next++];
      if (needsUpdate) {
        const updated = await updateAdminEventPage(db, item.eventPageId, {
          slug: current.slug,
          title: current.title,
          summary: current.summary,
          heroImageUrl: current.heroImageUrl,
          content: item.content,
          seoH1: current.seoH1,
          seoTitle: current.seoTitle,
          seoDescription: current.seoDescription,
          canonicalPath: current.canonicalPath,
          status: 'READY',
          isIndexable: item.isIndexable,
          changeNote: `Редакторский рерайт (пакет 01–03, 13.11.2026); ${item.decision}`,
        });
        if (!updated || updated.slug !== item.slug || updated.status !== 'READY' || updated.isIndexable !== item.isIndexable) {
          throw new Error(`Update verification failed for ${item.slug}`);
        }
      }
      const published = await publishAdminEventPage(db, item.eventPageId);
      if (!published || published.status !== 'READY' || !published.publishedAt) throw new Error(`Publish timestamp missing for ${item.slug}`);
      changed.push({
        id: item.eventPageId,
        slug: item.slug,
        status: published.status,
        isIndexable: published.isIndexable,
        publishedAt: published.publishedAt,
        eventIds: current.links.map((link) => link.eventId),
        revisionAdded: needsUpdate ? 2 : 1,
        decision: item.decision,
      });
    }
  }
  await Promise.all(Array.from({ length: Math.min(3, prepared.length) }, () => applyWorker()));

  const result = {
    appliedAt: new Date().toISOString(),
    pages: changed,
    counts: {
      applied: changed.length,
      newlyApplied: prepared.length,
      alreadyApplied: alreadyApplied.length,
      indexable: changed.filter((page) => page.isIndexable).length,
      publishedNoindex: changed.filter((page) => !page.isIndexable).length,
      indexableBaselineBefore: 815,
      indexableAfterExpected: 909,
    },
    excludedDrafts: [
      { id: 'evt_6af403677d7e114c004c278c', slug: 'put-raskolnikova-sankt-peterburg-8', reason: 'Нет будущих активных слотов' },
      { id: 'evt_6ad3c1e7146a3bfb07c74fd8', slug: 'muzykalnoe-loto-musebingo-moskva-5', reason: 'Нет будущих активных слотов' },
    ],
    linksAndRoutesChanged: false,
  };
  if (changed.length !== 296 || result.counts.indexable !== 94 || result.counts.publishedNoindex !== 202) {
    throw new Error(`Final result does not match expected totals: ${JSON.stringify(result.counts)}`);
  }
  fs.writeFileSync(resultPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  process.stdout.write(JSON.stringify(result.counts));
} finally {
  await db.close();
}
