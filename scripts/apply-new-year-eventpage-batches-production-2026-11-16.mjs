import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const editorial = path.join(root, 'data/ticketscloud/editorial');
const mainRepo = path.resolve(root, '..', '..', 'daibilet');
const envPath = path.join(mainRepo, '.env');
const queuePath = path.join(editorial, 'new-year-batch-final-queue-2026-11-16.csv');
const archivePath = path.join(editorial, 'new-year-batches-source-archive-2026-11-16.json');
const auditPath = path.join(editorial, 'new-year-batches-editorial-audit-2026-11-16.csv');
const backupPath = path.join(editorial, 'new-year-batches-production-before-apply-2026-11-16.json');
const resultPath = path.join(editorial, 'new-year-batches-production-result-2026-11-16.json');
const apply = process.argv.includes('--apply');
if (!apply && process.argv.includes('--preflight') === false) {
  throw new Error('Use --preflight for read-only validation or --apply to publish and index the 90 prepared EventPages.');
}

function parseCsv(text) {
  const lines = text.replace(/^\uFEFF/u, '').trim().split(/\r?\n/u);
  const parseRow = (line) => {
    const cells = []; let value = ''; let quoted = false;
    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      if (char === '"' && quoted && line[i + 1] === '"') { value += '"'; i += 1; }
      else if (char === '"') quoted = !quoted;
      else if (char === ',' && !quoted) { cells.push(value); value = ''; }
      else value += char;
    }
    cells.push(value); return cells;
  };
  const headers = parseRow(lines[0]);
  return lines.slice(1).map((line) => Object.fromEntries(parseRow(line).map((value, i) => [headers[i], value])));
}
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value;
}
function assert(condition, message) { if (!condition) throw new Error(message); }
function plainChars(text) {
  const decode = (value) => value.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/giu, (match, entity) => {
    const key = entity.toLowerCase();
    if (key.startsWith('#x')) return String.fromCodePoint(parseInt(key.slice(2), 16));
    if (key.startsWith('#')) return String.fromCodePoint(Number(key.slice(1)));
    return ({ amp: '&', lt: '<', gt: '>', quot: '\"', apos: "'", nbsp: ' ' })[key] || match;
  });
  return decode(text.replace(/<[^>]+>/gu, ' ')).replace(/[#*`]/gu, ' ').replace(/\s+/gu, ' ').trim().length;
}
function getProductionUrl() {
  const envText = fs.readFileSync(envPath, 'utf8');
  const raw = envText.match(/^DATABASE_URL=(.*)$/mu)?.[1]?.trim().replace(/^['"]|['"]$/gu, '');
  if (!raw) throw new Error('DATABASE_URL is missing from the project .env');
  const url = new URL(raw);
  url.hostname = '127.0.0.1'; url.port = '5433'; url.pathname = '/daibilet';
  assert(url.hostname === '127.0.0.1' && url.port === '5433' && url.pathname === '/daibilet', 'Refusing any DB target other than production SSH tunnel 127.0.0.1:5433/daibilet');
  return url.toString();
}
function parseMarkdownBatch(batch) {
  const file = path.join(editorial, `new-year-batch-${String(batch).padStart(2, '0')}-rewrites-2026-11-16.md`);
  const markdown = fs.readFileSync(file, 'utf8');
  const blocks = markdown.split(/^## (?=\d+\. )/mu).slice(1);
  assert(blocks.length === 30, `Batch ${batch} must contain 30 entries, got ${blocks.length}`);
  return blocks.map((block) => {
    const match = block.match(/^(\d+)\. ([^\r\n]+)\r?\n([\s\S]*)$/u);
    assert(match, `Cannot parse an entry in batch ${batch}`);
    const number = Number(match[1]);
    const parts = match[3].split(/^### Практическая информация\s*$/mu);
    assert(parts.length === 2, `Batch ${batch} entry ${number} lacks the practical information block`);
    const main = parts[0].trim(); const practical = parts[1].trim();
    const paragraphs = main.split(/\r?\n\s*\r?\n/u).map((item) => item.trim()).filter((item) => item && !/^#{1,6}\s/u.test(item));
    assert(paragraphs.length >= 2, `Batch ${batch} entry ${number} has fewer than two substantive paragraphs`);
    assert(/^- \*\*[^*]+:\*\*/mu.test(practical), `Batch ${batch} entry ${number} has no practical-info list`);
    return { batch, number, heading: match[2], main, practical };
  });
}
const queue = parseCsv(fs.readFileSync(queuePath, 'utf8'));
const archive = JSON.parse(fs.readFileSync(archivePath, 'utf8'));
const audit = parseCsv(fs.readFileSync(auditPath, 'utf8'));
const auditByKey = new Map(audit.map((row) => [`${row.batch}:${row.number}`, row]));
const archivedById = new Map(archive.eventPages.map((page) => [page.eventPageId, page]));
const pages = [1, 2, 3].flatMap((batch) => {
  const worksetPath = path.join(editorial, `new-year-batch-${String(batch).padStart(2, '0')}-workset-2026-11-16.json`);
  const workset = JSON.parse(fs.readFileSync(worksetPath, 'utf8'));
  return parseMarkdownBatch(batch).map((entry) => {
    const sourceRow = workset[entry.number - 1];
    const row = queue.find((candidate) => candidate.eventpage_id === sourceRow?.eventPageId);
    assert(row && row.slug === sourceRow.slug, `No exact queue mapping for batch ${batch}, row ${entry.number}`);
    const archived = archivedById.get(row.eventpage_id);
    const auditRow = auditByKey.get(`${batch}:${entry.number}`);
    assert(auditRow && auditRow.eventpage_id === row.eventpage_id && auditRow.length_pass === 'True', `Editorial audit failed or mapping mismatched for ${row.slug}`);
    assert(archived && archived.slug === row.slug, `Archive mapping mismatch at ${batch}/${entry.number}`);
    assert(plainChars(entry.main) >= Number(auditRow.provider_original_plain_chars), `Rewrite is shorter than the original for ${row.slug}: ${plainChars(entry.main)} < ${row.sourceChars}`);
    const linked = (archived.events || []).map((event) => event.id).sort();
    const expectedLinked = String(row.eventIds || '').split('|').filter(Boolean).sort();
    assert(JSON.stringify(linked) === JSON.stringify(expectedLinked), `Archived Event ID set differs from queue for ${row.slug}`);
    return {
      ...entry, id: row.eventpage_id, slug: row.slug, title: row.title, url: row.url, eventIds: linked,
      sourceChars: Number(auditRow.provider_original_plain_chars),
      content: {
        sections: [
          { id: 'about', kind: 'about', title: 'О событии', body: entry.main, items: [] },
          { id: 'practical-info', kind: 'custom', title: 'Практическая информация', body: entry.practical, items: [] },
        ],
        activeEditorialText: { field: 'sections', status: 'ACTIVE_EDITORIAL_REWRITE', version: 'new-year-2026-2027-batches-01-03-2026-11-16' },
      },
    };
  });
});
assert(pages.length === 90 && new Set(pages.map((page) => page.id)).size === 90 && new Set(pages.map((page) => page.url)).size === 90, 'Expected 90 unique EventPages and URLs');
if (apply) assert(fs.existsSync(backupPath), `Run --preflight first; production backup is missing: ${path.basename(backupPath)}`);
let priorResult = null;
if (apply && fs.existsSync(resultPath)) { priorResult = JSON.parse(fs.readFileSync(resultPath, 'utf8')); assert(priorResult.complete !== true, 'Production apply is already complete'); }

const { updateAdminEventPage, publishAdminEventPage } = await import(pathToFileURL(path.join(root, 'apps/backend/src/event-pages.js')).href);
process.env.DATABASE_URL = getProductionUrl();
// Load pg from the user's main checkout, while executing the event-page service from this isolated worktree.
const requireFromMainDb = createRequire(path.join(mainRepo, 'packages/db/package.json'));
const { Pool } = requireFromMainDb('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 3 });
const db = {
  query: (sql, params) => pool.query(sql, params),
  transaction: async (callback) => {
    const client = await pool.connect();
    try { await client.query('BEGIN'); const result = await callback({ query: (sql, params) => client.query(sql, params) }); await client.query('COMMIT'); return result; }
    catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  },
};
const snapshotQuery = `
  SELECT page.id, page.slug, page.title, page.summary, page."heroImageUrl", page.content,
    page."seoH1", page."seoTitle", page."seoDescription", page."canonicalPath", page.status, page."isIndexable", page."publishedAt",
    COALESCE((SELECT jsonb_agg(jsonb_build_object('eventId', link."eventId", 'position', link.position, 'role', link.role) ORDER BY link.position) FROM "EventPageEvent" link WHERE link."eventPageId" = page.id), '[]'::jsonb) AS links,
    COALESCE((SELECT jsonb_agg(jsonb_build_object('path', route.path, 'kind', route.kind, 'source', route.source) ORDER BY route.path) FROM "EventPageRoute" route WHERE route."eventPageId" = page.id), '[]'::jsonb) AS routes,
    (SELECT count(*)::int FROM "EventPageRevision" revision WHERE revision."eventPageId" = page.id) AS revisions,
    (SELECT count(DISTINCT event.id)::int FROM "EventPageEvent" link JOIN "Event" event ON event.id = link."eventId"
      WHERE link."eventPageId" = page.id
        AND EXISTS (SELECT 1 FROM "EventOffer" offer WHERE offer."eventId" = event.id AND offer.active IS TRUE)
        AND EXISTS (SELECT 1 FROM "EventSession" session WHERE session."eventId" = event.id AND session."isActive" IS NOT FALSE
          AND session."archivedAt" IS NULL AND session."cancelledAt" IS NULL AND session."startsAt" >= now()
          AND lower(coalesce(session."sourceStatus", '')) NOT IN ('widget_blocked','paused','suspended','stopped','cancelled','canceled','draft','hidden','stand_by','closed','sales_closed','sale_closed','not_for_sale'))
    ) AS "activeEventCount"
  FROM "EventPage" page WHERE page.id = $1`;
function equal(a, b) { return JSON.stringify(stable(a)) === JSON.stringify(stable(b)); }
try {
  const identity = await db.query('SELECT current_database() AS database, now() AS checked_at');
  assert(identity.rows[0]?.database === 'daibilet', 'Connected DB name is not production daibilet');
  const baseline = await db.query(`SELECT count(*)::int AS count FROM "EventPage" WHERE status = 'READY' AND "isIndexable" IS TRUE`);
  const backup = apply ? JSON.parse(fs.readFileSync(backupPath, 'utf8')) : null;
  if (apply) assert(backup.database === 'daibilet' && backup.pages.length === 90, 'Production backup is invalid');
  const backupById = new Map((backup?.pages || []).map((page) => [page.id, page]));
  const live = [];
  const alreadyApplied = [];
  for (const item of pages) {
    const result = await db.query(snapshotQuery, [item.id]); const page = result.rows[0];
    assert(page && page.slug === item.slug, `Missing or changed exact page ${item.slug}`);
    assert((page.links || []).length === item.eventIds.length && equal(page.links.map((link) => link.eventId).sort(), item.eventIds), `EventPage ↔ Event links differ for ${item.slug}`);
    assert((page.routes || []).some((route) => route.path === `/events/${item.slug}`), `Expected route missing for ${item.slug}`);
    assert(page.activeEventCount > 0, `No future saleable Event ID remains for ${item.slug}`);
    const archived = archivedById.get(item.id);
    for (const field of ['title', 'summary', 'heroImageUrl']) assert(page[field] === archived[field], `${field} changed since source snapshot: ${item.slug}`);
    if (!apply) {
      assert(page.status === 'DRAFT' && page.isIndexable === false && page.publishedAt === null, `Not an unpublished draft: ${item.slug}`);
      assert(equal(page.content, archived.content), `Draft content changed since source snapshot: ${item.slug}`);
      assert(!page.content?.activeEditorialText, `Active editorial rewrite already exists: ${item.slug}`);
      live.push({ item, page });
      continue;
    }
    const prior = backupById.get(item.id);
    assert(prior && prior.slug === item.slug && equal(page.links, prior.links) && equal(page.routes, prior.routes), `Page identity changed since preflight: ${item.slug}`);
    if (page.status === 'DRAFT' && page.isIndexable === false && page.publishedAt === null && equal(page.content, prior.content)) {
      live.push({ item, page });
      continue;
    }
    if (page.status === 'READY' && page.isIndexable === true && page.publishedAt && equal(page.content, item.content)) {
      alreadyApplied.push({ id: item.id, slug: item.slug, url: item.url, batch: item.batch, title: item.title, status: page.status,
        isIndexable: page.isIndexable, publishedAt: page.publishedAt, eventIds: page.links.map((link) => link.eventId),
        routes: page.routes.map((route) => route.path), linksAndRoutesChanged: false });
      continue;
    }
    throw new Error(`Live state is neither the archived draft nor the exact applied rewrite: ${item.slug}`);
  }
  if (!apply) assert(live.length === 90, `Expected 90 live drafts, found ${live.length}`);
  if (!apply) {
    const backup = { capturedAt: new Date().toISOString(), database: identity.rows[0].database, indexableEventPagesBefore: baseline.rows[0].count, pages: live.map(({ page }) => page) };
    if (fs.existsSync(backupPath)) throw new Error(`Backup already exists; refusing to overwrite ${path.basename(backupPath)}`);
    fs.writeFileSync(backupPath, `${JSON.stringify(backup, null, 2)}\n`, 'utf8');
    process.stdout.write(JSON.stringify({ mode: 'preflight', database: identity.rows[0].database, pages: live.length, futureSaleablePages: live.filter(({ page }) => page.activeEventCount > 0).length, indexableEventPagesBefore: baseline.rows[0].count, backup: path.basename(backupPath) }, null, 2));
  } else {
    assert(backup.pages.length === 90, 'Production backup is invalid');
    const baselineBefore = Number(backup.indexableEventPagesBefore);
    assert(baseline.rows[0].count >= baselineBefore + alreadyApplied.length, `Indexable baseline unexpectedly fell: before=${baselineBefore} now=${baseline.rows[0].count}`);
    if (priorResult) {
      const priorIds = new Set(priorResult.pages.map((page) => page.id));
      assert(priorResult.pages.every((page) => pages.some((item) => item.id === page.id && page.slug === item.slug)), 'Partial result contains an unknown page mapping');
    }
    const resultById = new Map([...(priorResult?.pages || []), ...alreadyApplied].map((page) => [page.id, page]));
    const results = [...resultById.values()];
    const writePartial = () => fs.writeFileSync(resultPath, `${JSON.stringify({ startedAt: backup.capturedAt, appliedAt: new Date().toISOString(), complete: false, pages: results }, null, 2)}\n`, 'utf8');
    if (!priorResult) writePartial();
    let next = 0;
    const failures = [];
    async function worker() {
      while (next < live.length) {
        const index = next++;
        const { item, page } = live[index];
        try {
          const updated = await updateAdminEventPage(db, item.id, {
            slug: page.slug, title: page.title, summary: page.summary, heroImageUrl: page.heroImageUrl, content: item.content,
            seoH1: page.seoH1, seoTitle: page.seoTitle, seoDescription: page.seoDescription, canonicalPath: page.canonicalPath,
            status: 'READY', isIndexable: true,
            changeNote: `Редакторский рерайт: новогодний пакет 01-03 (16.11.2026); опубликовано, indexable; исходный текст сохранён в архиве`,
          });
          assert(updated?.status === 'READY' && updated.isIndexable === true && updated.slug === item.slug, `Update failed for ${item.slug}`);
          const published = await publishAdminEventPage(db, item.id);
          assert(published?.status === 'READY' && published.isIndexable === true && published.publishedAt, `Publish failed for ${item.slug}`);
          results.push({ id: item.id, slug: item.slug, url: item.url, batch: item.batch, title: item.title, status: published.status,
            isIndexable: published.isIndexable, publishedAt: published.publishedAt, eventIds: page.links.map((link) => link.eventId),
            routes: page.routes.map((route) => route.path), linksAndRoutesChanged: false });
          writePartial();
        } catch (error) {
          failures.push({ slug: item.slug, error: error instanceof Error ? error.message : String(error) });
        }
      }
    }
    await Promise.all(Array.from({ length: Math.min(3, live.length) }, () => worker()));
    if (failures.length) { writePartial(); throw new Error(`Apply incomplete; ${failures.length} page(s) failed: ${JSON.stringify(failures)}`); }
    const after = await db.query(`SELECT count(*)::int AS count FROM "EventPage" WHERE status = 'READY' AND "isIndexable" IS TRUE`);
    assert(results.length === 90 && after.rows[0].count === baselineBefore + 90, `Unexpected final indexable count: ${after.rows[0].count}`);
    const output = { startedAt: backup.capturedAt, completedAt: new Date().toISOString(), complete: true, pages: results,
      counts: { applied: 90, indexable: 90, indexableEventPagesBefore: baselineBefore, indexableEventPagesAfter: after.rows[0].count },
      linksRoutesSeoFieldsChanged: false };
    fs.writeFileSync(resultPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
    process.stdout.write(JSON.stringify(output.counts));
  }
} finally { await pool.end(); }
