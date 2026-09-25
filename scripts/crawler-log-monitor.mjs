#!/usr/bin/env node
import { createReadStream, readFileSync, writeFileSync, renameSync, mkdirSync, appendFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { spawnSync } from 'node:child_process';
import { dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { sendTelegramAlert } from './lib/telegram-alert.mjs';

export function botFailure(line) {
  const match = line.match(/\[([^\]]+)\]\s+"[^"]*"\s+(5\d\d)\s+\S+\s+"[^"]*"\s+"([^"]*)"/);
  if (!match || !/(?:Googlebot|YandexBot)/i.test(match[3])) return null;
  const time = Date.parse(match[1].replace(/^(\d+)\/(\w+)\/(\d+):/, '$2 $1 $3 '));
  if (!Number.isFinite(time)) throw new Error('Unparseable nginx timestamp');
  return { time, status: Number(match[2]), agent: /Googlebot/i.test(match[3]) ? 'Googlebot' : 'YandexBot' };
}

export function referenceFailure(message) {
  return /\bReferenceError\b|cleanImportedDescription.*(?:not defined|not a function)/i.test(message);
}

export async function main() {
  const stateFile = process.env.CRAWLER_MONITOR_STATE || '/var/lib/daibilet/crawler-monitor/state.json';
  const alertFile = process.env.CRAWLER_ALERT_LOG || '/var/log/daibilet/crawler-alerts.jsonl';
  let state = { until: Date.now() - 2 * 60 * 60 * 1000 };
  try { state = JSON.parse(readFileSync(stateFile, 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (!Number.isFinite(state.until)) throw new Error('Invalid monitor watermark');
  // Allow access-log buffers to flush; use whole seconds for nginx precision.
  const until = Math.floor(Date.now() / 1000) * 1000 - 60_000;
  const since = state.until;
  const findings = [];
  const accessLog = process.env.CRAWLER_ACCESS_LOG || '/var/log/nginx/access.log';
  // Scan active + rotated previous log; timestamp watermark avoids re-alerting.
  for (const file of [`${accessLog}.1`, accessLog]) {
    try {
      const lines = createInterface({ input: createReadStream(file), crlfDelay: Infinity });
      for await (const line of lines) {
        const failure = botFailure(line);
        if (failure && failure.time >= since && failure.time < until) findings.push({ kind: 'bot_5xx', ...failure });
      }
    } catch (error) { if (file === accessLog || error.code !== 'ENOENT') throw error; }
  }
  // Filter inside journald: the unfiltered web log can exceed spawnSync's buffer
  // during an incident, exactly when the monitor must keep running.
  const journal = spawnSync('journalctl', ['-u', 'daibilet-api', '-u', 'daibilet-web', '--since', `@${Math.floor(since / 1000)}`, '--until', `@${Math.ceil(until / 1000)}`, '--grep', 'ReferenceError|cleanImportedDescription', '-o', 'json', '--no-pager'], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  // journalctl returns 1 for an empty filtered result. Other errors still fail.
  if (journal.error || (journal.status !== 0 && !(journal.status === 1 && !journal.stderr?.trim()))) throw new Error(`Unable to read API/web journal: ${journal.error?.message || journal.stderr?.trim() || journal.status}`);
  for (const line of journal.stdout.trim().split('\n').filter(Boolean)) {
    const entry = JSON.parse(line);
    const time = Number(entry.__REALTIME_TIMESTAMP) / 1000;
    if (time >= since && time < until && referenceFailure(String(entry.MESSAGE))) findings.push({ kind: 'reference_error', unit: entry._SYSTEMD_UNIT, message: String(entry.MESSAGE).slice(0, 400) });
  }
  const report = { at: new Date(until).toISOString(), since: new Date(since).toISOString(), bot5xx: findings.filter((f) => f.kind === 'bot_5xx').length, referenceErrors: findings.filter((f) => f.kind === 'reference_error').length, sample: findings.slice(0, 10) };
  console.log(JSON.stringify(report));
  if (findings.length) {
    mkdirSync(dirname(alertFile), { recursive: true });
    appendFileSync(alertFile, `${JSON.stringify(report)}\n`);
    // Local durable alert always exists; use the established Telegram channel if configured.
    if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
      await sendTelegramAlert(`Daibilet crawler ALERT\n${JSON.stringify(report)}`);
    }
  }
  mkdirSync(dirname(stateFile), { recursive: true });
  writeFileSync(`${stateFile}.tmp`, JSON.stringify({ until }));
  renameSync(`${stateFile}.tmp`, stateFile);
  if (findings.length) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => { console.error(`Crawler monitor ERROR: ${error.message}`); process.exitCode = 2; });
}
