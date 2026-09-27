#!/usr/bin/env node
import { readFileSync, mkdirSync, writeFileSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export function summarize(paths, samples, submittedAt, previous = null) {
  const baseline = Date.parse(submittedAt);
  if (!Number.isFinite(baseline)) throw new Error('Valid INDEXNOW_SUBMITTED_AT required');
  const rows = new Map(samples.map(row => [new URL(row.url).href, row]));
  const urls = [...new Set(paths.map(path => new URL(path, 'https://daibilet.ru').href))];
  if (!urls.length || urls.some(url => new URL(url).origin !== 'https://daibilet.ru')) throw new Error('Invalid target URL manifest');
  const details = urls.map(url => {
    const sample = rows.get(url);
    const access = sample?.access_date ? Date.parse(sample.access_date.replace(/,(\d{3})/, '.$1')) : NaN;
    return { url, evidence: !sample ? 'unknown' : access >= baseline ? 'crawled_since_submission' : 'older_or_undated_sample',
      accessDate: sample?.access_date || null, httpCode: sample?.http_code || null };
  });
  const crawled = details.filter(row => row.evidence === 'crawled_since_submission').length;
  return { at: new Date().toISOString(), submittedAt, total: urls.length, crawled,
    unknown: details.filter(row => row.evidence === 'unknown').length,
    delta: previous?.submittedAt === submittedAt ? crawled - previous.crawled : null,
    interpretation: 'API samples give positive crawl evidence; absence is unknown, not proof of no crawl or no indexing.', details };
}

export async function fetchSamples(base, token, fetcher = fetch) {
  const samples = []; let total = null;
  for (let offset = 0; offset < 50000; offset += 100) {
    const response = await fetcher(`${base}/indexing/samples?offset=${offset}&limit=100`, {
      headers: { Authorization: `OAuth ${token}` }, signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) throw new Error(`Webmaster API HTTP ${response.status}`);
    const body = await response.json();
    if (!Array.isArray(body.samples) || !Number.isInteger(body.count) || body.count < 0) throw new Error('Invalid Webmaster response');
    total = body.count;
    samples.push(...body.samples);
    if (offset + body.samples.length >= total) break;
    if (!body.samples.length) throw new Error('Incomplete Webmaster pagination');
  }
  return { samples, available: total, capped: total > samples.length };
}

export async function main() {
  const token = process.env.YANDEX_WEBMASTER_TOKEN;
  const user = process.env.YANDEX_WEBMASTER_USER_ID;
  const host = process.env.YANDEX_WEBMASTER_HOST_ID;
  if (!token || !user || !host) throw new Error('Configure YANDEX_WEBMASTER_TOKEN, YANDEX_WEBMASTER_USER_ID, YANDEX_WEBMASTER_HOST_ID');
  const manifest = JSON.parse(readFileSync(process.env.INDEXNOW_PATHS_FILE || 'docs/drafts/_msk-mustsee-indexnow-paths.json', 'utf8'));
  // Require the actual submission date, not the manifest generation date.
  const submittedAt = process.env.INDEXNOW_SUBMITTED_AT;
  if (!submittedAt || !Number.isFinite(Date.parse(submittedAt))) throw new Error('INDEXNOW_SUBMITTED_AT required');
  const dir = process.env.WEBMASTER_REPORT_DIR || '/var/lib/daibilet/webmaster';
  const latest = join(dir, 'latest.json');
  let previous = null;
  try { previous = JSON.parse(readFileSync(latest, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const result = await fetchSamples(`https://api.webmaster.yandex.net/v4/user/${encodeURIComponent(user)}/hosts/${encodeURIComponent(host)}`, token);
  const report = { ...summarize(manifest.paths, result.samples, submittedAt, previous), sampleCount: result.samples.length, samplesCapped: result.capped };
  if (!report.crawled && Date.now() - Date.parse(submittedAt) >= 5 * 86400000) {
    report.action = 'No positive crawl evidence: inspect Webmaster, robots, canonicals, sitemap and server bot logs. Sample absence is inconclusive.';
    report.diagnostics = [];
    // Bounded diagnostics on owned pages; no re-submission or API mutations.
    for (const url of ['https://daibilet.ru/robots.txt', 'https://daibilet.ru/sitemap.xml', ...report.details.slice(0, 8).map(row => row.url)]) {
      try {
        const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(8000) });
        report.diagnostics.push({ url, status: response.status, location: response.headers.get('location'), robots: response.headers.get('x-robots-tag') });
        await response.body?.cancel();
      } catch { report.diagnostics.push({ url, error: 'network_or_timeout' }); }
    }
  }
  mkdirSync(dir, { recursive: true });
  const text = JSON.stringify(report, null, 2);
  writeFileSync(join(dir, `${report.at.replace(/[:.]/g, '-')}.json`), text);
  writeFileSync(`${latest}.tmp`, text); renameSync(`${latest}.tmp`, latest);
  console.log(JSON.stringify({ at: report.at, total: report.total, crawled: report.crawled, delta: report.delta, unknown: report.unknown, action: report.action || null }));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(error => { console.error(error.message); process.exitCode = 1; });
