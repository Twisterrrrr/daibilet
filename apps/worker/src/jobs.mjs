/**
 * Job catalog for F4.2 worker.
 * Logic stays in root scripts/* — worker only provides a stable CLI entrypoint
 * for cron/systemd and docs. Admin Sources buttons keep using backend API spawn
 * of the same scripts (compatible pipeline).
 */

/** @typedef {{ id: string, description: string, scripts: string[], passArgs?: boolean, deferred?: boolean }} WorkerJob */

/** @type {Record<string, WorkerJob>} */
export const JOBS = {
  'tc-catalog': {
    id: 'tc-catalog',
    description: 'Ticketscloud full catalog sync (fetch + import + optional warm)',
    scripts: ['scripts/tc-sync.js'],
    passArgs: true,
  },
  'tep-catalog': {
    id: 'tep-catalog',
    description: 'Teplohod catalog import + Next home revalidate',
    scripts: ['scripts/tep-import-fixtures.js', 'scripts/revalidate-next-home.mjs'],
    passArgs: false,
  },
  'tc-orders': {
    id: 'tc-orders',
    description: 'Ticketscloud orders mirror poll',
    scripts: ['scripts/tc-sync-orders.js'],
    passArgs: true,
  },
  'tep-orders': {
    id: 'tep-orders',
    description: 'Teplohod orders stub (partner has no API — do not enable on prod cron)',
    scripts: ['scripts/tep-sync-orders.js'],
    passArgs: true,
    deferred: true,
  },
};

export const JOB_IDS = Object.keys(JOBS);
