/**
 * Fail-soft race for SSR hot paths. Prefer empty/stale UI over hung TTFB.
 * Does not cancel the underlying promise (Next/Prisma keep working in background).
 * Rejected promises also resolve to fallback (CI build without API must not abort SSG).
 */
export async function withSoftTimeout<T>(
  promise: Promise<T>,
  ms: number,
  fallback: T,
  label?: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise.catch((error: unknown) => {
        if (label && (process.env.DAIBILET_PERF_LOG === '1' || process.env.NEXT_PHASE === 'phase-production-build')) {
          console.warn(`[soft-timeout] ${label}: rejected → fallback`, error);
        }
        return fallback;
      }),
      new Promise<T>((resolve) => {
        timer = setTimeout(() => {
          if (label && process.env.DAIBILET_PERF_LOG === '1') {
            console.log(`[perf:soft-timeout] ${label}: ${ms}ms → fallback`);
          }
          resolve(fallback);
        }, ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
