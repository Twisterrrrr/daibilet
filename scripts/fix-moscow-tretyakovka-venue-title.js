#!/usr/bin/env node
/**
 * Fix TC venue whose title was the street address of Tretyakov Gallery.
 *
 * Bad:  title/address = «Москва, Лаврушинский переулок, 10»
 * Good: title = «Государственная Третьяковская галерея», address = «Лаврушинский переулок, 10»
 * Canon name matches cityInfo / must-see editorial (moscow-tret-yakovskaya-galereya).
 *
 * Usage (MSK):
 *   node scripts/fix-moscow-tretyakovka-venue-title.js --dry-run
 *   node scripts/fix-moscow-tretyakovka-venue-title.js --apply
 */
const path = require('path');
const fs = require('fs');
const { createRequire } = require('module');

const rootDir = path.resolve(__dirname, '..');
loadRootEnv(rootDir);

const requireFromDbPackage = createRequire(path.join(rootDir, 'packages', 'db', 'package.json'));
const { Pool } = requireFromDbPackage('pg');

const VENUE_ID = 'venue_6a1fd5158bd71b8ae77e127c';
const VENUE_SLUG = 'moskva-lavrushinskii-pereulok-10-6a1fd5158bd71b8ae77e127c';
const NEXT = {
  title: 'Государственная Третьяковская галерея',
  address: 'Лаврушинский переулок, 10',
  /** TC put the street line into description; clear if it still mirrors the old address-title. */
  clearAddressDescription: true,
};

const dryRun = process.argv.includes('--dry-run') || !process.argv.includes('--apply');

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://daibilet:daibilet@127.0.0.1:5437/daibilet',
    max: 2,
  });

  try {
    const found = await pool.query(
      `select id, slug, title, address, description, kind::text, "pageStatus"::text
       from "Venue"
       where id = $1 or slug = $2
       limit 1`,
      [VENUE_ID, VENUE_SLUG],
    );
    if (!found.rows[0]) {
      throw new Error(`Venue not found: ${VENUE_ID} / ${VENUE_SLUG}`);
    }
    const row = found.rows[0];
    const clearDescription =
      NEXT.clearAddressDescription &&
      /лаврушинск/i.test(String(row.description || '')) &&
      !/третьяков/i.test(String(row.description || ''));
    console.log('before', {
      id: row.id,
      slug: row.slug,
      title: row.title,
      address: row.address,
      description: row.description,
      kind: row.kind,
      pageStatus: row.pageStatus,
    });

    if (row.title === NEXT.title && row.address === NEXT.address && !clearDescription) {
      console.log('already fixed; nothing to do');
      return;
    }

    if (dryRun) {
      console.log('dry-run would set', { ...NEXT, description: clearDescription ? null : '(keep)' });
      return;
    }

    const updated = await pool.query(
      `update "Venue"
       set title = $2,
           address = $3,
           description = case when $4::boolean then null else description end,
           "updatedAt" = now()
       where id = $1
       returning id, slug, title, address, description`,
      [row.id, NEXT.title, NEXT.address, clearDescription],
    );
    console.log('after', updated.rows[0]);
  } finally {
    await pool.end();
  }
}

function loadRootEnv(root) {
  const envPath = path.join(root, '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}
