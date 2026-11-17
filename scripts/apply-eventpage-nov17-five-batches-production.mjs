import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const dir = path.join(root, 'data/ticketscloud/editorial');
const batchNumbers = [1, 2, 3, 4, 5];
const version = '2026-11-17-eventpage-editorial-next-150-hyphen-style';
const apply = process.argv.includes('--apply');
const backupPath = path.join(dir, 'eventpage-nov17-next-150-before-hyphen-style-update.json');
const resultPath = path.join(dir, 'eventpage-nov17-next-150-hyphen-style-production-result.json');

function parseBatch(batch) {
  const prefix = `eventpage-nov17-next-batch-0${batch}`;
  const archive = JSON.parse(fs.readFileSync(path.join(dir, `${prefix}-source-archive.json`), 'utf8'));
  const audit = JSON.parse(fs.readFileSync(path.join(dir, `${prefix}-audit.json`), 'utf8'));
  const markdown = fs.readFileSync(path.join(dir, `${prefix}-rewrites.md`), 'utf8');
  if (!audit.allPass || audit.entryCount !== 30 || audit.uniqueEventPageIds !== 30 || audit.repeatedEventIds.length) {
    throw new Error(`Batch ${batch} audit did not pass`);
  }
  const chunks = markdown.split(/^## (\d+)\. (.+)\r?$/mu);
  const entries = [];
  for (let index = 1; index < chunks.length; index += 3) {
    entries.push({ sequence: Number(chunks[index]), title: chunks[index + 1], raw: chunks[index + 2] || '' });
  }
  if (entries.length !== 30 || archive.pages.length !== 30 || audit.entries.length !== 30) {
    throw new Error(`Batch ${batch} does not contain 30 aligned rows`);
  }
  return entries.map(({ sequence, title, raw }) => {
    const sourcePage = archive.pages[sequence - 1];
    const auditRow = audit.entries.find((item) => item.position === sequence && item.pageId === sourcePage?.id);
    const primary = sourcePage?.events?.find((event) => event.role === 'PRIMARY') ?? sourcePage?.events?.[0];
    if (!sourcePage || !primary || !auditRow || auditRow.slug !== sourcePage.slug) {
      throw new Error(`Batch ${batch}, row ${sequence} does not match its archived EventPage`);
    }
    const practicalHeader = /^### Практическая информация\s*\r?\n/mu;
    const practicalMatch = practicalHeader.exec(raw);
    if (!practicalMatch) throw new Error(`Batch ${batch}, row ${sequence} has no practical information`);
    const main = raw.slice(0, practicalMatch.index).trim();
    const firstContentHeading = main.search(/^### .+$/mu);
    if (firstContentHeading < 0) throw new Error(`Batch ${batch}, row ${sequence} lacks a content heading`);
    const mainBody = main.slice(firstContentHeading).trim();
    const practicalInfo = raw.slice(practicalMatch.index + practicalMatch[0].length).trim();
    const substantiveParagraphs = mainBody.split(/\r?\n\s*\r?\n/u)
      .map((part) => part.trim()).filter((part) => part && !/^#{1,6}\s/u.test(part)).length;
    if (substantiveParagraphs < 2 || !practicalInfo || auditRow.rewriteChars < auditRow.originalChars) {
      throw new Error(`Batch ${batch}, row ${sequence} violates the editorial requirements`);
    }
    return {
      batch, sequence, eventPageId: sourcePage.id, eventId: primary.eventId,
      linkedEventIds: [...new Set(sourcePage.events.map((event) => event.eventId))],
      slug: sourcePage.slug, title: sourcePage.title, city: primary.city,
      sourceChars: auditRow.originalChars, rewriteChars: auditRow.rewriteChars,
      substantiveParagraphs, mainBody, practicalInfo,
    };
  });
}

const items = batchNumbers.flatMap(parseBatch);
if (items.length !== 150 || new Set(items.map((item) => item.eventPageId)).size !== 150) {
  throw new Error('Expected 150 unique EventPage records');
}
const allEventIds = items.flatMap((item) => item.linkedEventIds);
if (new Set(allEventIds).size !== allEventIds.length) throw new Error('A linked Event ID is repeated across EventPages');
if (apply && fs.existsSync(resultPath)) throw new Error(`Production result already exists: ${path.basename(resultPath)}`);
if (apply && fs.existsSync(backupPath)) throw new Error(`Production backup already exists: ${path.basename(backupPath)}`);

const databaseUrl = new URL(process.env.DATABASE_URL || '');
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
  const alreadyApplied = [];
  const stale = [];
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
            SELECT 1 FROM "EventOffer" offer WHERE offer."eventId" = event.id AND offer.active IS NOT FALSE
          ) AND (
            (upper(event.kind::text) = 'OPEN_DATE' AND (event."openDateValidTo" IS NULL OR event."openDateValidTo" >= now()))
            OR EXISTS (
              SELECT 1 FROM "EventSession" session WHERE session."eventId" = event.id
                AND session."isActive" IS NOT FALSE AND session."archivedAt" IS NULL AND session."cancelledAt" IS NULL
                AND (
                  session."startsAt" >= now() - interval '15 minutes'
                  OR (session."startsAt" < now() AND session."endsAt" >= now()
                    AND session."endsAt" - session."startsAt" < interval '36 hours')
                  OR lower(coalesce(session."sourceStatus", '')) IN ('open_date', 'widget')
                )
                AND lower(coalesce(session."sourceStatus", '')) NOT IN
                  ('widget_blocked','paused','suspended','stopped','cancelled','canceled','draft','hidden','stand_by','closed','sales_closed','sale_closed','not_for_sale')
            )
          )) AS activeEvents
      FROM "EventPage" page WHERE page.id = $1
    `, [item.eventPageId]);
    const page = result.rows[0];
    if (!page || page.slug !== item.slug || page.title !== item.title) throw new Error(`Page identity mismatch: ${item.slug}`);
    const currentIds = new Set((page.links || []).map((link) => link.eventId));
    if (item.linkedEventIds.some((eventId) => !currentIds.has(eventId)) || !currentIds.has(item.eventId)) {
      throw new Error(`EventPage links changed since the source archive: ${item.slug}`);
    }
    if (!(page.routes || []).some((route) => route.path === `/events/${item.slug}`)) throw new Error(`Expected route missing: ${item.slug}`);
    if ((page.activeevents ?? page.activeEvents ?? 0) < 1) stale.push(item.slug);
    const sameBatchVersion = page.content?.activeEditorialText?.version === '2026-11-17-eventpage-editorial-next-150';
    if ((page.status === 'DRAFT' && page.isIndexable === false && page.publishedAt === null
      && page.content?.activeEditorialText?.status !== 'ACTIVE_EDITORIAL_REWRITE')
      || (page.status === 'READY' && page.isIndexable === true && page.publishedAt
        && page.content?.activeEditorialText?.status === 'ACTIVE_EDITORIAL_REWRITE' && sameBatchVersion)) {
      live.push({ item, page });
    } else if (page.status === 'READY' && page.isIndexable === true && page.publishedAt
      && page.content?.activeEditorialText?.status === 'ACTIVE_EDITORIAL_REWRITE') {
      alreadyApplied.push({ item, page, version: page.content.activeEditorialText.version || null });
    } else {
      throw new Error(`Page changed after capture and needs review: ${item.slug} (${page.status}, indexable=${page.isIndexable}, publishedAt=${page.publishedAt}, editorial=${page.content?.activeEditorialText?.status || 'none'})`);
    }
  }
  if (stale.length) throw new Error(`No active future saleable sessions on ${stale.length} pages: ${stale.join(', ')}`);
  if (!apply) {
    process.stdout.write(JSON.stringify({ mode: 'preflight', database: identity.rows[0].database,
      checkedAt: identity.rows[0].checked_at, pages: items.length, toApply: live.length,
      alreadyApplied: alreadyApplied.map(({ item, version }) => ({ slug: item.slug, version })), activePages: items.length,
      uniqueEventPageIds: new Set(items.map((item) => item.eventPageId)).size,
      uniqueLinkedEventIds: new Set(allEventIds).size,
      statusChangesOnApply: 'DRAFT/noindex -> READY/indexable; content only; links/routes/canonical unchanged' }, null, 2));
  } else {
    fs.writeFileSync(backupPath, `${JSON.stringify({ backedUpAt: new Date().toISOString(), database: identity.rows[0].database,
      pages: [...live, ...alreadyApplied].map(({ page }) => page) }, null, 2)}\n`);
    const resultPages = alreadyApplied.map(({ item, page, version: existingVersion }) => ({
      eventPageId: item.eventPageId, eventId: item.eventId, slug: item.slug, title: item.title,
      city: item.city, batch: item.batch, sourceChars: item.sourceChars,
      rewriteChars: page.content?.sections?.find((section) => section.id === 'about')?.body?.length ?? null,
      substantiveParagraphs: null, status: page.status, isIndexable: page.isIndexable,
      publishedAt: page.publishedAt, linkedEventIds: item.linkedEventIds,
      routes: page.routes, revisionsBefore: page.revisions, revisionsAfter: page.revisions,
      alreadyApplied: true, existingVersion,
    }));
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
          slug: page.slug, title: page.title, summary: page.summary,
          heroImageUrl: page.heroImageUrl, content,
          seoH1: page.seoH1, seoTitle: page.seoTitle, seoDescription: page.seoDescription,
          canonicalPath: page.canonicalPath, status: 'READY', isIndexable: true,
          changeNote: `Редакторский рерайт, набор 150 (17.11.2026); опубликован и открыт к индексации`,
        });
        if (!updated || updated.slug !== item.slug || updated.status !== 'READY' || updated.isIndexable !== true) {
          throw new Error(`Update verification failed: ${item.slug}`);
        }
        const published = await publishAdminEventPage(db, item.eventPageId);
        if (!published || published.status !== 'READY' || published.isIndexable !== true || !published.publishedAt) {
          throw new Error(`Publish verification failed: ${item.slug}`);
        }
        resultPages.push({ eventPageId: item.eventPageId, eventId: item.eventId, slug: item.slug,
          title: item.title, city: item.city, batch: item.batch,
          sourceChars: item.sourceChars, rewriteChars: item.rewriteChars,
          substantiveParagraphs: item.substantiveParagraphs, status: published.status,
          isIndexable: published.isIndexable, publishedAt: published.publishedAt,
          linkedEventIds: item.linkedEventIds, routes: page.routes, revisionsBefore: page.revisions,
          revisionsAfter: published.revisions?.length ?? null });
      }
    } catch (error) {
      fs.writeFileSync(resultPath, `${JSON.stringify({ appliedAt: new Date().toISOString(), complete: false,
        error: error instanceof Error ? error.message : String(error), pages: resultPages }, null, 2)}\n`);
      throw error;
    }
    const output = { appliedAt: new Date().toISOString(), complete: true, pages: resultPages,
      counts: { appliedThisRun: resultPages.filter((page) => !page.alreadyApplied).length,
        alreadyAppliedBeforeRun: resultPages.filter((page) => page.alreadyApplied).length,
        totalIndexable: resultPages.filter((page) => page.isIndexable).length,
        byBatch: Object.fromEntries(batchNumbers.map((batch) => [batch, resultPages.filter((page) => page.batch === batch).length])) },
      linksRoutesAndSeoFieldsChanged: false };
    fs.writeFileSync(resultPath, `${JSON.stringify(output, null, 2)}\n`);
    process.stdout.write(JSON.stringify(output.counts));
  }
} finally {
  await db.close();
}
