import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mainRepo = path.resolve(root, '..', '..', 'daibilet');
const editorial = path.join(root, 'data/ticketscloud/editorial');
const backupPath = path.join(editorial, 'eventpage-nov17-batches-01-03-production-before-apply.json');
const resultPath = path.join(editorial, 'eventpage-nov17-batches-01-03-production-result.json');
const versionLabel = '2026-11-17-eventpage-rewrites-batches-01-03';

function assert(value, message) { if (!value) throw new Error(message); }
function plainText(value) {
  return String(value ?? '').replace(/<[^>]*>/gu, ' ').replace(/&nbsp;|&#160;/giu, ' ')
    .replace(/^\s{0,3}#{1,6}\s+/gmu, '').replace(/^\s*[-*+]\s+/gmu, '')
    .replace(/[*_`>#]/gu, '').replace(/\s+/gu, ' ').trim();
}
function getItems() {
  const items = [];
  for (let batch = 1; batch <= 3; batch += 1) {
    const prefix = `eventpage-nov17-batch-${String(batch).padStart(2, '0')}`;
    const archive = JSON.parse(fs.readFileSync(path.join(editorial, `${prefix}-source-archive.json`), 'utf8'));
    const audit = JSON.parse(fs.readFileSync(path.join(editorial, `${prefix}-audit.json`), 'utf8'));
    const markdown = fs.readFileSync(path.join(editorial, `${prefix}-rewrites.md`), 'utf8').replace(/^\uFEFF/u, '');
    assert(archive.pages.length === 30 && audit.allPass && audit.entryCount === 30, `Batch ${batch} audit failed`);
    const headers = [...markdown.matchAll(/^## (\d+)\. ([^\r\n]+)\r?\n/gmu)];
    assert(headers.length === 30, `Batch ${batch} text count mismatch`);
    for (let i = 0; i < headers.length; i += 1) {
      const page = archive.pages[i];
      const row = audit.entries[i];
      const body = markdown.slice(headers[i].index + headers[i][0].length, headers[i + 1]?.index ?? markdown.length).trim();
      const practicalMatches = [...body.matchAll(/^### Практическая информация\s*$/gmu)];
      assert(practicalMatches.length === 1 && page.id === row.pageId && page.slug === row.slug, `Batch ${batch}/${i + 1} mapping error`);
      const mainBody = body.slice(0, practicalMatches[0].index).trim();
      const practicalInfo = body.slice(practicalMatches[0].index + practicalMatches[0][0].length).trim();
      const paragraphs = mainBody.split(/\r?\n\s*\r?\n/u).map(plainText).filter((text) => text.length > 60);
      assert(plainText(mainBody).length >= row.originalChars && paragraphs.length >= 2, `Batch ${batch}/${i + 1} length/paragraph check failed`);
      assert(/^- \*\*[^*]+:\*\*/mu.test(practicalInfo), `Batch ${batch}/${i + 1} practical info format failed`);
      items.push({ batch, pageId: page.id, slug: page.slug, title: page.title, eventIds: [...new Set(page.events.map((event) => event.eventId))].sort(), mainBody, practicalInfo, originalChars: row.originalChars, rewriteChars: plainText(mainBody).length, substantiveParagraphs: paragraphs.length });
    }
  }
  assert(items.length === 90 && new Set(items.map((item) => item.pageId)).size === 90, 'Expected 90 distinct pages');
  return items;
}
function getDatabaseUrl() {
  const line = fs.readFileSync(path.join(mainRepo, '.env'), 'utf8').match(/^DATABASE_URL=(.*)$/mu)?.[1]?.trim().replace(/^['"]|['"]$/gu, '');
  assert(line, 'DATABASE_URL missing');
  const url = new URL(line); url.hostname = '127.0.0.1'; url.port = '5433'; url.pathname = '/daibilet';
  assert(url.hostname === '127.0.0.1' && url.port === '5433' && url.pathname === '/daibilet', 'Wrong database target');
  return url.toString();
}
const requireFromDb = createRequire(path.join(root, 'packages/db/package.json'));
const { Client } = requireFromDb('pg');
const client = new Client({ connectionString: getDatabaseUrl(), connectionTimeoutMillis: 10000, statement_timeout: 30000, query_timeout: 35000, application_name: 'daibilet-editorial-apply-nov17-90' });
const items = getItems();
assert(fs.existsSync(backupPath), 'Expected pre-apply production snapshot');
let checkpoint = { appliedAt: null, complete: false, database: 'daibilet', pages: [] };
if (fs.existsSync(resultPath)) {
  checkpoint = JSON.parse(fs.readFileSync(resultPath, 'utf8'));
  assert(checkpoint.database === 'daibilet' && Array.isArray(checkpoint.pages), 'Unexpected existing apply checkpoint');
}
const done = new Map(checkpoint.pages.map((page) => [page.eventPageId, page]));
const skipped = [];
const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
const backupById = new Map(backup.pages.map((page) => [page.id, page]));
for (const item of items) assert(backupById.has(item.pageId), `Missing archived page ${item.slug}`);

function revisionSnapshot(page) {
  return { slug: page.slug, title: page.title, summary: page.summary, heroImageUrl: page.heroImageUrl ?? null,
    content: page.content, seoH1: page.seoH1, seoTitle: page.seoTitle, seoDescription: page.seoDescription, canonicalPath: page.canonicalPath };
}
async function saveRevision(page, sourceSnapshot, note) {
  const v = await client.query('SELECT COALESCE(MAX(version),0)+1 AS version FROM "EventPageRevision" WHERE "eventPageId"=$1', [page.id]);
  await client.query(`INSERT INTO "EventPageRevision" (id,"eventPageId",version,content,"sourceSnapshot","changeNote","createdBy") VALUES ($1,$2,$3,$4::jsonb,$5::jsonb,$6,NULL)`,
    [randomUUID(), page.id, v.rows[0].version, JSON.stringify(revisionSnapshot(page)), JSON.stringify(sourceSnapshot), note]);
}
function writeCheckpoint(complete = false) {
  checkpoint.appliedAt ??= new Date().toISOString();
  checkpoint.complete = complete;
  checkpoint.counts = { applied: checkpoint.pages.length, indexable: checkpoint.pages.filter((page) => page.isIndexable).length };
  checkpoint.linksRoutesAndSeoFieldsChanged = false;
  fs.writeFileSync(resultPath, `${JSON.stringify(checkpoint, null, 2)}\n`, 'utf8');
}

try {
  await client.connect();
  const identity = await client.query('SELECT current_database() AS database');
  assert(identity.rows[0].database === 'daibilet', 'Connected database is not production');
  for (const item of items) {
    if (done.has(item.pageId)) continue;
    await client.query('BEGIN');
    try {
      const current = await client.query('SELECT * FROM "EventPage" WHERE id=$1 FOR UPDATE NOWAIT', [item.pageId]);
      const page = current.rows[0];
      assert(page && page.slug === item.slug, `Production page mismatch: ${item.slug}`);
      if (page.status === 'READY' && page.isIndexable === true && page.content?.activeEditorialText?.version === versionLabel) {
        await client.query('COMMIT');
        done.set(item.pageId, { eventPageId: page.id, slug: page.slug, title: page.title, batch: item.batch, status: page.status, isIndexable: true, recovered: true });
        checkpoint.pages = [...done.values()]; writeCheckpoint();
        continue;
      }
      assert(page.status === 'DRAFT' && page.isIndexable === false && page.publishedAt === null, `Refusing to overwrite non-draft page: ${item.slug}`);
      const currentContent = page.content && typeof page.content === 'object' ? page.content : {};
      assert(!JSON.stringify(currentContent).includes('ACTIVE_EDITORIAL_REWRITE'), `Existing active rewrite on ${item.slug}`);
      const linkResult = await client.query('SELECT "eventId",position,role,"sourceSnapshot" FROM "EventPageEvent" WHERE "eventPageId"=$1 ORDER BY position', [item.pageId]);
      assert(JSON.stringify([...new Set(linkResult.rows.map((link) => link.eventId))].sort()) === JSON.stringify(item.eventIds), `Event links changed: ${item.slug}`);
      const routeResult = await client.query('SELECT path,kind,source,"createdAt" FROM "EventPageRoute" WHERE "eventPageId"=$1 ORDER BY "createdAt"', [item.pageId]);
      assert(routeResult.rows.some((route) => route.path === `/events/${item.slug}`), `Route missing: ${item.slug}`);
      const group = await client.query('SELECT "tourGroupId" FROM "EventPage" WHERE id=$1', [item.pageId]);
      const sourceSnapshot = { events: linkResult.rows, routes: routeResult.rows, tourGroupId: group.rows[0]?.tourGroupId ?? null };
      const content = { ...currentContent, sections: [
        { id: 'about', kind: 'about', title: 'О событии', body: item.mainBody, items: [] },
        { id: 'practical-info', kind: 'custom', title: 'Практическая информация', body: item.practicalInfo, items: [] },
      ], activeEditorialText: { field: 'sections', status: 'ACTIVE_EDITORIAL_REWRITE', version: versionLabel } };
      const update = await client.query(`UPDATE "EventPage" SET content=$2::jsonb,status='READY',"isIndexable"=true,"updatedAt"=now() WHERE id=$1 RETURNING *`, [item.pageId, JSON.stringify(content)]);
      const updated = update.rows[0];
      await saveRevision(updated, sourceSnapshot, `Редакторский рерайт, батч ${item.batch}, 17.11.2026; открыт к индексации`);
      await client.query('UPDATE "EventPage" SET "publishedAt"=COALESCE("publishedAt",now()),"updatedAt"=now() WHERE id=$1', [item.pageId]);
      await saveRevision(updated, sourceSnapshot, 'Опубликован текст EventPage');
      await client.query('COMMIT');
      const result = { eventPageId: item.pageId, slug: item.slug, title: item.title, batch: item.batch, eventIds: item.eventIds,
        originalChars: item.originalChars, rewriteChars: item.rewriteChars, substantiveParagraphs: item.substantiveParagraphs,
        status: 'READY', isIndexable: true, publishedAt: new Date().toISOString(), routes: routeResult.rows.map((route) => route.path),
        revisionsBefore: backupById.get(item.pageId).revisions, revisionsAfter: backupById.get(item.pageId).revisions + 2 };
      done.set(item.pageId, result); checkpoint.pages = [...done.values()].sort((a, b) => items.findIndex((x) => x.pageId === a.eventPageId) - items.findIndex((x) => x.pageId === b.eventPageId)); writeCheckpoint();
      process.stdout.write(`Applied ${checkpoint.pages.length}/90: ${item.slug}\n`);
    } catch (error) {
      await client.query('ROLLBACK');
      if (error?.code === '55P03') {
        skipped.push({ eventPageId: item.pageId, slug: item.slug, reason: 'row_locked_by_another_transaction' });
        process.stdout.write(`Skipped locked row ${item.slug}\n`);
        continue;
      }
      throw error;
    }
  }
  checkpoint.pages = [...done.values()];
  checkpoint.skipped = skipped;
  writeCheckpoint(checkpoint.pages.length === 90);
  process.stdout.write(JSON.stringify(checkpoint.counts));
} finally {
  await client.end();
}
