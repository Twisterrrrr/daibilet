#!/usr/bin/env node
/**
 * Apply one reviewed organizer-email record to the catalogue.
 *
 * Operator flow after ingest-organizer-emails.js staged a message:
 *   1. read <inbox>/<key>/record.json, verify the text and photos;
 *   2. node scripts/apply-organizer-email.js --key <key> --apply
 *
 * What it does:
 *   - photos -> apps/web/public/images/organizer/<eventSlug>/ (nginx serves
 *     /images/* from disk with a 30d cache, see patch-prod-nginx-images-static);
 *   - record.json text -> EventOverride.description ONLY with --with-text
 *     (organizer copy must be reviewed: no invented facts, no session dates).
 *
 * Dry-run is the default. Photos are skipped if the slug is unknown.
 *
 * Flags: --key K (staging folder name) | --with-text | --apply | --force
 *        --in DIR (default ORGANIZER_INBOX_DIR or <repo>/tmp-organizer-inbox)
 *
 * Past-event guard: when the event's last session is already in the past the
 * apply is refused (stored copy would go stale) unless --force is given.
 * Open-date sessions (null startsAt) keep the event alive. No session rows at
 * all -> a warning, not a block.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const requireFromDb = createRequire(path.join(rootDir, 'packages', 'db', 'package.json'));
const { Pool } = requireFromDb('pg');

const argValue = (name) => {
  const idx = process.argv.indexOf(name);
  return idx >= 0 && process.argv[idx + 1] ? process.argv[idx + 1] : null;
};
const key = argValue('--key');
const apply = process.argv.includes('--apply');
const withText = process.argv.includes('--with-text');
const force = process.argv.includes('--force');
const inboxDir =
  argValue('--in') || process.env.ORGANIZER_INBOX_DIR || path.join(rootDir, 'tmp-organizer-inbox');
const imagesRoot = path.join(rootDir, 'apps', 'web', 'public', 'images', 'organizer');

function loadRootEnv() {
  const envPath = path.join(rootDir, '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!m || process.env[m[1]]) continue;
    process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}

async function main() {
  if (!key) throw new Error('Usage: apply-organizer-email.js --key <staging-key> [--with-text] [--apply]');
  const recordPath = path.join(inboxDir, key, 'record.json');
  if (!fs.existsSync(recordPath)) throw new Error(`No staged record at ${recordPath}`);
  const record = JSON.parse(fs.readFileSync(recordPath, 'utf8').replace(/^\uFEFF/u, ''));
  let slug = record.eventSlug;

  // Match by the TC event id from the subject when no slug is set:
  // catalogue Event.id = 'evt_' + <24-hex TC id>.
  if (!slug && record.eventId) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is required to match record.eventId to an event');
    }
    const idPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 1,
      application_name: 'organizer_email_apply',
    });
    const idc = await idPool.connect();
    try {
      const rows = (
        await idc.query('select id, slug, title from "Event" where id = $1', [
          `evt_${record.eventId}`,
        ])
      ).rows;
      if (!rows.length) {
        throw new Error(`Event evt_${record.eventId} not found in the catalogue - match manually`);
      }
      slug = rows[0].slug;
      console.log(`matched by event id: ${rows[0].title} -> ${slug}`);
    } finally {
      idc.release();
      await idPool.end();
    }
  }
  if (!slug) throw new Error('record.json has no eventSlug/eventId - match the event first (edit the record)');
  if (!record.eventSlug) {
    record.eventSlug = slug;
    fs.writeFileSync(recordPath, JSON.stringify(record, null, 2));
  }

  console.log(`record: ${record.from} | ${record.subject} | slug=${slug} | photos=${record.attachments.length}`);
  // Past-event guard: refuse stale applies unless --force.
  const { classifyEventTiming } = await import('./lib/organizer-email-intake.js');
  if (!process.env.DATABASE_URL) {
    console.warn('DATABASE_URL missing - past-event check skipped (set it for the guard)');
  } else {
    const guardPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 1,
      application_name: 'organizer_email_guard',
    });
    const guard = await guardPool.connect();
    try {
      const rows = (
        await guard.query(
          `select s."startsAt" from "EventSession" s
             join "Event" e on e.id = s."eventId"
            where e.slug = $1 and s."isActive"`,
          [slug],
        )
      ).rows;
      const timing = classifyEventTiming(rows.map((r) => r.startsAt));
      if (timing === 'past') {
        const last = rows
          .map((r) => (r.startsAt ? new Date(r.startsAt) : null))
          .filter(Boolean)
          .sort((a, b) => b - a)[0];
        const msg = `Event ${slug} already ended (last session ${last ? last.toISOString().slice(0, 10) : '?'}) - refuse apply. Use --force to override.`;
        if (!force) throw new Error(msg);
        console.warn(`FORCED: ${msg}`);
      } else if (timing === 'unknown') {
        console.warn(`No active sessions for ${slug} - cannot verify timing, review manually`);
      } else {
        console.log(`timing ok (${rows.length} active sessions)`);
      }
    } finally {
      guard.release();
      await guardPool.end();
    }
  }

  // --- Hero photo (variant A): assess staged photos, pick the best horizontal
  // one as the cover. Verticals / small / dark photos stay in staging for the
  // future gallery (variant B). Watermarks are NOT auto-detected - the operator
  // checks them at review ("better a mediocre own cover than a bad photo").
  const { assessHeroPhoto, parseImageDimensions, pickHeroCandidate } = await import(
    './lib/hero-photo-check.js'
  );
  const candidates = [];
  for (const att of record.attachments || []) {
    if (!fs.existsSync(att.path)) {
      console.warn(`missing attachment file: ${att.path}`);
      continue;
    }
    const dims = parseImageDimensions(fs.readFileSync(att.path));
    const assessment = assessHeroPhoto(dims, null);
    const name = path.basename(att.name).replace(/[^\w.\-а-яА-ЯёЁ]/gu, '_');
    candidates.push({ from: att.path, name, dims, assessment });
    console.log(
      `photo ${name}: ${dims ? `${dims.width}x${dims.height}` : 'unreadable'} -> ${assessment.ok ? 'hero candidate' : assessment.reason}`,
    );
  }
  const hero = pickHeroCandidate(candidates);
  if (hero) console.log(`hero candidate: ${hero.name} (score ${hero.assessment.score})`);
  else console.log('no hero candidate - all photos stay in staging');

  // Compare with the current cover before replacing it.
  let heroPlan = null;
  if (hero && process.env.DATABASE_URL) {
    const coverPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 1,
      application_name: 'organizer_email_apply',
    });
    const cover = await coverPool.connect();
    try {
      const rows = (
        await cover.query(
          `select o."imageUrl" as override_image, e."imageUrl" as event_image
             from "Event" e left join "EventOverride" o on o."eventId" = e.id
            where e.slug = $1`,
          [slug],
        )
      ).rows;
      const currentUrl = String(rows[0]?.override_image || rows[0]?.event_image || '').trim();
      const isPlaceholder =
        !currentUrl || /\/images\/events\/generated\//u.test(currentUrl);
      let replace = isPlaceholder;
      let reason = isPlaceholder ? (currentUrl ? 'current is a generated placeholder' : 'no current cover') : '';
      if (!replace && currentUrl) {
        // Best-effort read of the current cover to compare shape/size.
        try {
          const localPath = currentUrl.startsWith('/images/')
            ? path.join(rootDir, 'apps', 'web', 'public', currentUrl.slice(1))
            : null;
          const buf = localPath && fs.existsSync(localPath)
            ? fs.readFileSync(localPath)
            : Buffer.from(await (await fetch(currentUrl)).arrayBuffer());
          const currentAssessment = assessHeroPhoto(parseImageDimensions(buf), null);
          if (!currentAssessment.ok) {
            replace = true;
            reason = `current cover unusable: ${currentAssessment.reason}`;
          } else if (hero.assessment.score > currentAssessment.score) {
            replace = true;
            reason = `organizer photo scores higher (${hero.assessment.score} > ${currentAssessment.score})`;
          } else {
            reason = `current cover is fine (score ${currentAssessment.score} >= ${hero.assessment.score})`;
          }
        } catch {
          replace = true;
          reason = 'current cover not readable (expired signed URL?) - replacing';
        }
      }
      console.log(`hero decision: ${replace ? 'REPLACE' : 'KEEP'} - ${reason}`);
      if (replace) {
        const heroName = `hero-${hero.name}`;
        heroPlan = {
          from: hero.from,
          to: path.join(imagesRoot, slug, heroName),
          imageUrl: `/images/organizer/${slug}/${heroName}`,
        };
        console.log(`hero plan: ${hero.from} -> ${heroPlan.to}`);
        console.log(`           EventOverride.imageUrl = ${heroPlan.imageUrl}`);
      }
    } finally {
      cover.release();
      await coverPool.end();
    }
  } else if (hero) {
    console.warn('DATABASE_URL missing - hero cannot be compared/replaced');
  }

  if (withText) {
    console.log('text to store as EventOverride.description:');
    console.log('----------------------------------------');
    console.log(record.text.slice(0, 1500));
    console.log('----------------------------------------');
  }

  if (!apply) {
    console.log('Dry-run only. Re-run with --apply.');
    return;
  }

  if (heroPlan) {
    fs.mkdirSync(path.dirname(heroPlan.to), { recursive: true });
    fs.copyFileSync(heroPlan.from, heroPlan.to);
    console.log(`copied hero ${heroPlan.to}`);
  }

  if (withText) {
    const { hasSessionDateLines } = await import(
      '../apps/web/src/lib/event-description-session-lines.ts'
    );
    const { normalizeUserFacingCopy } = await import(
      '../apps/web/src/lib/event-description-format.ts'
    );
    const text = normalizeUserFacingCopy(record.text).trim();
    if (hasSessionDateLines(text)) {
      throw new Error('Organizer text contains session date lines - clean it first');
    }
    if (/[<][a-z]/iu.test(text)) {
      throw new Error('Organizer text contains HTML - clean it first');
    }
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required for --with-text');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1, application_name: 'organizer_email_apply' });
    const client = await pool.connect();
    try {
      const rows = (await client.query('select id from "Event" where slug = $1', [slug])).rows;
      if (!rows.length) throw new Error(`Event not found for slug ${slug}`);
      await client.query(
        `
        insert into "EventOverride" (id, "eventId", description, "createdAt", "updatedAt")
        values ($1, $2, $3, now(), now())
        on conflict ("eventId") do update set description = excluded.description, "updatedAt" = now()
        `,
        [`eov_${crypto.randomBytes(12).toString('hex')}`, rows[0].id, text],
      );
      console.log(`description updated for event ${rows[0].id}`);
    } finally {
      client.release();
      await pool.end();
    }
  }

  if (heroPlan) {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required to store the hero image');
    const heroPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 1,
      application_name: 'organizer_email_apply',
    });
    const hc = await heroPool.connect();
    try {
      const rows = (await hc.query('select id from "Event" where slug = $1', [slug])).rows;
      if (!rows.length) throw new Error(`Event not found for slug ${slug}`);
      await hc.query(
        `
        insert into "EventOverride" (id, "eventId", "imageUrl", "createdAt", "updatedAt")
        values ($1, $2, $3, now(), now())
        on conflict ("eventId") do update set "imageUrl" = excluded."imageUrl", "updatedAt" = now()
        `,
        [`eov_${crypto.randomBytes(12).toString('hex')}`, rows[0].id, heroPlan.imageUrl],
      );
      console.log(`hero image stored for event ${rows[0].id}`);
    } finally {
      hc.release();
      await heroPool.end();
    }
  }

  record.reviewed = true;
  record.appliedAt = new Date().toISOString();
  fs.writeFileSync(recordPath, JSON.stringify(record, null, 2));
  console.log('done.');
}

loadRootEnv();
main().catch((err) => {
  console.error(err);
  process.exit(1);
});
