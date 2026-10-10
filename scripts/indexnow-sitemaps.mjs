#!/usr/bin/env node
import { readFileSync, writeFileSync, renameSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { reserveIndexNowUrls } from '../apps/backend/src/indexnow-budget.js';

export function sitemapUrls(xml, origin) {
  if (!/<urlset\b/.test(xml) || !/<\/urlset>/.test(xml)) throw new Error('Expected complete sitemap urlset');
  const urls = [...xml.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/g)].map((match) => {
    const url = new URL(match[1].trim().replace(/&amp;/g, '&').replace(/&apos;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>'));
    if (url.origin !== origin || url.username || url.password) throw new Error('Foreign sitemap URL');
    return url.href;
  });
  if (!urls.length) throw new Error('Empty sitemap');
  return [...new Set(urls)];
}

async function checkedText(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000), redirect: 'error' });
  if (response.status !== 200) throw new Error(`${url}: HTTP ${response.status}`);
  return response.text();
}

export async function main() {
  const origin = new URL(process.env.PUBLIC_SITE_URL || 'https://daibilet.ru').origin;
  const key = process.env.INDEXNOW_KEY?.trim();
  if (!key || !/^[a-zA-Z0-9-]{8,128}$/.test(key)) throw new Error('INDEXNOW_KEY missing/invalid');
  const keyLocation = `${origin}/indexnow-key.txt`;
  if ((await checkedText(keyLocation)).trim() !== key) throw new Error('Public IndexNow key mismatch');
  const urls = new Set();
  // Cities first so a large events sitemap cannot starve city notifications.
  for (const name of ['cities', 'events']) {
    const found = sitemapUrls(await checkedText(`${origin}/sitemaps/${name}.xml`), origin);
    for (const url of found) urls.add(url);
    console.log(JSON.stringify({ at: new Date().toISOString(), sitemap: name, urls: found.length }));
  }
  const stateFile = process.env.INDEXNOW_SITEMAP_STATE || '/var/lib/daibilet/indexnow/sitemaps.json';
  let state = { accepted: [] };
  try { state = JSON.parse(readFileSync(stateFile, 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (!Array.isArray(state.accepted)) throw new Error('Invalid sitemap submission state');
  // Durable accepted set: reruns resume leftovers, never resend unchanged full sitemap daily.
  // Updates to existing URLs are sent by existing revalidate hooks using the same budget.
  const accepted = new Set(state.accepted);
  const pending = [...urls].filter((url) => !accepted.has(url));
  if (process.argv.includes('--dry-run')) {
    console.log(JSON.stringify({ dryRun: true, discovered: urls.size, pending: pending.length }));
    return;
  }
  mkdirSync(dirname(stateFile), { recursive: true });
  let submitted = 0;
  for (let offset = 0; offset < pending.length;) {
    const count = reserveIndexNowUrls(Math.min(500, pending.length - offset));
    if (!count) break;
    const batch = pending.slice(offset, offset + count);
    const response = await fetch('https://yandex.com/indexnow', {
      method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host: new URL(origin).host, key, keyLocation, urlList: batch }),
      signal: AbortSignal.timeout(30_000), redirect: 'error',
    });
    const responseBody = await response.text();
    console.log(JSON.stringify({ at: new Date().toISOString(), endpoint: 'https://yandex.com/indexnow', count, status: response.status, response: responseBody.slice(0, 2000) }));
    if (![200, 202].includes(response.status)) throw new Error(`IndexNow rejected batch: HTTP ${response.status}`);
    for (const url of batch) accepted.add(url);
    writeFileSync(`${stateFile}.tmp`, JSON.stringify({ accepted: [...accepted] }), { mode: 0o600 });
    renameSync(`${stateFile}.tmp`, stateFile);
    offset += count;
    submitted += count;
  }
  console.log(JSON.stringify({ at: new Date().toISOString(), discovered: urls.size, submitted, deferred: pending.length - submitted }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => { console.error(JSON.stringify({ error: error.message })); process.exitCode = 1; });
}
