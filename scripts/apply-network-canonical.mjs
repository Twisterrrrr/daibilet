#!/usr/bin/env node
/**
 * Big duplicate "networks": point every clone card to one canonical page and
 * take the clones out of the index (canonical + noindex), keeping them sellable.
 *
 * Owner task 2026-10-11: "для крупных сетей правильнее сначала решить вопрос merge/canonical".
 * Default threshold: clusters with more than --min-size cards (100).
 *
 * Usage (repo root):
 *   node scripts/apply-network-canonical.mjs --dry-run [--min-size 100]
 *   node scripts/apply-network-canonical.mjs --apply   [--min-size 100]
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
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
const argValue = (name) => {
  const idx = process.argv.indexOf(name);
  return idx >= 0 && process.argv[idx + 1] ? process.argv[idx + 1] : null;
};
const minSize = Number(argValue('--min-size') || 100) || 100;
const outDir = argValue('--out') || path.join(rootDir, 'tmp-event-desc-backup', 'network-canonical');

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1, application_name: 'network_canonical' });
  const client = await pool.connect();
  try {
    const rows = (
      await client.query(`
      select e.id, e.slug, e.title, c.title as city, v.title as venue,
        coalesce(nullif(btrim(o.description), ''), nullif(btrim(e.description), ''), '') as eff,
        (select count(*) from "EventSession" s where s."eventId" = e.id and s."isActive" is not false
          and s."cancelledAt" is null and s."startsAt" >= now()) as future_sessions
      from "Event" e
      left join "EventOverride" o on o."eventId" = e.id
      left join "City" c on c.id = e."primaryCityId"
      left join "Venue" v on v.id = e."venueId"
      where coalesce(o."editorStatus", e.status)::text not in ('HIDDEN','DRAFT')
        and coalesce(o."isIndexable", e."isIndexable", true)
        and exists (select 1 from "EventOffer" offer where offer."eventId" = e.id and offer.active is not false
          and (nullif(offer."widgetUrl", '') is not null or nullif(offer."deeplinkUrl", '') is not null))
        and exists (select 1 from "EventSession" s2 where s2."eventId" = e.id and s2."isActive" is not false
          and s2."cancelledAt" is null and s2."startsAt" >= now() - interval '2 hours')
    `)
    ).rows;

    const fp = (s) => {
      const plain = String(s || '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase()
        .replace(/[^a-zа-яё0-9]+/gi, '');
      return plain ? crypto.createHash('md5').update(plain).digest('hex') : null;
    };

    const groups = new Map();
    for (const r of rows) {
      const key = fp(r.eff);
      if (!key) continue;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(r);
    }

    const plan = [];
    let clusters = 0;
    let clones = 0;
    for (const members of groups.values()) {
      if (members.length <= minSize) continue;
      clusters += 1;
      // Main card: the one with the most future sessions, then earliest id.
      const sorted = [...members].sort(
        (a, b) => Number(b.future_sessions) - Number(a.future_sessions) || String(a.id).localeCompare(String(b.id)),
      );
      const main = sorted[0];
      const canonical = `/events/${main.slug}`;
      for (const m of sorted.slice(1)) {
        clones += 1;
        plan.push({ id: m.id, canonical, mainId: main.id, title: m.title });
      }
    }

    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'plan.json'), JSON.stringify(plan, null, 2), 'utf8');
    fs.writeFileSync(
      path.join(outDir, 'plan.tsv'),
      'id\tcanonical\tmainId\ttitle\n' + plan.map((p) => `${p.id}\t${p.canonical}\t${p.mainId}\t${p.title}`).join('\n'),
      'utf8',
    );
    console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', minSize, clusters, clones, outDir }, null, 2));
    if (!apply || !plan.length) {
      if (!apply) console.log('Dry-run only. Re-run with --apply.');
      return;
    }
    let updated = 0;
    const batch = 200;
    await client.query('begin');
    try {
      for (const item of plan) {
        const overrideId = `eov_${crypto.randomBytes(12).toString('hex')}`;
        await client.query(
          `
          insert into "EventOverride" (id, "eventId", "canonicalPath", "isIndexable", "createdAt", "updatedAt")
          values ($1, $2, $3, false, now(), now())
          on conflict ("eventId") do update
            set "canonicalPath" = excluded."canonicalPath",
                "isIndexable" = false,
                "updatedAt" = now()
          `,
          [overrideId, item.id, item.canonical],
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
    }
    console.log(JSON.stringify({ updated }, null, 2));
  } finally {
    client.release();
    await pool.end();
  }
}
main().catch((err) => {
  console.error(err);
  process.exit(1);
});
