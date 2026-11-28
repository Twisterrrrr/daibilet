/** Yandex Metrika reachGoal helpers. No-op when ym is unavailable. */
export function trackGoal(goal: string, params?: Record<string, unknown>): void {
  try {
    const id = Number(process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID) || 106786540;
    if (typeof window !== 'undefined' && typeof window.ym === 'function') {
      window.ym(id, 'reachGoal', goal, params);
    }
  } catch {
    // ignore
  }
}