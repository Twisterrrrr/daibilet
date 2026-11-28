/**
 * The Vite app under apps/public is retired. City hub data is maintained only
 * in apps/web; this compatibility entry point intentionally performs no writes.
 */
console.error(
  'Deprecated: apps/public is read-only. Edit the canonical city data under apps/web/src/lib instead.',
);
process.exitCode = 1;
