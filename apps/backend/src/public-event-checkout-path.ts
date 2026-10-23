/** Same-origin route; the page rechecks live finance readiness before payment creation. */
export function publicEventCheckoutPath(slug: string): string {
  return `/checkout/events/${encodeURIComponent(String(slug || '').trim())}`;
}
