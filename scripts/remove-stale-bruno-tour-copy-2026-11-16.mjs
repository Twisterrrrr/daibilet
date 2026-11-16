import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const mainRepo = path.resolve(root, '..', '..', 'daibilet');
const editorial = path.join(root, 'data/ticketscloud/editorial');
const backupPath = path.join(editorial, 'cirk-bruno-current-before-time-neutral-copy-2026-11-16.json');
const resultPath = path.join(editorial, 'cirk-bruno-time-neutral-copy-result-2026-11-16.json');
const apply = process.argv.includes('--apply');
if (!apply && !process.argv.includes('--preflight')) throw new Error('Use --preflight or --apply');
const targets = [
  { id: '6d2bbcae-551f-4ec0-949d-544ad683e946', slug: 'cirk-bruno-v-g-ishim', h1: 'Цирк Бруно в Ишиме' },
  { id: 'ccbfe318-3491-4ad3-a602-5ae1fc7b7b87', slug: 'cirk-bruno-v-g-tobolsk', h1: 'Цирк Бруно в Тобольске' },
];
const body = `### Животные, заявленные в анонсе

В программе цирка «Бруно» заявлены пять животных:
- американский енот
- хорьки
- северные хаски
- белый волк
- зелёная макака

### Цирковые номера и артисты

Помимо животных, организатор перечисляет цирковые номера и участников:
- артисты оригинального жанра
- пластический этюд
- жонглирование
- игра с хлыстами
- эквилибр на катушках
- выступление клоуна

В доступном анонсе не названы артисты и не указан порядок выступлений, поэтому этот список обозначает заявленные части программы, а не последовательность шоу. Местная площадка и время конкретного показа указаны в практической информации ниже.`;
const envText = fs.readFileSync(path.join(mainRepo, '.env'), 'utf8');
const raw = envText.match(/^DATABASE_URL=(.*)$/mu)?.[1]?.trim().replace(/^['"]|['"]$/gu, '');
if (!raw) throw new Error('DATABASE_URL is missing from the main checkout .env');
const url = new URL(raw); url.hostname = '127.0.0.1'; url.port = '5433'; url.pathname = '/daibilet';
if (url.hostname !== '127.0.0.1' || url.port !== '5433' || url.pathname !== '/daibilet') throw new Error('Refusing any DB target other than production tunnel 127.0.0.1:5433/daibilet');
process.env.DATABASE_URL = url.toString();
const { Pool } = createRequire(path.join(mainRepo, 'packages/db/package.json'))('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
const db = { query: (sql, params) => pool.query(sql, params), transaction: async (fn) => { const c = await pool.connect(); try { await c.query('BEGIN'); const result = await fn({ query: (s, p) => c.query(s, p) }); await c.query('COMMIT'); return result; } catch (e) { await c.query('ROLLBACK'); throw e; } finally { c.release(); } } };
const { getAdminEventPage, updateAdminEventPage } = await import(pathToFileURL(path.join(root, 'apps/backend/src/event-pages.js')).href);
const stable = (v) => v instanceof Date ? v.toISOString() : Array.isArray(v) ? v.map(stable) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, stable(v[k])])) : v;
const same = (a, b) => JSON.stringify(stable(a)) === JSON.stringify(stable(b));
try {
  const identity = await db.query('SELECT current_database() AS database');
  if (identity.rows[0].database !== 'daibilet') throw new Error('Connected DB is not production daibilet');
  const pages = [];
  for (const target of targets) {
    const page = await getAdminEventPage(db, target.id);
    if (!page || page.slug !== target.slug || page.status !== 'READY' || page.isIndexable !== true || page.seoH1 !== target.h1) throw new Error(`Unexpected published page ${target.slug}`);
    const about = page.content?.sections?.find((section) => section.id === 'about');
    if (!about?.body.includes('Гастрольные показы проходят в Оби, Тобольске и Ишиме')) throw new Error(`Expected stale sentence missing from ${target.slug}`);
    pages.push({ target, page });
  }
  if (!apply) {
    if (fs.existsSync(backupPath)) throw new Error('Backup already exists; refusing overwrite');
    fs.writeFileSync(backupPath, JSON.stringify({ database: identity.rows[0].database, capturedAt: new Date().toISOString(), pages: pages.map(({ target, page }) => ({ target, page: { id: page.id, slug: page.slug, content: page.content, seoH1: page.seoH1, seoTitle: page.seoTitle, seoDescription: page.seoDescription, canonicalPath: page.canonicalPath, status: page.status, isIndexable: page.isIndexable, publishedAt: page.publishedAt }, eventIds: page.events.map((event) => event.eventId).sort(), routes: page.routes.map((route) => ({ path: route.path, kind: route.kind, source: route.source })).sort((a,b) => a.path.localeCompare(b.path)), revisionCount: page.revisions.length })) }, null, 2) + '\n');
    process.stdout.write(JSON.stringify({ mode: 'preflight', database: identity.rows[0].database, pages: pages.map(({ target, page }) => ({ id: target.id, slug: target.slug, h1: page.seoH1, revisionCount: page.revisions.length })), backupPath }, null, 2));
  } else {
    if (!fs.existsSync(backupPath)) throw new Error('Run --preflight first');
    const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    const beforeById = new Map(backup.pages.map((item) => [item.page.id, item]));
    const changed = [];
    for (const { target, page } of pages) {
      const before = beforeById.get(target.id);
      if (!before || !same(before.page.content, page.content) || !same(before.eventIds, page.events.map((event) => event.eventId).sort())) throw new Error(`Page changed since preflight: ${target.slug}`);
      const content = structuredClone(page.content);
      content.sections.find((section) => section.id === 'about').body = body;
      content.activeEditorialText.version = '2026-11-16-bruno-time-neutral-copy-fix';
      const updated = await updateAdminEventPage(db, target.id, { slug: page.slug, title: page.title, summary: page.summary, heroImageUrl: page.heroImageUrl, content, seoH1: page.seoH1, seoTitle: page.seoTitle, seoDescription: page.seoDescription, canonicalPath: page.canonicalPath, status: page.status, isIndexable: page.isIndexable, changeNote: 'Убрана устаревающая формулировка о городах тура; локальная программа и практические сведения сохранены.' });
      if (updated?.content?.sections?.find((section) => section.id === 'about')?.body !== body || updated.status !== 'READY' || updated.isIndexable !== true) throw new Error(`Content verification failed for ${target.slug}`);
      if (!same(before.eventIds, updated.events.map((event) => event.eventId).sort())) throw new Error(`Event links changed for ${target.slug}`);
      if (!same(before.routes, updated.routes.map((route) => ({ path: route.path, kind: route.kind, source: route.source })).sort((a,b) => a.path.localeCompare(b.path)))) throw new Error(`Routes changed for ${target.slug}`);
      for (const field of ['seoH1', 'seoTitle', 'seoDescription', 'canonicalPath', 'status', 'isIndexable', 'publishedAt']) if (!same(before.page[field] ?? null, updated[field] ?? null)) throw new Error(`${field} changed unexpectedly for ${target.slug}`);
      changed.push({ slug: target.slug, url: `https://daibilet.ru/events/${target.slug}`, revisionCount: updated.revisions.length, status: updated.status, isIndexable: updated.isIndexable });
    }
    const result = { appliedAt: new Date().toISOString(), database: identity.rows[0].database, pages: changed, routesChanged: false, eventLinksChanged: false, publicationOrIndexabilityChanged: false };
    fs.writeFileSync(resultPath, JSON.stringify(result, null, 2) + '\n');
    process.stdout.write(JSON.stringify(result, null, 2));
  }
} finally { await pool.end(); }
