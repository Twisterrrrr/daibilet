import { notFound } from 'next/navigation';

/**
 * HTTP 404 for missing hub/PDP entities.
 *
 * Do NOT call `noStore()` before `notFound()` on ISR routes (`revalidate`):
 * `noStore()` throws digest `DYNAMIC_SERVER_USAGE` during static generation, and in
 * production that surfaces as HTTP 500 instead of a dynamic retry + 404.
 *
 * Null DTOs are already excluded from `unstable_cache` (venue/city v4/v5-no-null) -
 * that is the real STALE-404 poison fix for true misses. Transient API errors must map to
 * "unavailable" (soft 200), never `notFound()` - otherwise ISR caches HTML 404 with
 * year-long stale-while-revalidate and live URLs stay broken after API recovers.
 *
 * Soft-unavailable must NOT call `connection()` / `noStore()` either: on ISR those
 * digests DYNAMIC_SERVER_USAGE and become HTTP 500 (2026-08-09 bar-hroniki). Prefer soft
 * 200 HTML that may live ≤ `revalidate` over a hard 500; purge if soft poison lingers.
 * A short ISR HTML 404 TTL (`revalidate`) is OK for genuine misses.
 */
export function safeNotFound(): never {
  notFound();
}
