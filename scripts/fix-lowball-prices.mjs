#!/usr/bin/env node
/**
 * Fix obviously broken prices in stored override descriptions.
 *
 * Event.priceFromRub sometimes carries junk (8, 10, 12 ₽) while the real price
 * lives in active EventOffer rows. Owner task 2026-10-11: descriptions must not
 * advertise wrong prices.
 *
 * Usage (repo root):
 *   node scripts/fix-lowball-prices.mjs --dry-run
 *   node scripts/fix-lowball-prices.mjs --apply
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
loadRootEnv();

const apply = process.argv.includes('--apply');
const LOWBALL_RE = /(от|От)\s+(\d{1,2})\s*₽/gu;

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1, application_name: 'fix_lowball' });
  const client = await pool.connect();
  try {
    const rows = (
      await client.query(`
      select e.id, o.description,
        (select min(o2."priceRub") from "EventOffer" o2
          where o2."eventId" = e.id and o2.active is not false and o2."priceRub" is not null
            and o2."priceRub" >= 100) as real_price
      from "EventOverride" o join "Event" e on e.id = o."eventId"
      where o.description ~ 'от [0-9]{1,2} ₽' or o.description ~ 'От [0-9]{1,2} ₽'
    `)
    ).rows;
    const plan = [];
    for (const row of rows) {
      const real = Number(row.real_price || 0);
      let text = row.description;
      if (real >= 100) {
        text = text.replace(LOWBALL_RE, (full, prefix) => `${prefix} ${real} ₽`);
      } else {
        // No trustworthy price: drop the "от N ₽" fragment entirely.
        text = text
          .replace(/\s*Билеты\s+от\s+\d{1,2}\s*₽\.?/gu, '')
          .replace(/\s*от\s+\d{1,2}\s*₽/gu, '')
          .replace(/\s{2,}/g, ' ')
          .replace(/\s+\./g, '.')
          .trim();
      }
      if (text !== row.description) plan.push({ id: row.id, text });
    }
    console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', found: rows.length, planned: plan.length }, null, 2));
    for (const item of plan.slice(0, 5)) console.log('  ', item.id);
    if (!apply || !plan.length) {
      if (!apply) console.log('Dry-run only. Re-run with --apply.');
      return;
    }
    await client.query('begin');
    try {
      for (const item of plan) {
        await client.query(`update "EventOverride" set description = $2, "updatedAt" = now() where "eventId" = $1`, [
          item.id,
          item.text,
        ]);
      }
      await client.query('commit');
    } catch (err) {
      await client.query('rollback');
      throw err;
    }
    console.log(JSON.stringify({ updated: plan.length }, null, 2));
  } finally {
    client.release();
    await pool.end();
  }
}
main().catch((err) => {
  console.error(err);
  process.exit(1);
});
