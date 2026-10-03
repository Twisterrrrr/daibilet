#!/usr/bin/env node
/**
 * Post-purchase review request emails (cron).
 *
 * Usage (prod cron uses deploy/cron/review-requests.sh):
 *   node --import <tsx-loader> scripts/send-review-requests.js
 *   ... --dry-run | --reminders
 *
 * SMTP: set SMTP_HOST + SMTP_FROM (+ SMTP_USER/SMTP_PASS). Without SMTP — creates
 * ReviewRequest rows but skips send (logged). See docs/Project.md § Reviews.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function loadEnv() {
  try {
    const { loadRootEnv } = await import('../apps/backend/src/env.ts');
    loadRootEnv(rootDir);
  } catch {
    // optional
  }
}

async function main() {
  await loadEnv();

  const dryRun = process.argv.includes('--dry-run');
  const reminders = process.argv.includes('--reminders');

  const { sendReviewReminderBatch, sendReviewRequestBatch } = await import(
    '../apps/backend/src/review-scheduler.ts'
  );
  // Relative import: root package does not declare @daibilet/db workspace dep
  const { disconnectPrisma } = await import('../packages/db/src/client.ts');

  try {
    if (reminders) {
      const result = await sendReviewReminderBatch({ dryRun });
      console.log(JSON.stringify({ ok: true, mode: 'reminders', dryRun, ...result }, null, 2));
    } else {
      const result = await sendReviewRequestBatch({ dryRun });
      console.log(JSON.stringify({ ok: true, mode: 'requests', dryRun, ...result }, null, 2));
    }
  } finally {
    await disconnectPrisma().catch(() => undefined);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
