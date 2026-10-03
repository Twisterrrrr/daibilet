#!/usr/bin/env node
/**
 * Warm hub HTML into nginx/Next caches so browser cache-clear stays fast.
 * Paths: /, /events, top city hubs.
 *
 * Env: WARM_BASE (default http://127.0.0.1:3001), WARM_HOST (Host header),
 *      CITY_WARM_SLUGS (comma list) or defaults.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m || process.env[m[1]]) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    process.env[m[1]] = v;
  }
}

loadEnvFile(path.join(root, '.env'));

const DEFAULT_CITY_SLUGS = [
  'sankt-peterburg',
  'moskva',
  'kazan',
  'ekaterinburg',
  'novosibirsk',
  'nizhniy-novgorod',
  'krasnodar',
  'sochi',
  'kaliningrad',
  'murmansk',
];

function pathsToWarm() {
  const cities = String(process.env.CITY_WARM_SLUGS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const citySlugs = cities.length ? cities : DEFAULT_CITY_SLUGS;
  return ['/', '/events', ...citySlugs.map((slug) => `/cities/${slug}`)];
}

async function warmOne(base, host, routePath) {
  const url = `${base.replace(/\/$/, '')}${routePath}`;
  const t0 = Date.now();
  try {
    const fetchTimeoutMs = Number(process.env.WARM_FETCH_TIMEOUT_MS || 15000);
    const res = await fetch(url, {
      headers: {
        'user-agent': 'daibilet-warm-hub-pages',
        ...(host ? { host } : {}),
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(fetchTimeoutMs),
    });
    const ms = Date.now() - t0;
    const cache = res.headers.get('x-nextjs-cache') || res.headers.get('x-cache-status') || '-';
    console.log(`${res.status} ${ms}ms cache=${cache} ${routePath}`);
    return res.ok;
  } catch (error) {
    console.warn(`FAIL ${routePath}: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

const port = process.env.DAIBILET_WEB_PORT || process.env.PORT || '3001';
const base = process.env.WARM_BASE || `http://127.0.0.1:${port}`;
const host = process.env.WARM_HOST || '';
const paths = pathsToWarm();

console.log(`warm-hub-pages: ${paths.length} paths via ${base}`);
let ok = 0;
for (const routePath of paths) {
  // sequential: avoid stacking dual catalog rebuilds
  if (await warmOne(base, host, routePath)) ok += 1;
}
console.log(`warm-hub-pages done: ${ok}/${paths.length} ok`);
process.exit(ok === paths.length ? 0 : 1);
