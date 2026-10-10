/**
 * Post IndexNow for Moscow must-see 200-only paths via MSK localhost web.
 * Run ON daibilet-msk (has DAIBILET_NEXT_REVALIDATE_SECRET in .env).
 *
 * Usage:
 *   node scripts/submit-moscow-mustsee-indexnow.mjs
 *   WEB_PORT=3001 node scripts/submit-moscow-mustsee-indexnow.mjs
 */
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const pathsFile = 'docs/drafts/_msk-mustsee-indexnow-paths.json';
const data = JSON.parse(readFileSync(pathsFile, 'utf8'));
const paths = data.paths;
if (!Array.isArray(paths) || paths.length < 10) {
  console.error('bad paths file', pathsFile);
  process.exit(1);
}

const port = process.env.WEB_PORT || '3001';
const appDir = process.env.APP_DIR || '/opt/daibilet';

function loadSecret() {
  if (process.env.DAIBILET_NEXT_REVALIDATE_SECRET) {
    return process.env.DAIBILET_NEXT_REVALIDATE_SECRET.trim();
  }
  const envPath = `${appDir}/.env`;
  const raw = readFileSync(envPath, 'utf8');
  const m = raw.match(/^DAIBILET_NEXT_REVALIDATE_SECRET=(.*)$/m);
  if (!m) return null;
  return m[1].trim().replace(/^['"]|['"]$/g, '');
}

const secret = loadSecret();
if (!secret) {
  console.error('missing DAIBILET_NEXT_REVALIDATE_SECRET');
  process.exit(1);
}

// IndexNow API batches; our server caps at 64.
const BATCH = 64;
const results = [];
for (let i = 0; i < paths.length; i += BATCH) {
  const chunk = paths.slice(i, i + BATCH);
  const res = await fetch(`http://127.0.0.1:${port}/api/internal/indexnow`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify({
      paths: chunk,
      reason: 'msk-mustsee-201-after-expand-wire',
    }),
  });
  const body = await res.json().catch(() => ({}));
  results.push({ status: res.status, batch: chunk.length, body });
  console.log(JSON.stringify({ i, status: res.status, batch: chunk.length, ok: body.ok, submitted: body.submitted }));
}

const failed = results.filter((r) => r.status >= 400 || r.body?.ok === false);
console.log(
  JSON.stringify(
    {
      totalPaths: paths.length,
      batches: results.length,
      failed: failed.length,
      endpoints: results[0]?.body?.endpoints,
    },
    null,
    2,
  ),
);
if (failed.length) process.exit(2);
