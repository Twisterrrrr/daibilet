import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JOBS } from './jobs.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** Monorepo root: apps/worker/src → ../../.. */
export const ROOT_DIR = path.resolve(__dirname, '../../..');

/**
 * @param {string} jobId
 * @param {string[]} extraArgs
 * @param {{ cwd?: string, env?: NodeJS.ProcessEnv }} [opts]
 * @returns {{ ok: true, jobId: string, exitCode: number } | never}
 */
export function runJob(jobId, extraArgs = [], opts = {}) {
  const job = JOBS[jobId];
  if (!job) {
    const known = Object.keys(JOBS).join(', ');
    throw Object.assign(new Error(`Unknown job "${jobId}". Known: ${known}`), { statusCode: 2 });
  }

  const cwd = opts.cwd || ROOT_DIR;
  const env = { ...process.env, ...(opts.env || {}), DAIBILET_WORKER_JOB: job.id };
  const startedAt = new Date().toISOString();
  console.log(
    JSON.stringify({
      event: 'worker.job.start',
      job: job.id,
      deferred: Boolean(job.deferred),
      scripts: job.scripts,
      args: job.passArgs ? extraArgs : [],
      cwd,
      at: startedAt,
    }),
  );

  for (let i = 0; i < job.scripts.length; i += 1) {
    const rel = job.scripts[i];
    const scriptPath = path.join(cwd, rel);
    const args = [scriptPath];
    if (job.passArgs && i === job.scripts.length - 1 && extraArgs.length) {
      args.push(...extraArgs);
    }

    const result = spawnSync(process.execPath, args, {
      cwd,
      env,
      stdio: 'inherit',
      windowsHide: true,
    });

    if (result.error) {
      throw result.error;
    }
    // spawnSync: OOM/SIGABRT → status=null, signal set. `status !== 0` alone masks false SUCCESS.
    if (result.status !== 0 || result.signal) {
      const code = result.status ?? 1;
      console.error(
        JSON.stringify({
          event: 'worker.job.fail',
          job: job.id,
          script: rel,
          exitCode: code,
          signal: result.signal || null,
          at: new Date().toISOString(),
        }),
      );
      process.exitCode = code;
      return { ok: false, jobId: job.id, exitCode: code };
    }
  }

  console.log(
    JSON.stringify({
      event: 'worker.job.done',
      job: job.id,
      exitCode: 0,
      startedAt,
      finishedAt: new Date().toISOString(),
    }),
  );
  return { ok: true, jobId: job.id, exitCode: 0 };
}
