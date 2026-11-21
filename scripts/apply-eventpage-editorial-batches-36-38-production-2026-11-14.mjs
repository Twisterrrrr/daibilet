import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const dir = path.join(root, 'data/ticketscloud/editorial');
const batchNumbers = [36, 37, 38];
const version = '2026-11-14-eventpage-editorial-batches-36-38';
const apply = process.argv.includes('--apply');
const backupPath = path.join(dir, 'eventpage-editorial-batches-36-38-before-apply-2026-11-14.json');
const resultPath = path.join(dir, 'eventpage-editorial-batches-36-38-production-result-2026-11-14.json');

function parseBatch(batch) {
  const markdownPath = path.join(dir, `eventpage-editorial-batch-${batch}-rewrites-2026-11-13.md`);
  const archivePath = path.join(dir, `eventpage-editorial-batch-${batch}-source-archive-2026-11-13.json`);
  const auditPath = path.join(dir, `eventpage-editorial-batch-${batch}-audit-2026-11-13.json`);
  const markdown = fs.readFileSync(markdownPath, 'utf8');
  const archive = JSON.parse(fs.readFileSync(archivePath, 'utf8'));
  const audit = JSON.parse(fs.readFileSync(auditPath, 'utf8'));
  const archiveByEventId = new Map(archive.map((item) => [item.eventId, item]));
  const auditById = new Map(audit.map((item) => [item.eventPageId, item]));
  const chunks = markdown.split(/^## (\d+)\. (.+)\r?$/mu);
  const matches = [];
  for (let index = 1; index < chunks.length; index += 3) {
    matches.push({ sequence: chunks[index], title: chunks[index + 1], raw: chunks[index + 2] || '' });
  }
  if (matches.length !== 30 || archive.length !== 30 || audit.length !== 30) {
    throw new Error(`Batch ${batch} is not 30 rows: markdown=${matches.length}, archive=${archive.length}, audit=${audit.length}`);
  }
  return matches.map(({ sequence, title: headingTitle, raw }) => {
    const eventId = raw.match(/^- Event ID: `([^`]+)`/mu)?.[1];
    const slug = raw.match(/^- EventPage: `\/events\/([^`]+)`/mu)?.[1];
    const archiveRow = archiveByEventId.get(eventId);
    const auditRow = auditById.get(archiveRow?.eventPageId);
    if (!eventId || !slug || !archiveRow || !auditRow || auditRow.sequence !== Number(sequence)) {
      throw new Error(`Batch ${batch} row ${sequence} has no exact ID/slug/audit mapping`);
    }
    if (eventId !== archiveRow.eventId || slug !== archiveRow.slug) {
      throw new Error(`Batch ${batch} mapping mismatch at row ${sequence}: heading=${JSON.stringify(headingTitle)} archive=${JSON.stringify(archiveRow.title)} slug=${slug} expectedSlug=${archiveRow.slug}`);
    }
    const practicalHeader = /^### Практическая информация\s*\r?\n/mu;
    const practicalMatch = practicalHeader.exec(raw);
    if (!practicalMatch) throw new Error(`Batch ${batch} row ${sequence} lacks practical info`);
    const beforePractical = raw.slice(0, practicalMatch.index).trim();
    const firstHeading = beforePractical.search(/^### .+$/mu);
    if (firstHeading < 0) throw new Error(`Batch ${batch} row ${sequence} lacks a content heading`);
    const mainBody = beforePractical.slice(firstHeading).trim();
    const practicalInfo = raw.slice(practicalMatch.index + practicalMatch[0].length).trim();
    const substantiveParagraphs = mainBody
      .split(/\r?\n\s*\r?\n/u)
      .map((part) => part.trim())
      .filter((part) => part && !/^#{1,6}\s/u.test(part)).length;
    if (substantiveParagraphs < 2 || !practicalInfo) throw new Error(`Batch ${batch} row ${sequence} violates paragraph/practical rules`);
    if (auditRow.rewriteChars < auditRow.sourceChars || auditRow.mainParagraphs < 2 || !auditRow.exactMapping) {
      throw new Error(`Batch ${batch} audit failed at row ${sequence}`);
    }
    return {
      batch,
      sequence: Number(sequence),
      eventPageId: archiveRow.eventPageId,
      eventId,
      slug,
      title: archiveRow.title,
      city: archiveRow.city,
      sourceChars: auditRow.sourceChars,
      rewriteChars: mainBody.length,
      substantiveParagraphs,
      mainBody,
      practicalInfo,
    };
  });
}

function loadEnvDatabaseUrl() {
  const envText = fs.readFileSync(path.join(root, '.env'), 'utf8');
  const raw = envText.match(/^DATABASE_URL=(.*)$/mu)?.[1]?.trim().replace(/^['"]|['"]$/gu, '');
  if (!raw) throw new Error('DATABASE_URL is missing from project .env');
  const url = new URL(raw);
  // Local project .env points at a baseline snapshot; only use its credentials
  // over the explicit SSH tunnel, against production database daibilet.
  url.hostname = '127.0.0.1';
  url.port = '5433';
  url.pathname = '/daibilet';
  process.env.DATABASE_URL = url.toString();
  return url;
}

const items = batchNumbers.flatMap(parseBatch);
if (items.length !== 90 || new Set(items.map((item) => item.eventPageId)).size !== 90) {
  throw new Error('Expected 90 unique EventPage records');
}
const shortItems = items.filter((item) => item.rewriteChars < item.sourceChars);
if (shortItems.length) {
  throw new Error(`Rewrite text is shorter than original: ${shortItems.map((item) => `${item.batch}/${item.sequence} ${item.slug} (${item.rewriteChars} < ${item.sourceChars})`).join('; ')}`);
}
if (fs.existsSync(resultPath)) throw new Error(`Production result already exists: ${path.basename(resultPath)}`);
if (apply && fs.existsSync(backupPath)) throw new Error(`Production backup already exists: ${path.basename(backupPath)}`);

const databaseUrl = loadEnvDatabaseUrl();
if (databaseUrl.hostname !== '127.0.0.1' || databaseUrl.port !== '5433' || databaseUrl.pathname !== '/daibilet') {
  throw new Error('Refusing database target other than production SSH tunnel 127.0.0.1:5433/daibilet');
}
const { createDb } = await import(pathToFileURL(path.join(root, 'apps/backend/src/db.js')).href);
const { updateAdminEventPage, publishAdminEventPage } = await import(pathToFileURL(path.join(root, 'apps/backend/src/event-pages.js')).href);
const db = createDb(root);

try {
  const identity = await db.query('SELECT current_database() AS database, now() AS checked_at');
  if (identity.rows[0]?.database !== 'daibilet') throw new Error('Connected database is not production daibilet');
  const live = [];
  for (const item of items) {
    const result = await db.query(`
      SELECT page.id, page.slug, page.title, page.summary, page."heroImageUrl", page.content,
        page."seoH1", page."seoTitle", page."seoDescription", page."canonicalPath",
        page.status, page."isIndexable", page."publishedAt", page."tourGroupId",
        COALESCE((SELECT jsonb_agg(jsonb_build_object('eventId', link."eventId", 'position', link.position, 'role', link.role) ORDER BY link.position)
          FROM "EventPageEvent" link WHERE link."eventPageId" = page.id), '[]'::jsonb) AS links,
        COALESCE((SELECT jsonb_agg(jsonb_build_object('path', route.path, 'kind', route.kind, 'source', route.source) ORDER BY route.path)
          FROM "EventPageRoute" route WHERE route."eventPageId" = page.id), '[]'::jsonb) AS routes,
        (SELECT count(*)::int FROM "EventPageRevision" revision WHERE revision."eventPageId" = page.id) AS revisions,
        (SELECT count(DISTINCT event.id)::int FROM "EventPageEvent" link JOIN "Event" event ON event.id = link."eventId"
          WHERE link."eventPageId" = page.id AND EXISTS (
            SELECT 1 FROM "EventOffer" offer WHERE offer."eventId" = event.id AND offer.active IS TRUE
          ) AND EXISTS (
            SELECT 1 FROM "EventSession" session WHERE session."eventId" = event.id
              AND session."isActive" IS NOT FALSE AND session."archivedAt" IS NULL AND session."cancelledAt" IS NULL
              AND session."startsAt" >= now()
              AND lower(coalesce(session."sourceStatus", '')) NOT IN
                ('widget_blocked','paused','suspended','stopped','cancelled','canceled','draft','hidden','stand_by','closed','sales_closed','sale_closed','not_for_sale')
          )) AS activeEvents
      FROM "EventPage" page WHERE page.id = $1
    `, [item.eventPageId]);
    const page = result.rows[0];
    if (!page || page.slug !== item.slug) throw new Error(`Page/slug mismatch: ${item.slug}`);
    if (page.status !== 'DRAFT' || page.isIndexable !== false || page.publishedAt !== null) {
      throw new Error(`Page is not an unpublished draft: ${item.slug}`);
    }
    if (page.content?.activeEditorialText?.status === 'ACTIVE_EDITORIAL_REWRITE') {
      throw new Error(`An active rewrite already exists: ${item.slug}`);
    }
    if (!page.links.some((link) => link.eventId === item.eventId)) throw new Error(`Primary Event ID is no longer linked: ${item.slug}`);
    if (!(page.routes || []).some((route) => route.path === `/events/${item.slug}`)) throw new Error(`Expected route is missing: ${item.slug}`);
    if (page.activeevents < 1 && page.activeEvents < 1) throw new Error(`No active future saleable Event IDs remain: ${item.slug}`);
    live.push({ item, page });
  }

  if (live.length !== 90) throw new Error(`Expected 90 live records; got ${live.length}`);
  if (!apply) {
    process.stdout.write(JSON.stringify({ mode: 'preflight', database: identity.rows[0].database, pages: live.length,
      activePages: live.filter(({ page }) => (page.activeevents ?? page.activeEvents ?? 0) > 0).length,
      batches: batchNumbers.map((batch) => ({ batch, pages: items.filter((item) => item.batch === batch).length })),
      uniquePageIds: new Set(items.map((item) => item.eventPageId)).size }, null, 2));
  } else {
    fs.writeFileSync(backupPath, `${JSON.stringify({ backedUpAt: new Date().toISOString(), pages: live.map(({ page }) => page) }, null, 2)}\n`);
    const resultPages = [];
    try {
      for (const { item, page } of live) {
        const content = {
          sections: [
            { id: 'about', kind: 'about', title: 'О событии', body: item.mainBody, items: [] },
            { id: 'practical-info', kind: 'custom', title: 'Практическая информация', body: item.practicalInfo, items: [] },
          ],
          activeEditorialText: { field: 'sections', status: 'ACTIVE_EDITORIAL_REWRITE', version },
        };
        const updated = await updateAdminEventPage(db, item.eventPageId, {
          slug: page.slug,
          title: page.title,
          summary: page.summary,
          heroImageUrl: page.heroImageUrl,
          content,
          seoH1: page.seoH1,
          seoTitle: page.seoTitle,
          seoDescription: page.seoDescription,
          canonicalPath: page.canonicalPath,
          status: 'READY',
          isIndexable: true,
          changeNote: `Редакторский рерайт, батч ${item.batch} (14.11.2026); опубликован и открыт к индексации`,
        });
        if (!updated || updated.slug !== item.slug || updated.status !== 'READY' || updated.isIndexable !== true) {
          throw new Error(`Update verification failed: ${item.slug}`);
        }
        const published = await publishAdminEventPage(db, item.eventPageId);
        if (!published || published.status !== 'READY' || published.isIndexable !== true || !published.publishedAt) {
          throw new Error(`Publish verification failed: ${item.slug}`);
        }
        resultPages.push({ eventPageId: item.eventPageId, eventId: item.eventId, slug: item.slug, title: item.title,
          city: item.city, batch: item.batch, sourceChars: item.sourceChars, rewriteChars: item.rewriteChars,
          substantiveParagraphs: item.substantiveParagraphs, status: published.status,
          isIndexable: published.isIndexable, publishedAt: published.publishedAt,
          eventIds: page.links.map((link) => link.eventId), routes: page.routes.map((route) => route.path),
          revisionsBefore: page.revisions, revisionsAfter: published.revisions?.length ?? null });
      }
    } catch (error) {
      fs.writeFileSync(resultPath, `${JSON.stringify({ appliedAt: new Date().toISOString(), complete: false,
        error: error instanceof Error ? error.message : String(error), pages: resultPages }, null, 2)}\n`);
      throw error;
    }
    const output = { appliedAt: new Date().toISOString(), complete: true, pages: resultPages,
      counts: { applied: resultPages.length, indexable: resultPages.filter((page) => page.isIndexable).length,
        byBatch: Object.fromEntries(batchNumbers.map((batch) => [batch, resultPages.filter((page) => page.batch === batch).length])) },
      linksRoutesAndSeoFieldsChanged: false };
    fs.writeFileSync(resultPath, `${JSON.stringify(output, null, 2)}\n`);
    process.stdout.write(JSON.stringify(output.counts));
  }
} finally {
  await db.close();
}
