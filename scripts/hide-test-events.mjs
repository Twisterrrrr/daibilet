#!/usr/bin/env node
/**
 * Hide obviously test events from catalog and search results.
 *
 * Owner task 2026-10-11: "тестовые события конечно же стоит исключить из выдачи и каталога".
 * Matches titles like "Тест", "Тест Елки", "Тест Мета Елка", "тестовая ..." and sets
 * status=HIDDEN + isIndexable=false. Already-hidden rows are skipped.
 *
 * Usage (repo root):
 *   $env:DATABASE_URL = "postgresql://…@127.0.0.1:5433/daibilet"   # SSH tunnel
 *   node scripts/hide-test-events.js --dry-run
 *   node scripts/hide-test-events.js --apply
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const requireFromDb = createRequire(path.join(rootDir, 'packages', 'db', 'package.json'));
const { Pool } = requireFromDb('pg');

function loadRootEnv() {
  const envPath = path.join(rootDir, '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!m || process.env[m[1]]) continue;
    process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}

const dryRun = !process.argv.includes('--apply');
const TITLE_PATTERNS = [
  'тест',
  'тест %',
  '% тест %',
  'тестовая%',
  'тестовое%',
  'тестовыи%',
  'test%',
];

async function main() {
  loadRootEnv();
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1, application_name: 'hide_test_events' });
  const client = await pool.connect();
  try {
    const where = TITLE_PATTERNS.map((_, i) => `lower(btrim(e.title)) like $${i + 1}`).join(' or ');
    const params = TITLE_PATTERNS.map((p) => p.toLowerCase());
    const rows = (
      await client.query(
        `select e.id, e.title, e.status::text as status, e."isIndexable"
         from "Event" e
         where (${where}) and (e.status::text <> 'HIDDEN' or e."isIndexable" = true)
         order by e.title`,
        params,
      )
    ).rows;
    console.log(JSON.stringify({ mode: dryRun ? 'dry-run' : 'apply', matched: rows.length }, null, 2));
    for (const r of rows) console.log(`  ${r.id} | ${r.title} | ${r.status} | idx=${r.isIndexable}`);
    if (dryRun || !rows.length) {
      if (dryRun) console.log('Dry-run only. Re-run with --apply.');
      return;
    }
    const ids = rows.map((r) => r.id);
    await client.query('begin');
    try {
      const res = await client.query(
        `update "Event"
         set status = 'HIDDEN', "isIndexable" = false, "updatedAt" = now()
         where id = any($1::text[])`,
        [ids],
      );
      await client.query('commit');
      console.log(JSON.stringify({ hidden: res.rowCount }, null, 2));
    } catch (err) {
      await client.query('rollback');
      throw err;
    }
  } finally {
    client.release();
    await pool.end();
  }
}
main().catch((err) => {
  console.error(err);
  process.exit(1);
});
