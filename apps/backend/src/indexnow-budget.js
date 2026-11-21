import { mkdirSync, openSync, closeSync, readFileSync, writeFileSync, renameSync, unlinkSync } from 'node:fs';
import { dirname } from 'node:path';
import { spawnSync } from 'node:child_process';

function existingSubmissions(day) {
  const since = Math.floor(Date.parse(`${day}T00:00:00Z`) / 1000);
  const journal = spawnSync('journalctl', ['-u', 'daibilet-web', '--since', `@${since}`, '-o', 'cat', '--no-pager'], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  if (journal.error || journal.status !== 0) throw new Error('Cannot audit existing IndexNow submissions');
  return [...journal.stdout.matchAll(/\[indexnow\] OK[^\n]*?: (\d+) url\(s\)/g)]
    .reduce((total, match) => total + Number(match[1]), 0);
}

/** Shared by SSR notifications and sitemap jobs. Reserve before I/O: ambiguous
 * failures consume budget. Contention fails closed; stale locks require review.
 */
export function reserveIndexNowUrls(requested, stateFile = process.env.INDEXNOW_BUDGET_FILE || '/var/lib/daibilet/indexnow/budget.json', now = new Date()) {
  if (!Number.isInteger(requested) || requested < 0) throw new Error('Invalid IndexNow reservation');
  mkdirSync(dirname(stateFile), { recursive: true });
  const lock = `${stateFile}.lock`;
  const fd = openSync(lock, 'wx', 0o600);
  try {
    const day = now.toISOString().slice(0, 10);
    let state = { day, used: 0 };
    try { state = JSON.parse(readFileSync(stateFile, 'utf8')); }
    catch (error) {
      if (error.code !== 'ENOENT') throw error;
      // First production rollout must include notifications emitted earlier today.
      if (stateFile === '/var/lib/daibilet/indexnow/budget.json') state.used = existingSubmissions(day);
    }
    if (!Number.isInteger(state.used) || state.used < 0 || typeof state.day !== 'string') throw new Error('Invalid IndexNow budget state');
    if (state.day !== day) state = { day, used: 0 };
    const granted = Math.min(requested, Math.max(0, 10_000 - state.used));
    state.used += granted;
    writeFileSync(`${stateFile}.tmp`, JSON.stringify(state), { mode: 0o600 });
    renameSync(`${stateFile}.tmp`, stateFile);
    return granted;
  } finally {
    closeSync(fd);
    unlinkSync(lock);
  }
}
