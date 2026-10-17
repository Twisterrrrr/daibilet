#!/usr/bin/env node
/**
 * Daibilet worker CLI (F4.2).
 *
 * Usage:
 *   node apps/worker/bin/run.mjs <job> [-- <script-args...>]
 *   pnpm --filter @daibilet/worker start -- <job>
 *   pnpm worker -- <job>
 *
 * Jobs: health | list | tc-catalog | tep-catalog | tc-orders | tep-orders
 */
import { JOBS, JOB_IDS } from '../src/jobs.mjs';
import { ROOT_DIR, runJob } from '../src/run-job.mjs';

function printHelp() {
  console.log(`Daibilet worker — out-of-process sync entrypoints (F4.2)

Usage:
  node apps/worker/bin/run.mjs <job> [-- args...]
  pnpm worker -- <job>

Jobs:
  health       Print ok + job list (no side effects)
  list         Same as health
  tc-catalog   Ticketscloud catalog (scripts/tc-sync.js)
  tep-catalog  Teplohod catalog + revalidate
  tc-orders    Ticketscloud orders mirror
  tep-orders   Teplohod orders stub (deferred — no partner API)

Examples:
  pnpm worker -- health
  pnpm worker -- tc-catalog
  pnpm worker -- tc-orders -- --from=2026-07-01 --to=2026-07-24
  APP_DIR=/opt/daibilet node apps/worker/bin/run.mjs tep-catalog

Root: ${ROOT_DIR}
Admin Sources sync buttons still hit legacy API (same scripts/* pipeline).
`);
}

function printHealth() {
  const payload = {
    ok: true,
    service: '@daibilet/worker',
    root: ROOT_DIR,
    jobs: JOB_IDS.map((id) => ({
      id,
      description: JOBS[id].description,
      deferred: Boolean(JOBS[id].deferred),
      scripts: JOBS[id].scripts,
    })),
    at: new Date().toISOString(),
  };
  console.log(JSON.stringify(payload, null, 2));
}

const argv = process.argv.slice(2);
if (argv.length === 0 || argv[0] === '-h' || argv[0] === '--help' || argv[0] === 'help') {
  printHelp();
  process.exit(0);
}

const jobArg = argv[0];
const dash = argv.indexOf('--');
const extraArgs = dash >= 0 ? argv.slice(dash + 1) : argv.slice(1);

if (jobArg === 'health' || jobArg === 'list') {
  printHealth();
  process.exit(0);
}

try {
  const result = runJob(jobArg, extraArgs);
  if (!result.ok) {
    process.exit(result.exitCode || 1);
  }
} catch (err) {
  console.error(
    JSON.stringify({
      event: 'worker.job.error',
      job: jobArg,
      message: err instanceof Error ? err.message : String(err),
      at: new Date().toISOString(),
    }),
  );
  process.exit(err?.statusCode === 2 ? 2 : 1);
}
