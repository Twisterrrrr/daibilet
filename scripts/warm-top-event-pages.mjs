#!/usr/bin/env node
/**
 * PERF.E4: warm top-N /events/[slug] into Next Full Route Cache after deploy/sync.
 *
 * Env: EVENT_SSG_TOP_N (default 40), DAIBILET_WEB_PORT / WARM_BASE, WARM_CONCURRENCY (default 2),
 *      WARM_TIMEOUT_MS (default 8000), DATABASE_URL (or loaded from /opt/daibilet/.env).
 * Single-flight via flock file lock (skip if another warm is running).
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const requireFromDb = createRequire(path.join(root, 'packages/db/package.json'));
const pg = requireFromDb('pg');

const LOCK_PATH = path.join('/tmp', 'daibilet-warm-top-events.lock');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m || process.env[m[1]]) continue;
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    process.env[m[1]] = v;
  }
}

loadEnvFile(path.join(root, '.env'));
loadEnvFile(path.join(root, 'apps/web/.env'));

function topN() {
  // Soft default: avoid warm pile-up after deploy (was 200 @ concurrency 8).
  const n = Number(process.env.EVENT_SSG_TOP_N || 40);
  return Number.isFinite(n) && n > 0 ? Math.min(Math.floor(n), 200) : 40;
}

function acquireLock() {
  try {
    const fd = fs.openSync(LOCK_PATH, 'wx');
    fs.writeFileSync(fd, String(process.pid));
    fs.closeSync(fd);
    return true;
  } catch (error) {
    if (error && error.code === 'EEXIST') {
      try {
        const prev = Number(fs.readFileSync(LOCK_PATH, 'utf8').trim());
        if (prev > 1) {
          try {
            process.kill(prev, 0);
            console.log(`[warm-top-events] skip: lock held by pid=${prev}`);
            return false;
          } catch {
            // stale lock
          }
        }
        fs.unlinkSync(LOCK_PATH);
        return acquireLock();
      } catch {
        console.log('[warm-top-events] skip: lock busy');
        return false;
      }
    }
    throw error;
  }
}

function releaseLock() {
  try {
    fs.unlinkSync(LOCK_PATH);
  } catch {
    // ignore
  }
}

async function listSlugs(limit) {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL missing');
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    const { rows } = await client.query(
      `SELECT e.slug
       FROM "Event" e
       WHERE e.status IN ('READY', 'PUBLISHED')
         AND e."isIndexable" = true
         AND e.slug IS NOT NULL
         AND e.slug <> ''
         AND (
           EXISTS (
             SELECT 1 FROM "EventSession" s
             WHERE s."eventId" = e.id
               AND s."isActive" = true
               AND s."cancelledAt" IS NULL
               AND (s."startsAt" IS NULL OR s."startsAt" >= NOW() OR s."endsAt" >= NOW())
           )
           OR NOT EXISTS (SELECT 1 FROM "EventSession" s2 WHERE s2."eventId" = e.id)
         )
       ORDER BY e."updatedAt" DESC
       LIMIT $1`,
      [limit],
    );
    return rows.map((r) => r.slug).filter(Boolean);
  } finally {
    await client.end().catch(() => {});
  }
}

async function warmOne(base, slug, timeoutMs) {
  const url = `${base}/events/${encodeURIComponent(slug)}`;
  const t0 = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { 'user-agent': 'daibilet-warm-top-events' },
      redirect: 'follow',
      signal: controller.signal,
    });
    // drain body so keep-alive sockets stay healthy
    await res.arrayBuffer().catch(() => {});
    return { slug, status: res.status, ms: Date.now() - t0 };
  } catch (error) {
    return { slug, status: 0, ms: Date.now() - t0, error: String(error?.message || error) };
  } finally {
    clearTimeout(timer);
  }
}

async function mapPool(items, concurrency, fn) {
  const out = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  }
  const n = Math.min(concurrency, Math.max(items.length, 1));
  await Promise.all(Array.from({ length: n }, () => worker()));
  return out;
}

async function main() {
  if (!acquireLock()) {
    process.exitCode = 0;
    return;
  }
  try {
    const limit = topN();
    const base = (
      process.env.WARM_BASE ||
      `http://127.0.0.1:${process.env.DAIBILET_WEB_PORT || process.env.WEB_PORT || 3001}`
    ).replace(/\/$/, '');
    const concurrency = Math.max(1, Math.min(4, Number(process.env.WARM_CONCURRENCY || 2)));
    const timeoutMs = Math.max(2000, Math.min(30000, Number(process.env.WARM_TIMEOUT_MS || 8000)));

    const slugs = await listSlugs(limit);
    console.log(
      `[warm-top-events] base=${base} n=${slugs.length} concurrency=${concurrency} timeoutMs=${timeoutMs}`,
    );
    if (!slugs.length) {
      console.log('[warm-top-events] no slugs — skip');
      return;
    }

    const results = await mapPool(slugs, concurrency, (slug) => warmOne(base, slug, timeoutMs));
    const ok = results.filter((r) => r.status >= 200 && r.status < 400).length;
    const fail = results.length - ok;
    const avg =
      results.length > 0
        ? Math.round(results.reduce((s, r) => s + r.ms, 0) / results.length)
        : 0;
    console.log(
      JSON.stringify({
        ok,
        fail,
        avgMs: avg,
        sampleFail: results.filter((r) => r.status < 200 || r.status >= 400).slice(0, 5),
      }),
    );
    if (fail > results.length * 0.25) process.exitCode = 1;
  } finally {
    releaseLock();
  }
}

main().catch((error) => {
  releaseLock();
  console.error('[warm-top-events] failed:', error);
  process.exitCode = 1;
});
