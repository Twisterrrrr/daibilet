/**
 * Fail-soft race for SSR hot paths. Prefer empty/stale UI over hung TTFB.
 * Does not cancel the underlying promise (Next/Prisma keep working in background).
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
      promise,
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
