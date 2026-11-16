import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const mainRepo = path.resolve(root, '..', '..', 'daibilet');
const editorial = path.join(root, 'data/ticketscloud/editorial');
const auditPath = path.join(editorial, 'eventpage-city-h1-audit-2026-11-16.json');
const backupPath = path.join(editorial, 'eventpage-city-h1-before-apply-2026-11-16.json');
const resultPath = path.join(editorial, 'eventpage-city-h1-apply-result-2026-11-16.json');
const apply = process.argv.includes('--apply');
if (!apply && !process.argv.includes('--preflight')) throw new Error('Use --preflight or --apply');

const audit = JSON.parse(fs.readFileSync(auditPath, 'utf8'));
const cityIn = {
  Челябинск: 'в Челябинске', Хабаровск: 'в Хабаровске', Краснодар: 'в Краснодаре', Курган: 'в Кургане',
  Рязань: 'в Рязани', Тула: 'в Туле', Владивосток: 'во Владивостоке', Воронеж: 'в Воронеже',
  Домодедово: 'в Домодедове', 'Орехово-Зуево': 'в Орехово-Зуеве', Обь: 'в Оби',
  Грязи: 'в Грязях', 'Калач-на-Дону': 'в Калаче-на-Дону', Котовск: 'в Котовске', Скопин: 'в Скопине',
  Усмань: 'в Усмани', Жердевка: 'в Жердевке', Жирновск: 'в Жирновске', Котово: 'в Котове', Суровикино: 'в Суровикино',
};
const targets = audit.rows.map((row) => {
  const place = cityIn[row.city];
  if (!place) throw new Error(`No verified prepositional city form for ${row.city}`);
  let base = row.brokenH1.replace(/\s+(?:в|во)\s*$/iu, '').trim();
  if (row.slug.startsWith('anna-asti-')) base = 'ANNA ASTI. Сольный концерт «ШОУ „Царица“»';
  if (row.slug.startsWith('anton-i-viktoriya-makarskie-')) base = 'Антон и Виктория Макарские. «Живой концерт»';
  if (row.slug === 'cirk-bruno-v-g-ob') base = 'Цирк Бруно';
  if (row.slug.startsWith('spektakl-chto-tvoryat-muzhchiny-')) base = 'Спектакль «Что творят мужчины» с Сергеем Астаховым';
  return { id: row.id, slug: row.slug, city: row.city, expectedH1: row.title, brokenH1: row.brokenH1, seoH1: `${base} ${place}` };
});
if (targets.length !== 20 || new Set(targets.map((t) => t.id)).size !== targets.length) throw new Error('Expected 20 unique pages from the production audit');

const envText = fs.readFileSync(path.join(mainRepo, '.env'), 'utf8');
const raw = envText.match(/^DATABASE_URL=(.*)$/mu)?.[1]?.trim().replace(/^['"]|['"]$/gu, '');
if (!raw) throw new Error('DATABASE_URL is missing from the main checkout .env');
const dbUrl = new URL(raw); dbUrl.hostname = '127.0.0.1'; dbUrl.port = '5433'; dbUrl.pathname = '/daibilet';
if (dbUrl.hostname !== '127.0.0.1' || dbUrl.port !== '5433' || dbUrl.pathname !== '/daibilet') throw new Error('Refusing any DB target other than production SSH tunnel 127.0.0.1:5433/daibilet');
process.env.DATABASE_URL = dbUrl.toString();
const { Pool } = createRequire(path.join(mainRepo, 'packages/db/package.json'))('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
const db = {
  query: (sql, params) => pool.query(sql, params),
  transaction: async (callback) => {
    const client = await pool.connect();
    try { await client.query('BEGIN'); const result = await callback({ query: (sql, params) => client.query(sql, params) }); await client.query('COMMIT'); return result; }
    catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  },
};
const { getAdminEventPage, updateAdminEventPage } = await import(pathToFileURL(path.join(root, 'apps/backend/src/event-pages.js')).href);
const stable = (value) => value instanceof Date ? value.toISOString() : Array.isArray(value) ? value.map(stable) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])])) : value;
const same = (a, b) => JSON.stringify(stable(a)) === JSON.stringify(stable(b));

try {
  const identity = await db.query('SELECT current_database() AS database');
  if (identity.rows[0].database !== 'daibilet') throw new Error('Connected DB is not production daibilet');
  const pages = [];
  for (const target of targets) {
    const page = await getAdminEventPage(db, target.id);
    if (!page || page.slug !== target.slug || page.status !== 'READY' || page.isIndexable !== true || !page.publishedAt) throw new Error(`Unexpected lifecycle state for ${target.slug}`);
    if (String(page.seoH1 || page.title || '').trim() !== target.expectedH1) throw new Error(`H1 changed since audit for ${target.slug}: expected ${target.expectedH1}; current seoH1=${page.seoH1}; title=${page.title}`);
    pages.push({ target, page });
  }
  if (!apply) {
    if (fs.existsSync(backupPath)) throw new Error('Backup already exists; refusing overwrite');
    fs.writeFileSync(backupPath, JSON.stringify({ database: identity.rows[0].database, capturedAt: new Date().toISOString(), pages: pages.map(({ target, page }) => ({ target, page: { id: page.id, slug: page.slug, title: page.title, seoH1: page.seoH1, seoTitle: page.seoTitle, seoDescription: page.seoDescription, canonicalPath: page.canonicalPath, status: page.status, isIndexable: page.isIndexable, publishedAt: page.publishedAt }, eventIds: page.events.map((event) => event.eventId).sort(), routes: page.routes.map((route) => ({ path: route.path, kind: route.kind, source: route.source })).sort((a,b) => a.path.localeCompare(b.path)), revisionCount: page.revisions.length })) }, null, 2) + '\n');
    process.stdout.write(JSON.stringify({ mode: 'preflight', database: identity.rows[0].database, targets: pages.map(({ target, page }) => ({ id: target.id, slug: target.slug, from: page.seoH1 || page.title, to: target.seoH1, status: page.status, isIndexable: page.isIndexable })), backupPath }, null, 2));
  } else {
    if (!fs.existsSync(backupPath)) throw new Error('Run --preflight first; production backup is missing');
    const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    const beforeById = new Map(backup.pages.map((item) => [item.page.id, item]));
    const updatedRows = [];
    for (const { target, page } of pages) {
      const before = beforeById.get(target.id);
      if (!before || before.page.seoH1 !== (page.seoH1 || page.title) || !same(before.eventIds, page.events.map((event) => event.eventId).sort())) throw new Error(`Page changed since preflight: ${target.slug}`);
      const updated = await updateAdminEventPage(db, target.id, {
        slug: page.slug, title: page.title, summary: page.summary, heroImageUrl: page.heroImageUrl,
        content: page.content, seoH1: target.seoH1, seoTitle: page.seoTitle, seoDescription: page.seoDescription,
        canonicalPath: page.canonicalPath, status: page.status, isIndexable: page.isIndexable,
        changeNote: 'Восстановлен город в H1: удаление суффикса оставляло оборванное «в».',
      });
      if (!updated || updated.seoH1 !== target.seoH1 || updated.status !== 'READY' || updated.isIndexable !== true || !updated.publishedAt) throw new Error(`Update verification failed for ${target.slug}`);
      if (!same(before.eventIds, updated.events.map((event) => event.eventId).sort())) throw new Error(`Event links changed for ${target.slug}`);
      if (!same(before.routes, updated.routes.map((route) => ({ path: route.path, kind: route.kind, source: route.source })).sort((a,b) => a.path.localeCompare(b.path)))) throw new Error(`Routes changed for ${target.slug}`);
      for (const field of ['title', 'seoTitle', 'seoDescription', 'canonicalPath', 'status', 'isIndexable', 'publishedAt']) if (!same(before.page[field] ?? null, updated[field] ?? null)) throw new Error(`${field} changed unexpectedly for ${target.slug}`);
      updatedRows.push({ id: target.id, slug: target.slug, url: `https://daibilet.ru/events/${target.slug}`, seoH1: updated.seoH1, status: updated.status, isIndexable: updated.isIndexable, revisionCount: updated.revisions.length });
    }
    const result = { appliedAt: new Date().toISOString(), database: identity.rows[0].database, changedPages: updatedRows.length, pages: updatedRows, eventLinksChanged: false, routesChanged: false, publicationOrIndexabilityChanged: false };
    fs.writeFileSync(resultPath, JSON.stringify(result, null, 2) + '\n');
    process.stdout.write(JSON.stringify(result, null, 2));
  }
} finally { await pool.end(); }
