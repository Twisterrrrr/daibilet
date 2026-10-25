#!/usr/bin/env node
/**
 * SEO.20 - daily listing garbage audit (saleable public catalog → Telegram).
 *
 * Usage:
 *   node --import <tsx-loader> scripts/audit-listings.js
 *   ... --dry-run
 *
 * Cron: daily 04:00 — deploy/cron/audit-listings.sh + deploy/cron/README.md
 * Env: DATABASE_URL; optional TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID (skip warn if missing).
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

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

  const dryRun = hasFlag('dry-run');
  const { runListingGarbageAudit } = await import(
    '../apps/backend/src/listing-garbage-audit.ts'
  );
  const { disconnectPrisma } = await import('../packages/db/src/client.ts');

  try {
    const result = await runListingGarbageAudit({ dryRun });
    const summary = {
      ok: true,
      dryRun,
      scanned: result.scanned,
      findings: result.findings.length,
      telegram: result.telegram,
      sample: result.findings.slice(0, 5).map((f) => ({
        id: f.id,
        slug: f.slug,
        title: f.title,
        reasons: f.hits.map((h) => h.reason),
        url: f.url,
      })),
    };
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await disconnectPrisma().catch(() => undefined);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
