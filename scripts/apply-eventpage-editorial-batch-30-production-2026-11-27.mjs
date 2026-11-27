import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const dir = path.join(root, 'data/ticketscloud/editorial');
const markdownFile = 'eventpage-editorial-batch-30-rewrites-2026-11-26.md';
const archiveFile = 'eventpage-editorial-batch-30-source-archive-2026-11-26.json';
const auditJsonFile = 'eventpage-editorial-batch-30-audit-2026-11-26.json';
const auditCsvFile = 'eventpage-editorial-batch-30-audit-2026-11-26.csv';
const backupFile = 'eventpage-editorial-batch-30-before-apply-production-2026-11-27.json';
const resultFile = 'eventpage-editorial-batch-30-production-result-2026-11-27.json';
const version = '2026-11-27-eventpage-editorial-batch-30';
const apply = process.argv.includes('--apply');
const readJson = (name) => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
const markdown = fs.readFileSync(path.join(dir, markdownFile), 'utf8');
const archive = readJson(archiveFile);
const previousAudit = readJson(auditJsonFile);

function stripHtml(value) {
  return String(value || '').replace(/<br\s*\/?\s*>/giu, '\n').replace(/<[^>]*>/gu, ' ').replace(/&nbsp;/giu, ' ');
}
function plain(value) {
  return stripHtml(value).replace(/[`*_>#]/gu, '').replace(/\s+/gu, ' ').trim();
}
function sourceBodyChars(value) {
  let text = stripHtml(value);
  for (const marker of ['Как проходит экскурсия', 'Место и время встречи', 'Практическая информация', 'Где и когда', 'Льготные категории граждан', 'Льготные категории']) {
    const index = text.indexOf(marker);
    if (index >= 0) { text = text.slice(0, index); break; }
  }
  text = text.split(/\r?\n/gu).filter((line) =>
    !/^\s*(?:[-•*]\s*)?(?:Адрес|Площадка|Место встречи|Возрастное ограничение|Возраст|Тайминг|Начало|Время сбора|Продолжительность|Билеты|Цена|Телефон|Промокод|Важно|Часы работы кассы|Информация о льготах)\s*[:—-]/iu.test(line)
    && !/^\s*(?:Детям до|Отдельный билет|Аудитория)\b/iu.test(line),
  ).join(' ');
  return plain(text).length;
}
function paragraphCount(body) {
  return body.split(/\r?\n\s*\r?\n/gu).map(plain).filter((paragraph) => paragraph.length > 40).length;
}
function parseRows() {
  const headers = [...markdown.matchAll(/^## (\d+)\. ([^\r\n]+)\r?$/gmu)];
  if (headers.length !== 30) throw new Error(`Expected exactly 30 numbered rewrites; found ${headers.length}`);
  const errors = [];
  const rows = headers.map((match, index) => {
    const number = Number(match[1]);
    const section = markdown.slice(match.index, headers[index + 1]?.index ?? markdown.length);
    const id = section.match(/^- EventPage ID: ([^\r\n]+)/mu)?.[1]?.trim();
    const slug = section.match(/^- URL: https:\/\/daibilet\.ru\/events\/([^\s\r\n]+)/mu)?.[1]?.trim();
    const summary = section.match(/### Кратко\s*\r?\n([\s\S]*?)\r?\n### О событии/u)?.[1]?.trim();
    const body = section.match(/### О событии\s*\r?\n([\s\S]*?)\r?\n### Практическая информация/u)?.[1]?.trim();
    const practical = section.match(/### Практическая информация\s*\r?\n([\s\S]*?)(?=\r?\n#{2,3} (?:\d+\.|Факты для уточнения)|$)/u)?.[1]?.trim();
    const sourcePage = archive.pages.find((page) => page.id === id || page.slug === slug);
    if (!id || !slug || !summary || !body || !practical || !sourcePage || sourcePage.id !== id || sourcePage.slug !== slug) {
      throw new Error(`Missing exact mapping or content at batch row ${number}`);
    }
    const eventIds = [...new Set((sourcePage.events || []).map((event) => String(event.eventId)).filter(Boolean))].sort();
    const sources = (sourcePage.events || []).flatMap((event) => [
      event.sourceSnapshot?.description,
      event.event?.description,
      event.event?.override_description,
      event.event?.shortDescription,
    ]).filter(Boolean);
    const sourceChars = Math.max(0, ...sources.map(sourceBodyChars));
    const rewriteChars = plain(`${summary} ${body}`).length;
    const paragraphs = paragraphCount(body);
    if (!eventIds.length || !sourceChars || paragraphs < 2 || rewriteChars < sourceChars) {
      errors.push(`${slug}: rewrite=${rewriteChars}, original=${sourceChars}, paragraphs=${paragraphs}`);
    }
    if (/\bEventPage\b/iu.test(`${summary}\n${body}`)) errors.push(`${slug}: internal product term in customer text`);
    const practicalLines = practical.split(/\r?\n/gu).map((line) => line.trim()).filter(Boolean);
    if (!practicalLines.length || practicalLines.some((line) => !/^- \*\*[^*]+:\*\*/u.test(line))) {
      errors.push(`${slug}: practical information must use the agreed UL format`);
    }
    return { number, id, slug, title: match[2].trim(), summary, body, practical, eventIds, sourcePage, sourceChars, rewriteChars, paragraphs };
  });
  if (errors.length) throw new Error(`Editorial audit failed:\n${errors.join('\n')}`);
  const ids = rows.flatMap((row) => row.eventIds);
  if (new Set(rows.map((row) => row.id)).size !== 30) throw new Error('Duplicate EventPage IDs in batch');
  if (new Set(rows.map((row) => row.slug)).size !== 30) throw new Error('Duplicate slugs in batch');
  if (new Set(ids).size !== ids.length) throw new Error('Duplicate Event IDs across batch pages');
  if (ids.length !== 370) throw new Error(`Expected 370 exact linked Event IDs, found ${ids.length}`);
  return rows;
}

function loadProductionDatabaseUrl() {
  const envPath = path.join(root, '.env');
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/gu)) {
    const text = line.trim();
    if (!text || text.startsWith('#')) continue;
    const equals = text.indexOf('=');
    if (equals > 0) process.env[text.slice(0, equals).trim()] = text.slice(equals + 1).trim().replace(/^['"]|['"]$/gu, '');
  }
  const url = new URL(process.env.DATABASE_URL || '');
  if (url.pathname.endsWith('/daibilet_baseline')) {
    url.hostname = '127.0.0.1';
    url.port = '5433';
    url.pathname = '/daibilet';
  }
  if (url.hostname !== '127.0.0.1' || url.port !== '5433' || url.pathname !== '/daibilet') {
    throw new Error('Refusing production apply outside the configured SSH tunnel database daibilet');
  }
  process.env.DATABASE_URL = url.toString();
}

const rows = parseRows();
loadProductionDatabaseUrl();
const { createDb } = await import(pathToFileURL(path.join(root, 'apps/backend/src/db.js')).href);
const { updateAdminEventPage, publishAdminEventPage } = await import(pathToFileURL(path.join(root, 'apps/backend/src/event-pages.js')).href);
const db = createDb(root);
try {
  const identity = await db.query('SELECT current_database() AS database, now() AS "checkedAt"');
  if (identity.rows[0]?.database !== 'daibilet') throw new Error('Connected database is not production daibilet');
  const pageIds = rows.map((row) => row.id);
  const liveResult = await db.query(`
    SELECT p.id, p.slug, p.title, p.summary, p."heroImageUrl", p.content,
      p."seoH1", p."seoTitle", p."seoDescription", p."canonicalPath", p.status,
      p."isIndexable", p."publishedAt", p."tourGroupId",
      COALESCE((SELECT jsonb_agg(jsonb_build_object('eventId', l."eventId", 'position', l.position, 'role', l.role) ORDER BY l.position, l."createdAt")
        FROM "EventPageEvent" l WHERE l."eventPageId" = p.id), '[]'::jsonb) AS links,
      COALESCE((SELECT jsonb_agg(jsonb_build_object('path', r.path, 'kind', r.kind, 'source', r.source) ORDER BY r.path)
        FROM "EventPageRoute" r WHERE r."eventPageId" = p.id), '[]'::jsonb) AS routes,
      (SELECT count(*)::int FROM "EventPageRevision" rev WHERE rev."eventPageId" = p.id) AS revisions,
      (SELECT count(DISTINCT e.id)::int
        FROM "EventPageEvent" l JOIN "Event" e ON e.id = l."eventId"
        WHERE l."eventPageId" = p.id
          AND EXISTS (SELECT 1 FROM "EventOffer" o WHERE o."eventId" = e.id AND o.active IS TRUE)
          AND EXISTS (SELECT 1 FROM "EventSession" s WHERE s."eventId" = e.id
            AND s."isActive" IS NOT FALSE AND s."cancelledAt" IS NULL AND s."archivedAt" IS NULL
            AND s."startsAt" >= now()
            AND lower(coalesce(s."sourceStatus", '')) NOT IN
              ('widget_blocked','paused','suspended','stopped','cancelled','canceled','draft','hidden','stand_by','closed','sales_closed','sale_closed','not_for_sale'))
      ) AS "activeSaleableEvents"
    FROM "EventPage" p WHERE p.id = ANY($1::text[])
  `, [pageIds]);
  if (liveResult.rows.length !== 30) throw new Error(`Production contains ${liveResult.rows.length}/30 target EventPages`);
  const liveById = new Map(liveResult.rows.map((page) => [page.id, page]));
  const livePages = [];
  for (const row of rows) {
    const page = liveById.get(row.id);
    if (!page || page.slug !== row.slug) throw new Error(`Exact EventPage/slug mismatch: ${row.slug}`);
    if (page.status !== 'DRAFT' || page.isIndexable !== false || page.publishedAt != null
      || page.content?.activeEditorialText?.status === 'ACTIVE_EDITORIAL_REWRITE') {
      throw new Error(`Target no longer is a clean unpublished draft: ${row.slug}`);
    }
    const linkedIds = page.links.map((link) => String(link.eventId)).sort();
    if (linkedIds.join('|') !== row.eventIds.join('|')) throw new Error(`EventPage ↔ Event ID links changed: ${row.slug}`);
    const routes = (page.routes || []).map((route) => route.path).sort();
    if (!routes.includes(`/events/${row.slug}`)) throw new Error(`Expected public route missing: ${row.slug}`);
    if (page.canonicalPath && page.canonicalPath !== `/events/${row.slug}`) throw new Error(`Unexpected existing canonical route: ${row.slug}`);
    if (page.activeSaleableEvents < 1) throw new Error(`No linked future saleable event remains: ${row.slug}`);
    livePages.push({ ...page, routes });
  }

  const audit = rows.map((row) => {
    const previous = previousAudit.find((item) => item.batch === row.number) || {};
    return {
      batch: row.number,
      eventPageId: row.id,
      slug: row.slug,
      title: row.title,
      city: row.sourcePage.city || previous.city || '',
      originalChars: row.sourceChars,
      rewriteChars: row.rewriteChars,
      paragraphs: row.paragraphs,
      linkedEventIds: row.eventIds.length,
      activeFutureSlots: previous.activeFutureSlots || 0,
      hasActiveOffers: previous.hasActiveOffers === true,
      check: 'PASS',
    };
  });
  fs.writeFileSync(path.join(dir, auditJsonFile), `${JSON.stringify(audit, null, 2)}\n`, 'utf8');
  const csvEscape = (value) => `"${String(value ?? '').replace(/"/gu, '""')}"`;
  const csvRows = [['Batch','EventPage ID','Slug','Title','City','Original chars','Rewrite chars','Paragraphs','Linked Event IDs','Active future slots','Active offers','Check'],
    ...audit.map((row) => [row.batch,row.eventPageId,row.slug,row.title,row.city,row.originalChars,row.rewriteChars,row.paragraphs,row.linkedEventIds,row.activeFutureSlots,row.hasActiveOffers,row.check])];
  fs.writeFileSync(path.join(dir, auditCsvFile), `${csvRows.map((line) => line.map(csvEscape).join(',')).join('\n')}\n`, 'utf8');

  if (!apply) {
    const backup = { createdAt: new Date().toISOString(), database: 'daibilet', checkedAt: identity.rows[0].checkedAt,
      version, pages: livePages };
    fs.writeFileSync(path.join(dir, backupFile), `${JSON.stringify(backup, null, 2)}\n`, 'utf8');
    process.stdout.write(JSON.stringify({ mode: 'preflight', database: identity.rows[0].database, checkedAt: identity.rows[0].checkedAt,
      pages: rows.length, linkedEventIds: rows.reduce((count, row) => count + row.eventIds.length, 0),
      allDrafts: true, allHaveFutureSaleableEvents: true, shortDescriptions: 0,
      minParagraphs: Math.min(...rows.map((row) => row.paragraphs)),
      indexableBefore: livePages.filter((page) => page.isIndexable === true).length,
      backupFile, auditJsonFile, auditCsvFile }, null, 2));
  } else {
    const backup = readJson(backupFile);
    if (backup.database !== 'daibilet' || backup.pages.length !== 30 || backup.version !== version) {
      throw new Error('Missing or invalid production pre-apply backup; run this script once without --apply first');
    }
    const result = { appliedAt: new Date().toISOString(), database: 'daibilet', version, pages: [] };
    await db.transaction(async ({ query }) => {
      const helperDb = { query, transaction: (fn) => fn({ query }) };
      for (const row of rows) {
        const current = await query('SELECT id, slug, status, "isIndexable", "publishedAt", content FROM "EventPage" WHERE id = $1 FOR UPDATE', [row.id]);
        const page = current.rows[0];
        if (!page || page.slug !== row.slug || page.status !== 'DRAFT' || page.isIndexable !== false || page.publishedAt != null
          || page.content?.activeEditorialText?.status === 'ACTIVE_EDITORIAL_REWRITE') throw new Error(`Draft changed before write: ${row.slug}`);
        const currentLinks = await query('SELECT "eventId" FROM "EventPageEvent" WHERE "eventPageId" = $1 ORDER BY position, "createdAt"', [row.id]);
        if (currentLinks.rows.map((link) => String(link.eventId)).sort().join('|') !== row.eventIds.join('|')) throw new Error(`Links changed before write: ${row.slug}`);
        const live = liveById.get(row.id);
        const content = {
          sections: [
            { id: 'about', kind: 'about', title: 'О событии', body: row.body, items: [] },
            { id: 'practical-info', kind: 'custom', title: 'Практическая информация', body: row.practical, items: [] },
          ],
          activeEditorialText: { field: 'sections', status: 'ACTIVE_EDITORIAL_REWRITE', version },
          sourceArchive: { status: 'ARCHIVED_SOURCE_NOT_RENDERED', active: false, archiveFile, eventIds: row.eventIds },
        };
        const updated = await updateAdminEventPage(helperDb, row.id, {
          slug: live.slug,
          title: live.title,
          summary: row.summary,
          heroImageUrl: live.heroImageUrl,
          content,
          seoH1: live.seoH1,
          seoTitle: live.seoTitle,
          seoDescription: row.summary.slice(0, 300),
          canonicalPath: `/events/${row.slug}`,
          status: 'READY',
          isIndexable: true,
          changeNote: `Редакторский рерайт, батч 30 от 27.11.2026; исходники архивированы, EventPage открыта к индексации`,
        });
        if (!updated || updated.slug !== row.slug || updated.status !== 'READY' || updated.isIndexable !== true) {
          throw new Error(`Update failed: ${row.slug}`);
        }
        const published = await publishAdminEventPage(helperDb, row.id);
        if (!published || published.status !== 'READY' || published.isIndexable !== true || !published.publishedAt) {
          throw new Error(`Publish failed: ${row.slug}`);
        }
        result.pages.push({ id: row.id, slug: row.slug, status: published.status, isIndexable: published.isIndexable,
          publishedAt: published.publishedAt, eventIds: row.eventIds, revisionCount: published.revisions?.length ?? null });
      }
    });
    const verify = await db.query(`SELECT p.id,p.slug,p.status,p."isIndexable",p."publishedAt",p."canonicalPath",p.content,
      COALESCE((SELECT jsonb_agg(l."eventId" ORDER BY l.position,l."createdAt") FROM "EventPageEvent" l WHERE l."eventPageId"=p.id),'[]'::jsonb) AS links,
      COALESCE((SELECT jsonb_agg(r.path ORDER BY r.path) FROM "EventPageRoute" r WHERE r."eventPageId"=p.id),'[]'::jsonb) AS routes
      FROM "EventPage" p WHERE p.id=ANY($1::text[])`, [rows.map((row) => row.id)]);
    if (verify.rows.length !== 30) throw new Error(`Post-apply verification found ${verify.rows.length}/30 pages`);
    for (const row of rows) {
      const page = verify.rows.find((item) => item.id === row.id);
      const links = page.links.map(String).sort();
      const routes = page.routes.map(String).sort();
      if (page.slug !== row.slug || page.status !== 'READY' || page.isIndexable !== true || !page.publishedAt
        || page.canonicalPath !== `/events/${row.slug}`
        || page.content?.activeEditorialText?.status !== 'ACTIVE_EDITORIAL_REWRITE'
        || page.content?.sourceArchive?.active !== false || page.content?.sourceArchive?.archiveFile !== archiveFile
        || links.join('|') !== row.eventIds.join('|') || !routes.includes(`/events/${row.slug}`)) {
        throw new Error(`Post-apply verification failed: ${row.slug}`);
      }
    }
    result.complete = true;
    result.counts = { applied: result.pages.length, indexable: result.pages.filter((page) => page.isIndexable).length,
      linkedEventIds: rows.reduce((count, row) => count + row.eventIds.length, 0) };
    result.linksAndRoutesChanged = false;
    fs.writeFileSync(path.join(dir, resultFile), `${JSON.stringify(result, null, 2)}\n`, 'utf8');
    process.stdout.write(JSON.stringify({ mode: 'applied', ...result.counts, resultFile }, null, 2));
  }
} finally {
  await db.close();
}





