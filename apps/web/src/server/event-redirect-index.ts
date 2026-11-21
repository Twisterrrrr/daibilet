import type { EventRedirectEntry } from '@/lib/event-redirect-map';
import { buildEventRedirectIndex } from '@/lib/event-redirect-map';
import { EVENT_REDIRECT_ENTRIES } from '@/lib/event-redirect-entries';

const index = buildEventRedirectIndex(EVENT_REDIRECT_ENTRIES);

/** Fast lookup of a redirect-map entry for an event pathname; null when unmapped. */
export function lookupEventRedirect(pathname: string): EventRedirectEntry | null {
  return index.get(pathname) ?? null;
}