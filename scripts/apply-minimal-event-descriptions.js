#!/usr/bin/env node
/**
 * Apply generated minimal descriptions to current events that have no copy.
 *
 * Owner task 2026-10-11: cards without any description get at least a short
 * two-paragraph factual text (title/city/venue/address/next session/duration/
 * price/age). Nothing is invented - see apps/web/src/lib/event-minimal-description.ts.
 *
 * Usage:
 *   node --import tsx scripts/apply-minimal-event-descriptions.js --input <empty.json> [--apply]
 *   Default is dry-run. --out <dir> writes report + samples.
 *   --limit N processes first N cards.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
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

const apply = process.argv.includes('--apply');
const argValue = (name) => {
  const idx = process.argv.indexOf(name);
  return idx >= 0 && process.argv[idx + 1] ? process.argv[idx + 1] : null;
};
const input = argValue('--input') || path.join(rootDir, 'tmp-event-desc-backup', 'desc-empty-full.json');
const outDir = argValue('--out') || path.join(rootDir, 'tmp-event-desc-backup', 'minimal');
const limit = Number(argValue('--limit') || 0) || 0;

function writeFileSafe(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf8');
}

async function main() {
  loadRootEnv();
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is required');
  if (!fs.existsSync(input)) throw new Error(`Missing input ${input}`);

  const { buildMinimalEventDescription } = await import('../apps/web/src/lib/event-minimal-description.ts');

  const rows = JSON.parse(fs.readFileSync(input, 'utf8'));
  let cards = rows;
  if (limit > 0) cards = cards.slice(0, limit);

  // Stable group key -> variant rotation so grouped cards are not identical.
  const groupSeen = new Map();
  const plan = [];
  let skippedTest = 0;
  for (const row of cards) {
    if (/(^|\s)тест(\s|$)|тестов(ая|ое|ый)/iu.test(String(row.title || ''))) {
      skippedTest += 1;
      continue;
    }
    const key = `${String(row.title || '').toLowerCase()}||${row.venue || ''}||${row.city || ''}`;
    const variant = groupSeen.get(key) || 0;
    groupSeen.set(key, variant + 1);
    const text = buildMinimalEventDescription(
      {
        title: row.title,
        city: row.city,
        venue: row.venue,
        venueAddress: row.venue_address,
        category: row.category,
        subcategory: row.subcategory,
        kind: row.kind,
        durationMin: row.duration_min,
        priceFromRub: row.priceFromRub ?? row.price,
        ageLimit: row.ageLimit ?? row.age,
      },
      variant,
    );
    if (!text) continue;
    plan.push({ id: row.id, title: row.title, text, variant });
  }

  const quality = { hasHtml: 0, hasLongDash: 0, badHeading: 0, tooShort: 0 };
  for (const item of plan) {
    if (/<[a-z][\s\S]*>/i.test(item.text)) quality.hasHtml += 1;
    if (/[\u2013\u2014\u2212]/.test(item.text)) quality.hasLongDash += 1;
    if (item.text.split('\n').some((l) => l.startsWith('## ') && (l.length - 3 > 72 || /[.!?…]$/.test(l.trim())))) quality.badHeading += 1;
    if (item.text.length < 80) quality.tooShort += 1;
  }
  const uniqueTexts = new Set(plan.map((p) => p.text)).size;

  const report = {
    mode: apply ? 'apply' : 'dry-run',
    input,
    cards: plan.length,
    skippedTest,
    uniqueTexts,
    variants: [...groupSeen.values()].reduce((s, v) => s + (v > 1 ? 1 : 0), 0),
    quality,
  };

  writeFileSafe(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));
  writeFileSafe(
    path.join(outDir, 'samples.txt'),
    plan.slice(0, 25).map((p) => `\n\n===== ${p.id} (variant ${p.variant}) =====\n${p.text}`).join('\n'),
  );
  console.log(JSON.stringify(report, null, 2));

  if (!apply) {
    console.log('Dry-run only. Re-run with --apply.');
    return;
  }

  const pool = new Pool({ connectionString, max: 1, application_name: 'minimal_desc_apply' });
  const client = await pool.connect();
  let updated = 0;
  const batch = 200;
  try {
    writeFileSafe(
      path.join(outDir, `backup-${Date.now()}.json`),
      JSON.stringify(plan.map((p) => ({ id: p.id }))),
    );
    await client.query('begin');
    for (const item of plan) {
      const overrideId = `eov_${crypto.randomBytes(12).toString('hex')}`;
      await client.query(
        `
        insert into "EventOverride" (id, "eventId", description, "createdAt", "updatedAt")
        values ($1, $2, $3, now(), now())
        on conflict ("eventId") do update
          set description = excluded.description,
              "updatedAt" = now()
        `,
        [overrideId, item.id, item.text],
      );
      updated += 1;
      if (updated % batch === 0) {
        await client.query('commit');
        await client.query('begin');
        console.log(`applied ${updated}/${plan.length}`);
      }
    }
    await client.query('commit');
  } catch (err) {
    await client.query('rollback');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
  console.log(JSON.stringify({ updated, outDir }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
