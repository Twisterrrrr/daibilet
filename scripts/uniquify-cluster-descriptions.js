#!/usr/bin/env node
/**
 * Uniquify descriptions of duplicate clusters (tours across cities, mixed series).
 *
 * Owner task 2026-10-11: cards inside a duplicate cluster get a unique factual
 * lead (title + city + next session) and a "## Где и когда" fact block, so the
 * pages stop being 1:1 copies. Optional per-cluster rewrite bodies come from
 * --rewrites (JSON: { "<clusterIndex>": "text with {city}/{venue}/{date}/{price}" }).
 *
 * Usage:
 *   node --import tsx scripts/uniquify-cluster-descriptions.js --targets <file> [--rewrites <file>] [--apply]
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
const targetsPath = argValue('--targets');
const rewritesPath = argValue('--rewrites');
const outDir = argValue('--out') || path.join(rootDir, 'tmp-event-desc-backup', 'uniquify');

let cityPrepositional = (city) => city;
async function loadHelpers() {
  const mod = await import('../apps/web/src/lib/event-minimal-description.ts');
  cityPrepositional = mod.cityPrepositional;
}

function writeFileSafe(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf8');
}

const DASH_RE = /[\u2013\u2014\u2212]/g;
const dash = (s) => String(s || '').replace(DASH_RE, '-');

function buildLead(member, index) {
  const title = dash(member.title).trim();
  const city = dash(member.city).trim();
  const price = Number(member.price || 0);
  const titleHasCity = city && title.toLowerCase().includes(city.toLowerCase());
  const place = titleHasCity || !city ? '' : ` в ${cityPrepositional(city)}`;
  const priceText = price > 0 ? ` от ${price} ₽` : '';
  // No dates in the lead: the schedule is live in the purchase block.
  const variants = [
    `${title}${place}.`,
    `«${title}»${place}.`,
    `${title}${place}${priceText}.`,
    `${title}${place} - подробности и билеты ниже.`,
  ];
  return variants[Math.abs(index) % variants.length];
}

function buildFactBlock(member) {
  const lines = [];
  const city = dash(member.city).trim();
  const venue = dash(member.venue).trim();
  const price = Number(member.price || 0);
  const age = String(member.age || '').trim();
  if (city && venue) lines.push(`${city}, ${venue}`);
  else if (city) lines.push(city);
  else if (venue) lines.push(venue);
  if (price > 0) lines.push(`Билеты: от ${price} ₽`);
  if (age && age !== '0') lines.push(`Возраст: ${age}+`);
  if (!lines.length) return '';
  return ['## Где проходит', '', ...lines.map((l) => `- ${l}`)].join('\n');
}


async function main() {
  loadRootEnv();
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is required');
  if (!targetsPath || !fs.existsSync(targetsPath)) throw new Error('--targets file is required');
  await loadHelpers();

  const targets = JSON.parse(fs.readFileSync(targetsPath, 'utf8'));
  const rewrites = rewritesPath && fs.existsSync(rewritesPath) ? JSON.parse(fs.readFileSync(rewritesPath, 'utf8')) : {};

  const ids = [];
  for (const cluster of targets) for (const m of cluster.members) ids.push(m.id);
  console.log('target cards:', ids.length, '| clusters:', targets.length);

  const pool = new Pool({ connectionString, max: 1, application_name: 'uniquify_clusters' });
  const client = await pool.connect();
  const plan = [];
  const quality = { hasHtml: 0, hasLongDash: 0, badHeading: 0, alreadyDone: 0, noBase: 0 };
  try {
    const res = await client.query(
      `
      select e.id, coalesce(nullif(btrim(o.description), ''), nullif(btrim(e.description), '')) as description
      from "Event" e
      left join "EventOverride" o on o."eventId" = e.id
      where e.id = any($1::text[])
      `,
      [ids],
    );
    const baseById = new Map(res.rows.map((r) => [r.id, r.description || '']));

    for (const cluster of targets) {
      const rewriteBody = rewrites[String(cluster.clusterIndex)] || null;
      let index = 0;
      for (const m of cluster.members) {
        const base = baseById.get(m.id);
        if (base === undefined) { quality.noBase += 1; continue; }
        if (base.includes('## Где и когда')) { quality.alreadyDone += 1; index += 1; continue; }
        const lead = buildLead(m, index);
        index += 1;
        let body = rewriteBody || base;
        if (rewriteBody) {
          body = rewriteBody
            .replace(/\{city\}/g, String(m.city || '').trim())
            .replace(/\{venue\}/g, String(m.venue || '').trim())
            .replace(/\{date\}/g, ruDate(m.next)?.date || '')
            .replace(/\{price\}/g, Number(m.price || 0) > 0 ? String(m.price) : '');
        }
        const block = buildFactBlock(m);
        const text = [lead, '', body.trim(), block ? `\n${block}` : ''].join('\n').replace(/\n{3,}/g, '\n\n').trim();
        if (/<[a-z][\s\S]*>/i.test(text)) quality.hasHtml += 1;
        if (/[\u2013\u2014\u2212]/.test(text)) quality.hasLongDash += 1;
        if (text.split('\n').some((l) => l.startsWith('## ') && (l.length - 3 > 72 || /[.!?…]$/.test(l.trim())))) quality.badHeading += 1;
        plan.push({ id: m.id, text });
      }
    }

    const report = { mode: apply ? 'apply' : 'dry-run', cards: plan.length, quality, rewritesUsed: Object.keys(rewrites).length };
    writeFileSafe(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));
    writeFileSafe(path.join(outDir, 'samples.txt'), plan.slice(0, 20).map((p) => `\n\n===== ${p.id} =====\n${p.text.slice(0, 900)}`).join('\n'));
    console.log(JSON.stringify(report, null, 2));

    if (!apply) {
      console.log('Dry-run only. Re-run with --apply.');
      return;
    }

    let updated = 0;
    const batch = 200;
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
    console.log(JSON.stringify({ updated, outDir }, null, 2));
  } catch (err) {
    await client.query('rollback').catch(() => {});
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
