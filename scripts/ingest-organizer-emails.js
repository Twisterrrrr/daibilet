#!/usr/bin/env node
/**
 * Fetch organizer emails (Timeweb IMAP) into a server staging folder.
 *
 * Owner task 2026-10-18: organizers send extra event info + photos to
 * info@daibilet.ru. This worker runs on the server (cron / apps/worker) and
 * stages each message as a JSON record plus its photo attachments under
 * ORGANIZER_INBOX_DIR (default <repo>/tmp-organizer-inbox). Nothing touches
 * the catalogue: scripts/apply-organizer-email.js applies a reviewed record.
 *
 * Secrets - NEVER commit them (project rule). Set in the service environment:
 *   ORGANIZER_IMAP_USER     e.g. info@daibilet.ru
 *   ORGANIZER_IMAP_PASS     app password from the Timeweb mail panel
 *   ORGANIZER_IMAP_HOST     default imap.timeweb.ru
 *   ORGANIZER_IMAP_PORT     default 993
 *   ORGANIZER_INBOX_DIR     default <repo>/tmp-organizer-inbox
 *
 * Usage:
 *   node apps/worker/bin/run.mjs organizer-inbox
 *   node scripts/ingest-organizer-emails.js --limit 50 --since-days 7
 *
 * Flags: --limit N (default 50) | --since-days N (default 3) | --dry-run
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const requireFromRoot = createRequire(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../package.json'));
const { ImapFlow } = requireFromRoot('imapflow');
const { simpleParser } = requireFromRoot('mailparser');

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

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
const limit = Number(argValue('--limit') || 50) || 50;
const sinceDays = Number(argValue('--since-days') || 3) || 3;
const dryRun = process.argv.includes('--dry-run');

function writeFileSafe(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

async function main() {
  const {
    buildStagingRecord,
    isCatalogPhoto,
    isOrganizerSender,
    messageKey,
  } = await import('./lib/organizer-email-intake.js');

  loadRootEnv();
  const user = process.env.ORGANIZER_IMAP_USER;
  const pass = process.env.ORGANIZER_IMAP_PASS;
  if (!user || !pass) {
    throw new Error('Set ORGANIZER_IMAP_USER and ORGANIZER_IMAP_PASS (never commit them)');
  }
  const host = process.env.ORGANIZER_IMAP_HOST || 'imap.timeweb.ru';
  const port = Number(process.env.ORGANIZER_IMAP_PORT || 993);
  const inboxDir = process.env.ORGANIZER_INBOX_DIR || path.join(rootDir, 'tmp-organizer-inbox');

  const client = new ImapFlow({
    host,
    port,
    secure: true,
    auth: { user, pass },
    logger: false,
  });

  await client.connect();
  const staged = [];
  let skippedSenders = 0;
  try {
    const lock = await client.getMailboxLock('INBOX');
    try {
      const since = new Date(Date.now() - sinceDays * 24 * 3600 * 1000);
      const uids = await client.search({ since }, { uid: true });
      const picked = uids.slice(0, limit);
      console.log(`imap: ${uids.length} messages since ${since.toISOString().slice(0, 10)}, fetching ${picked.length}`);

      for (const uid of picked) {
        const msg = await client.fetchOne(uid, { source: true }, { uid: true });
        if (!msg || !msg.source) continue;
        const parsed = await simpleParser(msg.source);
        if (!isOrganizerSender(parsed.from?.text)) {
          skippedSenders += 1;
          console.log(`skip (sender not allowlisted): ${String(parsed.from?.text || '').slice(0, 60)}`);
          continue;
        }
        // Batch forwards arrive as .eml attachments ("Fwd:" with N letters
        // inside) - stage each nested letter as its own record.
        const nested = (parsed.attachments || []).filter(
          (a) => String(a.contentType || '').toLowerCase().startsWith('message/rfc822'),
        );
        const queue = nested.length
          ? await Promise.all(nested.map((a) => simpleParser(a.content)))
          : [parsed];

        for (const inner of queue) {
          const photos = (inner.attachments || []).filter((a) =>
            isCatalogPhoto(a.filename, a.contentType),
          );

          const key = messageKey(inner.messageId, String(inner.date || ''));
          const msgDir = path.join(inboxDir, key);
          const saved = [];
          for (const att of photos) {
            const name = path.basename(String(att.filename || 'photo')).replace(/[^\w.\-а-яА-ЯёЁ]/gu, '_');
            const target = path.join(msgDir, name);
            if (!dryRun) writeFileSafe(target, att.content);
            saved.push({ name, path: target, size: att.size || att.content.length });
          }

          const record = buildStagingRecord({
            messageId: inner.messageId,
            date: String(inner.date || ''),
            from: parsed.from?.text,
            subject: inner.subject || parsed.subject,
            text: inner.text,
            html: inner.html,
            attachments: saved,
          });
          if (!dryRun) {
            writeFileSafe(path.join(msgDir, 'record.json'), JSON.stringify(record, null, 2));
          }
          staged.push(record);
          console.log(
            `staged ${key} | ${(inner.subject || parsed.subject || '').slice(0, 60)} | photos=${photos.length} | event=${record.eventId || '-'} | slug=${record.eventSlug || '-'}`,
          );
        }
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }

  const report = {
    mode: dryRun ? 'dry-run' : 'stage',
    host,
    fetched: staged.length,
    skippedSenders,
    withSlug: staged.filter((r) => r.eventSlug).length,
    withPhotos: staged.filter((r) => r.attachments.length).length,
    inboxDir,
  };
  writeFileSafe(path.join(inboxDir, 'last-run.json'), JSON.stringify({ ...report, at: new Date().toISOString() }, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
