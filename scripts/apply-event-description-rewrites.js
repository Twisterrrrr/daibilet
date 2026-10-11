#!/usr/bin/env node
/**
 * Apply editorial rewrites (owner task 2026-10-11) to EventOverride.description.
 *
 * Input JSON: [{ index, title, rewrite, members: [{ id, city, venue, price, age, ... }] }]
 * For every member card the script appends a factual "practical info" block
 * (nearest sessions, venue, price, age) so clones of one programme stop being
 * byte-identical while staying factually honest.
 *
 * Usage:
 *   node scripts/apply-event-description-rewrites.js --input <file> [--dry-run|--apply] [--limit N] [--out DIR]
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createRequire } = require('module');

const rootDir = path.resolve(__dirname, '..');
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

const argValue = (name) => {
  const idx = process.argv.indexOf(name);
  return idx >= 0 && process.argv[idx + 1] ? process.argv[idx + 1] : null;
};

const INPUT = argValue('--input') || process.env.REWRITE_INPUT || path.join(rootDir, 'tmp-event-rewrites.json');
const dryRun = !process.argv.includes('--apply');
const limit = Number(argValue('--limit') || 0) || 0;
const outDir = argValue('--out') || path.join(rootDir, 'tmp-event-desc-rewrites');

const TZ = { timeZone: 'Europe/Moscow' };
const fmtDate = (d) => new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', ...TZ }).format(d);
const fmtTime = (d) => new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit', ...TZ }).format(d);

/** Four rotated phrasings keep the fact block from looking machine-stamped. */
function factBlock(card, dates, variant) {
  const place = [card.venue, card.city].filter(Boolean).join(', ');
  const price = card.price ? `Билеты от ${card.price} ₽.` : '';
  const age = card.age && String(card.age) !== '0' ? `Возраст: ${card.age}+.` : '';
  const dateLine = dates.length
    ? `${fmtDate(dates[0])}, ${fmtTime(dates[0])}${dates.length > 1 ? ` (и ещё ${dates.length - 1} сеанс${dates.length - 1 === 1 ? '' : 'а'})` : ''}`
    : 'билеты с открытой датой';
  const dateList = dates.length ? dates.map((d) => `${fmtDate(d)}, ${fmtTime(d)}`).join('; ') : '';

  const variants = [
    `## Практическая информация\n\nБлижайший сеанс - ${dateLine}.${place ? ` Площадка: ${place}.` : ''}${price ? ` ${price}` : ''}${age ? ` ${age}` : ''}`,
    `## Когда и где\n\n${dateList ? `Ближайшие даты: ${dateList}.` : 'Билеты с открытой датой.'}${place ? `\n\nАдрес: ${place}.` : ''}${price ? `\n\n${price}` : ''}${age ? ` ${age}` : ''}`,
    `## Организационные детали\n\nСледующий сеанс - ${dateLine}.${place ? `\n\nМесто: ${place}.` : ''}${price ? `\n\n${price}` : ''}${age ? ` ${age}` : ''}`,
    `## Даты и билеты\n\n${dateLine}${place ? `\n\n${place}.` : ''}${price ? `\n\n${price}` : ''}${age ? ` ${age}` : ''}`,
  ];
  return variants[variant % variants.length];
}


async function main() {
  loadRootEnv();
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is required (tunnel to MSK Postgres)');
  if (!fs.existsSync(INPUT)) throw new Error(`Missing input ${INPUT}`);

  const clusters = JSON.parse(fs.readFileSync(INPUT, 'utf8'));
  const allIds = clusters.flatMap((c) => c.members.map((m) => m.id));
  const limitedIds = limit > 0 ? new Set(allIds.slice(0, limit)) : new Set(allIds);

  const pool = new Pool({ connectionString, max: 2, application_name: 'event_rewrite_apply' });
  const client = await pool.connect();
  try {
    const sessionRows = (await client.query(
      `
      select "eventId", "startsAt"
      from "EventSession"
      where "eventId" = any($1::text[])
        and "isActive" is not false and "cancelledAt" is null
        and "startsAt" >= now() - interval '2 hours'
      order by "startsAt"
      `,
      [[...limitedIds]],
    )).rows;
    const sessionsByEvent = new Map();
    for (const r of sessionRows) {
      if (!sessionsByEvent.has(r.eventId)) sessionsByEvent.set(r.eventId, []);
      const list = sessionsByEvent.get(r.eventId);
      if (list.length < 3) list.push(r.startsAt);
    }

    const changes = [];
    for (const cluster of clusters) {
      cluster.members.forEach((member, i) => {
        if (!limitedIds.has(member.id)) return;
        const dates = (sessionsByEvent.get(member.id) || []).map((d) => new Date(d));
        const text = `${cluster.rewrite}\n\n${factBlock(member, dates, i)}`.trim();
        changes.push({ id: member.id, slug: member.slug, cluster: cluster.title, text });
      });
    }

    const report = {
      mode: dryRun ? 'dry-run' : 'apply',
      input: INPUT,
      clusters: clusters.length,
      cards: allIds.length,
      planned: changes.length,
      quality: {
        hasLongDash: changes.filter((c) => /[\u2013\u2014\u2212]/.test(c.text)).length,
        emptyText: changes.filter((c) => !c.text.trim()).length,
      },
    };
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2), 'utf8');
    fs.writeFileSync(
      path.join(outDir, 'samples.txt'),
      changes
        .slice(0, 14)
        .map((c) => `\n\n================ ${c.id} | ${c.slug} ================\n${c.text}`)
        .join('\n'),
      'utf8',
    );
    console.log(JSON.stringify(report, null, 2));
    if (report.quality.hasLongDash || report.quality.emptyText) {
      console.warn('WARNING: quality counters above are non-zero');
    }

    if (dryRun) {
      console.log('Dry-run only. Re-run with --apply.');
      return;
    }

    let updated = 0;
    await client.query('begin');
    try {
      for (const change of changes) {
        const overrideId = `eov_${crypto.randomBytes(12).toString('hex')}`;
        await client.query(
          `
          insert into "EventOverride" (id, "eventId", description, "createdAt", "updatedAt")
          values ($1, $2, $3, now(), now())
          on conflict ("eventId") do update
            set description = excluded.description,
                "updatedAt" = now()
          `,
          [overrideId, change.id, change.text],
        );
        updated += 1;
        if (updated % 100 === 0) {
          await client.query('commit');
          await client.query('begin');
          console.log(`applied ${updated}/${changes.length}`);
        }
      }
      await client.query('commit');
    } catch (err) {
      await client.query('rollback');
      throw err;
    }
    console.log(JSON.stringify({ updated, outDir }, null, 2));
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
